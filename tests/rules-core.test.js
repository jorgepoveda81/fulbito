const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/rules-core.js');

test('sumFieldSkills/isValidFieldSkills respetan la suma de 11 (seccion 3)', () => {
  const ok = { fuerza: 3, pase: 2, precision: 3, tiro: 2, defensa: 1 };
  assert.equal(R.sumFieldSkills(ok), 11);
  assert.equal(R.isValidFieldSkills(ok), true);

  const bad = { fuerza: 3, pase: 2, precision: 3, tiro: 2, defensa: 2 };
  assert.equal(R.sumFieldSkills(bad), 12);
  assert.equal(R.isValidFieldSkills(bad), false);
});

test('gkSkills reparte proporcion 2:2:2:1 y el total suma exacto', () => {
  for (const total of [7, 8, 10, 14, 21]) {
    const sk = R.gkSkills(total);
    assert.equal(sk.altura + sk.velocidad + sk.volada + sk.salto, total);
  }
  const sk7 = R.gkSkills(7);
  assert.deepEqual(sk7, { altura: 2, velocidad: 2, volada: 2, salto: 1 });
});

test('bandOf clasifica segun avance hacia el arco rival, no la mitad fisica', () => {
  const W = 900;
  // Equipo A avanza de x=0 (propio arco) a x=W (arco rival)
  assert.equal(R.bandOf('A', 0, W), 'baja');
  assert.equal(R.bandOf('A', W / 2, W), 'media');
  assert.equal(R.bandOf('A', W - 1, W), 'alta');
  // Equipo B avanza al reves: x=W es su propio arco, x=0 es el arco rival
  assert.equal(R.bandOf('B', W - 1, W), 'baja');
  assert.equal(R.bandOf('B', W / 2, W), 'media');
  assert.equal(R.bandOf('B', 0, W), 'alta');
});

test('speedMultiplierFromFuerza va de 0.55x a 1.45x', () => {
  assert.equal(R.speedMultiplierFromFuerza(0), 0.55);
  assert.ok(Math.abs(R.speedMultiplierFromFuerza(11) - 1.45) < 1e-9);
});

test('interceptionChance queda acotada entre 0.15 y 0.85', () => {
  assert.equal(R.interceptionChance(0, 100), 0.15);
  assert.equal(R.interceptionChance(100, 0), 0.85);
  assert.equal(R.interceptionChance(5, 5), 0.5);
});

test('keeperCatchThreshold sube con las habilidades del arquero', () => {
  const low = R.keeperCatchThreshold({ altura: 1, velocidad: 1, volada: 1, salto: 1 });
  const high = R.keeperCatchThreshold({ altura: 3, velocidad: 3, volada: 3, salto: 2 });
  assert.ok(high > low);
  assert.equal(low, 200 + 1 * 70);
});

test('resolvePossession: un solo candidato gana directo', () => {
  const r = R.resolvePossession([{ id: 'a', dist: 10, auraTimeMs: 0 }], 5);
  assert.deepEqual(r, { winnerId: 'a' });
});

test('resolvePossession: fuera del umbral gana el mas cercano', () => {
  const r = R.resolvePossession(
    [{ id: 'a', dist: 50, auraTimeMs: 0 }, { id: 'b', dist: 10, auraTimeMs: 0 }],
    5
  );
  assert.deepEqual(r, { winnerId: 'b' });
});

test('resolvePossession: dentro del umbral desempata por mas tiempo en el aura', () => {
  const r = R.resolvePossession(
    [{ id: 'a', dist: 10, auraTimeMs: 300 }, { id: 'b', dist: 12, auraTimeMs: 500 }],
    5
  );
  assert.deepEqual(r, { winnerId: 'b' });
});

test('resolvePossession: empate exacto de distancia y tiempo no da posesion a nadie', () => {
  const r = R.resolvePossession(
    [{ id: 'a', dist: 10, auraTimeMs: 200 }, { id: 'b', dist: 11, auraTimeMs: 200 }],
    5
  );
  assert.deepEqual(r, { tie: true });
});

test('advancePenaltyState: ronda normal, pasa el turno al otro equipo sin terminar', () => {
  const r = R.advancePenaltyState({ team: 'A', scoreA: 1, scoreB: 0, kicksLeft: { A: 3, B: 3 } });
  assert.deepEqual(r, { finished: false, winner: null, team: 'B', kicksLeft: { A: 2, B: 3 } });
});

test('advancePenaltyState: termina con ganador claro cuando los dos ya patearon todo', () => {
  const r = R.advancePenaltyState({ team: 'B', scoreA: 2, scoreB: 1, kicksLeft: { A: 0, B: 1 } });
  assert.equal(r.finished, true);
  assert.equal(r.winner, 'A');
});

test('advancePenaltyState: empate tras los tiros iniciales entra en muerte subita', () => {
  const r = R.advancePenaltyState({ team: 'B', scoreA: 2, scoreB: 2, kicksLeft: { A: 0, B: 1 } });
  assert.equal(r.finished, false);
  assert.equal(r.winner, null);
  assert.deepEqual(r.kicksLeft, { A: 1, B: 1 });
});

test('advancePenaltyState: una ronda de muerte subita con resultado distinto termina el partido', () => {
  const r = R.advancePenaltyState({ team: 'B', scoreA: 3, scoreB: 2, kicksLeft: { A: 0, B: 1 } });
  assert.equal(r.finished, true);
  assert.equal(r.winner, 'A');
});

test('advancePenaltyState: no termina mientras al otro equipo le queden tiros, sin importar el marcador', () => {
  const r = R.advancePenaltyState({ team: 'A', scoreA: 2, scoreB: 1, kicksLeft: { A: 1, B: 1 } });
  assert.equal(r.finished, false);
  assert.equal(r.team, 'B');
  assert.deepEqual(r.kicksLeft, { A: 0, B: 1 });
});

test('advancePenaltyState: si la muerte subita sigue empatada, se extiende otra ronda mas', () => {
  const r = R.advancePenaltyState({ team: 'A', scoreA: 2, scoreB: 2, kicksLeft: { A: 1, B: 0 } });
  assert.equal(r.finished, false);
  assert.equal(r.winner, null);
  assert.deepEqual(r.kicksLeft, { A: 1, B: 1 }); // otra vuelta de muerte subita
});
