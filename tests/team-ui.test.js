const test = require('node:test');
const assert = require('node:assert/strict');

async function loadDescribeCareer(){
  const { describeCareer } = await import('../js/team-ui.js');
  return describeCareer;
}

test('describeCareer: sin partidos jugados no muestra nada', async () => {
  const describeCareer = await loadDescribeCareer();
  assert.equal(describeCareer({ type: 'field' }), '');
  assert.equal(describeCareer({ type: 'field', careerMatches: 0 }), '');
});

test('describeCareer: arquero muestra atajadas, no goles', async () => {
  const describeCareer = await loadDescribeCareer();
  const html = describeCareer({ type: 'keeper', careerMatches: 3, careerSaves: 7 });
  assert.match(html, /7 atajadas en 3 partidos/);
  assert.doesNotMatch(html, /goles/);
});

test('describeCareer: jugador de campo muestra goles/tiros con porcentaje', async () => {
  const describeCareer = await loadDescribeCareer();
  const html = describeCareer({ type: 'field', careerMatches: 4, careerGoals: 3, careerShots: 6 });
  assert.match(html, /3 goles en 6 tiros \(50%\)/);
  assert.match(html, /4 partidos/);
});

test('describeCareer: sin tiros registrados no muestra porcentaje (evita dividir por cero)', async () => {
  const describeCareer = await loadDescribeCareer();
  const html = describeCareer({ type: 'field', careerMatches: 1, careerGoals: 0, careerShots: 0 });
  assert.doesNotMatch(html, /%/);
  assert.match(html, /1 partido[^s]/); // singular, no "partidos"
});
