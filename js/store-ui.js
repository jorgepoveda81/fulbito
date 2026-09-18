// Pantalla "Tienda": comprar jugadores con monedas ganadas jugando (sin dinero real).
import { getCurrentUser, onAuthChange, addCoins, getAuthStatus } from './auth.js';
import { listOwnedPlayers, addOwnedPlayer } from './player-repo.js';
import { STORE_CATALOG } from './store-data.js';

const RARITY_LABEL = { comun: 'Comun', rara: 'Rara', legendaria: 'Legendaria' };

export function initStoreScreen(container){
  onAuthChange(() => renderStoreScreen(container));
  renderStoreScreen(container);
}

async function renderStoreScreen(container){
  const { status, error } = getAuthStatus();
  if (status === 'unconfigured'){
    container.innerHTML = `<div class="notice-card">La tienda necesita que se configure Firebase primero (ver <code>docs/FIREBASE_SETUP.md</code>).</div>`;
    return;
  }
  if (status === 'loading'){ container.innerHTML = `<div class="notice-card">Conectando tu cuenta...</div>`; return; }
  if (status === 'failed'){ container.innerHTML = `<div class="notice-card">&#9888; ${error}</div>`; return; }
  const user = getCurrentUser();
  if (!user){ container.innerHTML = `<div class="notice-card">Conectando tu cuenta...</div>`; return; }

  const owned = await listOwnedPlayers();
  const ownedTemplateIds = new Set(owned.map(p => p.templateId).filter(Boolean));

  container.innerHTML = `
    <div class="coins-badge">&#129689; Tenes ${user.coins||0} monedas &middot; se ganan jugando partidos</div>
    <div class="store-grid" id="storeGrid"></div>
  `;
  const grid = container.querySelector('#storeGrid');

  STORE_CATALOG.forEach(item => {
    const already = ownedTemplateIds.has(item.id);
    const card = document.createElement('div');
    card.className = `store-card rarity-${item.rarity}`;
    card.innerHTML = `
      <div class="store-card-top">
        <b>${item.name}</b>
        <span class="rarity-tag">${RARITY_LABEL[item.rarity]}</span>
      </div>
      <div class="store-card-role">${item.role}</div>
      <div class="store-card-skills">${describeSkills(item)}</div>
      <button class="reset-btn store-buy-btn" ${already || user.coins < item.cost ? 'disabled' : ''}>
        ${already ? 'Ya lo tenes' : `Comprar &middot; ${item.cost} &#129689;`}
      </button>
    `;
    const btn = card.querySelector('.store-buy-btn');
    if (!already){
      btn.onclick = async () => {
        if (user.coins < item.cost) return;
        btn.disabled = true; btn.textContent = 'Comprando...';
        await addCoins(-item.cost);
        await addOwnedPlayer({ name: item.name, type: item.type, role: item.role, skills: item.skills, source: 'store', templateId: item.id });
        renderStoreScreen(container);
      };
    }
    grid.appendChild(card);
  });
}

function describeSkills(item){
  if (item.type === 'keeper') return `Alt${item.skills.altura} Vel${item.skills.velocidad} Vol${item.skills.volada} Sal${item.skills.salto}`;
  return `Fue${item.skills.fuerza} Pas${item.skills.pase} Pre${item.skills.precision} Tir${item.skills.tiro} Def${item.skills.defensa}`;
}
