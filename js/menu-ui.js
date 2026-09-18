// Pantalla "Inicio": cuenta, monedas y el boton para arrancar a jugar.
import { getCurrentUser, onAuthChange, setUsername, getAuthStatus, signOutUser } from './auth.js';
import { renderAuthGate } from './auth-ui.js';

let showUpgradeGate = false; // true: invitado pidio crear cuenta / iniciar sesion, sin cerrar su sesion de invitado

export function initHomeScreen(container, { onPlay }){
  onAuthChange(() => renderHomeScreen(container, onPlay));
  renderHomeScreen(container, onPlay);
}

function renderHomeScreen(container, onPlay){
  const { status, error } = getAuthStatus();

  if (status === 'loading'){
    container.innerHTML = `<div class="home-card"><p class="creator-hint">Conectando...</p></div>`;
    return;
  }
  if (status === 'failed'){
    container.innerHTML = `<div class="home-card"><p class="creator-hint">&#9888; ${error}</p></div>`;
    return;
  }
  if (status === 'unconfigured'){
    container.innerHTML = `
      <div class="home-card"><p class="creator-hint">Jugando en modo local: Mi Equipo y la Tienda se guardan del todo cuando se configure Firebase (ver README).</p></div>
      <button class="reset-btn play-btn" id="homePlayBtn">&#9917; Jugar</button>
    `;
    container.querySelector('#homePlayBtn').onclick = onPlay;
    return;
  }
  if (status === 'signedOut'){
    showUpgradeGate = false;
    renderAuthGate(container);
    return;
  }

  const user = getCurrentUser();
  if (user.isAnonymous && showUpgradeGate){
    renderAuthGate(container);
    const back = document.createElement('button');
    back.className = 'back-to-menu';
    back.textContent = '← Seguir de invitado';
    back.onclick = () => { showUpgradeGate = false; renderHomeScreen(container, onPlay); };
    container.prepend(back);
    return;
  }

  container.innerHTML = `
    <div class="home-card">
      <label>Tu nombre de jugador</label>
      <input type="text" id="homeUsername" maxlength="16" placeholder="Ponete un nombre" value="${(user.username||'').replace(/"/g,'')}">
      <div class="coins-badge">&#129689; ${user.coins||0} monedas &middot; ${user.wins||0}V ${user.draws||0}E ${user.losses||0}D</div>
      ${user.isAnonymous ? `<p class="creator-hint">Jugando de invitado. Si creas una cuenta con nombre+PIN, podes volver a ella desde cualquier celular sin perder tu equipo.</p>` : ''}
    </div>
    <button class="reset-btn play-btn" id="homePlayBtn">&#9917; Jugar</button>
    <div class="home-blurb">Elegi tu equipo en <b>Mi Equipo</b> y sumate jugadores nuevos en la <b>Tienda</b> jugando partidos.</div>
    <button class="back-to-menu" id="homeAccountBtn">${user.isAnonymous ? 'Crear cuenta / iniciar sesion' : 'Cerrar sesion (para que juegue otra persona)'}</button>
  `;
  container.querySelector('#homeUsername').onchange = e => setUsername(e.target.value.trim().slice(0,16));
  container.querySelector('#homePlayBtn').onclick = onPlay;
  container.querySelector('#homeAccountBtn').onclick = () => {
    if (user.isAnonymous){ showUpgradeGate = true; renderHomeScreen(container, onPlay); }
    else signOutUser();
  };
}
