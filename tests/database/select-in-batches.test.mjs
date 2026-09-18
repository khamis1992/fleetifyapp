import assert from 'node:assert/strict';
import { it } from 'node:test';
import { selectInBatches } from '../../scripts/utils/select-in-batches.cjs';

it('bounds long ID filters and preserves all results across batches', async () => {
  const ids = Array.from({ length: 451 }, (_, index) => `id-${index}`);
  const calls = [];
  const rows = await selectInBatches([...ids, ids[0], null, ''], async batch => {
    calls.push(batch);
    // Multiple entries for one payment must not be lost.
    return batch.flatMap(id => [{ id: `${id}-original` }, { id: `${id}-reversal` }]);
  });
  assert.deepEqual(calls.map(batch => batch.length), [100, 100, 100, 100, 51]);
  assert.deepEqual(calls.flat(), ids);
  assert.equal(rows.length, 902);
  assert.equal(rows.at(-1).id, 'id-450-reversal');
});
it('does not query an empty filter', async () => {
  assert.deepEqual(await selectInBatches([], () => { throw Error('Unexpected query'); }), []);
});
it('propagates a failed batch instead of reporting a partial audit as successful', async () => {
  let calls = 0;
  await assert.rejects(selectInBatches(Array.from({ length: 201 }, (_, i) => i + 1), async () => {
    calls++;
    if (calls === 2) throw Error('Read failed');
    return [{ id: 1 }];
  }), /Read failed/);
  assert.equal(calls, 2);
});
