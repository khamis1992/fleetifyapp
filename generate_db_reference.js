import fs from 'fs';

const typesPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\src\\integrations\\supabase\\types.ts';
const outputPath = 'C:\\Users\\khamis\\Desktop\\fleetifyapp\\DATABASE_REFERENCE.md';

const content = fs.readFileSync(typesPath, 'utf8');

// Find the Tables section
const tablesStart = content.indexOf('Tables: {');
if (tablesStart === -1) {
  console.log('Could not find Tables section');
  process.exit(1);
}

// Extract the Tables section (need to balance braces)
let braceCount = 0;
let tablesEnd = tablesStart + 8; // Skip 'Tables: {'
let inTables = false;

for (let i = tablesStart + 8; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    if (braceCount === 0) {
      tablesEnd = i;
      break;
    }
    braceCount--;
  }
}

const tablesSection = content.substring(tablesStart, tablesEnd + 1);

// Parse table definitions
const lines = tablesSection.split('\n');
const tables = [];
let currentTable = null;
let currentSection = null; // 'Row', 'Insert', 'Update', 'Relationships'

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Match table definition: "  table_name: {"
  const tableMatch = line.match(/^(\s+)([a-z_]+): \{$/);
  if (tableMatch && !tableMatch[2].match(/^[A-Z]/) && tableMatch[1].length === 4) {
    // Save previous table
    if (currentTable) {
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

  // Match section headers
  if (trimmed === 'Row: {') {
    currentSection = 'Row';
    continue;
  }
  if (trimmed === 'Insert: {') {
    currentSection = 'Insert';
    continue;
  }
  if (trimmed === 'Update: {') {
    currentSection = 'Update';
    continue;
  }
  if (trimmed === 'Relationships: [') {
    currentSection = 'Relationships';
    continue;
  }

  // Parse columns in Row section
  if (currentSection === 'Row') {
    const colMatch = line.match(/^(\s+)([a-z_]+): (.+?)(?:\|\s*null)?$/);
    if (colMatch && colMatch[1].length === 10) {
      const colName = colMatch[2];
      const colType = colMatch[3].trim();
      const isNullable = line.includes('| null');
      const hasDefault = line.includes('?:');

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
    const fkMatch = line.match(/foreignKeyName: "([^"]+)"/);
    const refMatch = line.match(/referencedRelation: "([^"]+)"/);
    const colMatch = line.match(/columns: \[([^\]]+)\]/);

    if (fkMatch && refMatch && colMatch) {
      const columns = colMatch[1].replace(/"/g, '').split(', ').map(s => s.trim());
      currentTable.relationships.push({
        foreignKey: fkMatch[1],
        references: refMatch[1],
        columns: columns
      });
    }
  }
}

// Save last table
if (currentTable) {
  tables.push(currentTable);
}

// Filter out views (start with 'v_', 'mv_', or contain '_summary', '_statistics')
const actualTables = tables.filter(t =>
  !t.name.startsWith('v_') &&
  !t.name.startsWith('mv_') &&
  !t.name.includes('_summary') &&
  !t.name.includes('_statistics') &&
  !t.name.includes('_view')
);

console.log(`Found ${actualTables.length} actual tables (filtered ${tables.length - actualTables.length} views)`);

// Group tables by domain
const domains = {
  core: ['companies', 'users', 'profiles', 'tenants'],
  finance: [
    'chart_of_accounts', 'journal_entries', 'journal_entry_lines',
    'invoices', 'invoice_items', 'payments', 'payment_plans',
    'cost_centers', 'accounting_periods', 'accounting_templates',
    'bank_transactions', 'banks', 'budgets', 'budget_items',
    'fixed_assets', 'depreciation_records'
  ],
  contracts: [
    'contracts', 'contract_documents', 'contract_amendments',
    'contract_payment_schedules', 'contract_vehicle_returns',
    'contract_templates', 'contract_drafts'
  ],
  customers: [
    'customers', 'customer_accounts', 'customer_deposits',
    'customer_documents', 'customer_notes', 'customer_payment_scores',
    'customer_aging_analysis', 'customer_balances'
  ],
  fleet: [
    'vehicles', 'vehicle_maintenance', 'vehicle_insurance',
    'vehicle_documents', 'fuel_records', 'odometer_readings',
    'vehicle_categories', 'vehicle_groups', 'vehicle_pricing',
    'vehicle_reservations', 'vehicle_transfers'
  ],
  inventory: [
    'inventory_items', 'inventory_movements', 'inventory_warehouses',
    'inventory_stock_levels', 'inventory_suppliers',
    'purchase_orders', 'purchase_order_items', 'goods_receipts'
  ],
  legal: [
    'legal_cases', 'legal_case_documents', 'legal_memos',
    'legal_consultations', 'traffic_violations', 'penalties'
  ],
  hr: [
    'employees', 'payroll', 'payroll_slips', 'leave_requests',
    'leave_balances', 'attendance_records', 'hr_settings'
  ],
  system: [
    'system_logs', 'system_alerts', 'system_notifications',
    'audit_logs', 'audit_trail', 'background_jobs'
  ]
};

// Generate Markdown documentation
let md = `# Fleetify Database Reference

> **Generated**: ${new Date().toISOString()}
> **Total Tables**: ${actualTables.length}
> **Database**: PostgreSQL 17.6 (Supabase)

## Table of Contents

`;

// Generate domain TOC
for (const [domain, tableList] of Object.entries(domains)) {
  const domainTables = actualTables.filter(t => tableList.includes(t.name));
  if (domainTables.length > 0) {
    md += `### ${domain.charAt(0).toUpperCase() + domain.slice(1)}\n`;
    for (const table of domainTables) {
      md += `- [\`${table.name}\`](#${table.name})\n`;
    }
    md += `\n`;
  }
}

// Other tables
const categorizedTables = Object.values(domains).flat();
const otherTables = actualTables.filter(t => !categorizedTables.includes(t.name));
if (otherTables.length > 0) {
  md += `### Other Tables\n`;
  for (const table of otherTables) {
    md += `- [\`${table.name}\`](#${table.name})\n`;
  }
  md += `\n`;
}

md += `---\n\n`;

// Generate detailed documentation for each table by domain
for (const [domain, tableList] of Object.entries(domains)) {
  const domainTables = actualTables.filter(t => tableList.includes(t.name));
  if (domainTables.length === 0) continue;

  md += `## ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain\n\n`;

  for (const table of domainTables) {
    md += `### \`${table.name}\`\n\n`;
    md += `**Columns**: ${table.columns.length}\n\n`;

    // Primary key (usually 'id')
    const pkColumn = table.columns.find(c => c.name === 'id');
    if (pkColumn) {
      md += `**Primary Key**: \`${pkColumn.name}\` (${pkColumn.type})\n\n`;
    }

    // Required columns
    const requiredCols = table.columns.filter(c => !c.nullable && !c.hasDefault);
    if (requiredCols.length > 0) {
      md += `#### Required Columns\n\n`;
      md += `| Column | Type | Description |\n`;
      md += `|--------|------|-------------|\n`;
      for (const col of requiredCols) {
        md += `| \`${col.name}\` | ${col.type} | |\n`;
      }
      md += `\n`;
    }

    // Optional columns
    const optionalCols = table.columns.filter(c => c.nullable || c.hasDefault);
    if (optionalCols.length > 0) {
      md += `#### Optional Columns\n\n`;
      md += `| Column | Type | Nullable |\n`;
      md += `|--------|------|----------|\n`;
      for (const col of optionalCols) {
        md += `| \`${col.name}\` | ${col.type} | ${col.nullable ? 'Yes' : 'No'} |\n`;
      }
      md += `\n`;
    }

    // Relationships
    if (table.relationships.length > 0) {
      md += `#### Relationships\n\n`;
      for (const rel of table.relationships) {
        md += `- **${rel.foreignKey}**: → \`${rel.references}\`(\`${rel.columns.join('`, `')}\`)\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }
}

// Add other tables
if (otherTables.length > 0) {
  md += `## Other Tables\n\n`;
  for (const table of otherTables) {
    md += `### \`${table.name}\`\n\n`;
    md += `**Columns**: ${table.columns.length}\n\n`;

    const requiredCols = table.columns.filter(c => !c.nullable && !c.hasDefault);
    if (requiredCols.length > 0) {
      md += `**Required Columns**: ${requiredCols.map(c => `\`${c.name}\``).join(', ')}\n\n`;
    }

    if (table.relationships.length > 0) {
      md += `**Relationships**:\n`;
      for (const rel of table.relationships) {
        md += `- → \`${rel.references}\`(\`${rel.columns.join('`, `')}\`)\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }
}

// Business Rules
md += `## Business Rules & Critical Information\n\n`;

md += `### Multi-Tenancy\n\n`;
md += `- **Almost all tables** include a \`company_id\` column for multi-tenancy\n`;
md += `- **Row Level Security (RLS)** policies enforce company isolation\n`;
md += `- **Always filter by \`company_id\`** in application queries\n`;
md += `- **Exception**: System tables like \`auth.users\`, \`public.users\`\n\n`;

md += `### Financial System\n\n`;
md += `#### Chart of Accounts (\`chart_of_accounts\`)\n`;
md += `- **Hierarchical structure** with levels 1-6\n`;
md += `- **Posting rules**: Only \`is_header = false AND account_level >= 3\` can have postings\n`;
md += `- **Primary identifier**: \`account_code\` (NOT \`id\`)\n`;
md += `- **Display name**: \`account_name\` (NOT \`account_name_en\`)\n`;
md += `- **Parent reference**: \`parent_account_code\` (NOT \`parent_code\`)\n\n`;

md += `#### Journal Entries (\`journal_entries\`, \`journal_entry_lines\`)\n`;
md += `- **Header**: \`journal_entries\` (transaction metadata)\n`;
md += `- **Lines**: \`journal_entry_lines\` (individual line items)\n`;
md += `- **Line description**: Use \`line_description\` (NOT \`description\`)\n`;
md += `- **Sequencing**: Use \`line_number\` for ordering\n`;
md += `- **Balance requirement**: Each entry must have at least 2 lines (debits = credits)\n`;
md += `- **Status workflow**: \`draft\` → \`pending\` → \`posted\` → \`void\`\n\n`;

md += `#### Payments (\`payments\`)\n`;
md += `- **Status column**: \`payment_status\` (NOT \`status\`)\n`;
md += `- **Values**: \`pending\`, \`partial\`, \`completed\`, \`failed\`, \`refunded\`\n`;
md += `- **Linking**: Payments can be linked to invoices, contracts, or traffic violations\n\n`;

md += `### Critical Column Name Corrections\n\n`;
md += `| Context | Wrong ❌ | Correct ✅ |\n`;
md += `|---------|----------|------------|\n`;
md += `| Journal lines | \`description\` | \`line_description\` |\n`;
md += `| Chart of accounts | \`level\` | \`account_level\` |\n`;
md += `| Chart of accounts | \`parent_code\` | \`parent_account_code\` |\n`;
md += `| Chart of accounts | \`account_name_en\` | \`account_name\` |\n`;
md += `| Payments | \`status\` | \`payment_status\` |\n\n`;

md += `### Key Entity Relationships\n\n`;
md += `#### Contract-Customer-Vehicle Triangle\n`;
md += `- **Contracts** belong to **Customers** (many-to-one)\n`;
md += `- **Contracts** reference **Vehicles** (many-to-many via \`contract_vehicles\`)\n`;
md += `- **Vehicles** can be in multiple Contracts over time\n\n`;

md += `#### Financial Flow\n`;
md += `- **Invoices** generated from **Contracts** (via payment schedules)\n`;
md += `- **Payments** applied to **Invoices** (partial payments allowed)\n`;
md += `- **Journal Entries** created for invoices and payments\n`;
md += `- **Chart of Accounts** used for all financial postings\n\n`;

md += `### Data Records Summary\n\n`;
md += `| Entity | Approx. Records | Notes |\n`;
md += `|--------|----------------|-------|\n`;
md += `| Contracts | ~588 | Active rental agreements |\n`;
md += `| Customers | ~781 | Customer records |\n`;
md += `| Vehicles | ~510 | Fleet vehicles |\n`;
md += `| Invoices | ~1,250 | Billing documents |\n`;
md += `| Payments | ~6,568 | Payment transactions |\n\n`;

md += `### Important Indexes\n\n`;
md += `Most tables have indexes on:\n`;
md += `- \`company_id\` (for multi-tenancy)\n`;
md += `- \`created_at\` (for time-based queries)\n`;
md += `- Foreign key columns (for joins)\n`;
md += `- Status columns (for filtering)\n\n`;

md += `### Common Query Patterns\n\n`;
md += `#### Always Filter by Company\n`;
md += `\`\`\`sql\n`;
md += `-- Always include company_id in queries\n`;
md += `SELECT * FROM contracts WHERE company_id = '...';\n`;
md += `\`\`\`\n\n`;

md += `#### Join Example\n`;
md += `\`\`\`sql\n`;
md += `SELECT\n`;
md += `  c.id,\n`;
md += `  c.contract_number,\n`;
md += `  cust.customer_name,\n`;
md += `  v.license_plate\n`;
md += `FROM contracts c\n`;
md += `JOIN customers cust ON c.customer_id = cust.id\n`;
md += `JOIN contract_vehicles cv ON c.id = cv.contract_id\n`;
md += `JOIN vehicles v ON cv.vehicle_id = v.id\n`;
md += `WHERE c.company_id = '...';\n`;
md += `\`\`\`\n\n`;

// Write to file
fs.writeFileSync(outputPath, md);

console.log(`\nGenerated documentation:`);
console.log(`- Tables: ${actualTables.length}`);
console.log(`- Output: ${outputPath}`);
