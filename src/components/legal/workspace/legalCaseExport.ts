/** UTF-8 CSV with spreadsheet-formula neutralization for user-entered fields. */
export function legalCaseCsv(rows: Array<Array<string | number | null | undefined>>) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const raw = String(value ?? '');
    const safe = typeof value === 'number' ? raw : /^[\s]*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}

export function downloadLegalCases(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `القضايا-المعروضة-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
