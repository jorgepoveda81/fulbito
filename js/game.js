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

// Colores de camiseta por equipo (se pueden personalizar desde Mi Equipo, ver setTeamColors)
let teamColors = { A:'#2f6fe0', B:'#e0432f' };
function hexToRgba(hex, alpha){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  return FulbitoRules.gkSkills(total);
}

function mkPlayer(team, role, x, y, isCaptain, isKeeper, jersey){
  return {
    team, role, x, y, homeX:x, homeY:y, isCaptain:!!isCaptain, isKeeper:!!isKeeper, jersey,
    r: isCaptain ? CAPTAIN_R : PLAYER_R,
    skills: isKeeper ? gkSkills(settings.gkSkillTotal) : { ...FIELD_SKILL_PRESETS[isCaptain ? 'captain' : role] },
  };
}

let players = [];
function resetPlayers(){
  players = [
    mkPlayer('A','keeper', 30,260, false, true, '1'),
    mkPlayer('A','def',   140,150, false, false, '2'),
    mkPlayer('A','def',   140,370, false, false, '3'),
    mkPlayer('A','mid',   280,110, false, false, '4'),
    mkPlayer('A','mid',   280,410, false, false, '5'),
    mkPlayer('A','fwd',   400,260, false, false, '6'),
    mkPlayer('A','fwd',   430,260, true,  false, 'C'),

    mkPlayer('B','keeper', 870,260, false, true, '1'),
    mkPlayer('B','def',   760,150, false, false, '2'),
    mkPlayer('B','def',   760,370, false, false, '3'),
    mkPlayer('B','mid',   620,110, false, false, '4'),
    mkPlayer('B','mid',   620,410, false, false, '5'),
    mkPlayer('B','fwd',   500,260, false, false, '6'),
    mkPlayer('B','fwd',   470,260, true,  false, 'C'),
  ];
  applyFormation('A');
  applyFormation('B');
  applyRosterOverride();
}

// ============================================================================
// Puente con la app externa (cuentas/tienda/equipo, ver js/app.js).
// El equipo del usuario logueado reemplaza los presets fijos del Equipo A.
// ============================================================================
let rosterOverrideA = null; // arreglo de 7 {skills, name} en el mismo orden que resetPlayers() crea a cada equipo
let rosterOverrideB = null; // igual, pero para el Equipo B (solo se usa en modo 2 jugadores, ver "Selector de Jugador 2")
function applyRosterOverride(){
  [['A', rosterOverrideA], ['B', rosterOverrideB]].forEach(([team, override]) => {
    if (!override) return;
    players.filter(p=>p.team===team).forEach((p,i)=>{
      const ov = override[i];
      if (!ov) return;
      if (ov.skills) p.skills = { ...ov.skills };
      if (ov.name) p.displayName = ov.name;
      if (ov.id) p.ownedId = ov.id;
    });
  });
}
function captainOf(team){ return players.find(p=>p.team===team && p.isCaptain); }
function keeperOf(team){ return players.find(p=>p.team===team && p.isKeeper); }
function otherTeam(team){ return team==='A' ? 'B' : 'A'; }

// ============================================================================
// SECCION 2 — Formacion previa al partido
// Los 5 jugadores fijos de campo (sin contar arquero ni capitan) se ubican a
// mano antes de cada partido, en cualquier parte de LA CANCHA ENTERA (no solo
// el campo propio), respetando los limites de zona del documento: baja max 3,
// media max 2, alta max 2. La zona se calcula por que tan avanzado esta el
// jugador hacia el arco rival, no por en que mitad esta parado. El arquero y
// el capitan tienen su posicion de inicio fija segun las reglas (seccion 2 y
// 6) y no se arrastran.
// ============================================================================
const ZONE_CAPS = { baja:3, media:2, alta:2 };
function draggablePlayers(team){
  return players.filter(p => p.team===team && !p.isCaptain && !p.isKeeper);
}
function bandOf(team, x){
  return FulbitoRules.bandOf(team, x, W);
}
function clampFormationX(team, x){
  return clamp(x, 40, W-40);
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
const ball = { x:450, y:260, vx:0, vy:0, flying:false, justShotBy:null, hasEscaped:true };
let ballAuraTime = new Map(); // acumula ms que el balon paso dentro del aura de cada jugador (seccion 7)

// ============================================================================
// SECCION 11 — Los 10 poderes
// ============================================================================
const POWERS = [
  { id:'tiempo',        name:'Tiempo extra',        desc:'+5s a este turno', scope:'own' },
  { id:'impulso',       name:'Impulso',              desc:'+20% de fuerza al proximo disparo', scope:'own' },
  { id:'farmear',       name:'Farmear aura',         desc:'Tras 2 pases seguidos, agranda tu aura 25%', scope:'own' },
  { id:'planb',         name:'Plan B',                desc:'Cancela tu puntaria y vuelve a apuntar', scope:'own' },
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
  aiDifficulty:'normal', // 'facil' | 'normal' | 'dificil' — solo aplica en modo vsAI
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
  formationStep: 'players', // 'players' | 'ghost'
  penalty: null,
  pendingSinglePenalty: null, // {forTeam} — penal por zona fantasma descubierta
};

function hasPower(team, id){ return state.selectedPowers[team].includes(id) && !state.usedPowers[team][id]; }
function markUsed(team, id){ state.usedPowers[team][id] = true; }
function teamName(team){ return state.teamNames[team] || `Equipo ${team}`; }

// ============================================================================
// Preferencias del jugador (sonido/vibracion), guardadas en el celular.
// Pantalla real en js/settings-ui.js (tab "Ajustes"); se controlan desde ahi
// via window.FulbitoPrefs, no desde la pantalla de pruebas para desarrolladores.
// ============================================================================
const PREFS_KEY = 'fulbito_prefs_v1';
function loadPrefs(){
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return { sound: saved.sound !== false, vibration: saved.vibration !== false };
  } catch(e){ return { sound: true, vibration: true }; }
}
const prefs = loadPrefs();
function savePrefs(){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(e){} }
window.FulbitoPrefs = {
  get(){ return { ...prefs }; },
  setSound(v){ prefs.sound = !!v; savePrefs(); },
  setVibration(v){ prefs.vibration = !!v; savePrefs(); },
};

// ============================================================================
// Sonido (Web Audio, sin archivos) y vibracion en celular
// ============================================================================
const audio = (function(){
  let ctxA = null;
  function ensure(){
    if (!prefs.sound) return null;
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
  function noiseBurst(dur, gainPeak, delay, sweep){
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay||0);
    const bufferSize = Math.floor(c.sampleRate*dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
    const src = c.createBufferSource(); src.buffer = buffer;
    const filter = c.createBiquadFilter(); filter.type='bandpass';
    if (sweep){
      filter.frequency.setValueAtTime(sweep.from, t0);
      filter.frequency.linearRampToValueAtTime(sweep.to, t0+dur);
      filter.Q.value = 0.7;
    } else {
      filter.frequency.value = 1200;
    }
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001,t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak||0.25, t0+0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start(t0); src.stop(t0+dur);
  }
  function horn(delay){
    const c = ensure(); if (!c) return;
    [0, 0.22].forEach(off => {
      const t0 = c.currentTime + (delay||0) + off;
      const osc = c.createOscillator(); const osc2 = c.createOscillator(); const gain = c.createGain();
      osc.type = 'sawtooth'; osc2.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t0); osc2.frequency.setValueAtTime(303, t0); // ligero detune = mas "grande"
      osc.frequency.exponentialRampToValueAtTime(340, t0+0.18);
      osc2.frequency.exponentialRampToValueAtTime(343, t0+0.18);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.22, t0+0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0+0.2);
      osc.connect(gain); osc2.connect(gain); gain.connect(c.destination);
      osc.start(t0); osc.stop(t0+0.22); osc2.start(t0); osc2.stop(t0+0.22);
    });
  }
  function chord(freqs, dur, type, gainPeak, delay){
    freqs.forEach(f => tone(f, dur, type, gainPeak, delay));
  }
  return {
    unlock(){ ensure(); },
    kick(){ tone(180,0.12,'triangle',0.22); noiseBurst(0.08,0.15); },
    whistle(){ tone(2200,0.18,'square',0.12); tone(2200,0.18,'square',0.12,0.2); },
    intercept(){ tone(420,0.1,'square',0.15); },
    save(){ tone(140,0.15,'sawtooth',0.2); },
    goal(){
      horn(0);
      [0.42,0.51,0.60,0.69].forEach((d,i)=>tone(392+i*160, 0.22, 'triangle', 0.16, d));
      chord([523,659,784], 0.9, 'sawtooth', 0.16, 0.72); // acorde final triunfal
      noiseBurst(1.6, 0.16, 0.08, { from:400, to:2600 }); // ola de gente creciendo
    },
  };
})();
function vibrate(pattern){
  if (!prefs.vibration) return;
  if (navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
}

// ============================================================================
// SECCION 10 — Zona fantasma
// 5% del area de la cancha, no sobre la linea del area grande (recomendacion del doc)
// ============================================================================
const GHOST_RADIUS = Math.sqrt(0.05 * (W*H) / Math.PI) * 0.5; // 50% mas chica que el 5% del area recomendado
function placeGhostZone(team){
  const marginX = 60, marginY = 60;
  const x = marginX + GHOST_RADIUS + Math.random() * (W - marginX*2 - GHOST_RADIUS*2);
  const y = marginY + GHOST_RADIUS + Math.random() * (H - marginY*2 - GHOST_RADIUS*2);
  return { x, y, revealed:false, team };
}
function clampGhostPos(team, x, y){
  const marginX = 60, marginY = 60;
  const cx = clamp(x, marginX+GHOST_RADIUS, W-marginX-GHOST_RADIUS);
  const cy = clamp(y, marginY+GHOST_RADIUS, H-marginY-GHOST_RADIUS);
  return { x:cx, y:cy };
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

// Tutorial de "como se juega": se muestra una sola vez, la primera vez que alguien
// arranca un partido en este celular (antes de elegir poderes), y nunca mas.
const TUTORIAL_SEEN_KEY = 'fulbito_tutorial_seen';
const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialContinue = document.getElementById('tutorialContinue');
function maybeShowTutorial(next){
  let seen = false;
  try { seen = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'; } catch(e){}
  if (seen){ next(); return; }
  tutorialOverlay.classList.remove('hidden');
  tutorialContinue.onclick = () => {
    tutorialOverlay.classList.add('hidden');
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); } catch(e){}
    next();
  };
}

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
  psTitle.textContent = `${teamName(team)}: elige 2 poderes`;
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
const matchSummary = document.getElementById('matchSummary');
const matchSummaryBody = document.getElementById('matchSummaryBody');

function beginFormation(){
  resetPlayers();
  state.phase = 'formation';
  state.formingTeam = 'A';
  state.formationStep = 'players';
  state.ghostZones = { A: placeGhostZone('A'), B: placeGhostZone('B') }; // arrancan al azar, se pueden reubicar
  ball.x = W/2; ball.y = H/2;
  formationBar.classList.remove('hidden');
  renderFormationBar();
}
function renderFormationBar(){
  if (state.formationStep === 'players'){
    fbTitle.textContent = `${teamName(state.formingTeam)}: arrastra tus jugadores a su lugar`;
    fbReady.textContent = 'Listo, elegir zona fantasma ▶';
  } else {
    fbTitle.textContent = `${teamName(state.formingTeam)}: toca la cancha para esconder tu zona fantasma`;
    fbReady.textContent = 'Confirmar zona fantasma ▶';
  }
  updateFormationZoneCounts();
}
function updateFormationZoneCounts(){
  const team = state.formingTeam;
  const counts = { baja:0, media:0, alta:0 };
  draggablePlayers(team).forEach(p => counts[bandOf(team,p.x)]++);
  fbZones.innerHTML = state.formationStep==='players'
    ? `<span>Zona baja ${counts.baja}/${ZONE_CAPS.baja}</span>`+
      `<span>Zona media ${counts.media}/${ZONE_CAPS.media}</span>`+
      `<span>Zona alta ${counts.alta}/${ZONE_CAPS.alta}</span>`
    : `<span>Nadie mas la ve. Se descubre sola si el balon del rival cae justo ahi.</span>`;
}
fbReady.onclick = () => {
  if (state.formationStep === 'players'){
    saveFormation(state.formingTeam);
    state.formationStep = 'ghost';
    renderFormationBar();
    return;
  }
  if (state.formingTeam === 'A'){
    if (state.mode === 'vsAI'){
      resetPlayers();
      jitterAutoFormation('B');
      saveFormation('B');
      // la PC deja su zona fantasma en el lugar al azar con el que arranco
      formationBar.classList.add('hidden');
      startMatch();
      return;
    }
    state.formingTeam = 'B';
    state.formationStep = 'players';
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
let ghostDragging = false;
function formationPointerDown(clientX, clientY){
  const p = canvasPoint(clientX,clientY);
  const team = state.formingTeam;
  if (state.formationStep === 'ghost'){
    const pos = clampGhostPos(team, p.x, p.y);
    state.ghostZones[team].x = pos.x; state.ghostZones[team].y = pos.y;
    ghostDragging = true;
    return;
  }
  let target=null, bestDist=30;
  for (const pl of draggablePlayers(team)){
    const d = Math.hypot(p.x-pl.x, p.y-pl.y);
    if (d < bestDist){ bestDist = d; target = pl; }
  }
  if (target) formationDrag = { player:target, startX:target.x, startY:target.y };
}
function formationPointerMove(clientX, clientY){
  const p = canvasPoint(clientX,clientY);
  if (state.formationStep === 'ghost'){
    if (!ghostDragging) return;
    const pos = clampGhostPos(state.formingTeam, p.x, p.y);
    state.ghostZones[state.formingTeam].x = pos.x; state.ghostZones[state.formingTeam].y = pos.y;
    return;
  }
  if (!formationDrag) return;
  formationDrag.player.x = clampFormationX(state.formingTeam, p.x);
  formationDrag.player.y = clamp(p.y, 34, H-34);
  updateFormationZoneCounts();
}
function formationPointerUp(){
  if (state.formationStep === 'ghost'){ ghostDragging = false; return; }
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
// Mientras le toca tirar a la PC, el mouse/dedo del humano no debe pisarle la puntaria
// (pointerMove no distingue quien la mueve, asi que hay que frenarlo en el turno de la IA).
function humanInputAllowed(){
  if (state.phase !== 'aiming' && state.phase !== 'flying') return true; // formacion, sorteo, etc.
  return !(state.mode==='vsAI' && state.turnTeam==='B');
}
canvas.addEventListener('mousedown', e=>{ if (humanInputAllowed()) pointerDown(e.clientX,e.clientY); });
window.addEventListener('mousemove', e=>{ if (humanInputAllowed()) pointerMove(e.clientX,e.clientY); });
window.addEventListener('mouseup', ()=>{ if (humanInputAllowed()) pointerUp(); });
canvas.addEventListener('touchstart', e=>{ const t=e.touches[0]; if (humanInputAllowed()) pointerDown(t.clientX,t.clientY); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchmove', e=>{ const t=e.touches[0]; if (humanInputAllowed()) pointerMove(t.clientX,t.clientY); e.preventDefault(); }, {passive:false});
canvas.addEventListener('touchend', e=>{ if (humanInputAllowed()) pointerUp(); e.preventDefault(); }, {passive:false});

// ============================================================================
// Poderes — botones e interaccion
// ============================================================================
// Cache de los botones de poder ya creados, para no tener que volver a buscarlos con
// querySelectorAll en cada frame (updatePowerButtons corre 60 veces por segundo).
let powerButtonEls = [];
function renderPowerButtons(){
  powerButtonEls = [];
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
      powerButtonEls.push(btn);
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
        flashMessage('Plan B', 'Vuelve a apuntar', 700);
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
        flashMessage('Paso del capitan', 'Toca donde quieres moverlo', 1000);
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
  powerButtonEls.forEach(btn=>{
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
  return FulbitoRules.speedMultiplierFromFuerza(fuerza);
}
function applyPrecisionDeviation(dirx, diry, precision, power){
  const maxDeg = (1 - precision/11) * 18; // baja precision = hasta 18 grados de error
  const deg = maxDeg * (0.4 + 0.6*power) * (Math.random()*2 - 1);
  const rad = deg * Math.PI/180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return { x: dirx*cos - diry*sin, y: dirx*sin + diry*cos };
}
// ============================================================================
// Estadisticas de la partida en curso, por jugador (identificado por equipo+camiseta,
// que se mantiene estable aunque resetPlayers() reconstruya los objetos tras un gol).
// ============================================================================
let matchStats = {};
function statKey(p){ return `${p.team}#${p.jersey}`; }
function statFor(p){
  const key = statKey(p);
  if (!matchStats[key]) matchStats[key] = { team:p.team, jersey:p.jersey, name: p.displayName||null, ownedId: p.ownedId||null, goals:0, shots:0, saves:0 };
  if (p.displayName) matchStats[key].name = p.displayName;
  if (p.ownedId) matchStats[key].ownedId = p.ownedId;
  return matchStats[key];
}

function shoot(holder, dirx, diry, power){
  statFor(holder).shots++;
  // Evita que el balon "choque" contra el mismo jugador que lo acaba de patear en el primer
  // instante del tiro (antes rebotaba y listo, pero una atajada real lo frena en seco: sin
  // esto, un arquero podia terminar atajandose su propio saque y quedar trabado para siempre).
  ball.justShotBy = holder;
  ball.hasEscaped = false;
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
let ballTrail = [];
function updateBall(dt){
  if (!ball.flying) return;
  ball.x += ball.vx*dt; ball.y += ball.vy*dt;
  ball.vx *= Math.pow(settings.friction, dt*60);
  ball.vy *= Math.pow(settings.friction, dt*60);

  if (Math.hypot(ball.vx,ball.vy) > settings.maxSpeed*0.35){
    ballTrail.push({ x:ball.x, y:ball.y });
    if (ballTrail.length > 7) ballTrail.shift();
  } else if (ballTrail.length){
    ballTrail.shift();
  }

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
  if (!ball.hasEscaped && ball.justShotBy){
    const dEsc = Math.hypot(ball.x-ball.justShotBy.x, ball.y-ball.justShotBy.y);
    if (dEsc >= ball.justShotBy.r + BALL_R) ball.hasEscaped = true;
  }
  for (const p of active){
    if (p === ball.justShotBy && !ball.hasEscaped) continue; // todavia no se alejo de quien lo pateo
    const dx = ball.x-p.x, dy = ball.y-p.y;
    const dist = Math.hypot(dx,dy);
    const minDist = p.r + BALL_R;
    if (dist < minDist && dist > 0.001){
      const nx = dx/dist, ny = dy/dist;
      const incomingSpeed = Math.hypot(ball.vx, ball.vy);

      // SECCION 9 — Si el tiro no es demasiado fuerte para las habilidades del arquero,
      // lo controla del todo (el balon queda en su aura); si es muy fuerte, solo lo desvia.
      if (p.isKeeper){
        const catchThreshold = FulbitoRules.keeperCatchThreshold(p.skills);
        statFor(p).saves++;
        if (incomingSpeed < catchThreshold){
          ball.x = p.x; ball.y = p.y; ball.vx = 0; ball.vy = 0; ball.flying = false;
          flashMessage('&#129508; ¡Atajada segura!', `${teamName(p.team)} controla el balon`, 900);
          audio.save(); vibrate(30);
          startTurn(p.team, p);
          return;
        }
        flashMessage('&#129508; ¡Atajada!', 'El arquero la desvia', 700);
        audio.save(); vibrate(30);
      }

      ball.x = p.x + nx*minDist; ball.y = p.y + ny*minDist;
      const dot = ball.vx*nx + ball.vy*ny;
      ball.vx -= 2*dot*nx; ball.vy -= 2*dot*ny;
      ball.vx *= 0.82; ball.vy *= 0.82;
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
        const attackSkill = getAttackSkillForIntercept();
        const chance = FulbitoRules.interceptionChance(p.skills.defensa, attackSkill);
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
function clamp(v,min,max){ return FulbitoRules.clamp(v,min,max); }
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
    triggerVarZoom(ball.x, ball.y);
    const byId = new Map(inside.map(p => [statKey(p), p]));
    const candidates = inside.map(p => ({
      id: statKey(p),
      dist: Math.hypot(ball.x-p.x, ball.y-p.y),
      auraTimeMs: ballAuraTime.get(p)||0,
    }));
    const result = FulbitoRules.resolvePossession(candidates, settings.varThreshold * settings.auraRadius);
    if (result.tie){
      // empate exacto: el balon rebota al centro y nadie recibe posesion
      ball.x = W/2; ball.y = H/2;
      flashMessage('&#127937; Empate total', 'Nadie recibe la posesion, el balon vuelve al centro', 1300);
      setTimeout(()=>startTurn(state.turnTeam, players.find(p=>p.team===state.turnTeam && p.isKeeper)), 1300);
      return;
    }
    winner = byId.get(result.winnerId);
    let detail = '';
    if (state.revisionVarPending){
      const sorted = candidates.slice().sort((a,b)=>a.dist-b.dist);
      detail = ` (d:${sorted[0].dist.toFixed(0)}px${sorted[1]?`/${sorted[1].dist.toFixed(0)}px`:''})`;
      state.revisionVarPending = false;
    }
    flashMessage('&#128250; VAR de posesion', `Gana ${teamName(winner.team)}${detail}`, 1300);
  }
  startTurn(winner.team, winner);
}

// ============================================================================
// Turnos
// ============================================================================
function startTurn(team, holder){
  ballTrail = [];
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
  // El penal por zona fantasma (single) se resuelve aparte: no tiene kicksLeft
  // como la tanda de penales (shootout), asi que hay que revisarlo primero.
  if (state.pendingSinglePenalty){ resolveSinglePenaltyGoal(team); return; }
  if (state.penalty){ registerPenaltyGoal(team); return; }
  if (team==='A') state.scoreA++; else state.scoreB++;
  if (lastShooterRef && lastShooterRef.team===team) statFor(lastShooterRef).goals++;
  updateScoreboard();
  flashMessage('&#9917; ¡GOOOOL!', `${teamName(team)} marca`, 1700, true);
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
    if (lastShooterRef && lastShooterRef.team===team) statFor(lastShooterRef).goals++;
    updateScoreboard();
    flashMessage('&#9917; ¡GOL de penal!', '', 1500, true);
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
  // el reloj del partido ya termino y su intervalo se detuvo (onMatchTimeUp): si no se avisa
  // aca, el numero queda clavado en 0:00 y parece que el juego se colgo aunque siga en penales.
  document.getElementById('matchtime').textContent = 'PENALES';
  flashMessage('&#127877; Tanda de penales', 'Empate al final de los 3 minutos', 1800);
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
  // Bonus de la seccion 10: descubrir la zona fantasma rival da unos segundos extra para patear.
  state.turnTimeLeft = mode === 'single' ? 12 + 5 : 12;
  state.phase = 'aiming';
  const leftText = state.penalty.mode==='shootout' ? ` &middot; quedan ${state.penalty.kicksLeft[kicking]}` : '';
  const bonusText = mode === 'single' ? ' &middot; +5s por descubrirla' : '';
  flashMessage(`Penal &mdash; ${teamName(kicking)}`, `Patea el capitan${leftText}${bonusText}`, 1200);
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
  document.getElementById('matchtime').textContent = 'FINAL';
  const winner = p.scoreA>p.scoreB ? 'Equipo A' : 'Equipo B';
  flashMessage('&#127942; Fin de los penales', `¡Gana ${winner}! (${p.scoreA} - ${p.scoreB})`, 500000);
  notifyMatchEnd(p.scoreA>p.scoreB ? 'win' : 'loss'); // en penales no hay empate
}
function notifyMatchEnd(resultForA){
  renderMatchSummary();
  const statsForA = Object.values(matchStats).filter(s => s.team==='A' && s.ownedId);
  if (window.FulbitoGame && window.FulbitoGame.onMatchEnd) window.FulbitoGame.onMatchEnd(resultForA, statsForA);
}
function renderMatchSummary(){
  const rows = Object.values(matchStats)
    .filter(s => s.team==='A' && (s.goals||s.shots||s.saves))
    .sort((a,b)=> b.goals-a.goals || b.shots-a.shots);
  if (!rows.length){ matchSummary.classList.add('hidden'); return; }
  matchSummaryBody.innerHTML = rows.map(s => {
    const who = s.name || `Jugador ${s.jersey}`;
    const parts = [];
    if (s.goals) parts.push(`${s.goals} gol${s.goals===1?'':'es'}`);
    if (s.shots) parts.push(`${s.shots} tiro${s.shots===1?'':'s'}`);
    if (s.saves) parts.push(`${s.saves} atajada${s.saves===1?'':'s'}`);
    return `<div class="summary-row"><span class="sj">${s.jersey}</span><span class="sn">${who}</span><span class="ss">${parts.join(' &middot; ')}</span></div>`;
  }).join('');
  matchSummary.classList.remove('hidden');
}

// ============================================================================
// Mensajes en pantalla
// ============================================================================
const msgOverlay = document.getElementById('msgOverlay');
const msgMain = document.getElementById('msgMain');
const msgSub = document.getElementById('msgSub');
let msgTimer=null;
function flashMessage(main, sub, ms, big){
  msgMain.innerHTML = main; msgSub.innerHTML = sub||'';
  msgOverlay.classList.remove('show','msg-goal');
  void msgOverlay.offsetWidth; // fuerza a reiniciar la animacion si se repite el mismo mensaje
  msgOverlay.classList.add('show');
  if (big) msgOverlay.classList.add('msg-goal');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(()=>msgOverlay.classList.remove('show','msg-goal'), ms||1000);
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
      onMatchTimeUp(); // decide que mostrar en el reloj (PENALES o el resultado final)
      return;
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
  document.getElementById('matchtime').textContent = 'FINAL';
  const winner = state.scoreA>state.scoreB ? 'Equipo A' : (state.scoreB>state.scoreA ? 'Equipo B' : 'Empate');
  flashMessage('&#127942; Fin del partido', winner==='Empate' ? 'Empate' : `¡Gana ${winner}!`, 500000);
  notifyMatchEnd(state.scoreA>state.scoreB ? 'win' : (state.scoreB>state.scoreA ? 'loss' : 'draw'));
}

// ============================================================================
// Festejo: confeti y sacudida de camara
// ============================================================================
let confetti = [];
let shake = { time:0, mag:0 };
function confettiColors(){ return ['#ffc94d', teamColors.A, teamColors.B, '#ffffff', '#4ade80']; }
function spawnConfetti(x, y){
  for (let i=0;i<46;i++){
    const ang = Math.random()*Math.PI*2;
    const spd = 120 + Math.random()*260;
    confetti.push({
      x, y,
      vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 120,
      life: 1, color: confettiColors()[i%5],
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

// SECCION 7 — Zoom de camara para el VAR de posesion, y animacion del sorteo inicial
const VAR_ZOOM_DURATION = 0.8;
let varZoom = { time:0, x:0, y:0 };
function triggerVarZoom(x,y){ varZoom = { time:VAR_ZOOM_DURATION, x, y }; }
function updateVarZoom(dt){
  if (varZoom.time>0) varZoom.time = Math.max(0, varZoom.time-dt);
}
let coinFlip = null; // { resultTeam, startTime }
function drawCoinFlip(){
  if (!coinFlip) return;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0,0,W,H);
  const elapsed = performance.now() - coinFlip.startTime;
  const t = Math.min(1, elapsed/1200);
  const angle = t*6*Math.PI*2;
  const showResult = t>=1;
  const showTeam = showResult ? coinFlip.resultTeam : (Math.cos(angle)>0 ? 'A' : 'B');
  const scaleX = showResult ? 1 : Math.max(0.12, Math.abs(Math.cos(angle)));
  ctx.save();
  ctx.translate(W/2,H/2);
  ctx.scale(scaleX,1);
  ctx.beginPath(); ctx.arc(0,0,42,0,Math.PI*2);
  ctx.fillStyle = teamColors[showTeam];
  ctx.fill();
  ctx.lineWidth=4; ctx.strokeStyle='#fff'; ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#fff'; ctx.font='bold 17px Inter'; ctx.textAlign='center';
  ctx.fillText(showResult ? `¡Arranca ${teamName(coinFlip.resultTeam)}!` : 'Sorteo...', W/2, H/2+72);
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
  if (varZoom.time>0){
    const f = varZoom.time/VAR_ZOOM_DURATION;
    const scale = 1 + 0.35*Math.sin(f*Math.PI); // crece y vuelve, como un zoom de camara
    ctx.translate(varZoom.x, varZoom.y);
    ctx.scale(scale, scale);
    ctx.translate(-varZoom.x, -varZoom.y);
  }
  ctx.clearRect(-20,-20,W+40,H+40);
  drawField();
  if (settings.debugGhost) drawGhostZones();
  if (state.phase==='formation' && state.formationStep==='ghost') drawGhostPlacementPreview();
  drawFormationGuides();
  drawAuras();
  drawPlayers();
  drawAimAndPower();
  if (state.phase!=='formation') drawBall();
  drawConfetti();
  if (state.phase==='sorteo') drawCoinFlip();
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
  // area chica: marca el terreno del arquero, para que se note mejor donde esta el arco
  const boxH = (GOAL_BOTTOM-GOAL_TOP) + 50, boxY = H/2 - boxH/2, boxW = 85;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth=2;
  ctx.strokeRect(6, boxY, boxW, boxH);
  ctx.strokeRect(W-6-boxW, boxY, boxW, boxH);
  // profundidad detras de la linea de gol
  ctx.fillStyle='rgba(0,0,0,0.22)';
  ctx.fillRect(0,GOAL_TOP,26,GOAL_BOTTOM-GOAL_TOP);
  ctx.fillRect(W-26,GOAL_TOP,26,GOAL_BOTTOM-GOAL_TOP);
  // red: cuadricula prolija en vez de diagonal, se lee mejor como arco
  ctx.strokeStyle='rgba(255,255,255,0.28)'; ctx.lineWidth=1;
  const netCols=5, netRows=8, goalH=GOAL_BOTTOM-GOAL_TOP;
  for(let i=0;i<=netCols;i++){
    const gx=i*(26/netCols);
    ctx.beginPath(); ctx.moveTo(gx,GOAL_TOP); ctx.lineTo(gx,GOAL_BOTTOM); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W-gx,GOAL_TOP); ctx.lineTo(W-gx,GOAL_BOTTOM); ctx.stroke();
  }
  for(let j=0;j<=netRows;j++){
    const gy=GOAL_TOP+j*(goalH/netRows);
    ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(26,gy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W-26,gy); ctx.lineTo(W,gy); ctx.stroke();
  }
  // postes bien marcados, con remate redondeado arriba y abajo
  ctx.lineWidth=5;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor='rgba(255,255,255,0.6)'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.moveTo(6,GOAL_TOP); ctx.lineTo(6,GOAL_BOTTOM); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W-6,GOAL_TOP); ctx.lineTo(W-6,GOAL_BOTTOM); ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='#ffffff';
  [GOAL_TOP,GOAL_BOTTOM].forEach(gy=>{
    ctx.beginPath(); ctx.arc(6,gy,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(W-6,gy,5,0,Math.PI*2); ctx.fill();
  });
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
    ctx.strokeStyle = z.revealed ? 'rgba(255,255,255,0.6)' : hexToRgba(teamColors[team], 0.5);
    ctx.lineWidth=2; ctx.stroke();
    ctx.setLineDash([]);
  });
}
function drawGhostPlacementPreview(){
  const z = state.ghostZones[state.formingTeam];
  if (!z) return;
  ctx.beginPath();
  ctx.arc(z.x,z.y,GHOST_RADIUS,0,Math.PI*2);
  ctx.fillStyle = 'rgba(155,89,255,0.18)';
  ctx.fill();
  ctx.setLineDash([6,5]);
  ctx.strokeStyle = 'rgba(155,89,255,0.85)'; ctx.lineWidth=2.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(155,89,255,0.9)'; ctx.font='11px Inter'; ctx.textAlign='center';
  ctx.fillText('Tu zona secreta', z.x, z.y+4);
}
function formationAlphaFor(p){
  if (state.phase!=='formation') return 1;
  return p.team===state.formingTeam ? 1 : 0.16;
}
function drawFormationGuides(){
  if (state.phase!=='formation') return;
  const team = state.formingTeam;
  const edges = [W/3, (2*W)/3];
  ctx.save();
  ctx.setLineDash([5,6]);
  ctx.strokeStyle = 'rgba(255,201,77,0.5)'; ctx.lineWidth=1.5;
  edges.forEach(x=>{ ctx.beginPath(); ctx.moveTo(x,10); ctx.lineTo(x,H-10); ctx.stroke(); });
  ctx.restore();
  ctx.fillStyle='rgba(255,201,77,0.75)'; ctx.font='11px Inter'; ctx.textAlign='center';
  const thirdX = [W/6, W/2, (5*W)/6];
  const labelX = team==='A' ? thirdX : thirdX.slice().reverse();
  ['Baja','Media','Alta'].forEach((t,i)=>ctx.fillText(t,labelX[i],26));
}
function drawAuras(){
  const active = getActivePlayers();
  for (const p of active){
    ctx.globalAlpha = formationAlphaFor(p);
    ctx.beginPath();
    ctx.arc(p.x,p.y,auraRadiusFor(p),0,Math.PI*2);
    ctx.fillStyle = hexToRgba(teamColors[p.team], 0.10);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(teamColors[p.team], 0.45);
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
    ctx.ellipse(p.x, p.y+p.r*0.6, p.r*0.95, p.r*0.4, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = teamColors[p.team];
    if (p.isCaptain){ ctx.shadowColor = teamColors[p.team]; ctx.shadowBlur = 8; }
    ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.fillStyle='#fff'; ctx.font='bold 12px Inter'; ctx.textAlign='center';
    if (p.jersey) ctx.fillText(p.jersey,p.x,p.y+4);
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
  for (let i=0;i<ballTrail.length;i++){
    const t = ballTrail[i];
    const age = (ballTrail.length-i)/ballTrail.length;
    ctx.beginPath();
    ctx.arc(t.x,t.y,BALL_R*(1-age*0.4),0,Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${0.22*(1-age)})`;
    ctx.fill();
  }
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
  updateVarZoom(dt);
  updateHud();
  draw();
  requestAnimationFrame(loop);
}
function holderLabel(p){
  const who = p.displayName ? p.displayName : (p.isCaptain ? 'El capitan' : (p.isKeeper ? 'El arquero' : `Jugador ${p.jersey}`));
  return `#${p.jersey} ${who}`;
}
// Elementos estaticos del HUD, buscados una sola vez (updateHud corre cada frame).
const hudLabel = document.getElementById('turnLabel');
const hudDot = document.getElementById('turnDot');
const hudBar = document.getElementById('turnbar');
const hudCapInfo = document.getElementById('captainInfo');
function updateHud(){
  if (state.phase==='formation'){
    hudLabel.textContent = `Armando la formacion de ${teamName(state.formingTeam)}`;
    updateFormationZoneCounts();
  } else if (state.phase==='ended'){
    hudLabel.textContent='Partido terminado';
  } else if (state.penalty){
    hudLabel.textContent = state.penalty.mode==='shootout'
      ? `Penales &middot; ${teamName(state.penalty.kickingTeam)} (${state.penalty.scoreA}-${state.penalty.scoreB})`
      : `Penal &middot; ${teamName(state.penalty.kickingTeam)}`;
  } else {
    hudLabel.textContent = `Turno de ${teamName(state.turnTeam)}` + (state.phase==='flying' ? ' &middot; balon en juego' : '');
  }
  hudDot.style.background = (state.phase==='formation' ? state.formingTeam : state.turnTeam)==='A' ? 'var(--teamA)' : 'var(--teamB)';
  const pct = state.phase==='formation' ? 100 : Math.max(0, state.turnTimeLeft/settings.turnSeconds)*100;
  hudBar.style.width = pct+'%';
  hudCapInfo.textContent = state.phase==='formation' ? 'Arrastra los jugadores con borde punteado' :
    (state.holder ? holderLabel(state.holder) : '-');
  updatePowerButtons();
}

// ============================================================================
// Arranque de partido
// ============================================================================
function startMatch(){
  state.scoreA=0; state.scoreB=0;
  matchStats = {};
  matchSummary.classList.add('hidden');
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
  // las zonas fantasma ya se eligieron a mano durante la formacion (beginFormation)
  state.phase='aiming';
  updateScoreboard();
  renderPowerButtons();
  resetPlayers();
  document.getElementById('matchtime').textContent = fmtTime(state.matchTimeLeft);
  const startTeam = Math.random()<0.5 ? 'A' : 'B';
  state.phase = 'sorteo';
  coinFlip = { resultTeam: startTeam, startTime: performance.now() };
  audio.whistle();
  setTimeout(()=>{
    coinFlip = null;
    startTurn(startTeam, keeperOf(startTeam));
    startMatchClock();
  }, 1500);
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

const nameBStatus = document.getElementById('nameBStatus');
const aiDifficultyGrid = document.getElementById('aiDifficultyGrid');
function selectMode(mode){
  state.mode = mode;
  modeHotseat.classList.toggle('selected', mode==='hotseat');
  modeVsAI.classList.toggle('selected', mode==='vsAI');
  nameBWrap.classList.toggle('disabled', mode==='vsAI');
  aiDifficultyGrid.classList.toggle('hidden', mode!=='vsAI');
  nameBInput.placeholder = mode==='vsAI' ? 'LA PC' : 'EQUIPO B';
  if (mode==='vsAI'){ rosterOverrideB = null; nameBStatus.textContent=''; }
}
modeHotseat.onclick = () => selectMode('hotseat');
modeVsAI.onclick = () => selectMode('vsAI');

aiDifficultyGrid.querySelectorAll('.diff-card').forEach(card => {
  card.onclick = () => {
    state.aiDifficulty = card.dataset.difficulty;
    aiDifficultyGrid.querySelectorAll('.diff-card').forEach(c => c.classList.toggle('selected', c===card));
  };
});

// Selector de Jugador 2 (modo 2 jugadores): si lo que escribio coincide con una cuenta
// real, usa su equipo y color guardados para ese partido (busqueda de solo lectura,
// no inicia sesion como esa persona). Ver js/app.js -> window.FulbitoAccounts.
let nameBLookupToken = 0;
let teamColorFromLookupB = null;
nameBInput.addEventListener('blur', async () => {
  if (state.mode !== 'hotseat') return;
  const query = nameBInput.value.trim();
  rosterOverrideB = null;
  if (!query || !window.FulbitoAccounts){ nameBStatus.textContent = ''; return; }
  const myToken = ++nameBLookupToken;
  nameBStatus.textContent = 'Buscando cuenta...';
  const found = await window.FulbitoAccounts.lookupPlayer2(query);
  if (myToken !== nameBLookupToken) return; // el usuario ya escribio otra cosa mientras tanto
  if (!found){ nameBStatus.textContent = 'No hay cuenta con ese nombre: se usa el equipo por defecto.'; return; }
  rosterOverrideB = found.roster;
  if (found.color && found.color !== teamColors.A){
    teamColorFromLookupB = found.color;
    window.FulbitoGame.setTeamColors({ B: found.color });
  }
  nameBStatus.textContent = found.roster
    ? `✓ Usando el equipo de ${found.username}`
    : `✓ Cuenta encontrada, pero todavia no armo su equipo en Mi Equipo`;
});
menuContinue.onclick = () => {
  audio.unlock(); // desbloquea el audio con el primer toque del usuario
  const nameA = nameAInput.value.trim();
  const nameB = nameBInput.value.trim();
  state.teamNames.A = (nameA || 'EQUIPO A').toUpperCase().slice(0,16);
  state.teamNames.B = (state.mode==='vsAI' ? (nameB || 'LA PC') : (nameB || 'EQUIPO B')).toUpperCase().slice(0,16);
  document.getElementById('tagAName').textContent = state.teamNames.A;
  document.getElementById('tagBName').textContent = state.teamNames.B;
  mainMenuOverlay.classList.add('hidden');
  maybeShowTutorial(beginPowerSelection);
};

// ============================================================================
// IA del Equipo B (modo 1 jugador vs PC)
// Decide un objetivo simple, "carga" el disparo como lo haria una persona y
// suelta usando el mismo camino de codigo que un toque humano (pointerUp).
// La dificultad NUNCA le da informacion que un humano no tendria (todos los
// jugadores son siempre visibles para los dos lados); lo que cambia entre
// Facil/Normal/Dificil es la calidad de la decision: que tan bien elige a
// quien pasarle, que tan calibrada esta la fuerza de carga, que tan lejos
// se anima a tirar al arco, que tan rapido reacciona, y si aprovecha sus
// poderes — igual que la diferencia entre un jugador nuevo y uno con oficio.
// ============================================================================
const AI_DIFFICULTY_PRESETS = {
  facil:   { reactionMs:[500,950], aimNoise:70, bestMate:false, shotRangeX:300, usePowers:false,
             keeperPassMs:[300,750], shotMs:[550,1300], passMs:[250,750] },
  normal:  { reactionMs:[250,500], aimNoise:30, bestMate:true,  shotRangeX:380, usePowers:false,
             keeperPassMs:[350,600], shotMs:[700,1150], passMs:[320,620] },
  dificil: { reactionMs:[80,220],  aimNoise:8,  bestMate:true,  shotRangeX:460, usePowers:true,
             keeperPassMs:[380,520], shotMs:[780,1000], passMs:[350,520] },
};
function aiPreset(){ return AI_DIFFICULTY_PRESETS[state.aiDifficulty] || AI_DIFFICULTY_PRESETS.normal; }
function aiRangeMs([min,max]){ return min + Math.random()*(max-min); }
// entre los companeros mas avanzados hacia el arco rival, elige uno con algo de variedad
// (no siempre el mismo) en vez de puro azar entre todos — mejor lectura de la cancha sin ser perfecta
function aiPickMate(mates){
  const sorted = mates.slice().sort((a,b)=>a.x-b.x);
  const topCount = Math.min(2, sorted.length);
  return sorted[Math.floor(Math.random()*topCount)];
}

const aiState = { thinking:false, releaseAt:0, lastHolder:null, readyAt:0 };
function updateAI(dt){
  if (state.turnTeam !== 'B' || state.phase !== 'aiming') { aiState.thinking=false; aiState.lastHolder=null; return; }
  if (aiState.thinking){
    if (performance.now() >= aiState.releaseAt) { aiState.thinking=false; pointerUp(); }
    return;
  }
  if (aim.active || !state.holder || state.holder.team!=='B') return;

  // demora de "reaccion" antes de decidir, para que Facil se sienta mas lenta/torpe
  if (aiState.lastHolder !== state.holder){
    aiState.lastHolder = state.holder;
    aiState.readyAt = performance.now() + aiRangeMs(aiPreset().reactionMs);
  }
  if (performance.now() < aiState.readyAt) return;

  const preset = aiPreset();
  const holder = state.holder;
  let target, isShot, chargeMs;
  if (holder.isKeeper){
    const mates = players.filter(p=>p.team==='B' && !p.isKeeper);
    const mate = preset.bestMate ? aiPickMate(mates) : mates[Math.floor(Math.random()*mates.length)];
    target = { x: mate.x, y: mate.y };
    isShot = false; chargeMs = aiRangeMs(preset.keeperPassMs);
  } else if ((holder.role==='fwd' || holder.isCaptain) && holder.x < preset.shotRangeX){
    target = { x: 12, y: H/2 + (Math.random()*70-35) };
    isShot = true; chargeMs = aiRangeMs(preset.shotMs);
    if (preset.usePowers && hasPower('B','impulso')) activatePower('B','impulso');
  } else {
    const mates = players.filter(p=>p.team==='B' && p!==holder && p.x < holder.x-20);
    const mate = mates.length ? (preset.bestMate ? aiPickMate(mates) : mates[Math.floor(Math.random()*mates.length)])
                               : players.find(p=>p.team==='B'&&p.isCaptain);
    target = { x: mate.x, y: mate.y };
    isShot = false; chargeMs = aiRangeMs(preset.passMs);
  }

  // ruido en la puntaria: representa una decision menos afinada, no una mano mas torpe
  // (eso ya lo maneja la Precision del jugador al patear, ver applyPrecisionDeviation)
  const noise = preset.aimNoise;
  target = { x: target.x + (Math.random()*2-1)*noise, y: target.y + (Math.random()*2-1)*noise };

  aim.active = true; aim.charging = true; aim.startTime = performance.now();
  aim.x = target.x; aim.y = target.y;
  aiState.thinking = true;
  aiState.releaseAt = performance.now() + (isShot ? Math.min(chargeMs, settings.chargeMs) : chargeMs);
}

window.FulbitoGame = {
  // roster: arreglo de 7 {skills, name} (arquero, def, def, mid, mid, fwd, capitan) o null para volver al preset por defecto
  setPlayerRoster(roster){ rosterOverrideA = roster; },
  setPlayerRosterB(roster){ rosterOverrideB = roster; }, // ver "Selector de Jugador 2" (modo 2 jugadores)
  // colors: { A: '#rrggbb', B: '#rrggbb' } — cualquiera de los dos puede omitirse
  setTeamColors(colors){
    teamColors = { ...teamColors, ...(colors||{}) };
    document.documentElement.style.setProperty('--teamA', teamColors.A);
    document.documentElement.style.setProperty('--teamB', teamColors.B);
  },
  showModeMenu(){
    rosterOverrideB = null; teamColorFromLookupB = null; nameBStatus.textContent = '';
    mainMenuOverlay.classList.remove('hidden');
  },
};

resetPlayers();
draw();
requestAnimationFrame(loop);

})();
