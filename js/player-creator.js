// Creador de jugador personalizado: repartir exactamente 11 puntos entre las 5
// habilidades de campo (seccion 3), o 7 entre las 4 de arquero, a eleccion.
import { addOwnedPlayer } from './player-repo.js';
import { FIELD_SKILL_SUM, KEEPER_SKILL_SUM } from './store-data.js';

const FIELD_SKILLS = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'pase', label: 'Pase' },
  { key: 'precision', label: 'Precision' },
  { key: 'tiro', label: 'Tiro' },
  { key: 'defensa', label: 'Defensa' },
];
const KEEPER_SKILLS = [
  { key: 'altura', label: 'Altura' },
  { key: 'velocidad', label: 'Velocidad' },
  { key: 'volada', label: 'Volada' },
  { key: 'salto', label: 'Salto' },
];
export const FIELD_DEFAULTS = { fuerza: 3, pase: 2, precision: 2, tiro: 2, defensa: 2 }; // suma 11
export const KEEPER_DEFAULTS = { altura: 2, velocidad: 2, volada: 2, salto: 1 }; // suma 7

export function renderPlayerCreator(container, { onSaved } = {}){
  let type = 'field'; // 'field' | 'keeper'
  let values = { ...FIELD_DEFAULTS };

  container.innerHTML = `
    <div class="creator-card">
      <h3>Crea tu propio jugador</h3>
      <div class="auth-toggle">
        <button class="auth-toggle-btn active" id="ctField">Jugador de campo</button>
        <button class="auth-toggle-btn" id="ctKeeper">Arquero</button>
      </div>
      <p class="creator-hint" id="creatorHint"></p>
      <input type="text" id="creatorName" maxlength="16" placeholder="Nombre de tu jugador" class="creator-name">
      <div id="creatorSliders"></div>
      <div class="creator-remaining" id="creatorRemaining"></div>
      <button class="reset-btn" id="creatorSave" disabled>Guardar jugador</button>
      <div class="creator-msg" id="creatorMsg"></div>
    </div>
  `;

  const hintEl = container.querySelector('#creatorHint');
  const slidersEl = container.querySelector('#creatorSliders');
  const remainingEl = container.querySelector('#creatorRemaining');
  const saveBtn = container.querySelector('#creatorSave');
  const msgEl = container.querySelector('#creatorMsg');
  const nameInput = container.querySelector('#creatorName');
  const ctField = container.querySelector('#ctField');
  const ctKeeper = container.querySelector('#ctKeeper');

  function skillsFor(){ return type === 'keeper' ? KEEPER_SKILLS : FIELD_SKILLS; }
  function sumFor(){ return type === 'keeper' ? KEEPER_SKILL_SUM : FIELD_SKILL_SUM; }

  function sumOthers(exceptKey){
    return skillsFor().reduce((acc, s) => acc + (s.key === exceptKey ? 0 : values[s.key]), 0);
  }
  function refresh(){
    const total = sumFor();
    const sum = skillsFor().reduce((acc, s) => acc + values[s.key], 0);
    const remaining = total - sum;
    remainingEl.textContent = remaining === 0
      ? `Puntos usados: ${total}/${total} - listo para guardar`
      : `Te quedan ${remaining} puntos por repartir`;
    remainingEl.classList.toggle('creator-remaining-ok', remaining === 0);
    saveBtn.disabled = remaining !== 0;
  }
  function buildSliders(){
    hintEl.textContent = type === 'keeper'
      ? `Repartí exactamente ${KEEPER_SKILL_SUM} puntos entre las 4 habilidades de arquero.`
      : `Repartí exactamente ${FIELD_SKILL_SUM} puntos entre las 5 habilidades. Sirve para un jugador de campo o tu capitan.`;
    slidersEl.innerHTML = '';
    skillsFor().forEach(s => {
      const row = document.createElement('div');
      row.className = 'creator-row';
      row.innerHTML = `
        <label>${s.label}: <output id="out_${s.key}">${values[s.key]}</output></label>
        <input type="range" min="0" max="${sumFor()}" value="${values[s.key]}" id="in_${s.key}">
      `;
      slidersEl.appendChild(row);
      const input = row.querySelector(`#in_${s.key}`);
      const out = row.querySelector(`#out_${s.key}`);
      input.oninput = () => {
        const maxAllowed = sumFor() - sumOthers(s.key);
        const v = Math.min(Number(input.value), maxAllowed);
        input.value = v;
        values[s.key] = v;
        out.textContent = v;
        refresh();
      };
    });
    refresh();
  }
  function selectType(newType){
    type = newType;
    values = { ...(newType === 'keeper' ? KEEPER_DEFAULTS : FIELD_DEFAULTS) };
    ctField.classList.toggle('active', newType === 'field');
    ctKeeper.classList.toggle('active', newType === 'keeper');
    buildSliders();
  }
  ctField.onclick = () => selectType('field');
  ctKeeper.onclick = () => selectType('keeper');
  buildSliders();

  saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name){ msgEl.textContent = 'Ponele un nombre primero.'; return; }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    const role = type === 'keeper' ? 'Arquero' : 'Personalizado';
    const id = await addOwnedPlayer({ name, type, role, skills: { ...values }, source: 'custom' });
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
