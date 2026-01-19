import fs from 'fs';

const typesPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\src\\integrations\\supabase\\types.ts';
const outputPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\DATABASE_REFERENCE.md';

const content = fs.readFileSync(typesPath, 'utf8');

// Find Tables section start and end
const tablesStart = content.indexOf('  Tables: {');
if (tablesStart === -1) {
  console.log('Tables section not found');
  process.exit(1);
}

// Find the end of Tables section (look for '    }' at same indentation as '  Tables: {')
let tablesEnd = tablesStart;
let braceDepth = 0;
let inTables = false;

for (let i = tablesStart + 11; i < content.length; i++) {
  if (content[i] === '{') braceDepth++;
  if (content[i] === '}') {
    if (braceDepth === 0 && inTables) {
      tablesEnd = i + 1;
      break;
    }
    braceDepth--;
    inTables = true;
  }
}

const tablesSection = content.substring(tablesStart, tablesEnd);

// Parse tables by looking for patterns
const lines = tablesSection.split('\n');
const tables = [];
let currentTable = null;
let currentSection = null;
let braceStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Count braces to track structure
  const openCount = (line.match(/\{/g) || []).length;
  const closeCount = (line.match(/\}/g) || []).length;

  // Table definition: 6 spaces + table_name: {
  const tableMatch = line.match(/^(\s{6})([a-z_]+): \{$/);
  if (tableMatch) {
    // Save previous table
    if (currentTable && currentTable.columns.length > 0) {
      tables.push(currentTable);
    }

    currentTable = {
      name: tableMatch[2],
      columns: [],
      relationships: []
    };
    currentSection = null;
    continue;
  }

  if (!currentTable) continue;

  // Track sections
  if (trimmed === 'Row: {') {
    currentSection = 'Row';
    braceStack = ['Row'];
    continue;
  }
  if (trimmed === 'Insert: {') {
    currentSection = 'Insert';
    braceStack = ['Insert'];
    continue;
  }
  if (trimmed === 'Update: {') {
    currentSection = 'Update';
    braceStack = ['Update'];
    continue;
  }
  if (trimmed === 'Relationships: [') {
    currentSection = 'Relationships';
    continue;
  }

  // Update brace stack
  for (let j = 0; j < openCount; j++) braceStack.push('{');
  for (let j = 0; j < closeCount; j++) braceStack.pop();

  // Check if we're still in a section
  if (braceStack.length === 0) {
    currentSection = null;
  }

  // Parse columns in Row section (8 spaces indentation)
  if (currentSection === 'Row') {
    const colMatch = line.match(/^(\s{8,10})([a-z_]+): (.+)$/);
    if (colMatch) {
      const colName = colMatch[2];
      const colTypeRaw = colMatch[3].trim();
      const isNullable = colTypeRaw.includes('| null');
      const hasDefault = colTypeRaw.includes('?:');
      const colType = colTypeRaw.replace(/\|.*$/, '').replace(/\?.*$/, '').trim();

      currentTable.columns.push({
        name: colName,
        type: colType,
        nullable: isNullable,
        hasDefault: hasDefault
      });
    }
  }

  // Parse relationships
  if (currentSection === 'Relationships') {
    const fkMatch = trimmed.match(/foreignKeyName: "([^"]+)"/);
    const refMatch = trimmed.match(/referencedRelation: "([^"]+)"/);
    const colMatch = trimmed.match(/columns: \[([^\]]+)\]/);

    if (fkMatch && refMatch && colMatch) {
      const columns = colMatch[1].split(',').map(s => s.replace(/["\s]/g, ''));
      currentTable.relationships.push({
        foreignKey: fkMatch[1],
        references: refMatch[1],
        columns: columns
      });
    }
  }
}

// Save last table
if (currentTable && currentTable.columns.length > 0) {
  tables.push(currentTable);
}

// Filter out views
const actualTables = tables.filter(t =>
  !t.name.startsWith('v_') &&
  !t.name.startsWith('mv_') &&
  !t.name.includes('_summary') &&
  !t.name.includes('_statistics')
);

console.log(`Found ${actualTables.length} actual tables`);

// Generate documentation
let md = `# Fleetify Database Reference

> **Generated**: ${new Date().toISOString()}
> **Total Tables**: ${actualTables.length}
> **Database**: PostgreSQL 17.6 (Supabase)

## Table of Contents

`;

// Group by domain
const coreTables = ['companies', 'users', 'profiles', 'tenants', 'company_usage', 'system_settings'];
const financeTables = actualTables.filter(t =>
  t.name.includes('account') ||
  t.name.includes('journal') ||
  t.name.includes('invoice') ||
  t.name.includes('payment') ||
  t.name === 'banks' || t.name === 'budgets' || t.name === 'cost_centers' ||
  t.name === 'accounting_periods' || t.name === 'accounting_templates' ||
  t.name === 'bank_transactions' || t.name === 'fixed_assets' ||
  t.name === 'depreciation_records'
);
const contractTables = actualTables.filter(t => t.name.includes('contract'));
const customerTables = actualTables.filter(t => t.name.includes('customer'));
const fleetTables = actualTables.filter(t =>
  t.name.includes('vehicle') ||
  t.name.includes('fuel') ||
  t.name.includes('odometer') ||
  t.name === 'drivers' || t.name === 'dispatch_permit_tracking' ||
  t.name === 'dispatch_permit_attachments'
);
const inventoryTables = actualTables.filter(t => t.name.includes('inventory') || t.name.includes('purchase_order') || t.name === 'goods_');
const legalTables = actualTables.filter(t =>
  t.name.includes('legal') ||
  t.name.includes('traffic') ||
  t.name.includes('penalty') ||
  t.name.includes('lawsuit')
);
const hrTables = actualTables.filter(t =>
  t.name.includes('employee') ||
  t.name.includes('payroll') ||
  t.name.includes('leave') ||
  t.name.includes('attendance') ||
  t.name.startsWith('hr_')
);
const systemTables = actualTables.filter(t =>
  t.name.includes('system_') ||
  t.name.includes('audit') ||
  t.name.includes('background_job') ||
  t.name.includes('notification')
);

const allCategorized = [
  ...coreTables,
  ...financeTables.map(t => t.name),
  ...contractTables.map(t => t.name),
  ...customerTables.map(t => t.name),
  ...fleetTables.map(t => t.name),
  ...inventoryTables.map(t => t.name),
  ...legalTables.map(t => t.name),
  ...hrTables.map(t => t.name),
  ...systemTables.map(t => t.name)
];

const otherTables = actualTables.filter(t => !allCategorized.includes(t.name));

// Generate TOC
const addSection = (title, tableList) => {
  if (tableList.length > 0) {
    md += `### ${title}\n`;
    for (const table of tableList) {
      md += `- [\`${typeof table === 'string' ? table : table.name}\`](#${typeof table === 'string' ? table : table.name})\n`;
    }
    md += `\n`;
  }
};

addSection('Core', coreTables.map(n => ({ name: n })));
addSection('Finance', financeTables);
addSection('Contracts', contractTables);
addSection('Customers', customerTables);
addSection('Fleet', fleetTables);
addSection('Inventory', inventoryTables);
addSection('Legal', legalTables);
addSection('HR', hrTables);
addSection('System', systemTables);
addSection('Other', otherTables);

md += `---\n\n`;

// Generate detailed documentation
const generateTableDoc = (table) => {
  let tableMd = `### \`${table.name}\`\n\n`;
  tableMd += `**Columns**: ${table.columns.length}\n\n`;

  const requiredCols = table.columns.filter(c => !c.nullable && !c.hasDefault);
  const optionalCols = table.columns.filter(c => c.nullable || c.hasDefault);

  if (requiredCols.length > 0) {
    tableMd += `#### Required Columns\n\n`;
    tableMd += `| Column | Type |\n`;
    tableMd += `|--------|------|\n`;
    for (const col of requiredCols) {
      tableMd += `| \`${col.name}\` | ${col.type} |\n`;
    }
    tableMd += `\n`;
  }

  if (optionalCols.length > 0) {
    tableMd += `#### Optional Columns\n\n`;
    tableMd += `| Column | Type | Nullable |\n`;
    tableMd += `|--------|------|----------|\n`;
    for (const col of optionalCols) {
      tableMd += `| \`${col.name}\` | ${col.type} | ${col.nullable ? 'Yes' : 'No'} |\n`;
    }
    tableMd += `\n`;
  }

  if (table.relationships.length > 0) {
    tableMd += `#### Relationships\n\n`;
    for (const rel of table.relationships) {
      tableMd += `- \`->\` **${rel.references}** (\`${rel.columns.join('`, `')}\`)\n`;
    }
    tableMd += `\n`;
  }

  tableMd += `---\n\n`;
  return tableMd;
};

// Core Tables
md += `## Core Domain\n\n`;
for (const name of coreTables) {
  const table = actualTables.find(t => t.name === name);
  if (table) md += generateTableDoc(table);
}

// Finance
md += `## Finance Domain\n\n`;
for (const table of financeTables) md += generateTableDoc(table);

// Contracts
md += `## Contracts Domain\n\n`;
for (const table of contractTables) md += generateTableDoc(table);

// Customers
md += `## Customers Domain\n\n`;
for (const table of customerTables) md += generateTableDoc(table);

// Fleet
md += `## Fleet Domain\n\n`;
for (const table of fleetTables) md += generateTableDoc(table);

// Inventory
md += `## Inventory Domain\n\n`;
for (const table of inventoryTables) md += generateTableDoc(table);

// Legal
md += `## Legal Domain\n\n`;
for (const table of legalTables) md += generateTableDoc(table);

// HR
md += `## HR Domain\n\n`;
for (const table of hrTables) md += generateTableDoc(table);

// System
md += `## System Domain\n\n`;
for (const table of systemTables) md += generateTableDoc(table);

// Other
if (otherTables.length > 0) {
  md += `## Other Tables\n\n`;
  for (const table of otherTables) md += generateTableDoc(table);
}

// Business Rules
md += `## Business Rules & Critical Information\n\n`;

md += `### Multi-Tenancy\n\n`;
md += `- Most tables include \`company_id\` for multi-tenancy\n`;
md += `- RLS policies enforce company isolation\n`;
md += `- Always filter by \`company_id\` in queries\n\n`;

md += `### Financial System\n\n`;
md += `- **chart_of_accounts**: Hierarchical (levels 1-6), only \`is_header=false AND account_level>=3\` can have postings\n`;
md += `- **journal_entries**: Header table for transactions\n`;
md += `- **journal_entry_lines**: Use \`line_description\` (NOT \`description\`), \`line_number\` for sequencing\n`;
md += `- Each entry must have 2+ lines (balanced debits/credits)\n\n`;

md += `### Critical Column Names\n\n`;
md += `| Wrong | Correct |\n`;
md += `|-------|----------|\n`;
md += `| \`description\` | \`line_description\` (journal_entry_lines) |\n`;
md += `| \`level\` | \`account_level\` (chart_of_accounts) |\n`;
md += `| \`parent_code\` | \`parent_account_code\` |\n`;
md += `| \`account_name_en\` | \`account_name\` |\n`;
md += `| \`status\` | \`payment_status\` (payments) |\n\n`;

md += `### Key Relationships\n\n`;
md += `- **Contracts** ↔ **Customers** (many-to-one)\n`;
md += `- **Contracts** ↔ **Vehicles** (many-to-many via contract_vehicles)\n`;
md += `- **Invoices** ← **Contracts** (via payment schedules)\n`;
md += `- **Payments** → **Invoices** (partial payments allowed)\n\n`;

md += `### Data Records\n\n`;
md += `| Entity | Records |\n`;
md += `|--------|----------|\n`;
md += `| Contracts | ~588 |\n`;
md += `| Customers | ~781 |\n`;
md += `| Vehicles | ~510 |\n`;
md += `| Invoices | ~1,250 |\n`;
md += `| Payments | ~6,568 |\n\n`;

fs.writeFileSync(outputPath, md);
console.log(`Generated database reference: ${outputPath}`);
