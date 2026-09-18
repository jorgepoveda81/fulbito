// Punto de entrada: arranca la sesion, arma las 3 pestañas (Inicio/Mi Equipo/Tienda)
// y hace de puente entre esas pantallas y el motor del partido en js/game.js.
import { initAuth, recordMatchResult, getCurrentUser } from './auth.js';
import { initHomeScreen } from './menu-ui.js';
import { initTeamScreen, buildRosterOverride } from './team-ui.js';
import { initStoreScreen } from './store-ui.js';
import { initSettingsScreen } from './settings-ui.js';
import { addCareerStats, lookupPublicAccount } from './player-repo.js';

const DEFAULT_COLOR_A = '#2f6fe0';
const DEFAULT_COLOR_B = '#e0432f'; // color de arranque del Equipo B; si en modo 2 jugadores se encuentra
// su cuenta por nombre, game.js pisa este color con el suyo (ver el buscador de "Jugador 2" en game.js)

const appShell = document.getElementById('appShell');
const gameRoot = document.getElementById('gameRoot');
const tabs = document.querySelectorAll('.app-tab');
const screens = {
  home: document.getElementById('tabHome'),
  team: document.getElementById('tabTeam'),
  store: document.getElementById('tabStore'),
  settings: document.getElementById('tabSettings'),
};

tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    Object.entries(screens).forEach(([key, el]) => el.classList.toggle('hidden', key !== tab.dataset.tab));
  };
});

async function goPlay(){
  const roster = await buildRosterOverride();
  window.FulbitoGame.setPlayerRoster(roster); // null si no hay cuenta/equipo guardado: usa el preset de siempre

  const user = getCurrentUser();
  let colorA = (user && user.color) || DEFAULT_COLOR_A;
  if (colorA === DEFAULT_COLOR_B) colorA = DEFAULT_COLOR_A; // no pueden coincidir con el Equipo B
  window.FulbitoGame.setTeamColors({ A: colorA, B: DEFAULT_COLOR_B });

  appShell.classList.add('hidden');
  gameRoot.classList.remove('hidden');
  window.FulbitoGame.showModeMenu();
}
document.getElementById('backToMenu').onclick = () => {
  gameRoot.classList.add('hidden');
  appShell.classList.remove('hidden');
};

initHomeScreen(screens.home, { onPlay: goPlay });
initTeamScreen(screens.team);
initStoreScreen(screens.store);
initSettingsScreen(screens.settings);

// Modo desarrollador oculto: tocar el titulo 5 veces seguidas (en menos de 3s)
// muestra la pantalla de pruebas para ajustar valores del juego (abajo de la
// cancha). Los jugadores comunes no la necesitan ni la ven; sus ajustes reales
// (sonido/vibracion) estan en la pestaña "Ajustes" de arriba.
(function initDevMode(){
  const DEV_KEY = 'fulbito_devmode';
  const title = document.getElementById('appTitle');
  const devPanel = document.getElementById('devPanel');
  if (!title || !devPanel) return;
  if (localStorage.getItem(DEV_KEY) === '1') devPanel.classList.remove('hidden');

  let taps = 0, tapTimer = null;
  title.addEventListener('click', () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 3000);
    if (taps >= 5){
      taps = 0;
      const nowOn = devPanel.classList.toggle('hidden') === false;
      try { localStorage.setItem(DEV_KEY, nowOn ? '1' : '0'); } catch(e){}
    }
  });
})();

window.FulbitoGame.onMatchEnd = (result, statsForA) => {
  recordMatchResult(result);
  if (statsForA && statsForA.length) addCareerStats(statsForA);
};

// Bridge para que el selector de "Jugador 2" (dentro de js/game.js, un script comun sin
// import) pueda buscar cuentas por nombre sin tener acceso directo a Firestore.
window.FulbitoAccounts = { lookupPlayer2: lookupPublicAccount };

initAuth();
