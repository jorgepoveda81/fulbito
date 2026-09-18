// Punto de entrada: arranca la sesion, arma las 3 pestañas (Inicio/Mi Equipo/Tienda)
// y hace de puente entre esas pantallas y el motor del partido en js/game.js.
import { initAuth, recordMatchResult } from './auth.js';
import { initHomeScreen } from './menu-ui.js';
import { initTeamScreen, buildRosterOverride } from './team-ui.js';
import { initStoreScreen } from './store-ui.js';

const appShell = document.getElementById('appShell');
const gameRoot = document.getElementById('gameRoot');
const tabs = document.querySelectorAll('.app-tab');
const screens = {
  home: document.getElementById('tabHome'),
  team: document.getElementById('tabTeam'),
  store: document.getElementById('tabStore'),
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

window.FulbitoGame.onMatchEnd = (result) => recordMatchResult(result);

initAuth();
