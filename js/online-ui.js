// Pantalla de conexion del modo online: crear o unirse a una sala por codigo, y esperar
// a que el rival se conecte. Una vez conectados, game.js toma el control (cada quien
// elige sus poderes y arma su formacion en su propio celular — ver startOnlineSetup
// en js/game.js). Este modulo solo habla con Firestore a traves de online-repo.js.
import { createRoom, joinRoom, watchRoom, leaveRoom } from './online-repo.js';

const overlay = document.getElementById('onlineOverlay');
const introEl = document.getElementById('onlineIntro');
const choiceGrid = document.getElementById('onlineChoiceGrid');
const createBtn = document.getElementById('onlineCreateBtn');
const joinBtn = document.getElementById('onlineJoinBtn');
const joinForm = document.getElementById('onlineJoinForm');
const codeInput = document.getElementById('onlineCodeInput');
const statusEl = document.getElementById('onlineStatus');
const actionBtn = document.getElementById('onlineActionBtn');
const cancelBtn = document.getElementById('onlineCancelBtn');

let currentCode = null;
let unwatch = null;

function stopWatching(){ if (unwatch){ unwatch(); unwatch = null; } }

function resetOverlay(){
  choiceGrid.classList.remove('hidden');
  joinForm.classList.add('hidden');
  actionBtn.classList.add('hidden');
  statusEl.textContent = '';
  codeInput.value = '';
  introEl.textContent = 'Crea una sala y comparte el codigo con tu rival, o entra con el codigo que te paso.';
}

export function openOnlineOverlay(){
  stopWatching();
  currentCode = null;
  resetOverlay();
  overlay.classList.remove('hidden');
}
function closeOnlineOverlay(){
  overlay.classList.add('hidden');
}

createBtn.onclick = async () => {
  choiceGrid.classList.add('hidden');
  statusEl.textContent = 'Creando la sala...';
  const code = await createRoom();
  if (!code){
    statusEl.textContent = 'No se pudo crear la sala. Revisa tu conexion e intenta de nuevo.';
    choiceGrid.classList.remove('hidden');
    return;
  }
  currentCode = code;
  introEl.innerHTML = `Comparte este codigo con tu rival:<br><b style="font-size:24px;letter-spacing:5px;color:var(--gold);">${code}</b>`;
  statusEl.textContent = 'Esperando a que tu rival se una...';
  let started = false;
  unwatch = watchRoom(code, (room) => {
    if (!room || started || !room.guestUid) return;
    started = true;
    statusEl.textContent = `${room.guestName || 'Tu rival'} se conecto. Arrancando...`;
    stopWatching();
    closeOnlineOverlay();
    window.FulbitoGame.startOnlineSetup(room, true);
  });
};

joinBtn.onclick = () => {
  choiceGrid.classList.add('hidden');
  joinForm.classList.remove('hidden');
  actionBtn.classList.remove('hidden');
  actionBtn.textContent = 'Unirme';
  codeInput.focus();
};

actionBtn.onclick = async () => {
  const code = codeInput.value.trim().toUpperCase();
  if (!code){ statusEl.textContent = 'Escribe el codigo de la sala.'; return; }
  actionBtn.disabled = true;
  statusEl.textContent = 'Conectando...';
  const res = await joinRoom(code);
  actionBtn.disabled = false;
  if (!res.ok){
    statusEl.textContent = res.error === 'not-found' ? 'No existe una sala con ese codigo.'
      : res.error === 'full' ? 'Esa sala ya tiene dos jugadores.'
      : res.error === 'self' ? 'Esa es tu propia sala — pidele el codigo a tu rival.'
      : 'No se pudo conectar. Revisa el codigo e intenta de nuevo.';
    return;
  }
  currentCode = code;
  joinForm.classList.add('hidden');
  actionBtn.classList.add('hidden');
  statusEl.textContent = 'Conectado. Arrancando...';
  let started = false;
  unwatch = watchRoom(code, (room) => {
    if (!room || started) return;
    started = true;
    stopWatching();
    closeOnlineOverlay();
    window.FulbitoGame.startOnlineSetup(room, false);
  });
};

cancelBtn.onclick = async () => {
  stopWatching();
  if (currentCode) await leaveRoom(currentCode);
  closeOnlineOverlay();
};

export function initOnlineUi(){ /* los botones ya quedan cableados al importar este modulo */ }
