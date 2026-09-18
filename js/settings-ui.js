// Pantalla "Ajustes": lo unico que un jugador comun necesita tocar (sonido,
// vibracion). Nada de valores de balance del juego aca (eso es la pantalla
// de pruebas para desarrolladores, ver el modo desarrollador oculto en app.js).
export function initSettingsScreen(container){
  renderSettingsScreen(container);
}

function renderSettingsScreen(container){
  const prefs = (window.FulbitoPrefs && window.FulbitoPrefs.get()) || { sound: true, vibration: true };
  container.innerHTML = `
    <div class="home-card">
      <label class="setting-toggle">
        <input type="checkbox" id="prefSound" ${prefs.sound ? 'checked' : ''}>
        <span>&#128266; Sonido</span>
      </label>
      <label class="setting-toggle">
        <input type="checkbox" id="prefVibration" ${prefs.vibration ? 'checked' : ''}>
        <span>&#128241; Vibracion</span>
      </label>
      <p class="creator-hint">Estos ajustes se guardan en este celular.</p>
    </div>
  `;
  container.querySelector('#prefSound').onchange = e => window.FulbitoPrefs && window.FulbitoPrefs.setSound(e.target.checked);
  container.querySelector('#prefVibration').onchange = e => window.FulbitoPrefs && window.FulbitoPrefs.setVibration(e.target.checked);
}
