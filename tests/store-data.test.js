const test = require('node:test');
const assert = require('node:assert/strict');

async function loadStoreData(){
  return import('../js/store-data.js');
}

test('cada jugador de campo suma exactamente 11 puntos entre sus 5 habilidades', async () => {
  const { STARTER_ROSTER, STORE_CATALOG, FIELD_SKILL_SUM, sumSkills } = await loadStoreData();
  const fieldPlayers = [...STARTER_ROSTER, ...STORE_CATALOG].filter(p => p.type === 'field');
  assert.ok(fieldPlayers.length > 0);
  for (const p of fieldPlayers){
    assert.equal(sumSkills(p.skills), FIELD_SKILL_SUM, `${p.name} (${p.id}) deberia sumar ${FIELD_SKILL_SUM}`);
  }
});

test('cada arquero suma exactamente 7 puntos entre sus 4 habilidades', async () => {
  const { STARTER_ROSTER, STORE_CATALOG, KEEPER_SKILL_SUM, sumSkills } = await loadStoreData();
  const keepers = [...STARTER_ROSTER, ...STORE_CATALOG].filter(p => p.type === 'keeper');
  assert.ok(keepers.length > 0);
  for (const p of keepers){
    assert.equal(sumSkills(p.skills), KEEPER_SKILL_SUM, `${p.name} (${p.id}) deberia sumar ${KEEPER_SKILL_SUM}`);
  }
});

test('ningun jugador de campo o arquero tiene mas puntos totales que otro de su tipo (sin pay to win)', async () => {
  // Redundante con los dos tests anteriores (si todos suman lo mismo, ninguno es "mas fuerte" en total),
  // pero lo dejamos explicito porque es la garantia central de la tienda que pide el documento de reglas.
  const { STARTER_ROSTER, STORE_CATALOG, sumSkills } = await loadStoreData();
  const all = [...STARTER_ROSTER, ...STORE_CATALOG];
  const fieldSums = new Set(all.filter(p => p.type === 'field').map(p => sumSkills(p.skills)));
  const keeperSums = new Set(all.filter(p => p.type === 'keeper').map(p => sumSkills(p.skills)));
  assert.equal(fieldSums.size, 1, 'todos los de campo deberian sumar el mismo total');
  assert.equal(keeperSums.size, 1, 'todos los arqueros deberian sumar el mismo total');
});

test('los ids del catalogo son unicos entre STARTER_ROSTER y STORE_CATALOG', async () => {
  const { STARTER_ROSTER, STORE_CATALOG } = await loadStoreData();
  const ids = [...STARTER_ROSTER, ...STORE_CATALOG].map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'hay un id repetido en el catalogo');
});

test('costos: el equipo inicial es gratis y nada en la tienda cuesta negativo', async () => {
  const { STARTER_ROSTER, STORE_CATALOG } = await loadStoreData();
  for (const p of STARTER_ROSTER) assert.equal(p.cost, 0, `${p.id} del equipo inicial deberia costar 0`);
  for (const p of STORE_CATALOG) assert.ok(p.cost > 0, `${p.id} deberia tener un costo positivo`);
});

test('todas las rarezas son valores conocidos', async () => {
  const { STARTER_ROSTER, STORE_CATALOG } = await loadStoreData();
  const known = new Set(['comun', 'rara', 'legendaria']);
  for (const p of [...STARTER_ROSTER, ...STORE_CATALOG]){
    assert.ok(known.has(p.rarity), `${p.id} tiene una rareza desconocida: ${p.rarity}`);
  }
});

test('STARTER_ROSTER tiene exactamente 7 jugadores: 1 arquero y 6 de campo', async () => {
  const { STARTER_ROSTER } = await loadStoreData();
  assert.equal(STARTER_ROSTER.length, 7);
  assert.equal(STARTER_ROSTER.filter(p => p.type === 'keeper').length, 1);
  assert.equal(STARTER_ROSTER.filter(p => p.type === 'field').length, 6);
});
