import { getFirebase, isFirebaseConfigured } from './firebase-init.js';

let currentUser = null; // { uid, username, coins, wins, losses, draws }
let status = 'loading'; // 'loading' | 'ready' | 'failed' | 'unconfigured'
let lastError = '';
const listeners = [];

export function onAuthChange(cb){
  listeners.push(cb);
  if (status !== 'loading') cb(currentUser);
}
function notify(){ listeners.forEach(cb => cb(currentUser)); }

export function getCurrentUser(){ return currentUser; }
export function getAuthStatus(){ return { status, error: lastError }; }

// Arranca sesion anonima (sin email ni contraseña) y crea el perfil la primera vez.
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
    if (!user){
      try { await authMod.signInAnonymously(auth); }
      catch (err){
        console.warn('FULBITO: no se pudo iniciar sesion anonima', err);
        status = 'failed';
        lastError = 'No se pudo iniciar sesion. ¿Activaste "Anonymous" en Firebase Authentication?';
        notify();
      }
      return; // onAuthStateChanged se vuelve a disparar solo cuando el login termine
    }
    try {
      const ref = fsMod.doc(db, 'profiles', user.uid);
      let snap = await fsMod.getDoc(ref);
      if (!snap.exists()){
        await fsMod.setDoc(ref, { username: '', coins: 50, wins: 0, losses: 0, draws: 0, color: '#2f6fe0', createdAt: Date.now() });
        snap = await fsMod.getDoc(ref);
      }
      currentUser = { uid: user.uid, ...snap.data() };
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
