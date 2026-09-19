// Salas de partido online: cada sala es un documento en Firestore identificado por un
// codigo corto que el anfitrion comparte con su rival por fuera del juego (WhatsApp, de
// palabra, etc.) — se eligio codigo de sala en vez de buscar por nombre o emparejamiento
// con desconocidos. Ver firestore.rules para quien puede crear/unirse/escribir cada sala.
import { getFirebase } from './firebase-init.js';
import { getCurrentUser } from './auth.js';

const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin O/0/I/1: se confunden al escribirlos
function randomRoomCode(len){
  let code = '';
  for (let i=0;i<len;i++) code += ROOM_CODE_CHARS[Math.floor(Math.random()*ROOM_CODE_CHARS.length)];
  return code;
}

// Crea una sala nueva y la deja "esperando rival". Devuelve el codigo, o null si Firebase
// no esta disponible o no se pudo (reintenta un par de veces por si el codigo ya existia).
export async function createRoom(){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user) return null;
  const { db, fsMod } = fb;
  for (let attempt=0; attempt<5; attempt++){
    const code = randomRoomCode(5);
    const ref = fsMod.doc(db, 'onlineRooms', code);
    const snap = await fsMod.getDoc(ref);
    if (snap.exists()) continue;
    try {
      await fsMod.setDoc(ref, {
        code, hostUid: user.uid, hostName: user.username || 'Jugador',
        hostColor: user.color || '#2f6fe0', hostKit: user.kit || 'solid',
        guestUid: null, guestName: null, guestColor: null, guestKit: null,
        status: 'waiting', seq: 0, snapshot: null,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      return code;
    } catch(e){ return null; }
  }
  return null;
}

// Se une a una sala existente como invitado. { ok:true, room } o { ok:false, error }.
export async function joinRoom(codeRaw){
  const fb = await getFirebase();
  const user = getCurrentUser();
  const code = String(codeRaw||'').toUpperCase().trim();
  if (!fb || !user) return { ok:false, error:'no-auth' };
  if (!code) return { ok:false, error:'empty' };
  const { db, fsMod } = fb;
  const ref = fsMod.doc(db, 'onlineRooms', code);
  const snap = await fsMod.getDoc(ref);
  if (!snap.exists()) return { ok:false, error:'not-found' };
  const room = snap.data();
  if (room.hostUid === user.uid) return { ok:false, error:'self' };
  if (room.guestUid && room.guestUid !== user.uid) return { ok:false, error:'full' };
  if (!room.guestUid){
    try {
      await fsMod.updateDoc(ref, {
        guestUid: user.uid, guestName: user.username || 'Jugador',
        guestColor: user.color || '#e0432f', guestKit: user.kit || 'solid',
        status: 'active', updatedAt: Date.now(),
      });
    } catch(e){ return { ok:false, error:'denied' }; }
  }
  return { ok:true, code };
}

// Escucha los cambios de una sala en vivo (conexion del rival, cada turno jugado).
// cb(null) si la sala se borro (el anfitrion se fue). Devuelve una funcion para dejar de escuchar.
export function watchRoom(code, cb){
  let stopped = false;
  let unsub = () => {};
  getFirebase().then(fb => {
    if (!fb || stopped) return;
    const { db, fsMod } = fb;
    unsub = fsMod.onSnapshot(fsMod.doc(db, 'onlineRooms', code), (snap) => {
      cb(snap.exists() ? snap.data() : null);
    }, () => cb(null));
  });
  return () => { stopped = true; unsub(); };
}

// Guarda el estado del partido en la sala (llamado por quien acaba de jugar su turno).
export async function publishRoomState(code, seq, snapshot){
  const fb = await getFirebase();
  if (!fb) return;
  const { db, fsMod } = fb;
  try {
    await fsMod.updateDoc(fsMod.doc(db, 'onlineRooms', code), { seq, snapshot, updatedAt: Date.now() });
  } catch(e){ /* conexion o permisos: el jugador vera que no avanzo y puede reintentar */ }
}

// Guarda la mitad de cada jugador (sus 2 poderes + su formacion + su zona fantasma) antes
// de que arranque el partido: cada quien arma la suya en su propio celular, sin que el
// rival la vea hasta que las dos mitades esten listas (ver beginOnlineMatchFromSetups en game.js).
export async function publishSetup(code, role, setup){
  const fb = await getFirebase();
  if (!fb) return;
  const { db, fsMod } = fb;
  const field = role === 'host' ? 'hostSetup' : 'guestSetup';
  try {
    await fsMod.updateDoc(fsMod.doc(db, 'onlineRooms', code), { [field]: setup, updatedAt: Date.now() });
  } catch(e){ /* conexion o permisos: el jugador vera que sigue esperando y puede reintentar */ }
}

// El anfitrion cierra la sala (se borra), o el invitado se retira (libera su lugar).
export async function leaveRoom(code){
  const fb = await getFirebase();
  const user = getCurrentUser();
  if (!fb || !user || !code) return;
  const { db, fsMod } = fb;
  const ref = fsMod.doc(db, 'onlineRooms', code);
  const snap = await fsMod.getDoc(ref).catch(()=>null);
  if (!snap || !snap.exists()) return;
  const room = snap.data();
  try {
    if (room.hostUid === user.uid) await fsMod.deleteDoc(ref);
    else if (room.guestUid === user.uid){
      await fsMod.updateDoc(ref, { guestUid:null, guestName:null, guestColor:null, guestKit:null, status:'waiting', updatedAt: Date.now() });
    }
  } catch(e){ /* si no se pudo, la sala queda como estaba */ }
}
