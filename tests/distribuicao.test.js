const test = require('node:test');
const assert = require('node:assert/strict');
const { distribuir, unidades } = require('../scripts/planejar-distribuicao-unidades');

test('rateio conserva cada quantidade, inclusive produtos de baixa disponibilidade', () => {
  assert.equal(unidades.length, 9);
  assert.equal(unidades.reduce((soma, unidade) => soma + unidade.peso, 0), 100);
  for (const quantidade of [0, 1, 4, 5, 7, 8, 9, 23, 58, 91, 1000]) {
    for (const produtoId of [1, 3, 16, 21]) {
      const rateio = distribuir(quantidade, produtoId);
      assert.equal(rateio.length, 9);
      assert.equal(rateio.reduce((soma, valor) => soma + valor, 0), quantidade);
      assert.ok(rateio.every(valor => Number.isSafeInteger(valor) && valor >= 0));
      assert.deepEqual(distribuir(quantidade, produtoId), rateio);
    }
  }
});

test('uma unidade escassa é direcionada à sede e empates alternam entre filiais', () => {
  assert.deepEqual(distribuir(1, 3), [1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.notDeepEqual(distribuir(4, 3), distribuir(4, 4));
});
