import fs from 'fs';

const typesPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\src\\integrations\\supabase\\types.ts';
const lines = fs.readFileSync(typesPath, 'utf8').split('\n');

const tables = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  // Match table name pattern: "  table_name: {"
  const match = line.match(/^(\s+)([a-z_]+): \{$/);

  if (match && !match[2].match(/^[A-Z]/)) {
    const indent = match[1].length;
    const tableName = match[2];

    // Check if next line contains "Row: {"
    if (i + 1 < lines.length && lines[i + 1].includes('Row:')) {
      tables.push(tableName);
    }
  }
  i++;
}

// Sort and deduplicate
const uniqueTables = [...new Set(tables)].sort();

console.log(`Found ${uniqueTables.length} tables`);
console.log(uniqueTables.join('\n'));

fs.writeFileSync('C:\\Users\\khamis\\Desktop\\fleetifyapp\\real_tables.txt', uniqueTables.join('\n'));
