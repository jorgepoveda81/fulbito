(function(){
"use strict";

/* ============================================================================
   FULBITO — Prototipo v2 (mobile)
   Implementa las reglas de FULBITO_Reglas_Version_1_0_Para_Desarrollo:
   secciones 1 a 12: cancha, auras, capitan, habilidades, VAR de posesion,
   defensa/intercepcion, arquero, zona fantasma, penales y los 10 poderes.
   Los valores marcados como "POR DEFINIR" en el documento quedan como
   parametros configurables en la pantalla de pruebas (abajo del juego).
   ============================================================================ */

const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ---------- Ajustes configurables (pantalla de pruebas, prioridad 7) ----------
const settings = {
  auraRadius: 55,
  friction: 0.985,
  maxSpeed: 720,
  turnSeconds: 20,
  matchSeconds: 180,
  chargeMs: 1100,
  varThreshold: 0.12,   // seccion 7: "diferencia muy pequena" como % del radio del aura
  gkSkillTotal: 7,      // seccion 2 POR DEFINIR: suma de habilidades del arquero
  debugGhost: false,
};

const els = {
  aura: document.getElementById('set_aura'), outAura: document.getElementById('out_aura'),
  friction: document.getElementById('set_friction'), outFriction: document.getElementById('out_friction'),
  speed: document.getElementById('set_speed'), outSpeed: document.getElementById('out_speed'),
  turn: document.getElementById('set_turn'), outTurn: document.getElementById('out_turn'),
  match: document.getElementById('set_match'), outMatch: document.getElementById('out_match'),
  varT: document.getElementById('set_var'), outVar: document.getElementById('out_var'),
  gkTotal: document.getElementById('set_gktotal'), outGkTotal: document.getElementById('out_gktotal'),
  debugGhost: document.getElementById('set_debugghost'),
};
els.aura.oninput = e => { settings.auraRadius = +e.target.value; els.outAura.textContent = e.target.value; };
els.friction.oninput = e => { settings.friction = (+e.target.value)/1000; els.outFriction.textContent = e.target.value; };
els.speed.oninput = e => { settings.maxSpeed = +e.target.value; els.outSpeed.textContent = e.target.value; };
els.turn.oninput = e => { settings.turnSeconds = +e.target.value; els.outTurn.textContent = e.target.value; };
els.match.oninput = e => { settings.matchSeconds = +e.target.value; els.outMatch.textContent = e.target.value; };
els.varT.oninput = e => { settings.varThreshold = (+e.target.value)/100; els.outVar.textContent = e.target.value; };
els.gkTotal.oninput = e => { settings.gkSkillTotal = +e.target.value; els.outGkTotal.textContent = e.target.value; resetPlayers(); };
els.debugGhost.onchange = e => { settings.debugGhost = e.target.checked; };
document.getElementById('btnReset').onclick = () => beginPowerSelection();

// ---------- Constantes de cancha ----------
const GOAL_TOP = H/2 - 60, GOAL_BOTTOM = H/2 + 60;
const PLAYER_R = 15, CAPTAIN_R = 17, BALL_R = 8;
const STOP_EPS = 6; // velocidad minima antes de considerar el balon detenido

// ============================================================================
// SECCION 3 — Habilidades
// Jugador de campo / capitan: Fuerza, Pase, Precision, Tiro, Defensa (suman 11)
// Arquero: Altura, Velocidad, Volada, Salto (suma configurable, recomendado 7)
// ============================================================================
const FIELD_SKILL_PRESETS = {
  def:     { fuerza:3, pase:2, precision:2, tiro:1, defensa:3 },
  mid:     { fuerza:2, pase:3, precision:3, tiro:1, defensa:2 },
  fwd:     { fuerza:2, pase:1, precision:3, tiro:4, defensa:1 },
  captain: { fuerza:3, pase:2, precision:3, tiro:2, defensa:1 },
};
function gkSkills(total){
  // reparte la suma configurable manteniendo la proporcion 2:2:2:1 del documento
  const ratios = [2,2,2,1];
  const base = ratios.map(r => Math.round(r/7*total));
  const diff = total - base.reduce((a,b)=>a+b,0);
  base[2] += diff; // ajusta "volada" si el redondeo no cierra exacto
  return { altura:base[0], velocidad:base[1], volada:base[2], salto:base[3] };
}

function mkPlayer(team, role, x, y, isCaptain, isKeeper){
  return {
    team, role, x, y, homeX:x, homeY:y, isCaptain:!!isCaptain, isKeeper:!!isKeeper,
    r: isCaptain ? CAPTAIN_R : PLAYER_R,
    skills: isKeeper ? gkSkills(settings.gkSkillTotal) : { ...FIELD_SKILL_PRESETS[isCaptain ? 'captain' : role] },
  };
}

let players = [];
function resetPlayers(){
  players = [
    mkPlayer('A','keeper', 30,260, false, true),
    mkPlayer('A','def',   140,150),
    mkPlayer('A','def',   140,370),
    mkPlayer('A','mid',   280,110),
    mkPlayer('A','mid',   280,410),
    mkPlayer('A','fwd',   400,260),
    mkPlayer('A','fwd',   430,260, true),

    mkPlayer('B','keeper', 870,260, false, true),
    mkPlayer('B','def',   760,150),
    mkPlayer('B','def',   760,370),
    mkPlayer('B','mid',   620,110),
    mkPlayer('B','mid',   620,410),
    mkPlayer('B','fwd',   500,260),
    mkPlayer('B','fwd',   470,260, true),
  ];
  applyFormation('A');
  applyFormation('B');
  applyRosterOverride();
}

// ============================================================================
// Puente con la app externa (cuentas/tienda/equipo, ver js/app.js).
// El equipo del usuario logueado reemplaza los presets fijos del Equipo A.
// ============================================================================
let rosterOverrideA = null; // arreglo de 7 {skills, name} en el mismo orden que resetPlayers() crea al Equipo A
function applyRosterOverride(){
  if (!rosterOverrideA) return;
  players.filter(p=>p.team==='A').forEach((p,i)=>{
    const ov = rosterOverrideA[i];
    if (!ov) return;
    if (ov.skills) p.skills = { ...ov.skills };
    if (ov.name) p.displayName = ov.name;
  });
}
function captainOf(team){ return players.find(p=>p.team===team && p.isCaptain); }
function keeperOf(team){ return players.find(p=>p.team===team && p.isKeeper); }
function otherTeam(team){ return team==='A' ? 'B' : 'A'; }

// ============================================================================
// SECCION 2 — Formacion previa al partido
// Los 5 jugadores fijos de campo (sin contar arquero ni capitan) se ubican a
// mano antes de cada partido, respetando los limites de zona del documento:
// baja max 3, media max 2, alta max 2. El arquero y el capitan tienen su
// posicion de inicio fija segun las reglas (seccion 2 y 6) y no se arrastran.
// ============================================================================
const ZONE_CAPS = { baja:3, media:2, alta:2 };
function draggablePlayers(team){
  return players.filter(p => p.team===team && !p.isCaptain && !p.isKeeper);
}
function bandOf(team, x){
  if (team === 'A'){
    if (x < 190) return 'baja';
    if (x < 330) return 'media';
    return 'alta';
  }
  if (x > 710) return 'baja';
  if (x > 570) return 'media';
  return 'alta';
}
function clampFormationX(team, x){
  return team==='A' ? clamp(x, 55, 430) : clamp(x, 470, 845);
}
function applyFormation(team){
  const saved = state.formation[team];
  if (!saved) return;
  draggablePlayers(team).forEach((p,i)=>{
    if (saved[i]){ p.x=saved[i].x; p.y=saved[i].y; p.homeX=saved[i].x; p.homeY=saved[i].y; }
  });
}
function saveFormation(team){
  state.formation[team] = draggablePlayers(team).map(p=>({x:p.x,y:p.y}));
}
function jitterAutoFormation(team){
  draggablePlayers(team).forEach(p=>{
    p.x = clampFormationX(team, p.x + (Math.random()*50-25));
    p.y = clamp(p.y + (Math.random()*90-45), 34, H-34);
  });
}

// ---------- Balon ----------
const ball = { x:450, y:260, vx:0, vy:0, flying:false };
let ballAuraTime = new Map(); // acumula ms que el balon paso dentro del aura de cada jugador (seccion 7)

// ============================================================================
// SECCION 11 — Los 10 poderes
// ============================================================================
const POWERS = [
  { id:'tiempo',        name:'Tiempo extra',        desc:'+5s a este turno', scope:'own' },
  { id:'impulso',       name:'Impulso',              desc:'+20% de fuerza al proximo disparo', scope:'own' },
  { id:'farmear',       name:'Farmear aura',         desc:'Tras 2 pases seguidos, agranda tu aura 25%', scope:'own' },
  { id:'planb',         name:'Plan B',                desc:'Cancela tu puntaria y volve a apuntar', scope:'own' },
  { id:'segundobloqueo',name:'Segundo bloqueo',      desc:'Intento extra de intercepcion en el turno rival', scope:'rival' },
  { id:'silencio',      name:'Silencio',              desc:'El rival no usa poderes en su proximo turno', scope:'own' },
  { id:'escudo',        name:'Escudo de aura',       desc:'Te salva de un Silencio rival', scope:'both' },
  { id:'pasocapitan',   name:'Paso del capitan',     desc:'Reposiciona al capitan una vez extra', scope:'own' },
  { id:'revisionvar',   name:'Revision VAR',          desc:'Veras los datos exactos si hay VAR', scope:'both' },
  { id:'recuperacion',  name:'Recuperacion rapida',  desc:'+5s cuando tu capitan recupera en zona vacia', scope:'passive' },
];
function powerById(id){ return POWERS.find(p=>p.id===id); }

// ============================================================================
// Estado general del partido
// ============================================================================
const state = {
  mode:'hotseat', // 'hotseat' | 'vsAI'
  teamNames: { A:'EQUIPO A', B:'EQUIPO B' },
  scoreA:0, scoreB:0,
  matchTimeLeft: settings.matchSeconds,
  phase:'setup', // setup | aiming | flying | goalPause | penaltySetup | ended
  turnTeam:'A',
  holder:null,
  turnTimeLeft: settings.turnSeconds,
  shooterTeam:'A',
  lastActionType:'tiro', // 'tiro' | 'pase' — para comparar contra Defensa
  selectedPowers: { A:[], B:[] },
  usedPowers: { A:{}, B:{} },
  impulsoActive: { A:false, B:false },
  silencedNextTurn: { A:false, B:false },
  shieldActive: { A:false, B:false },
  interceptUsed: { A:false, B:false },
  interceptRolled: new Set(),
  passStreak: { A:0, B:0 },
  auraBoost: null, // { player, factor }
  revisionVarPending: false,
  moveCaptainMode: { A:false, B:false },
  ghostZones: { A:null, B:null },
  formation: { A:null, B:null },
  formingTeam: 'A',
  penalty: null,
  pendingSinglePenalty: null, // {forTeam} — penal por zona fantasma descubierta
};

function hasPower(team, id){ return state.selectedPowers[team].includes(id) && !state.usedPowers[team][id]; }
function markUsed(team, id){ state.usedPowers[team][id] = true; }
function teamName(team){ return state.teamNames[team] || `Equipo ${team}`; }

// ============================================================================
// Sonido (Web Audio, sin archivos) y vibracion en celular
// ============================================================================
const audio = (function(){
  let ctxA = null;
  function ensure(){
    if (!ctxA){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctxA = new AC();
    }
    if (ctxA && ctxA.state==='suspended') ctxA.resume();
    return ctxA;
  }
  function tone(freq, dur, type, gainPeak, delay){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay||0);
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.type = type||'sine'; osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak||0.2, t0+0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  }
  function noiseBurst(dur, gainPeak, delay){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay||0);
    const bufferSize = Math.floor(c.sampleRate*dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    const src = c.createBufferSource(); src.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=1200;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001,t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak||0.25, t0+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start(t0); src.stop(t0+dur);
  }
  return {
    unlock(){ ensure(); },
    kick(){ tone(180,0.12,'triangle',0.22); noiseBurst(0.08,0.15); },
    whistle(){ tone(2200,0.18,'square',0.12); tone(2200,0.18,'square',0.12,0.2); },
    intercept(){ tone(420,0.1,'square',0.15); },
    save(){ tone(140,0.15,'sawtooth',0.2); },
    goal(){
      [0,0.09,0.18].forEach((d,i)=>tone(440+i*220, 0.35, 'sawtooth', 0.18, d));
      noiseBurst(0.9, 0.12, 0.05); // "ola" de gente
    },
  };
})();
function vibrate(pattern){
  if (navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
}

// ============================================================================
// SECCION 10 — Zona fantasma
// 5% del area de la cancha, no sobre la linea del area grande (recomendacion del doc)
// ============================================================================
const GHOST_RADIUS = Math.sqrt(0.05 * (W*H) / Math.PI);
function placeGhostZone(team){
  const marginX = 100, marginY = 70;
  let x, y;
  if (team === 'A'){
    x = marginX + GHOST_RADIUS + Math.random() * (W/2 - marginX - GHOST_RADIUS*2 - 40);
  } else {
    x = W/2 + 40 + Math.random() * (W/2 - marginX - GHOST_RADIUS*2 - 40);
  }
  y = marginY + GHOST_RADIUS + Math.random() * (H - marginY*2 - GHOST_RADIUS*2);
  return { x, y, revealed:false, team };
}

// ============================================================================
// Seleccion de poderes (secreta, hotseat) antes del partido
// ============================================================================
const psOverlay = document.getElementById('powerSelectOverlay');
const psGrid = document.getElementById('psGrid');
const psTitle = document.getElementById('psTitle');
const psConfirm = document.getElementById('psConfirm');
const handoffOverlay = document.getElementById('handoffOverlay');
const handoffText = document.getElementById('handoffText');
const handoffContinue = document.getElementById('handoffContinue');

let pickingTeam = 'A';
let tempPick = [];

function beginPowerSelection(){
  state.selectedPowers = { A:[], B:[] };
  state.formation = { A:null, B:null };
  pickingTeam = 'A';
  tempPick = [];
  openPickerFor('A');
}
function openPickerFor(team){
  pickingTeam = team;
  tempPick = [];
  psTitle.textContent = `${teamName(team)}: elegi 2 poderes`;
  psGrid.innerHTML = '';
  POWERS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'ps-card';
    card.innerHTML = `<b>${p.name}</b><span>${p.desc}</span>`;
    card.onclick = () => {
      const idx = tempPick.indexOf(p.id);
      if (idx >= 0){ tempPick.splice(idx,1); card.classList.remove('selected'); }
      else if (tempPick.length < 2){ tempPick.push(p.id); card.classList.add('selected'); }
      psConfirm.textContent = `Confirmar (${tempPick.length}/2)`;
      psConfirm.disabled = tempPick.length !== 2;
    };
    psGrid.appendChild(card);
  });
  psConfirm.textContent = 'Confirmar (0/2)';
  psConfirm.disabled = true;
  handoffOverlay.classList.add('hidden');
  psOverlay.classList.remove('hidden');
}
psConfirm.onclick = () => {
  state.selectedPowers[pickingTeam] = tempPick.slice();
  psOverlay.classList.add('hidden');
  if (pickingTeam === 'A'){
    if (state.mode === 'vsAI'){
      // la PC elige sus 2 poderes sola, sin pantalla de espera
      const shuffled = POWERS.map(p=>p.id).sort(()=>Math.random()-0.5);
      state.selectedPowers.B = shuffled.slice(0,2);
      beginFormation();
      return;
    }
    handoffText.textContent = `${teamName('A')} ya eligio sus poderes. Pasa el celular a ${teamName('B')}.`;
    handoffOverlay.classList.remove('hidden');
    handoffContinue.onclick = () => openPickerFor('B');
  } else {
    handoffOverlay.classList.add('hidden');
    beginFormation();
  }
};

// ============================================================================
// Fase de formacion (hotseat, secreta como los poderes)
// ============================================================================
const formationBar = document.getElementById('formationBar');
const fbTitle = document.getElementById('fbTitle');
const fbZones = document.getElementById('fbZones');
const fbReady = document.getElementById('fbReady');

function beginFormation(){
  resetPlayers();
  state.phase = 'formation';
  state.formingTeam = 'A';
  ball.x = W/2; ball.y = H/2;
  formationBar.classList.remove('hidden');
  renderFormationBar();
}
function renderFormationBar(){
  fbTitle.textContent = `${teamName(state.formingTeam)}: arrastra tus jugadores a su lugar`;
  updateFormationZoneCounts();
}
function updateFormationZoneCounts(){
  const team = state.formingTeam;
  const counts = { baja:0, media:0, alta:0 };
  draggablePlayers(team).forEach(p => counts[bandOf(team,p.x)]++);
  fbZones.innerHTML =
    `<span>Zona baja ${counts.baja}/${ZONE_CAPS.baja}</span>`+
    `<span>Zona media ${counts.media}/${ZONE_CAPS.media}</span>`+
    `<span>Zona alta ${counts.alta}/${ZONE_CAPS.alta}</span>`;
}
fbReady.onclick = () => {
  saveFormation(state.formingTeam);
  if (state.formingTeam === 'A'){
    if (state.mode === 'vsAI'){
      resetPlayers();
      jitterAutoFormation('B');
      saveFormation('B');
      formationBar.classList.add('hidden');
      startMatch();
      return;
    }
    state.formingTeam = 'B';
    resetPlayers(); // reaplica lo de A (guardado) y deja a B con la formacion por defecto para editar
    renderFormationBar();
  } else {
    formationBar.classList.add('hidden');
    startMatch();
  }
};

// ============================================================================
// Entrada (mouse / touch)
// ============================================================================
const aim = { active:false, charging:false, startTime:0, x:0, y:0 };

function canvasPoint(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width/rect.width, sy = canvas.height/rect.height;
  return { x:(clientX-rect.left)*sx, y:(clientY-rect.top)*sy };
}
let formationDrag = null; // { player, startX, startY }
function formationPointerDown(clientX, clientY){
  const p = canvasPoint(clientX,clientY);
  const team = state.formingTeam;
  let target=null, bestDist=30;
  for (const pl of draggablePlayers(team)){
    const d = Math.hypot(p.x-pl.x, p.y-pl.y);
    if (d < bestDist){ bestDist = d; target = pl; }
  }
  if (target) formationDrag = { player:target, startX:target.x, startY:target.y };
}
function formationPointerMove(clientX, clientY){
  if (!formationDrag) return;
  const p = canvasPoint(clientX,clientY);
  formationDrag.player.x = clampFormationX(state.formingTeam, p.x);
  formationDrag.player.y = clamp(p.y, 34, H-34);
  updateFormationZoneCounts();
}
function formationPointerUp(){
  if (!formationDrag) return;
  const team = state.formingTeam;
  const player = formationDrag.player;
  const band = bandOf(team, player.x);
  const countInBand = draggablePlayers(team).filter(pl => pl!==player && bandOf(team,pl.x)===band).length;
  if (countInBand >= ZONE_CAPS[band]){
    player.x = formationDrag.startX; player.y = formationDrag.startY;
    flashMessage(`Zona ${band} llena`, `Maximo ${ZONE_CAPS[band]} jugadores ahi`, 900);
  }
  formationDrag = null;
  updateFormationZoneCounts();
}

function pointerDown(clientX, clientY){
  if (state.phase==='formation'){ formationPointerDown(clientX,clientY); return; }
  if (state.phase!=='aiming' || !state.holder) return;
  const p = canvasPoint(clientX,clientY);

  // Poder "Paso del capitan": el siguiente toque reposiciona al capitan en vez de apuntar
  const team = state.holder.team;
  if (state.moveCaptainMode[team] && state.holder.isCaptain){
    state.holder.x = Math.max(state.holder.r+8, Math.min(W-state.holder.r-8, p.x));
    state.holder.y = Math.max(state.holder.r+8, Math.min(H-state.holder.r-8, p.y));
    state.moveCaptainMode[team] = false;
    flashMessage('Capitan reposicionado', '', 700);
    return;
  }

  aim.active = true; aim.charging = true; aim.startTime = performance.now();
  aim.x = p.x; aim.y = p.y;
}
function pointerMove(clientX, clientY){
  if (state.phase==='formation'){ formationPointerMove(clientX,clientY); return; }
  if (!aim.active) return;
  const p = canvasPoint(clientX,clientY);
  aim.x = p.x; aim.y = p.y;
}
function pointerUp(){
  if (state.phase==='formation'){ formationPointerUp(); return; }
  if (!aim.active || !state.holder){ aim.active=false; aim.charging=false; return; }
  const holder = state.holder;
  const dx = aim.x - holder.x, dy = aim.y - holder.y;
  const dist = Math.hypot(dx,dy) || 1;
  let power = Math.min(1, (performance.now()-aim.startTime)/settings.chargeMs);
  power = Math.max(power, 0.12); // siempre hay un minimo de impulso
  aim.active=false; aim.charging=false;
  // Se considera "tiro" si apunta hacia el arco rival, "pase" en otro caso (seccion 8)
  const towardRivalGoal = holder.team === 'A' ? dx > 0 : dx < 0;
  state.lastActionType = towardRivalGoal ? 'tiro' : 'pase';
  shoot(holder, dx/dist, dy/dist, power);
}
canvas.addEventListener('mousedown', e=>pointerDown(e.clientX,e.clientY));
window.addEventListener('mousemove', e=>pointerMove(e.clientX,e.clientY));
window.addEventListener('mouseup', pointerUp);
canvas.addEventListener('touchstart', e=>{ const t=e.touches[0]; pointerDown(t.clientX,t.clientY); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchmove', e=>{ const t=e.touches[0]; pointerMove(t.clientX,t.clientY); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchend', e=>{ pointerUp(); e.preventDefault(); }, {passive:false});

// ============================================================================
// Poderes — botones e interaccion
// ============================================================================
function renderPowerButtons(){
  ['A','B'].forEach(team => {
    const row = document.getElementById(team==='A' ? 'powerRowA' : 'powerRowB');
    row.innerHTML = '';
    state.selectedPowers[team].forEach(id => {
      const p = powerById(id);
      const btn = document.createElement('button');
      btn.className = 'power-btn';
      btn.dataset.team = team; btn.dataset.power = id;
      btn.innerHTML = `${p.name}<span class="desc">${p.desc}</span>`;
      btn.onclick = () => activatePower(team, id);
      row.appendChild(btn);
    });
  });
  updatePowerButtons();
}
function activatePower(team, id){
  if (state.usedPowers[team][id]) return;
  switch(id){
    case 'tiempo':
      if (state.turnTeam===team && state.phase==='aiming'){
        state.turnTimeLeft += 5; markUsed(team,id);
        flashMessage('+5 segundos', `${teamName(team)} uso Tiempo Extra`, 900);
      }
      break;
    case 'impulso':
      state.impulsoActive[team] = true; markUsed(team,id);
      flashMessage('Impulso activado', `El proximo disparo de ${teamName(team)} tendra +20% de fuerza`, 1100);
      break;
    case 'farmear':
      if (state.passStreak[team] >= 2 && state.holder && state.holder.team===team){
        state.auraBoost = { player: state.holder, factor:1.25 };
        markUsed(team,id);
        flashMessage('Aura agrandada 25%', '', 900);
      }
      break;
    case 'planb':
      if (aim.active && state.holder && state.holder.team===team){
        aim.active=false; aim.charging=false; markUsed(team,id);
        flashMessage('Plan B', 'Volve a apuntar', 700);
      }
      break;
    case 'segundobloqueo':
      if (state.turnTeam !== team){
        state.interceptUsed[team] = false; markUsed(team,id);
        flashMessage('Segundo bloqueo listo', '', 800);
      }
      break;
    case 'silencio':
      state.silencedNextTurn[otherTeam(team)] = true; markUsed(team,id);
      flashMessage('Silencio', `${teamName(otherTeam(team))} no puede usar poderes en su proximo turno`, 1100);
      break;
    case 'escudo':
      state.shieldActive[team] = true; markUsed(team,id);
      flashMessage('Escudo de aura activo', '', 800);
      break;
    case 'pasocapitan':
      if (state.turnTeam===team && state.holder && state.holder.isCaptain){
        state.moveCaptainMode[team] = true; markUsed(team,id);
        flashMessage('Paso del capitan', 'Toca donde queres moverlo', 1000);
      }
      break;
    case 'revisionvar':
      state.revisionVarPending = true; markUsed(team,id);
      flashMessage('Revision VAR lista', '', 800);
      break;
    default: break;
  }
  updatePowerButtons();
}
function updatePowerButtons(){
  document.querySelectorAll('.power-btn').forEach(btn=>{
    const team = btn.dataset.team, id = btn.dataset.power;
    const isSilenced = state.silencedNextTurn[team] && state.turnTeam===team;
    let enabled = !state.usedPowers[team][id] && !isSilenced;
    // reglas de "cuando se puede usar" por poder
    if (id==='tiempo') enabled = enabled && state.turnTeam===team && state.phase==='aiming';
    if (id==='farmear') enabled = enabled && state.passStreak[team]>=2 && !!state.holder && state.holder.team===team;
    if (id==='planb') enabled = enabled && aim.active && !!state.holder && state.holder.team===team;
    if (id==='segundobloqueo') enabled = enabled && state.turnTeam!==team;
    if (id==='pasocapitan') enabled = enabled && state.turnTeam===team && !!state.holder && state.holder.isCaptain;
    btn.disabled = !enabled;
  });
}

// ============================================================================
// Disparo / pase (secciones 3, 8 y 9)
// ============================================================================
function speedMultiplierFromFuerza(fuerza){
  return 0.55 + (fuerza/11) * 0.9; // 0 -> 0.55x, 11 -> 1.45x
}
function applyPrecisionDeviation(dirx, diry, precision, power){
  const maxDeg = (1 - precision/11) * 18; // baja precision = hasta 18 grados de error
  const deg = maxDeg * (0.4 + 0.6*power) * (Math.random()*2 - 1);
  const rad = deg * Math.PI/180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: dirx*cos - diry*sin, y: dirx*sin + diry*cos };
}
function shoot(holder, dirx, diry, power){
  state.shooterTeam = holder.team;
  state.interceptUsed = { A:false, B:false }; // nuevo intento de intercepcion disponible (seccion 8)
  state.interceptRolled.clear();
  ballAuraTime = new Map();

  let speed = 90 + power * settings.maxSpeed;
  let dir = { x:dirx, y:diry };

  if (!holder.isKeeper){
    speed *= speedMultiplierFromFuerza(holder.skills.fuerza);
    dir = applyPrecisionDeviation(dirx, diry, holder.skills.precision, power);
  } else {
    // [REGLA] "un jugador no puede marcar directamente de arco a arco": el arquero
    // tiene un tope de fuerza mas bajo para que no pueda mandarla de arco a arco.
    speed = Math.min(speed, settings.maxSpeed*0.55);
  }
  if (state.impulsoActive[holder.team]){
    speed *= 1.2;
    state.impulsoActive[holder.team] = false;
  }

  // Farmear aura: si el poseedor actual tenia el boost pendiente y ahora dispara,
  // el aura crecida se mantiene hasta que el balon la toque o termine la accion rival.
  if (state.auraBoost && state.auraBoost.player !== holder){
    state.auraBoost = null;
  }

  ball.vx = dir.x*speed; ball.vy = dir.y*speed;
  ball.flying = true;
  state.phase = 'flying';
  state.holder = null;
  audio.kick();
  vibrate(15);
}

// ============================================================================
// Fisica del balon
// ============================================================================
function auraRadiusFor(p){
  if (state.auraBoost && state.auraBoost.player === p) return settings.auraRadius * state.auraBoost.factor;
  return settings.auraRadius;
}
function updateBall(dt){
  if (!ball.flying) return;
  ball.x += ball.vx*dt; ball.y += ball.vy*dt;
  ball.vx *= Math.pow(settings.friction, dt*60);
  ball.vy *= Math.pow(settings.friction, dt*60);

  if (ball.y - BALL_R < 0){ ball.y = BALL_R; ball.vy *= -1; }
  if (ball.y + BALL_R > H){ ball.y = H-BALL_R; ball.vy *= -1; }

  if (ball.x - BALL_R < 0){
    if (ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM){ scoreGoal('B'); return; }
    ball.x = BALL_R; ball.vx *= -1;
  }
  if (ball.x + BALL_R > W){
    if (ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM){ scoreGoal('A'); return; }
    ball.x = W-BALL_R; ball.vx *= -1;
  }

  // Colision fisica con jugadores (choque/atajada)
  const active = getActivePlayers();
  for (const p of active){
    const dx = ball.x-p.x, dy = ball.y-p.y;
    const dist = Math.hypot(dx,dy);
    const minDist = p.r + BALL_R;
    if (dist < minDist && dist > 0.001){
      const nx = dx/dist, ny = dy/dist;
      ball.x = p.x + nx*minDist; ball.y = p.y + ny*minDist;
      const dot = ball.vx*nx + ball.vy*ny;
      ball.vx -= 2*dot*nx; ball.vy -= 2*dot*ny;
      ball.vx *= 0.82; ball.vy *= 0.82;
      if (p.isKeeper){ flashMessage('&#129508; ¡Atajada!', '', 700); audio.save(); vibrate(30); }
    }
  }

  // SECCION 8 — Defensa e intercepcion: una oportunidad por turno rival
  const shooterTeam = state.shooterTeam;
  const rivalTeam = otherTeam(shooterTeam);
  if (!state.interceptUsed[rivalTeam]){
    for (const p of active){
      if (p.team !== rivalTeam) continue;
      if (state.interceptRolled.has(p)) continue;
      const dist = Math.hypot(ball.x-p.x, ball.y-p.y);
      if (dist <= auraRadiusFor(p)){
        state.interceptRolled.add(p);
        state.interceptUsed[rivalTeam] = true;
        const shooter = players.find(pl => pl.team===shooterTeam) ? getLastShooter() : null;
        const attackSkill = getAttackSkillForIntercept();
        const chance = clamp(p.skills.defensa / (p.skills.defensa + attackSkill), 0.15, 0.85);
        if (Math.random() < chance){
          ball.vx = 0; ball.vy = 0; ball.flying = false;
          ball.x = p.x; ball.y = p.y;
          flashMessage('&#128737; ¡Intercepcion!', `${teamName(rivalTeam)} recupera el balon`, 1100);
          audio.intercept(); vibrate(40);
          startTurn(rivalTeam, p);
          return;
        }
        // si falla, el balon sigue su recorrido sin cambios
      }
    }
  }

  // Acumula tiempo dentro de cada aura para el desempate del VAR (seccion 7)
  for (const p of active){
    const dist = Math.hypot(ball.x-p.x, ball.y-p.y);
    if (dist <= auraRadiusFor(p)){
      ballAuraTime.set(p, (ballAuraTime.get(p)||0) + dt*1000);
    }
  }

  const speed = Math.hypot(ball.vx,ball.vy);
  if (speed < STOP_EPS){
    ball.vx = 0; ball.vy = 0; ball.flying = false;
    resolveEndpoint();
  }
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
let lastShooterRef = null;
function getLastShooter(){ return lastShooterRef; }
function getAttackSkillForIntercept(){
  const shooter = lastShooterRef;
  if (!shooter) return 3;
  return state.lastActionType === 'tiro' ? shooter.skills.tiro : shooter.skills.pase;
}

function getActivePlayers(){
  if (state.penalty) return state.penalty.players;
  return players;
}

// ============================================================================
// SECCION 5 — Donde termina el balon / SECCION 7 — VAR de posesion
// SECCION 10 — Zona fantasma (se revisa antes de resolver la posesion normal)
// ============================================================================
function resolveEndpoint(){
  if (state.penalty){ resolvePenaltyRest(); return; }

  // Zona fantasma: solo se activa si el balon termina con su centro adentro
  const rivalToShooter = otherTeam(state.shooterTeam);
  const zone = state.ghostZones[rivalToShooter];
  if (zone && !zone.revealed){
    const d = Math.hypot(ball.x-zone.x, ball.y-zone.y);
    if (d <= GHOST_RADIUS){
      zone.revealed = true;
      flashMessage('&#128123; ¡Zona fantasma descubierta!', `${teamName(state.shooterTeam)} tiene un penal`, 1600);
      setTimeout(()=>startSinglePenalty(state.shooterTeam), 1600);
      return;
    }
  }

  const active = getActivePlayers();
  const inside = active.filter(p => Math.hypot(ball.x-p.x, ball.y-p.y) <= auraRadiusFor(p));

  if (inside.length === 0){
    // Zona vacia -> el capitan rival interviene y recupera el balon
    const rivalTeam = otherTeam(state.shooterTeam);
    const cap = captainOf(rivalTeam);
    cap.x = ball.x; cap.y = ball.y;
    flashMessage('¡Zona vacia!', `El capitan de ${teamName(rivalTeam)} recupera el balon`, 1200);
    startTurn(rivalTeam, cap);
    if (hasPower(rivalTeam,'recuperacion')){
      state.turnTimeLeft += 5; markUsed(rivalTeam,'recuperacion');
    }
    return;
  }

  let winner;
  if (inside.length === 1){
    winner = inside[0];
  } else {
    // VAR de posesion: gana el aura mas cercana al centro final del balon.
    // Si la diferencia es menor al umbral configurado, desempata por ms dentro del aura.
    const sorted = inside.slice().sort((a,b)=>{
      const da = Math.hypot(ball.x-a.x, ball.y-a.y);
      const db = Math.hypot(ball.x-b.x, ball.y-b.y);
      return da-db;
    });
    const d1 = Math.hypot(ball.x-sorted[0].x, ball.y-sorted[0].y);
    const d2 = sorted[1] ? Math.hypot(ball.x-sorted[1].x, ball.y-sorted[1].y) : Infinity;
    if (Math.abs(d1-d2) <= settings.varThreshold * settings.auraRadius && sorted[1]){
      const t1 = ballAuraTime.get(sorted[0])||0, t2 = ballAuraTime.get(sorted[1])||0;
      if (t1 === t2){
        // empate exacto: el balon rebota al centro y nadie recibe posesion
        ball.x = W/2; ball.y = H/2;
        flashMessage('&#127937; Empate total', 'Nadie recibe la posesion, el balon vuelve al centro', 1300);
        setTimeout(()=>startTurn(state.turnTeam, players.find(p=>p.team===state.turnTeam && p.isKeeper)), 1300);
        return;
      }
      winner = t1 >= t2 ? sorted[0] : sorted[1];
    } else {
      winner = sorted[0];
    }
    let detail = '';
    if (state.revisionVarPending){
      detail = ` (d:${d1.toFixed(0)}px${sorted[1]?`/${d2.toFixed(0)}px`:''})`;
      state.revisionVarPending = false;
    }
    flashMessage('&#128250; VAR de posesion', `Gana ${winner.team==='A'?'Equipo A':'Equipo B'}${detail}`, 1300);
  }
  startTurn(winner.team, winner);
}

// ============================================================================
// Turnos
// ============================================================================
function startTurn(team, holder){
  // Racha de pases (poder "Farmear aura"): sigue si el mismo equipo conserva el balon
  // por una accion clasificada como pase; se corta si cambia de equipo o fue un tiro.
  if (team === state.turnTeam && state.lastActionType === 'pase'){
    state.passStreak[team] = (state.passStreak[team]||0) + 1;
  } else {
    state.passStreak.A = 0; state.passStreak.B = 0;
  }

  state.turnTeam = team;
  state.holder = holder;
  lastShooterRef = holder;
  ball.x = holder.x; ball.y = holder.y; ball.vx=0; ball.vy=0; ball.flying=false;
  state.turnTimeLeft = settings.turnSeconds;
  state.phase = 'aiming';
  updatePowerButtons();
}

function handleTurnTimeout(){
  const rivalTeam = otherTeam(state.turnTeam);
  const gk = keeperOf(rivalTeam);
  flashMessage('&#9203; Tiempo agotado', `El balon pasa a ${teamName(rivalTeam)}`, 1000);
  audio.whistle();
  startTurn(rivalTeam, gk);
}

// ============================================================================
// SECCION 9 — Goles
// ============================================================================
function scoreGoal(team){
  ball.flying=false; ball.vx=0; ball.vy=0;
  state.phase='goalPause';
  if (state.penalty){ registerPenaltyGoal(team); return; }
  if (state.pendingSinglePenalty){ resolveSinglePenaltyGoal(team); return; }
  if (team==='A') state.scoreA++; else state.scoreB++;
  updateScoreboard();
  flashMessage('&#9917; ¡GOOOOL!', `${teamName(team)} marca`, 1700);
  spawnConfetti(team==='A' ? W-40 : 40, H/2);
  spawnConfetti(W/2, H/2);
  triggerShake(9);
  audio.goal();
  vibrate([120,60,120,60,220]);
  const concededTeam = team==='A' ? 'B' : 'A';
  setTimeout(()=>{
    if (state.phase!=='ended') restartAfterGoal(concededTeam);
  }, 1700);
}
function restartAfterGoal(concededTeam){
  const savedZones = state.ghostZones;
  resetPlayers();
  state.ghostZones = savedZones; // las zonas fantasma no se reubican tras un gol
  const gk = keeperOf(concededTeam);
  startTurn(concededTeam, gk);
}

// ============================================================================
// SECCION 10 — Penal por zona fantasma (un solo tiro, no es tanda)
// ============================================================================
function startSinglePenalty(forTeam){
  state.pendingSinglePenalty = { forTeam };
  setupPenaltyKick(forTeam, otherTeam(forTeam), 'single');
}
function resolveSinglePenaltyGoal(team){
  state.pendingSinglePenalty = null;
  if (team === state.penalty.kickingTeam){
    if (team==='A') state.scoreA++; else state.scoreB++;
    updateScoreboard();
    flashMessage('&#9917; ¡GOL de penal!', '', 1500);
  }
  const kicking = state.penalty.kickingTeam;
  state.penalty = null;
  setTimeout(()=>{
    resetPlayers();
    startTurn(otherTeam(kicking), keeperOf(otherTeam(kicking)));
  }, 1500);
}

// ============================================================================
// SECCION 10/12 — Tanda de penales (empate al final de los 3 minutos)
// ============================================================================
function startPenalties(){
  state.phase='penaltySetup';
  state.penalty = { round:1, team:'A', scoreA:0, scoreB:0, kicksLeft:{A:3,B:3}, players:[], mode:'shootout', kickingTeam:'A' };
  flashMessage('&#127877; Tanda de penales', 'Empate al final de los 3 minutos', 1500);
  setTimeout(setupPenaltyKick, 1500);
}
function setupPenaltyKick(forTeamArg, defTeamArg, mode){
  let kicking, defending;
  if (mode === 'single'){
    kicking = forTeamArg; defending = defTeamArg;
    state.penalty = { players:[], mode:'single', kickingTeam:kicking };
  } else {
    const p = state.penalty;
    if (!p) return;
    kicking = p.team; defending = kicking==='A' ? 'B' : 'A';
    p.kickingTeam = kicking;
  }
  const cap = captainOf(kicking);
  const gk = keeperOf(defending);
  cap.x = kicking==='A' ? 620 : 280;
  cap.y = 260;
  gk.x = defending==='A' ? 30 : 870;
  gk.y = 260;
  state.penalty.players = [cap, gk];
  ball.x = cap.x; ball.y = cap.y; ball.vx=0; ball.vy=0; ball.flying=false;
  state.holder = cap; state.turnTeam = kicking; state.shooterTeam = kicking;
  lastShooterRef = cap;
  state.turnTimeLeft = 12;
  state.phase = 'aiming';
  const leftText = state.penalty.mode==='shootout' ? ` &middot; quedan ${state.penalty.kicksLeft[kicking]}` : '';
  flashMessage(`Penal &mdash; ${teamName(kicking)}`, `Patea el capitan${leftText}`, 1200);
}
function registerPenaltyGoal(team){
  const p = state.penalty;
  if (team==='A') p.scoreA++; else p.scoreB++;
  advancePenalty();
}
function resolvePenaltyRest(){
  // el arquero atajo o el tiro se fue afuera del aura del arco: no hay gol
  if (state.penalty.mode === 'single'){ resolveSinglePenaltyGoal(otherTeam(state.penalty.kickingTeam)); return; }
  advancePenalty();
}
function advancePenalty(){
  const p = state.penalty;
  p.kicksLeft[p.team]--;
  const otherT = p.team==='A' ? 'B' : 'A';
  const bothDone = p.kicksLeft.A<=0 && p.kicksLeft.B<=0;
  if (bothDone && p.scoreA !== p.scoreB){ finishPenalties(); return; }
  if (bothDone && p.scoreA === p.scoreB){ p.kicksLeft.A = 1; p.kicksLeft.B = 1; }
  p.team = otherT;
  setTimeout(setupPenaltyKick, 900);
}
function finishPenalties(){
  const p = state.penalty;
  state.phase='ended';
  const winner = p.scoreA>p.scoreB ? 'Equipo A' : 'Equipo B';
  flashMessage('&#127942; Fin de los penales', `¡Gana ${winner}! (${p.scoreA} - ${p.scoreB})`, 500000);
  notifyMatchEnd(p.scoreA>p.scoreB ? 'win' : 'loss'); // en penales no hay empate
}
function notifyMatchEnd(resultForA){
  if (window.FulbitoGame && window.FulbitoGame.onMatchEnd) window.FulbitoGame.onMatchEnd(resultForA);
}

// ============================================================================
// Mensajes en pantalla
// ============================================================================
const msgOverlay = document.getElementById('msgOverlay');
const msgMain = document.getElementById('msgMain');
const msgSub = document.getElementById('msgSub');
let msgTimer=null;
function flashMessage(main, sub, ms){
  msgMain.innerHTML = main; msgSub.innerHTML = sub||'';
  msgOverlay.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(()=>msgOverlay.classList.remove('show'), ms||1000);
}

// ============================================================================
// Marcador / reloj
// ============================================================================
function updateScoreboard(){
  document.getElementById('scoreA').textContent = state.scoreA;
  document.getElementById('scoreB').textContent = state.scoreB;
}
function fmtTime(s){ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }

let matchIntervalId=null;
function startMatchClock(){
  clearInterval(matchIntervalId);
  matchIntervalId = setInterval(()=>{
    if (state.phase==='ended') return;
    state.matchTimeLeft -= 1;
    if (state.matchTimeLeft <= 0){
      state.matchTimeLeft = 0;
      onMatchTimeUp();
    }
    document.getElementById('matchtime').textContent = fmtTime(state.matchTimeLeft);
  }, 1000);
}
function onMatchTimeUp(){
  clearInterval(matchIntervalId);
  if (state.scoreA === state.scoreB) startPenalties();
  else endMatch();
}
function endMatch(){
  state.phase = 'ended';
  const winner = state.scoreA>state.scoreB ? 'Equipo A' : (state.scoreB>state.scoreA ? 'Equipo B' : 'Empate');
  flashMessage('&#127942; Fin del partido', winner==='Empate' ? 'Empate' : `¡Gana ${winner}!`, 500000);
  notifyMatchEnd(state.scoreA>state.scoreB ? 'win' : (state.scoreB>state.scoreA ? 'loss' : 'draw'));
}

// ============================================================================
// Festejo: confeti y sacudida de camara
// ============================================================================
let confetti = [];
let shake = { time:0, mag:0 };
const CONFETTI_COLORS = ['#ffc94d','#2f6fe0','#e0432f','#ffffff','#4ade80'];
function spawnConfetti(x, y){
  for (let i=0;i<46;i++){
    const ang = Math.random()*Math.PI*2;
    const spd = 120 + Math.random()*260;
    confetti.push({
      x, y,
      vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 120,
      life: 1, color: CONFETTI_COLORS[i%CONFETTI_COLORS.length],
      size: 3+Math.random()*3, spin: Math.random()*Math.PI*2, spinV:(Math.random()-0.5)*10,
    });
  }
}
function updateConfetti(dt){
  confetti.forEach(p=>{
    p.vy += 420*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.spin += p.spinV*dt;
    p.life -= dt*0.6;
  });
  confetti = confetti.filter(p=>p.life>0 && p.y < H+40);
}
function drawConfetti(){
  confetti.forEach(p=>{
    ctx.save();
    ctx.globalAlpha = Math.max(0,p.life);
    ctx.translate(p.x,p.y); ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*1.6);
    ctx.restore();
  });
}
function triggerShake(mag){ shake.time = 0.35; shake.mag = mag; }
function updateShake(dt){
  if (shake.time>0){ shake.time = Math.max(0, shake.time-dt); }
}

// ============================================================================
// Dibujo
// ============================================================================
function draw(){
  ctx.save();
  if (shake.time>0){
    const f = shake.time/0.35;
    ctx.translate((Math.random()*2-1)*shake.mag*f, (Math.random()*2-1)*shake.mag*f);
  }
  ctx.clearRect(-20,-20,W+40,H+40);
  drawField();
  if (settings.debugGhost) drawGhostZones();
  drawFormationGuides();
  drawAuras();
  drawPlayers();
  drawAimAndPower();
  if (state.phase!=='formation') drawBall();
  drawConfetti();
  ctx.restore();
}
function drawField(){
  const stripes=10;
  for(let i=0;i<stripes;i++){
    ctx.fillStyle = i%2===0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(i*(W/stripes),0,W/stripes,H);
  }
  ctx.strokeStyle='rgba(238,247,240,0.85)';
  ctx.lineWidth=2.5;
  ctx.strokeRect(6,6,W-12,H-12);
  ctx.beginPath(); ctx.moveTo(W/2,6); ctx.lineTo(W/2,H-6); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2,H/2,55,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.moveTo(6,GOAL_TOP); ctx.lineTo(6,GOAL_BOTTOM); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W-6,GOAL_TOP); ctx.lineTo(W-6,GOAL_BOTTOM); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.fillRect(0,GOAL_TOP,26,GOAL_BOTTOM-GOAL_TOP);
  ctx.fillRect(W-26,GOAL_TOP,26,GOAL_BOTTOM-GOAL_TOP);
  // redes (cuadricula diagonal, solo estetico)
  ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1;
  for(let i=-4;i<=4;i++){
    ctx.beginPath(); ctx.moveTo(0,GOAL_TOP+ i*15 + (GOAL_BOTTOM-GOAL_TOP)/2); ctx.lineTo(26, GOAL_TOP+(GOAL_BOTTOM-GOAL_TOP)/2 + i*15 - 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W,GOAL_TOP+ i*15 + (GOAL_BOTTOM-GOAL_TOP)/2); ctx.lineTo(W-26, GOAL_TOP+(GOAL_BOTTOM-GOAL_TOP)/2 + i*15 - 20); ctx.stroke();
  }
  // arcos de esquina
  ctx.strokeStyle='rgba(238,247,240,0.6)'; ctx.lineWidth=2;
  [[6,6,0,Math.PI/2],[W-6,6,Math.PI/2,Math.PI],[6,H-6,-Math.PI/2,0],[W-6,H-6,Math.PI,Math.PI*1.5]]
    .forEach(([cx,cy,a0,a1])=>{ ctx.beginPath(); ctx.arc(cx,cy,14,a0,a1); ctx.stroke(); });
}
function drawGhostZones(){
  ['A','B'].forEach(team=>{
    const z = state.ghostZones[team];
    if (!z) return;
    ctx.beginPath();
    ctx.setLineDash([6,5]);
    ctx.arc(z.x,z.y,GHOST_RADIUS,0,Math.PI*2);
    ctx.strokeStyle = z.revealed ? 'rgba(255,255,255,0.6)' : (team==='A' ? 'rgba(47,111,224,0.5)' : 'rgba(224,67,47,0.5)');
    ctx.lineWidth=2; ctx.stroke();
    ctx.setLineDash([]);
  });
}
function formationAlphaFor(p){
  if (state.phase!=='formation') return 1;
  return p.team===state.formingTeam ? 1 : 0.16;
}
function drawFormationGuides(){
  if (state.phase!=='formation') return;
  const team = state.formingTeam;
  const edges = team==='A' ? [190,330] : [710,570];
  ctx.save();
  ctx.setLineDash([5,6]);
  ctx.strokeStyle = 'rgba(255,201,77,0.5)'; ctx.lineWidth=1.5;
  edges.forEach(x=>{ ctx.beginPath(); ctx.moveTo(x,10); ctx.lineTo(x,H-10); ctx.stroke(); });
  ctx.restore();
  ctx.fillStyle='rgba(255,201,77,0.75)'; ctx.font='11px Inter'; ctx.textAlign='center';
  const labelX = team==='A' ? [110,260,390] : [790,640,510];
  ['Baja','Media','Alta'].forEach((t,i)=>ctx.fillText(t,labelX[i],26));
}
function drawAuras(){
  const active = getActivePlayers();
  for (const p of active){
    ctx.globalAlpha = formationAlphaFor(p);
    ctx.beginPath();
    ctx.arc(p.x,p.y,auraRadiusFor(p),0,Math.PI*2);
    ctx.fillStyle = p.team==='A' ? 'rgba(47,111,224,0.10)' : 'rgba(224,67,47,0.10)';
    ctx.fill();
    ctx.strokeStyle = p.team==='A' ? 'rgba(47,111,224,0.45)' : 'rgba(224,67,47,0.45)';
    ctx.lineWidth=1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function drawPlayers(){
  const active = getActivePlayers();
  for (const p of active){
    const isHolder = state.holder===p;
    const isDraggable = state.phase==='formation' && p.team===state.formingTeam && !p.isCaptain && !p.isKeeper;
    ctx.globalAlpha = formationAlphaFor(p);
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = p.team==='A' ? '#2f6fe0' : '#e0432f';
    if (p.isCaptain){ ctx.fillStyle = p.team==='A' ? '#4a86ff' : '#ff5c45'; }
    ctx.fill();
    ctx.lineWidth = p.isKeeper ? 3 : 2;
    ctx.strokeStyle = '#0b0e10';
    ctx.stroke();
    if (isHolder){
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r+6,0,Math.PI*2);
      ctx.strokeStyle='#ffc94d'; ctx.lineWidth=3; ctx.stroke();
    }
    if (isDraggable){
      ctx.beginPath();
      ctx.setLineDash([3,4]);
      ctx.arc(p.x,p.y,p.r+5,0,Math.PI*2);
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle='#fff'; ctx.font='10px Inter'; ctx.textAlign='center';
    const label = p.isCaptain ? 'C' : (p.isKeeper ? 'A' : '');
    if (label) ctx.fillText(label,p.x,p.y+3);
    ctx.globalAlpha = 1;
  }
}
function drawAimAndPower(){
  if (!aim.active || !state.holder) return;
  const h = state.holder;
  const dx=aim.x-h.x, dy=aim.y-h.y;
  const dist=Math.hypot(dx,dy)||1;
  const nx=dx/dist, ny=dy/dist;
  const len = Math.min(dist, 140);
  ctx.strokeStyle='#ffc94d'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(h.x+nx*len,h.y+ny*len); ctx.stroke();
  ctx.beginPath();
  const ax=h.x+nx*len, ay=h.y+ny*len;
  ctx.moveTo(ax,ay);
  ctx.lineTo(ax-nx*10-ny*6, ay-ny*10+nx*6);
  ctx.lineTo(ax-nx*10+ny*6, ay-ny*10-nx*6);
  ctx.closePath(); ctx.fillStyle='#ffc94d'; ctx.fill();

  const power = Math.min(1,(performance.now()-aim.startTime)/settings.chargeMs);
  const barW=70, barH=8;
  const bx=h.x-barW/2, by=h.y-h.r-18;
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(bx,by,barW,barH);
  ctx.fillStyle = power>0.75 ? '#ff5c45' : '#ffc94d';
  ctx.fillRect(bx,by,barW*power,barH);
  ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(bx,by,barW,barH);
}
function drawBall(){
  ctx.beginPath();
  ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2);
  ctx.fillStyle='#fff';
  ctx.fill();
  ctx.strokeStyle='#0b0e10'; ctx.lineWidth=1.5; ctx.stroke();
}

// ============================================================================
// Bucle principal
// ============================================================================
let lastT = performance.now();
function loop(now){
  const dt = Math.min(0.033,(now-lastT)/1000);
  lastT = now;

  if (state.phase==='aiming'){
    state.turnTimeLeft -= dt;
    if (state.turnTimeLeft <= 0){
      state.turnTimeLeft = 0;
      if (state.penalty){ /* los penales no pierden turno por tiempo */ }
      else handleTurnTimeout();
    }
    if (state.holder && !aim.active){ ball.x = state.holder.x; ball.y = state.holder.y; }
  } else if (state.phase==='flying'){
    updateBall(dt);
  }

  if (state.mode==='vsAI') updateAI(dt);
  updateConfetti(dt);
  updateShake(dt);
  updateHud();
  draw();
  requestAnimationFrame(loop);
}
function updateHud(){
  const label = document.getElementById('turnLabel');
  const dot = document.getElementById('turnDot');
  const bar = document.getElementById('turnbar');
  const capInfo = document.getElementById('captainInfo');
  if (state.phase==='formation'){
    label.textContent = `Armando la formacion de ${teamName(state.formingTeam)}`;
    updateFormationZoneCounts();
  } else if (state.phase==='ended'){
    label.textContent='Partido terminado';
  } else if (state.penalty){
    label.textContent = state.penalty.mode==='shootout'
      ? `Penales &middot; ${teamName(state.penalty.kickingTeam)} (${state.penalty.scoreA}-${state.penalty.scoreB})`
      : `Penal &middot; ${teamName(state.penalty.kickingTeam)}`;
  } else {
    label.textContent = `Turno de ${teamName(state.turnTeam)}` + (state.phase==='flying' ? ' &middot; balon en juego' : '');
  }
  dot.style.background = (state.phase==='formation' ? state.formingTeam : state.turnTeam)==='A' ? 'var(--teamA)' : 'var(--teamB)';
  const pct = state.phase==='formation' ? 100 : Math.max(0, state.turnTimeLeft/settings.turnSeconds)*100;
  bar.style.width = pct+'%';
  capInfo.textContent = state.phase==='formation' ? 'Arrastra los jugadores con borde punteado' :
    (state.holder ? (state.holder.isCaptain ? 'El capitan tiene el balon' : (state.holder.isKeeper ? 'El arquero tiene el balon' : 'Jugador de campo')) : '-');
  updatePowerButtons();
}

// ============================================================================
// Arranque de partido
// ============================================================================
function startMatch(){
  state.scoreA=0; state.scoreB=0;
  state.matchTimeLeft = settings.matchSeconds;
  state.usedPowers = { A:{}, B:{} };
  state.impulsoActive = { A:false, B:false };
  state.silencedNextTurn = { A:false, B:false };
  state.shieldActive = { A:false, B:false };
  state.interceptUsed = { A:false, B:false };
  state.interceptRolled = new Set();
  state.passStreak = { A:0, B:0 };
  state.auraBoost = null;
  state.revisionVarPending = false;
  state.moveCaptainMode = { A:false, B:false };
  state.penalty = null;
  state.pendingSinglePenalty = null;
  state.ghostZones = { A: placeGhostZone('A'), B: placeGhostZone('B') };
  state.phase='aiming';
  updateScoreboard();
  renderPowerButtons();
  resetPlayers();
  document.getElementById('matchtime').textContent = fmtTime(state.matchTimeLeft);
  const startTeam = Math.random()<0.5 ? 'A' : 'B';
  startTurn(startTeam, keeperOf(startTeam));
  startMatchClock();
}

// ============================================================================
// Menu principal — modo de juego y nombres de equipo
// ============================================================================
const mainMenuOverlay = document.getElementById('mainMenuOverlay');
const modeHotseat = document.getElementById('modeHotseat');
const modeVsAI = document.getElementById('modeVsAI');
const nameAInput = document.getElementById('nameA');
const nameBInput = document.getElementById('nameB');
const nameBWrap = document.getElementById('nameBWrap');
const menuContinue = document.getElementById('menuContinue');

function selectMode(mode){
  state.mode = mode;
  modeHotseat.classList.toggle('selected', mode==='hotseat');
  modeVsAI.classList.toggle('selected', mode==='vsAI');
  nameBWrap.classList.toggle('disabled', mode==='vsAI');
  nameBInput.placeholder = mode==='vsAI' ? 'LA PC' : 'EQUIPO B';
}
modeHotseat.onclick = () => selectMode('hotseat');
modeVsAI.onclick = () => selectMode('vsAI');
menuContinue.onclick = () => {
  audio.unlock(); // desbloquea el audio con el primer toque del usuario
  const nameA = nameAInput.value.trim();
  const nameB = nameBInput.value.trim();
  state.teamNames.A = (nameA || 'EQUIPO A').toUpperCase().slice(0,16);
  state.teamNames.B = (state.mode==='vsAI' ? (nameB || 'LA PC') : (nameB || 'EQUIPO B')).toUpperCase().slice(0,16);
  document.getElementById('tagAName').textContent = state.teamNames.A;
  document.getElementById('tagBName').textContent = state.teamNames.B;
  mainMenuOverlay.classList.add('hidden');
  beginPowerSelection();
};

// ============================================================================
// IA del Equipo B (modo 1 jugador vs PC)
// Decide un objetivo simple, "carga" el disparo como lo haria una persona y
// suelta usando el mismo camino de codigo que un toque humano (pointerUp).
// ============================================================================
const aiState = { thinking:false, releaseAt:0 };
function updateAI(dt){
  if (state.turnTeam !== 'B' || state.phase !== 'aiming') { aiState.thinking=false; return; }
  if (aiState.thinking){
    if (performance.now() >= aiState.releaseAt) { aiState.thinking=false; pointerUp(); }
    return;
  }
  if (aim.active || !state.holder || state.holder.team!=='B') return;

  const holder = state.holder;
  let target, isShot, chargeMs;
  if (holder.isKeeper){
    const mate = players.filter(p=>p.team==='B' && !p.isKeeper)
      .sort((a,b)=>a.x-b.x)[0]; // el companero mas avanzado hacia el arco rival
    target = { x: mate.x, y: mate.y };
    isShot = false; chargeMs = 350 + Math.random()*250;
  } else if ((holder.role==='fwd' || holder.isCaptain) && holder.x < 380){
    target = { x: 12, y: H/2 + (Math.random()*70-35) };
    isShot = true; chargeMs = 700 + Math.random()*450;
  } else {
    const mates = players.filter(p=>p.team==='B' && p!==holder && p.x < holder.x-20);
    const mate = mates.length ? mates[Math.floor(Math.random()*mates.length)] : players.find(p=>p.team==='B'&&p.isCaptain);
    target = { x: mate.x, y: mate.y };
    isShot = false; chargeMs = 320 + Math.random()*300;
  }

  aim.active = true; aim.charging = true; aim.startTime = performance.now();
  aim.x = target.x; aim.y = target.y;
  aiState.thinking = true;
  aiState.releaseAt = performance.now() + (isShot ? Math.min(chargeMs, settings.chargeMs) : chargeMs);
}

window.FulbitoGame = {
  // roster: arreglo de 7 {skills, name} (arquero, def, def, mid, mid, fwd, capitan) o null para volver al preset por defecto
  setPlayerRoster(roster){ rosterOverrideA = roster; },
  showModeMenu(){ mainMenuOverlay.classList.remove('hidden'); },
};

resetPlayers();
draw();
requestAnimationFrame(loop);

})();
