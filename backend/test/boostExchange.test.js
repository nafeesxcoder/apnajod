const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EXCHANGE } = require('../src/services/coinService');

test('a Boost can be swapped for 1000 coins, like a Spark or a Super Like', () => {
  assert.deepEqual(EXCHANGE.boost, { coins: 1000, credit: 'boost', label: '1 Boost' });
  assert.equal(EXCHANGE.superlike.coins, 400);
  assert.equal(EXCHANGE.spark.coins, 150);
});
