import { runOrientationScan } from './runner.ts';
const value = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
try {
  const report = await runOrientationScan({ apply: process.argv.includes('--apply'),
    documentId: value('--document-id'), maxDocuments: Number(value('--max-documents')) || undefined,
    maxMinutes: Number(value('--max-minutes')) || undefined });
  const { results: _, ...summary } = report;
  console.log(JSON.stringify(summary));
  if (report.failed) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Orientation worker failed');
  process.exitCode = 1;
}
