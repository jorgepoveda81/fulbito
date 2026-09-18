// Reglas puras de FULBITO: sin canvas, sin DOM, sin Firebase. Solo calculo,
// para poder testearlas de verdad (ver tests/rules-core.test.js) y para que
// js/game.js no repita esta logica mezclada con el dibujo y el estado del partido.
//
// Se carga como script clasico en el navegador (define window.FulbitoRules) y
// como modulo CommonJS en los tests de Node (module.exports) sin necesitar
// build ni dependencias — el mismo archivo sirve para los dos.
(function (root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.FulbitoRules = rules;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const FIELD_SKILL_SUM = 11; // seccion 3: Fuerza+Pase+Precision+Tiro+Defensa

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // suma de las 5 habilidades de un jugador de campo/capitan (objeto {fuerza,pase,...})
  function sumFieldSkills(skills) {
    return ['fuerza', 'pase', 'precision', 'tiro', 'defensa']
      .reduce((acc, k) => acc + (Number(skills[k]) || 0), 0);
  }
  // true si un jugador de campo/capitan respeta la regla de los 11 puntos (seccion 3)
  function isValidFieldSkills(skills) {
    return sumFieldSkills(skills) === FIELD_SKILL_SUM;
  }

  // reparte la suma configurable del arquero manteniendo la proporcion 2:2:2:1 del documento
  function gkSkills(total) {
    const ratios = [2, 2, 2, 1];
    const base = ratios.map(r => Math.round((r / 7) * total));
    const diff = total - base.reduce((a, b) => a + b, 0);
    base[2] += diff; // ajusta "volada" si el redondeo no cierra exacto
    return { altura: base[0], velocidad: base[1], volada: base[2], salto: base[3] };
  }

  // seccion 2: zona baja/media/alta segun que tan avanzado esta el jugador hacia
  // el arco rival (no segun en que mitad de la cancha esta parado)
  function bandOf(team, x, fieldWidth) {
    const advance = team === 'A' ? x : (fieldWidth - x);
    if (advance < fieldWidth / 3) return 'baja';
    if (advance < (2 * fieldWidth) / 3) return 'media';
    return 'alta';
  }

  // seccion 3: la fuerza estira la velocidad de tiro entre 0.55x y 1.45x
  function speedMultiplierFromFuerza(fuerza) {
    return 0.55 + (fuerza / FIELD_SKILL_SUM) * 0.9;
  }

  // seccion 8: probabilidad de intercepcion segun Defensa del que defiende vs.
  // Tiro/Pase de quien ataca, acotada para que nunca sea imposible ni segura
  function interceptionChance(defenseSkill, attackSkill, min, max) {
    min = min === undefined ? 0.15 : min;
    max = max === undefined ? 0.85 : max;
    return clamp(defenseSkill / (defenseSkill + attackSkill), min, max);
  }

  // seccion 9: por debajo de este umbral de velocidad el arquero controla el
  // balon del todo; por encima, solo lo desvia (rebote)
  function keeperCatchThreshold(gk) {
    const catchSkill = (gk.altura + gk.velocidad + gk.volada + gk.salto) / 4;
    return 200 + catchSkill * 70;
  }

  // secciones 5 y 7: a quien le queda el balon cuando se detiene dentro de una
  // o mas auras. candidates: [{ id, dist, auraTimeMs }] (dist = distancia del
  // centro del balon al centro de esa aura). varThresholdPx = umbral configurado
  // (settings.varThreshold * settings.auraRadius) ya resuelto por quien llama.
  // Devuelve { winnerId } o { tie:true } (empate exacto: nadie recibe posesion).
  function resolvePossession(candidates, varThresholdPx) {
    if (!candidates.length) return { winnerId: null };
    const sorted = candidates.slice().sort((a, b) => a.dist - b.dist);
    if (sorted.length === 1) return { winnerId: sorted[0].id };
    const d1 = sorted[0].dist, d2 = sorted[1].dist;
    if (Math.abs(d1 - d2) <= varThresholdPx) {
      const t1 = sorted[0].auraTimeMs || 0, t2 = sorted[1].auraTimeMs || 0;
      if (t1 === t2) return { tie: true };
      return { winnerId: t1 >= t2 ? sorted[0].id : sorted[1].id };
    }
    return { winnerId: sorted[0].id };
  }

  // secciones 10/12: decide que pasa despues de que un equipo patea en la tanda de
  // penales. current: { team, scoreA, scoreB, kicksLeft:{A,B} } — team es quien acaba
  // de patear. Devuelve { finished, winner, team, kicksLeft } — si finished es false,
  // team/kicksLeft son el estado para la proxima patada; si es true, winner ('A'|'B')
  // ya decidio (nunca hay empate en penales). Empate tras agotar los tiros iniciales
  // de los dos equipos -> muerte subita: kicksLeft se resetea a 1 para cada uno.
  function advancePenaltyState(current) {
    const kicksLeft = { A: current.kicksLeft.A, B: current.kicksLeft.B };
    kicksLeft[current.team] -= 1;
    const otherTeam = current.team === 'A' ? 'B' : 'A';
    const bothDone = kicksLeft.A <= 0 && kicksLeft.B <= 0;
    if (bothDone && current.scoreA !== current.scoreB) {
      return { finished: true, winner: current.scoreA > current.scoreB ? 'A' : 'B', team: null, kicksLeft };
    }
    if (bothDone && current.scoreA === current.scoreB) {
      kicksLeft.A = 1;
      kicksLeft.B = 1;
    }
    return { finished: false, winner: null, team: otherTeam, kicksLeft };
  }

  return {
    FIELD_SKILL_SUM,
    clamp,
    sumFieldSkills,
    isValidFieldSkills,
    gkSkills,
    bandOf,
    speedMultiplierFromFuerza,
    interceptionChance,
    keeperCatchThreshold,
    resolvePossession,
    advancePenaltyState,
  };
});
