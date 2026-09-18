// Pantalla "Mi Equipo": elegir que jugador de tu coleccion va en cada puesto.
import { getCurrentUser, onAuthChange, setUsername, setColor, getAuthStatus } from './auth.js';
import { listOwnedPlayers, getTeam, saveTeam, grantStarterRosterIfEmpty } from './player-repo.js';
import { renderPlayerCreator } from './player-creator.js';
import { TEAM_COLOR_PALETTE } from './store-data.js';

const SLOTS = [
  { key: 'keeper', label: 'Arquero', type: 'keeper' },
  { key: 'def1', label: 'Defensor 1', type: 'field' },
  { key: 'def2', label: 'Defensor 2', type: 'field' },
  { key: 'mid1', label: 'Mediocampista 1', type: 'field' },
  { key: 'mid2', label: 'Mediocampista 2', type: 'field' },
  { key: 'fwd', label: 'Delantero', type: 'field' },
  { key: 'captain', label: 'Capitan (movil)', type: 'field' },
];

export function initTeamScreen(container){
  onAuthChange(() => renderTeamScreen(container));
  renderTeamScreen(container);
}

async function renderTeamScreen(container){
  const { status, error } = getAuthStatus();
  if (status === 'unconfigured'){
    container.innerHTML = `<div class="notice-card">Todavia falta configurar Firebase para guardar tu equipo (ver <code>docs/FIREBASE_SETUP.md</code>). Mientras tanto el partido usa el equipo por defecto.</div>`;
    return;
  }
  if (status === 'loading'){ container.innerHTML = `<div class="notice-card">Conectando tu cuenta...</div>`; return; }
  if (status === 'failed'){ container.innerHTML = `<div class="notice-card">&#9888; ${error}</div>`; return; }
  const user = getCurrentUser();
  if (!user){ container.innerHTML = `<div class="notice-card">Conectando tu cuenta...</div>`; return; }

  const [owned] = await Promise.all([grantStarterRosterIfEmpty()]);
  const savedTeam = await getTeam();
  const roster = savedTeam ? { ...savedTeam.roster } : defaultRosterFrom(owned);

  container.innerHTML = `
    <div class="profile-card">
      <label>Tu nombre de jugador</label>
      <input type="text" id="teamUsername" maxlength="16" placeholder="Ponete un nombre" value="${escapeHtml(user.username||'')}">
      <label>Color de tu equipo</label>
      <div class="color-swatches" id="colorSwatches">
        ${TEAM_COLOR_PALETTE.map(c => `<button class="color-swatch ${c===(user.color||'#2f6fe0')?'selected':''}" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`).join('')}
      </div>
    </div>
    <div class="coins-badge">&#129689; ${user.coins||0} monedas &middot; ${user.wins||0}V ${user.draws||0}E ${user.losses||0}D</div>
    <div class="roster-card">
      <h3>Tu formacion</h3>
      <div id="rosterSlots"></div>
      <button class="reset-btn" id="teamSaveBtn">Guardar equipo</button>
      <div class="creator-msg" id="teamSaveMsg"></div>
    </div>
    <div id="playerCreatorHost"></div>
    <div class="collection-card">
      <h3>Tu coleccion (${owned.length})</h3>
      <div class="collection-grid" id="collectionGrid"></div>
    </div>
  `;

  container.querySelector('#teamUsername').onchange = e => setUsername(e.target.value.trim().slice(0,16));
  container.querySelectorAll('.color-swatch').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      setColor(btn.dataset.color);
    };
  });

  const slotsEl = container.querySelector('#rosterSlots');
  SLOTS.forEach(slot => {
    const options = owned.filter(p => p.type === slot.type);
    const row = document.createElement('div');
    row.className = 'roster-row';
    row.innerHTML = `<label>${slot.label}</label>
      <select id="slot_${slot.key}">
        <option value="">- elegir -</option>
        ${options.map(p => `<option value="${p.id}" ${roster[slot.key]===p.id?'selected':''}>${escapeHtml(p.name)} (${describeSkills(p)})</option>`).join('')}
      </select>`;
    slotsEl.appendChild(row);
  });

  container.querySelector('#teamSaveBtn').onclick = async () => {
    const newRoster = {};
    let missing = false;
    SLOTS.forEach(slot => {
      const val = container.querySelector(`#slot_${slot.key}`).value;
      if (!val) missing = true;
      newRoster[slot.key] = val;
    });
    const msg = container.querySelector('#teamSaveMsg');
    if (missing){ msg.textContent = 'Elegi un jugador para cada puesto.'; return; }
    await saveTeam(newRoster);
    msg.textContent = 'Equipo guardado. Ya se usa cuando toques Jugar.';
  };

  renderPlayerCreator(container.querySelector('#playerCreatorHost'), {
    onSaved: () => renderTeamScreen(container),
  });

  const grid = container.querySelector('#collectionGrid');
  owned.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-chip';
    card.innerHTML = `<b>${escapeHtml(p.name)}</b><span>${p.role} &middot; ${describeSkills(p)}</span>${describeCareer(p)}`;
    grid.appendChild(card);
  });
}

// Historial de carrera del jugador (se acumula partido a partido, ver addCareerStats
// en player-repo.js). El arquero muestra atajadas en vez de goles/precision de tiro.
export function describeCareer(p){
  if (!p.careerMatches) return '';
  const matchWord = p.careerMatches===1 ? 'partido' : 'partidos';
  if (p.type === 'keeper'){
    return `<span>&#128737; ${p.careerSaves||0} atajadas en ${p.careerMatches} ${matchWord}</span>`;
  }
  const goals = p.careerGoals||0, shots = p.careerShots||0;
  const accuracy = shots > 0 ? ` (${Math.round((goals/shots)*100)}%)` : '';
  return `<span>&#127942; ${goals} goles en ${shots} tiros${accuracy} &middot; ${p.careerMatches} ${matchWord}</span>`;
}

function defaultRosterFrom(owned){
  const bySource = id => owned.find(p => p.templateId === id);
  return {
    keeper: bySource('st-gk')?.id || '',
    def1: bySource('st-d1')?.id || '',
    def2: bySource('st-d2')?.id || '',
    mid1: bySource('st-m1')?.id || '',
    mid2: bySource('st-m2')?.id || '',
    fwd: bySource('st-f1')?.id || '',
    captain: bySource('st-c1')?.id || '',
  };
}
function describeSkills(p){
  if (p.type === 'keeper') return `Alt${p.skills.altura} Vel${p.skills.velocidad} Vol${p.skills.volada} Sal${p.skills.salto}`;
  return `Fue${p.skills.fuerza} Pas${p.skills.pase} Pre${p.skills.precision} Tir${p.skills.tiro} Def${p.skills.defensa}`;
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Convierte el equipo guardado al formato que espera game.js (7 posiciones en orden fijo).
export async function buildRosterOverride(){
  if (getAuthStatus().status !== 'ready' || !getCurrentUser()) return null;
  const [owned, team] = await Promise.all([listOwnedPlayers(), getTeam()]);
  if (!team) return null;
  const order = ['keeper','def1','def2','mid1','mid2','fwd','captain'];
  const result = order.map(key => {
    const p = owned.find(pl => pl.id === team.roster[key]);
    return p ? { skills: p.skills, name: p.name } : null;
  });
  return result.every(Boolean) ? result : null;
}
