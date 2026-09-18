// Pantalla "Inicio": bienvenida, monedas y el boton para arrancar a jugar.
import { isFirebaseConfigured } from './firebase-init.js';
import { getCurrentUser, onAuthChange, setUsername } from './auth.js';

export function initHomeScreen(container, { onPlay }){
  onAuthChange(() => renderHomeScreen(container, onPlay));
  renderHomeScreen(container, onPlay);
}

function renderHomeScreen(container, onPlay){
  const user = isFirebaseConfigured ? getCurrentUser() : null;

  container.innerHTML = `
    <div class="home-card">
      ${isFirebaseConfigured && !user ? `<p class="creator-hint">Conectando tu cuenta...</p>` : ''}
      ${user ? `
        <label>Tu nombre de jugador</label>
        <input type="text" id="homeUsername" maxlength="16" placeholder="Ponete un nombre" value="${(user.username||'').replace(/"/g,'')}">
        <div class="coins-badge">&#129689; ${user.coins||0} monedas &middot; ${user.wins||0}V ${user.draws||0}E ${user.losses||0}D</div>
      ` : ''}
      ${!isFirebaseConfigured ? `<p class="creator-hint">Jugando en modo local: Mi Equipo y la Tienda se guardan del todo cuando se configure Firebase (ver README).</p>` : ''}
    </div>
    <button class="reset-btn play-btn" id="homePlayBtn">&#9917; Jugar</button>
    <div class="home-blurb">Elegi tu equipo en <b>Mi Equipo</b> y sumate jugadores nuevos en la <b>Tienda</b> jugando partidos.</div>
  `;

  if (user){
    container.querySelector('#homeUsername').onchange = e => setUsername(e.target.value.trim().slice(0,16));
  }
  container.querySelector('#homePlayBtn').onclick = onPlay;
}
