import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const matrixPath = resolve(root, 'docs/plans/2026-08-28-agent-failure-scenario-coverage.md');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.sql', '.json']);
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'docs']);
const sourceRoots = ['src', 'supabase', 'automation', 'scripts'];

async function collectSources(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectSources(path, files);
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const matrix = await readFile(matrixPath, 'utf8');
const scenarioRows = matrix.split(/\r?\n/).filter((line) => /^\| [A-Z]+-\d+ \|/.test(line));
function splitMarkdownRow(row) {
  const cells = [];
  let cell = '';
  let inCode = false;
  for (const character of row) {
    if (character === '`') inCode = !inCode;
    if (character === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
    } else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

const ids = scenarioRows.map((row) => splitMarkdownRow(row)[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

const sourceFiles = [];
for (const sourceRoot of sourceRoots) await collectSources(resolve(root, sourceRoot), sourceFiles);
const sourceEntries = [];
for (const path of sourceFiles) {
  sourceEntries.push({
    path: relative(root, path).replaceAll('\\', '/'),
    text: await readFile(path, 'utf8'),
  });
}

const missingEvidence = [];
for (const row of scenarioRows) {
  const cells = splitMarkdownRow(row);
  const id = cells[1];
  const evidence = cells[4] || '';
  const tokens = [...evidence.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());
  const traceable = tokens.some((token) => sourceEntries.some((entry) =>
    entry.path.includes(token) || entry.text.includes(token)
  ));
  if (!traceable) missingEvidence.push({ id, evidence, tokens });
}

const result = {
  scenarios: scenarioRows.length,
  duplicateIds: [...new Set(duplicateIds)],
  missingEvidence,
  ready: duplicateIds.length === 0 && missingEvidence.length === 0,
};
console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exitCode = 1;
