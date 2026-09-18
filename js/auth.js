import { getFirebase, isFirebaseConfigured } from './firebase-init.js';

let currentUser = null; // { uid, username, coins, wins, losses, draws, color, age, isAnonymous }
let status = 'loading'; // 'loading' | 'signedOut' | 'ready' | 'failed' | 'unconfigured'
let lastError = '';
const listeners = [];

export function onAuthChange(cb){
  listeners.push(cb);
  if (status !== 'loading') cb(currentUser);
}
function notify(){ listeners.forEach(cb => cb(currentUser)); }

export function getCurrentUser(){ return currentUser; }
export function getAuthStatus(){ return { status, error: lastError }; }

// La cuenta con nombre+PIN no usa un email de verdad: arma uno interno invisible
// para el usuario (Firebase Auth necesita un identificador con forma de email).
function normalizeUsername(name){
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
function toSyntheticEmail(name){
  return `${normalizeUsername(name)}@fulbito.local`;
}
function toPassword(pin){
  return `fb_${String(pin).trim()}`; // Firebase pide 6+ caracteres; un PIN corto solo no alcanza
}

async function loadOrCreateProfile(db, fsMod, user, extra){
  const ref = fsMod.doc(db, 'profiles', user.uid);
  let snap = await fsMod.getDoc(ref);
  if (!snap.exists()){
    await fsMod.setDoc(ref, {
      username: '', coins: 50, wins: 0, losses: 0, draws: 0, color: '#2f6fe0', age: null,
      createdAt: Date.now(), ...extra,
    });
    snap = await fsMod.getDoc(ref);
  } else if (extra && Object.keys(extra).length){
    await fsMod.updateDoc(ref, extra);
    snap = await fsMod.getDoc(ref);
  }
  return { uid: user.uid, isAnonymous: !!user.isAnonymous, ...snap.data() };
}

// Solo observa la sesion que ya exista (Firebase la recuerda sola entre visitas).
// No arranca sesion sola: el usuario elige jugar de invitado, crear cuenta o iniciar sesion.
export async function initAuth(){
  if (!isFirebaseConfigured){ status = 'unconfigured'; notify(); return null; }
  const fb = await getFirebase();
  if (!fb){
    status = 'failed';
    lastError = 'No se pudo cargar Firebase (revisa tu conexion a internet).';
    notify();
    return null;
  }
  const { auth, db, authMod, fsMod } = fb;
  authMod.onAuthStateChanged(auth, async (user) => {
    if (!user){ currentUser = null; status = 'signedOut'; notify(); return; }
    try {
      currentUser = await loadOrCreateProfile(db, fsMod, user);
      status = 'ready';
      notify();
    } catch (err){
      console.warn('FULBITO: no se pudo leer/crear el perfil en Firestore', err);
      status = 'failed';
      lastError = 'No se pudo conectar con la base de datos. ¿Creaste Firestore Database y pegaste firestore.rules?';
      notify();
    }
  });
}

export async function continueAsGuest(){
  const fb = await getFirebase();
  if (!fb) return { ok:false, error:'Firebase no esta disponible.' };
  const { auth, authMod } = fb;
  try { await authMod.signInAnonymously(auth); return { ok:true }; }
  catch (err){ return { ok:false, error:'No se pudo entrar como invitado. ¿Activaste "Anonymous" en Firebase Authentication?' }; }
}

// Crea una cuenta con nombre+PIN. Si ya estabas jugando de invitado, la cuenta nueva
// hereda tu equipo/coleccion de invitado en vez de arrancar de cero.
export async function signUp(name, pin, age){
  const fb = await getFirebase();
  if (!fb) return { ok:false, error:'Firebase no esta disponible.' };
  const username = String(name).trim().slice(0,16);
  if (normalizeUsername(username).length < 2) return { ok:false, error:'Poné un nombre con al menos 2 letras o numeros.' };
  if (String(pin).trim().length < 4) return { ok:false, error:'El PIN tiene que tener al menos 4 numeros.' };
  const { auth, authMod } = fb;
  const email = toSyntheticEmail(username);
  const password = toPassword(pin);
  try {
    if (auth.currentUser && auth.currentUser.isAnonymous){
      const cred = authMod.EmailAuthProvider.credential(email, password);
      await authMod.linkWithCredential(auth.currentUser, cred);
    } else {
      await authMod.createUserWithEmailAndPassword(auth, email, password);
    }
    // el profile se termina de crear/actualizar cuando dispare onAuthStateChanged,
    // pero le mandamos el nombre y la edad de una para no perderlos.
    const fb2 = await getFirebase();
    const user = fb2.auth.currentUser;
    currentUser = await loadOrCreateProfile(fb2.db, fb2.fsMod, user, { username, age: age||null });
    status = 'ready';
    notify();
    return { ok:true };
  } catch (err){
    if (err.code === 'auth/email-already-in-use') return { ok:false, error:'Ese nombre ya tiene cuenta. Probá iniciar sesion, o elegí otro nombre.' };
    if (err.code === 'auth/credential-already-in-use') return { ok:false, error:'Ese nombre ya tiene cuenta. Probá iniciar sesion, o elegí otro nombre.' };
    console.warn('FULBITO: error en signUp', err);
    return { ok:false, error:'No se pudo crear la cuenta.' };
  }
}

export async function logIn(name, pin){
  const fb = await getFirebase();
  if (!fb) return { ok:false, error:'Firebase no esta disponible.' };
  const { auth, authMod } = fb;
  try {
    await authMod.signInWithEmailAndPassword(auth, toSyntheticEmail(name), toPassword(pin));
    return { ok:true };
  } catch (err){
    return { ok:false, error:'Nombre o PIN incorrecto.' };
  }
}

export async function signOutUser(){
  const fb = await getFirebase();
  if (!fb) return;
  await fb.authMod.signOut(fb.auth);
}

export async function setUsername(name){
  const fb = await getFirebase();
  if (!fb || !currentUser) return;
  const { db, fsMod } = fb;
  await fsMod.updateDoc(fsMod.doc(db, 'profiles', currentUser.uid), { username: name });
  currentUser.username = name;
  notify();
}

export async function setColor(color){
  const fb = await getFirebase();
  if (!fb || !currentUser) return;
  const { db, fsMod } = fb;
  await fsMod.updateDoc(fsMod.doc(db, 'profiles', currentUser.uid), { color });
  currentUser.color = color;
  notify();
}

export async function addCoins(amount){
  const fb = await getFirebase();
  if (!fb || !currentUser) return;
  const { db, fsMod } = fb;
  currentUser.coins = (currentUser.coins || 0) + amount;
  await fsMod.updateDoc(fsMod.doc(db, 'profiles', currentUser.uid), { coins: currentUser.coins });
  notify();
}

// result: 'win' | 'loss' | 'draw'. Devuelve las monedas ganadas.
export async function recordMatchResult(result){
  const fb = await getFirebase();
  if (!fb || !currentUser) return 0;
  const { db, fsMod } = fb;
  const field = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws';
  const coinsEarned = result === 'win' ? 50 : result === 'draw' ? 20 : 10;
  currentUser[field] = (currentUser[field] || 0) + 1;
  currentUser.coins = (currentUser.coins || 0) + coinsEarned;
  await fsMod.updateDoc(fsMod.doc(db, 'profiles', currentUser.uid), { [field]: currentUser[field], coins: currentUser.coins });
  notify();
  return coinsEarned;
}
