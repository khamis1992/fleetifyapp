const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_DIRS = ['supabase/migrations', 'scripts'];
const TEXT_EXTENSIONS = new Set(['.sql', '.cjs', '.js', '.mjs', '.ts', '.tsx', '.json']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function countNullBytes(filePath) {
  const bytes = fs.readFileSync(filePath);
  let count = 0;
  for (const byte of bytes) {
    if (byte === 0) count += 1;
  }
  return { length: bytes.length, nullBytes: count };
}

function main() {
  const dirs = process.argv.slice(2);
  const scanDirs = (dirs.length > 0 ? dirs : DEFAULT_DIRS).map((dir) => path.resolve(ROOT, dir));
  const files = scanDirs.flatMap((dir) => walk(dir));
  const corrupted = [];

  for (const file of files) {
    const result = countNullBytes(file);
    if (result.nullBytes > 0) {
      corrupted.push({
        file: path.relative(ROOT, file),
        length: result.length,
        nullBytes: result.nullBytes,
      });
    }
  }

  console.log(JSON.stringify({
    scannedFiles: files.length,
    corruptedFiles: corrupted.length,
    corrupted,
  }, null, 2));

  if (corrupted.length > 0) {
    process.exitCode = 1;
  }
}

main();
