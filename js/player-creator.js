// Creador de jugador personalizado: repartir exactamente 11 puntos entre las 5
// habilidades (seccion 3 de las reglas). Sirve para armar tu propio capitan o
// cualquier jugador de campo.
import { addOwnedPlayer } from './player-repo.js';
import { FIELD_SKILL_SUM } from './store-data.js';

const SKILLS = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'pase', label: 'Pase' },
  { key: 'precision', label: 'Precision' },
  { key: 'tiro', label: 'Tiro' },
  { key: 'defensa', label: 'Defensa' },
];

export function renderPlayerCreator(container, { onSaved } = {}){
  const values = { fuerza: 3, pase: 2, precision: 2, tiro: 2, defensa: 2 }; // arranca sumando 11

  container.innerHTML = `
    <div class="creator-card">
      <h3>Crea tu propio jugador</h3>
      <p class="creator-hint">Repartí exactamente ${FIELD_SKILL_SUM} puntos entre las 5 habilidades. Sirve para un jugador de campo o tu capitan.</p>
      <input type="text" id="creatorName" maxlength="16" placeholder="Nombre de tu jugador" class="creator-name">
      <div id="creatorSliders"></div>
      <div class="creator-remaining" id="creatorRemaining"></div>
      <button class="reset-btn" id="creatorSave" disabled>Guardar jugador</button>
      <div class="creator-msg" id="creatorMsg"></div>
    </div>
  `;

  const slidersEl = container.querySelector('#creatorSliders');
  SKILLS.forEach(s => {
    const row = document.createElement('div');
    row.className = 'creator-row';
    row.innerHTML = `
      <label>${s.label}: <output id="out_${s.key}">${values[s.key]}</output></label>
      <input type="range" min="0" max="${FIELD_SKILL_SUM}" value="${values[s.key]}" id="in_${s.key}">
    `;
    slidersEl.appendChild(row);
  });

  const remainingEl = container.querySelector('#creatorRemaining');
  const saveBtn = container.querySelector('#creatorSave');
  const msgEl = container.querySelector('#creatorMsg');
  const nameInput = container.querySelector('#creatorName');

  function sumOthers(exceptKey){
    return SKILLS.reduce((acc, s) => acc + (s.key === exceptKey ? 0 : values[s.key]), 0);
  }
  function refresh(){
    const sum = SKILLS.reduce((acc, s) => acc + values[s.key], 0);
    const remaining = FIELD_SKILL_SUM - sum;
    remainingEl.textContent = remaining === 0
      ? 'Puntos usados: 11/11 - listo para guardar'
      : `Te quedan ${remaining} puntos por repartir`;
    remainingEl.classList.toggle('creator-remaining-ok', remaining === 0);
    saveBtn.disabled = remaining !== 0;
  }
  SKILLS.forEach(s => {
    const input = container.querySelector(`#in_${s.key}`);
    const out = container.querySelector(`#out_${s.key}`);
    input.oninput = () => {
      const maxAllowed = FIELD_SKILL_SUM - sumOthers(s.key);
      const v = Math.min(Number(input.value), maxAllowed);
      input.value = v;
      values[s.key] = v;
      out.textContent = v;
      refresh();
    };
  });
  refresh();

  saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name){ msgEl.textContent = 'Ponele un nombre primero.'; return; }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    const id = await addOwnedPlayer({ name, type: 'field', role: 'Personalizado', skills: { ...values }, source: 'custom' });
    if (id){
      msgEl.textContent = `${name} se guardo en tu coleccion.`;
      nameInput.value = '';
      if (onSaved) onSaved();
    } else {
      msgEl.textContent = 'Necesitas tener la cuenta configurada para guardar jugadores (ver Ajustes de Firebase).';
    }
    saveBtn.textContent = 'Guardar jugador';
    refresh();
  };
}
