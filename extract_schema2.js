import fs from 'fs';

const typesPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\src\\integrations\\supabase\\types.ts';
const content = fs.readFileSync(typesPath, 'utf8');

// Find the Tables section
const tablesSectionMatch = content.match(/Tables: \{([\s\S]*?)\n    \}/);
if (!tablesSectionMatch) {
  console.log('Could not find Tables section');
  process.exit(1);
}

const tablesSection = tablesSectionMatch[1];

// Extract table definitions - they follow pattern: table_name: {
const tableMatches = tablesSection.matchAll(/(\w+): \{[\s\S]*?Row: \{/g);

const tables = [];
for (const match of tableMatches) {
  const tableName = match[1];
  // Skip if it's a property like Insert, Update, Relationships
  if (tableName === 'Insert' || tableName === 'Update' || tableName === 'Relationships' || tableName === 'Row') {
    continue;
  }
  tables.push(tableName);
}

// Remove duplicates and sort
const uniqueTables = [...new Set(tables)].sort();

console.log('Found tables:', uniqueTables.length);
console.log(uniqueTables.join('\n'));

// Save to file
fs.writeFileSync('C:\\Users\\khamis\\Desktop\\fleetifyapp\\all_tables_real.txt', uniqueTables.join('\n'));
console.log('\nSaved to all_tables_real.txt');
