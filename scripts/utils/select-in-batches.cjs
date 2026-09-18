// Bound PostgREST IN filters: large UUID lists can exceed HTTP header limits.
// The caller still paginates every batch, so this does not cap result counts.
async function selectInBatches(ids, loadBatch) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const rows = [];
  for (let start = 0; start < uniqueIds.length; start += 100) {
    rows.push(...await loadBatch(uniqueIds.slice(start, start + 100)));
  }
  return rows;
}

module.exports = { selectInBatches };
