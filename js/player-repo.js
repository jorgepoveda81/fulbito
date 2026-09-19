// Acceso a datos: jugadores propios y equipo guardado (coleccion 'players' y 'teams' en Firestore).
import { getFirebase } from './firebase-init.js';
import { getCurrentUser } from './auth.js';
import { STARTER_ROSTER } from './store-data.js';

export async function listOwnedPlayers(){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user) return [];
  const { db, fsMod } = fb;
  const q = fsMod.query(fsMod.collection(db, 'players'), fsMod.where('ownerId', '==', user.uid));
  const snap = await fsMod.getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addOwnedPlayer(player){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user) return null;
  const { db, fsMod } = fb;
  const ref = await fsMod.addDoc(fsMod.collection(db, 'players'), {
    ownerId: user.uid,
    name: player.name,
    type: player.type,
    role: player.role,
    skills: player.skills,
    source: player.source,
    templateId: player.templateId || null,
    acquiredAt: Date.now(),
  });
  return ref.id;
}

// Da el equipo inicial gratis la primera vez que alguien entra (cuenta sin jugadores todavia).
export async function grantStarterRosterIfEmpty(){
  const owned = await listOwnedPlayers();
  if (owned.length > 0) return owned;
  for (const p of STARTER_ROSTER){
    await addOwnedPlayer({ name: p.name, type: p.type, role: p.role, skills: p.skills, source: 'starter', templateId: p.id });
  }
  return listOwnedPlayers();
}

export async function getTeam(){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user) return null;
  const { db, fsMod } = fb;
  const snap = await fsMod.getDoc(fsMod.doc(db, 'teams', user.uid));
  return snap.exists() ? snap.data() : null;
}

// roster: { keeper, def1, def2, mid1, mid2, fwd, captain } -> id de players
export async function saveTeam(roster){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user) return;
  const { db, fsMod } = fb;
  await fsMod.setDoc(fsMod.doc(db, 'teams', user.uid), { roster, updatedAt: Date.now() });
}

// Busqueda de solo lectura por nombre de cuenta (no inicia sesion como esa persona).
// Se usa para el "Jugador 2" del modo 2 jugadores: usar su equipo/color guardados sin
// tener que iniciar sesion en su cuenta desde este mismo celular.
export async function lookupPublicAccount(username){
  const fb = await getFirebase();
  const query = String(username||'').trim();
  if (!fb || !query) return null;
  const { db, fsMod } = fb;
  const q = fsMod.query(fsMod.collection(db, 'profiles'), fsMod.where('username', '==', query));
  const snap = await fsMod.getDocs(q);
  if (snap.empty) return null;
  const uid = snap.docs[0].id;
  const profile = snap.docs[0].data();

  const teamSnap = await fsMod.getDoc(fsMod.doc(db, 'teams', uid));
  if (!teamSnap.exists()) return { username: profile.username, color: profile.color||null, kit: profile.kit||null, roster: null };

  const order = ['keeper','def1','def2','mid1','mid2','fwd','captain'];
  const roster = teamSnap.data().roster || {};
  const playerDocs = await Promise.all(order.map(key => roster[key]
    ? fsMod.getDoc(fsMod.doc(db, 'players', roster[key])).catch(()=>null)
    : null));
  const rosterOverride = playerDocs.map(d => d && d.exists() ? { skills: d.data().skills, name: d.data().name } : null);
  return {
    username: profile.username,
    color: profile.color || null,
    kit: profile.kit || null,
    roster: rosterOverride.every(Boolean) ? rosterOverride : null,
  };
}

// stats: [{ ownedId, goals, shots, saves }] — estadisticas de la partida que se acaba de jugar,
// se suman (no se reemplazan) al historial de cada jugador de la coleccion.
export async function addCareerStats(stats){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user || !stats || !stats.length) return;
  const { db, fsMod } = fb;
  await Promise.all(stats.map(s => fsMod.updateDoc(fsMod.doc(db, 'players', s.ownedId), {
    careerMatches: fsMod.increment(1),
    careerGoals: fsMod.increment(s.goals||0),
    careerShots: fsMod.increment(s.shots||0),
    careerSaves: fsMod.increment(s.saves||0),
  }).catch(()=>{}))); // si el jugador se borro de la coleccion mientras tanto, no rompe nada
}
