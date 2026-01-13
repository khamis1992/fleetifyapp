/**
 * Fleetify Database Schema Documentation Generator
 *
 * This script extracts schema information from the Supabase types file
 * and generates comprehensive documentation.
 *
 * Usage: node scripts/extract-schema-docs.js
 */

const fs = require('fs');
const path = require('path');

const typesFilePath = path.join(__dirname, '../src/integrations/supabase/types.ts');
const outputDir = path.join(__dirname, '../docs');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Extract table information from types.ts
 */
function extractSchemaFromTypes() {
  const content = fs.readFileSync(typesFilePath, 'utf-8');

  // Find the Tables section - looking for the pattern in the actual file
  const tablesStart = content.indexOf('Tables: {');
  if (tablesStart === -1) {
    console.error('Could not find Tables section in types.ts');
    return null;
  }

  // Find where Tables section ends (before Views section)
  // Look for various possible patterns
  let viewsStart = content.indexOf('\n      Views: {', tablesStart);
  if (viewsStart === -1) {
    viewsStart = content.indexOf('\n    Views: {', tablesStart);
  }
  if (viewsStart === -1) {
    viewsStart = content.indexOf('\nViews: {', tablesStart);
  }

  if (viewsStart === -1) {
    // If we can't find Views, use a large portion of the file
    viewsStart = content.length;
  }

  const tablesContent = content.substring(tablesStart, viewsStart);
  const tables = [];

  // Find each table definition using a simpler approach
  // Look for pattern like "  table_name: {" and extract to the closing brace
  const lines = tablesContent.split('\n');
  let currentTable = null;
  let inRow = false;
  let inInsert = false;
  let inUpdate = false;
  let inRelationships = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a new table definition (6 spaces = table level)
    const tableMatch = line.match(/^\s{6}(\w+):\s*\{$/);
    if (tableMatch && !currentTable) {
      currentTable = {
        name: tableMatch[1],
        columns: [],
        relationships: []
      };
      braceCount = 1;
      continue;
    }

    if (currentTable) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      // Check for Row section (8 spaces)
      if (line.match(/^\s{8}Row:\s*\{$/)) {
        inRow = true;
        inInsert = false;
        inUpdate = false;
        continue;
      }

      // Check for Insert section
      if (line.match(/^\s{8}Insert:\s*\{$/)) {
        inRow = false;
        inInsert = true;
        inUpdate = false;
        continue;
      }

      // Check for Update section
      if (line.match(/^\s{8}Update:\s*\{$/)) {
        inRow = false;
        inInsert = false;
        inUpdate = true;
        continue;
      }

      // Check for Relationships section (8 spaces)
      if (line.match(/^\s{8}Relationships:\s*\[$/)) {
        inRow = false;
        inInsert = false;
        inUpdate = false;
        inRelationships = true;
        continue;
      }

      // Parse columns in Row section only (10 spaces)
      if (inRow && !inRelationships && !inInsert && !inUpdate) {
        const colMatch = line.match(/^\s{10}(\w+):\s+(.+)$/);
        if (colMatch) {
          currentTable.columns.push({
            name: colMatch[1],
            type: colMatch[2].trim().replace(/,$/, '')
          });
        }
      }

      // Parse relationships (10 spaces)
      if (inRelationships && line.match(/^\s{10}foreignKeyName:/)) {
        const fkName = line.match(/foreignKeyName:\s*"([^"]+)"/)?.[1];
        if (fkName && lines[i + 1] && lines[i + 2] && lines[i + 3]) {
          const columns = lines[i + 1].match(/columns:\s*\[(.+)\]/)?.[1]?.replace(/"/g, '').split(', ');
          const referencedRelation = lines[i + 2].match(/referencedRelation:\s*"([^"]+)"/)?.[1];
          const referencedColumns = lines[i + 3].match(/referencedColumns:\s*\[(.+)\]/)?.[1]?.replace(/"/g, '').split(', ');

          if (columns && referencedRelation && referencedColumns) {
            currentTable.relationships.push({
              foreignKeyName: fkName,
              columns: columns,
              referencedRelation: referencedRelation,
              referencedColumns: referencedColumns
            });
          }
        }
      }

      // Table definition complete when brace count returns to 0
      if (braceCount === 0) {
        if (currentTable.columns.length > 0) {
          tables.push(currentTable);
        }
        currentTable = null;
        inRow = false;
        inInsert = false;
        inUpdate = false;
        inRelationships = false;
      }
    }
  }

  return tables;
}

/**
 * Extract views information
 */
function extractViewsFromTypes() {
  const content = fs.readFileSync(typesFilePath, 'utf-8');

  // Find the Views section
  let viewsStart = content.indexOf('Views: {');
  if (viewsStart === -1) return [];

  let functionsStart = content.indexOf('\n      Functions: {', viewsStart);
  if (functionsStart === -1) {
    functionsStart = content.indexOf('\n    Functions: {', viewsStart);
  }
  if (functionsStart === -1) {
    functionsStart = content.indexOf('\nFunctions: {', viewsStart);
  }
  if (functionsStart === -1) {
    functionsStart = content.length;
  }

  const viewsContent = content.substring(viewsStart, functionsStart);

  // Extract view names using similar logic as tables
  const lines = viewsContent.split('\n');
  const views = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s{6}(\w+):\s*\{$/);
    if (match) {
      views.push({ name: match[1] });
    }
  }

  return views;
}

/**
 * Extract functions information
 */
function extractFunctionsFromTypes() {
  const content = fs.readFileSync(typesFilePath, 'utf-8');

  // Find the Functions section
  let functionsStart = content.indexOf('Functions: {');
  if (functionsStart === -1) return [];

  // Go to end of file or find end of section
  let functionsEnd = content.indexOf('\n  }\n}', functionsStart);
  if (functionsEnd === -1) {
    functionsEnd = content.length;
  }

  const functionsContent = content.substring(functionsStart, functionsEnd);

  // Extract function names
  const lines = functionsContent.split('\n');
  const functions = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s{4}(\w+):\s*\(/); // Functions use ( instead of {
    if (match) {
      functions.push({ name: match[1] });
    }
  }

  return functions;
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(tables, views, functions) {
  let md = '# Fleetify Database Schema Documentation\n\n';
  md += 'Generated: ' + new Date().toISOString() + '\n\n';
  md += 'PostgreSQL Version: 17.6 (Supabase)\n\n';
  md += '---\n\n';

  // Summary
  md += '## Summary\n\n';
  md += '- **Total Tables**: ' + tables.length + '\n';
  md += '- **Total Views**: ' + views.length + '\n';
  md += '- **Total Functions**: ' + functions.length + '\n';
  md += '- **Schemas**: public, auth, storage\n\n';

  // Table of Contents
  md += '## Table of Contents\n\n';
  md += '### Tables\n\n';
  md += '> Note: Due to the large number of tables, only a sample is listed below.\n\n';

  const sampleTables = tables.slice(0, 50);
  for (let i = 0; i < sampleTables.length; i++) {
    md += '- [' + sampleTables[i].name + '](#' + sampleTables[i].name + ')\n';
  }

  // Views
  md += '\n### Views\n\n';
  for (let i = 0; i < views.length; i++) {
    md += '- [' + views[i].name + '](#view-' + views[i].name + ')\n';
  }

  // Functions
  md += '\n### Functions\n\n';
  for (let i = 0; i < functions.length; i++) {
    md += '- [' + functions[i].name + '](#fn-' + functions[i].name + ')\n';
  }

  md += '\n---\n\n';

  // Tables Detail
  md += '## Tables\n\n';

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    md += '### ' + table.name + '\n\n';

    if (table.relationships.length > 0) {
      md += '**Relationships:**\n\n';
      for (let j = 0; j < table.relationships.length; j++) {
        const rel = table.relationships[j];
        md += '- `' + rel.columns.join(', ') + '` → ' + rel.referencedRelation + '(`' + rel.referencedColumns.join(', ') + '`)\n';
      }
      md += '\n';
    }

    md += '| Column | Type | Description |\n';
    md += '|--------|------|-------------|\n';

    for (let j = 0; j < table.columns.length; j++) {
      const col = table.columns[j];
      const description = getColumnDescription(table.name, col.name, col.type);
      md += '| `' + col.name + '` | ' + col.type + ' | ' + description + ' |\n';
    }

    md += '\n';
  }

  // Views
  md += '## Views\n\n';
  for (let i = 0; i < views.length; i++) {
    md += '### ' + views[i].name + '\n\n';
    md += '> View: ' + views[i].name + '\n\n';
  }

  // Functions
  md += '## Functions\n\n';
  for (let i = 0; i < functions.length; i++) {
    md += '### ' + functions[i].name + '\n\n';
    md += '> Function: ' + functions[i].name + '\n\n';
  }

  return md;
}

/**
 * Get description for a column based on name patterns
 */
function getColumnDescription(tableName, columnName, columnType) {
  // Special cases for important columns
  const specialCases = {
    'id': 'Primary key',
    'created_at': 'Creation timestamp',
    'updated_at': 'Last update timestamp',
    'company_id': 'Company reference (multi-tenancy)',
    'employee_id': 'Employee reference',
    'customer_id': 'Customer reference',
    'vehicle_id': 'Vehicle reference',
    'contract_id': 'Contract reference',
    'payment_id': 'Payment reference',
    'invoice_id': 'Invoice reference',
    'chart_of_account_id': 'Chart of account reference',
  };

  if (specialCases[columnName]) {
    return specialCases[columnName];
  }

  // Pattern-based descriptions
  if (columnName.endsWith('_id')) {
    const refTable = columnName.replace('_id', '');
    return refTable + ' reference';
  }

  if (columnName.endsWith('_at')) {
    const field = columnName.replace('_at', '').replace(/_/g, ' ');
    return field.charAt(0).toUpperCase() + field.slice(1) + ' timestamp';
  }

  if (columnName.endsWith('_date')) {
    const field = columnName.replace('_date', '').replace(/_/g, ' ');
    return field.charAt(0).toUpperCase() + field.slice(1) + ' date';
  }

  if (columnName.startsWith('is_')) {
    const field = columnName.replace('is_', '').replace(/_/g, ' ');
    return 'Flag indicating if ' + field;
  }

  if (columnName.startsWith('has_')) {
    const field = columnName.replace('has_', '').replace(/_/g, ' ');
    return 'Flag indicating if ' + field + ' is present';
  }

  if (columnType === 'boolean') {
    return 'Boolean flag';
  }

  if (columnType.startsWith('number')) {
    return 'Numeric value';
  }

  if (columnType === 'string') {
    return 'Text field';
  }

  return '';
}

/**
 * Main execution
 */
function main() {
  console.log('Extracting schema from types.ts...\n');

  const tables = extractSchemaFromTypes();
  const views = extractViewsFromTypes();
  const functions = extractFunctionsFromTypes();

  if (!tables) {
    console.error('Failed to extract schema');
    process.exit(1);
  }

  console.log('Found ' + tables.length + ' tables');
  console.log('Found ' + views.length + ' views');
  console.log('Found ' + functions.length + ' functions');

  const markdown = generateMarkdown(tables, views, functions);

  const outputPath = path.join(outputDir, 'DATABASE_SCHEMA.md');
  fs.writeFileSync(outputPath, markdown);

  console.log('\nDocumentation generated: ' + outputPath);

  // Also generate a simpler tables list
  const tablesList = tables.map(function(t) { return t.name; }).sort().join('\n');
  fs.writeFileSync(path.join(outputDir, 'TABLES_LIST.txt'), tablesList);
  console.log('Tables list generated: ' + path.join(outputDir, 'TABLES_LIST.txt'));
}

// Run
if (require.main === module) {
  main();
}

module.exports = { extractSchemaFromTypes: extractSchemaFromTypes, generateMarkdown: generateMarkdown };
