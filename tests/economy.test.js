const test = require('node:test');
const assert = require('node:assert/strict');

async function loadEconomy(){
  return import('../js/economy.js');
}

test('coinsForResult devuelve el monto correcto para cada resultado', async () => {
  const { coinsForResult } = await loadEconomy();
  assert.equal(coinsForResult('win'), 50);
  assert.equal(coinsForResult('draw'), 20);
  assert.equal(coinsForResult('loss'), 10);
});

test('ganar paga mas que empatar, y empatar mas que perder', async () => {
  const { coinsForResult } = await loadEconomy();
  assert.ok(coinsForResult('win') > coinsForResult('draw'));
  assert.ok(coinsForResult('draw') > coinsForResult('loss'));
});

test('un resultado desconocido no rompe: paga como una derrota, nunca de mas', async () => {
  const { coinsForResult, COINS_FOR_RESULT } = await loadEconomy();
  assert.equal(coinsForResult('algo-raro'), COINS_FOR_RESULT.loss);
});

test('nunca paga cero ni numeros negativos (siempre gana algo por jugar)', async () => {
  const { COINS_FOR_RESULT } = await loadEconomy();
  for (const amount of Object.values(COINS_FOR_RESULT)) assert.ok(amount > 0);
});
