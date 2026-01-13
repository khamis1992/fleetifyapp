import fs from 'fs';

const typesPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\src\\integrations\\supabase\\types.ts';
const content = fs.readFileSync(typesPath, 'utf8');

// Extract all table names
const tableRegex = /(\w+): \{[\s\S]*?Row: \{/g;
const tables = [];
let match;

while ((match = tableRegex.exec(content)) !== null) {
  tables.push(match[1]);
}

// Remove duplicates and sort
const uniqueTables = [...new Set(tables)].sort();

console.log('Found tables:', uniqueTables.length);
console.log(uniqueTables.join('\n'));

// Save to file
fs.writeFileSync('C:\\Users\\khamis\\Desktop\\fleetifyapp\\all_tables.txt', uniqueTables.join('\n'));
console.log('\nSaved to all_tables.txt');
