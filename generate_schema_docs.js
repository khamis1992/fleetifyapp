import fs from 'fs';

const typesPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\src\\integrations\\supabase\\types.ts';
const outputPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\DATABASE_SCHEMA.md';

const content = fs.readFileSync(typesPath, 'utf8');

// Find the Tables section
const tablesSectionMatch = content.match(/Tables: \{([\s\S]*?)\n\s{6}\}/);
if (!tablesSectionMatch) {
  console.log('Could not find Tables section');
  process.exit(1);
}

const tablesSection = tablesSectionMatch[1];

// Parse table definitions
const tableRegex = /(\w+): \{\s*Row: \{([\s\S]*?)\}\s*Insert: \{([\s\S]*?)\}\s*Update: \{([\s\S]*?)\}\s*(?:Relationships: (\[[\s\S]*?\]))?\s*\}/g;

let mdContent = `# Fleetify Database Schema Documentation

> **Generated**: ${new Date().toISOString()}
> **Total Tables**: Parsing...

## Table of Contents

`;

const tables = [];
let match;

// Extract tables
while ((match = tableRegex.exec(tablesSection)) !== null) {
  const tableName = match[1];
  const rowSection = match[2];
  const insertSection = match[3];
  const updateSection = match[4];
  const relationshipsSection = match[5] || '[]';

  // Skip if it's not a real table (functions, etc.)
  if (['Insert', 'Update', 'Relationships', 'Row'].includes(tableName)) {
    continue;
  }

  // Parse columns
  const columnLines = rowSection.trim().split('\n');
  const columns = [];
  const requiredColumns = [];
  const optionalColumns = [];

  for (const line of columnLines) {
    const columnMatch = line.match(/(\w+): (.+)(?:$|\|)/);
    if (columnMatch) {
      const colName = columnMatch[1];
      const colType = columnMatch[2].trim();
      const isNullable = line.includes('| null');

      columns.push({
        name: colName,
        type: colType,
        nullable: isNullable,
        required: !isNullable && !line.includes('?:')
      });

      if (!isNullable) {
        requiredColumns.push(colName);
      } else {
        optionalColumns.push(colName);
      }
    }
  }

  // Parse relationships
  let relationships = [];
  try {
    // Extract foreign key info from relationships section
    const fkMatches = relationshipsSection.matchAll(/foreignKeyName: "([^"]+)"/g);
    const refMatches = relationshipsSection.matchAll(/referencedRelation: "([^"]+)"/g);
    const colMatches = relationshipsSection.matchAll(/columns: \[([^\]]+)\]/g);

    const fkNames = [...fkMatches].map(m => m[1]);
    const refRelations = [...refMatches].map(m => m[1]);
    const refColumns = [...colMatches].map(m => m[1].replace(/"/g, '').split(', '));

    for (let i = 0; i < fkNames.length; i++) {
      relationships.push({
        foreignKey: fkNames[i],
        references: refRelations[i] || 'unknown',
        columns: refColumns[i] || []
      });
    }
  } catch (e) {
    // Ignore parse errors
  }

  tables.push({
    name: tableName,
    columns,
    requiredColumns,
    optionalColumns,
    relationships
  });
}

// Sort tables alphabetically
tables.sort((a, b) => a.name.localeCompare(b.name));

// Update total count
mdContent = mdContent.replace('Parsing...', tables.length);

// Generate TOC
for (const table of tables) {
  mdContent += `- [\`${table.name}\`](#${table.name})\n`;
}

mdContent += `\n---\n\n`;

// Generate documentation for each table
for (const table of tables) {
  mdContent += `## \`${table.name}\`\n\n`;

  // Column count
  mdContent += `**Columns**: ${table.columns.length}\n\n`;

  // Required columns
  if (table.requiredColumns.length > 0) {
    mdContent += `### Required Columns\n\n`;
    mdContent += `| Column | Type |\n`;
    mdContent += `|--------|------|\n`;
    for (const col of table.requiredColumns) {
      const colInfo = table.columns.find(c => c.name === col);
      mdContent += `| \`${col}\` | ${colInfo.type} |\n`;
    }
    mdContent += `\n`;
  }

  // Optional columns
  if (table.optionalColumns.length > 0) {
    mdContent += `### Optional Columns\n\n`;
    mdContent += `| Column | Type |\n`;
    mdContent += `|--------|------|\n`;
    for (const col of table.optionalColumns) {
      const colInfo = table.columns.find(c => c.name === col);
      mdContent += `| \`${col}\` | ${colInfo.type} |\n`;
    }
    mdContent += `\n`;
  }

  // Relationships
  if (table.relationships.length > 0) {
    mdContent += `### Relationships\n\n`;
    for (const rel of table.relationships) {
      mdContent += `- **${rel.foreignKey}**: References \`${rel.references}\` (${rel.columns.join(', ')})\n`;
    }
    mdContent += `\n`;
  }

  mdContent += `---\n\n`;
}

// Add Business Rules section
mdContent += `## Business Rules & Critical Information\n\n`;
mdContent += `### Multi-Tenancy\n`;
mdContent += `- Most tables include a \`company_id\` column for multi-tenancy\n`;
mdContent += `- RLS (Row Level Security) policies enforce company isolation\n`;
mdContent += `- Always filter by \`company_id\` in queries\n\n`;

mdContent += `### Financial System\n`;
mdContent += `- \`chart_of_accounts\`: Hierarchical chart (levels 1-6)\n`;
mdContent += `  - Only \`is_header = false AND account_level >= 3\` can have postings\n`;
mdContent += `  - \`account_code\` is the primary identifier\n`;
mdContent += `  - Use \`account_name\` (NOT \`account_name_en\`)\n`;
mdContent += `- \`journal_entries\`: Header table for transactions\n`;
mdContent += `- \`journal_entry_lines\`: Line items\n`;
mdContent += `  - Uses \`line_description\` (NOT \`description\`)\n`;
mdContent += `  - Uses \`line_number\` for sequencing\n`;
mdContent += `  - Each entry must have at least 2 lines (balanced debits/credits)\n\n`;

mdContent += `### Key Entity Relationships\n`;
mdContent += `- \`contracts\` - Rental contracts\n`;
mdContent += `- \`customers\` - Customer records\n`;
mdContent += `- \`vehicles\` - Fleet vehicles\n`;
mdContent += `- \`invoices\` - Billing documents\n`;
mdContent += `- \`payments\` - Payment records\n\n`;

mdContent += `### Important Column Name Corrections\n`;
mdContent += `| Wrong | Correct |\n`;
mdContent += `|-------|----------|\n`;
mdContent += `| \`description\` | \`line_description\` (journal_entry_lines) |\n`;
mdContent += `| \`level\` | \`account_level\` (chart_of_accounts) |\n`;
mdContent += `| \`parent_code\` | \`parent_account_code\` |\n`;
mdContent += `| \`account_name_en\` | \`account_name\` |\n`;
mdContent += `| \`status\` | \`payment_status\` (payments table) |\n\n`;

// Write to file
fs.writeFileSync(outputPath, mdContent);

console.log(`Generated documentation for ${tables.length} tables`);
console.log(`Saved to: ${outputPath}`);
