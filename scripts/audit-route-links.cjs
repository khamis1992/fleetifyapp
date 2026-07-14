const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');
const routeSource = fs.readFileSync(path.join(srcRoot, 'routes', 'index.ts'), 'utf8');
const routes = [...routeSource.matchAll(/\bpath:\s*['"]([^'"]+)['"]/g)]
  .map((match) => match[1])
  .filter((route) => !route.endsWith('/*'));

for (const [prefix, file] of [
  ['/finance', path.join(srcRoot, 'pages', 'Finance.tsx')],
  ['/inventory', path.join(srcRoot, 'pages', 'Inventory.tsx')],
]) {
  routes.push(prefix);
  const nestedSource = fs.readFileSync(file, 'utf8');
  for (const match of nestedSource.matchAll(/<Route\s+[\s\S]*?\bpath=['"]([^'"]+)['"]/g)) {
    routes.push(`${prefix}/${match[1]}`);
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function matchesRoute(target) {
  return routes.some((route) => {
    const pattern = route
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(target);
  });
}

const referencePattern = /(?:navigate\(|to=|href=|route:\s*|path:\s*)(?:['"](\/[^'"\s]*)['"]|`(\/[^`\s]*)`)/g;
const misses = [];

for (const file of walk(srcRoot).filter((name) => /\.(?:ts|tsx|js|jsx)$/.test(name))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(referencePattern)) {
    const raw = match[1] || match[2];
    if (raw.endsWith('/*')) continue;
    const target = raw
      .split(/[?#]/, 1)[0]
      .replace(/\$\{[^}]+\}/g, 'dynamic')
      .replace(/\/$/, '') || '/';
    if (target.startsWith('/uploads/') || target.startsWith('/src/')) continue;
    if (!matchesRoute(target)) {
      const line = source.slice(0, match.index).split('\n').length;
      misses.push(`${path.relative(root, file)}:${line} ${raw}`);
    }
  }
}

console.log(`registered_routes=${routes.length}`);
console.log(`unmatched_references=${misses.length}`);
console.log(misses.join('\n'));
if (misses.length > 0) process.exitCode = 1;
