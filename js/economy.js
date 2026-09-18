// Cuanto se gana jugando: nunca con dinero real, solo jugando partidos (ver README).
// Chico y separado para poder testearlo (tests/economy.test.js) sin tocar Firebase.
export const COINS_FOR_RESULT = { win: 50, draw: 20, loss: 10 };

export function coinsForResult(result){
  return COINS_FOR_RESULT[result] ?? COINS_FOR_RESULT.loss;
}
