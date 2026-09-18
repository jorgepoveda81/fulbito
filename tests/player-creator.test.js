const test = require('node:test');
const assert = require('node:assert/strict');

test('los valores iniciales del creador de jugador ya suman el total correcto', async () => {
  const { FIELD_DEFAULTS, KEEPER_DEFAULTS } = await import('../js/player-creator.js');
  const { FIELD_SKILL_SUM, KEEPER_SKILL_SUM, sumSkills } = await import('../js/store-data.js');
  assert.equal(sumSkills(FIELD_DEFAULTS), FIELD_SKILL_SUM);
  assert.equal(sumSkills(KEEPER_DEFAULTS), KEEPER_SKILL_SUM);
});
