export function pageNumbers(current: number, total: number): number[] {
  const length = Math.min(5, Math.max(0, total));
  const start = Math.max(1, Math.min(current - 2, total - length + 1));
  return Array.from({ length }, (_, index) => start + index);
}

export function operationsCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}

export function downloadOperationsCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob([operationsCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
