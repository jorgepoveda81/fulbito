// Pantalla de cuenta: crear cuenta (nombre + PIN), iniciar sesion, o jugar de invitado.
// No pide datos reales: el nombre y el PIN los elige el usuario, no hace falta email.
import { signUp, logIn, continueAsGuest } from './auth.js';

export function renderAuthGate(container){
  let mode = 'signup'; // 'signup' | 'login'

  function render(){
    container.innerHTML = `
      <div class="home-card">
        <div class="auth-toggle">
          <button class="auth-toggle-btn ${mode==='signup'?'active':''}" id="atSignup">Crear cuenta</button>
          <button class="auth-toggle-btn ${mode==='login'?'active':''}" id="atLogin">Ya tengo cuenta</button>
        </div>
        <label>Nombre de jugador</label>
        <input type="text" id="authName" maxlength="16" placeholder="Tu nombre">
        <label>PIN (4 numeros o mas)</label>
        <input type="password" inputmode="numeric" id="authPin" maxlength="10" placeholder="****">
        <button class="reset-btn" id="authSubmit">${mode==='signup' ? 'Crear cuenta' : 'Iniciar sesion'}</button>
        <div class="creator-msg" id="authMsg"></div>
      </div>
      <button class="reset-btn play-btn" id="authGuest" style="background:var(--panel2);">Jugar como invitado (sin cuenta)</button>
    `;
    container.querySelector('#atSignup').onclick = () => { mode='signup'; render(); };
    container.querySelector('#atLogin').onclick = () => { mode='login'; render(); };

    container.querySelector('#authSubmit').onclick = async () => {
      const name = container.querySelector('#authName').value.trim();
      const pin = container.querySelector('#authPin').value.trim();
      const msg = container.querySelector('#authMsg');
      if (!name){ msg.textContent = 'Ponete un nombre.'; return; }
      if (pin.length < 4){ msg.textContent = 'El PIN necesita al menos 4 numeros.'; return; }
      msg.textContent = 'Un momento...';
      const result = mode==='signup' ? await signUp(name, pin) : await logIn(name, pin);
      if (!result.ok) msg.textContent = result.error;
      // si funciono, onAuthChange en auth.js va a avisar y la pantalla de Inicio se re-dibuja sola
    };
    container.querySelector('#authGuest').onclick = async () => {
      const msg = container.querySelector('#authMsg');
      msg.textContent = 'Un momento...';
      const result = await continueAsGuest();
      if (!result.ok) msg.textContent = result.error;
    };
  }
  render();
}
