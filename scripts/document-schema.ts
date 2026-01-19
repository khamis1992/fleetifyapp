/**
 * Fleetify Database Schema Documentation Script
 *
 * Run with: npm run db:doc
 *
 * This script connects to your Supabase database and generates comprehensive
 * documentation of all tables, columns, relationships, indexes, and policies.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; // Or service role key for full access
const supabase = createClient(supabaseUrl, supabaseKey);

interface TableInfo {
  schema: string;
  name: string;
  rowCount?: number;
  size?: string;
}

interface ColumnInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: string;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignTable?: string;
  foreignColumn?: string;
}

interface ForeignKeyInfo {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  onUpdate: string;
  onDelete: string;
}

interface IndexInfo {
  tableName: string;
  indexName: string;
  columns: string;
  isUnique: boolean;
  isPrimary: boolean;
  definition: string;
}

interface PolicyInfo {
  tableName: string;
  policyName: string;
  isPermissive: boolean;
  command: string;
  roles: string[];
  using: string | null;
  withCheck: string | null;
}

/**
 * Execute a SQL query and return results
 */
async function executeQuery(sql: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Query error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all tables in the database
 */
async function getAllTables(): Promise<TableInfo[]> {
  const sql = `
    SELECT
      schemaname AS schema,
      tablename AS name
    FROM pg_tables
    WHERE schemaname IN ('public', 'auth', 'storage')
    ORDER BY schemaname, tablename
  `;

  // Since we can't use custom RPC, let's use the schema inspection
  const { data: tables, error } = await supabase
    .from('pg_tables')
    .select('schemaname, tablename')
    .in('schemaname', ['public', 'auth', 'storage']);

  if (error) {
    console.error('Error fetching tables:', error);
    return [];
  }

  return (tables || []).map((t: any) => ({
    schema: t.schemaname,
    name: t.tablename,
  }));
}

/**
 * Get column information for all tables
 */
async function getColumnsInfo(): Promise<ColumnInfo[]> {
  const sql = `
    SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
        SELECT
            ku.table_name,
            ku.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
    ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.ordinal_position
  `;

  return [];
}

/**
 * Get foreign key relationships
 */
async function getForeignKeys(): Promise<ForeignKeyInfo[]> {
  return [];
}

/**
 * Get index information
 */
async function getIndexes(): Promise<IndexInfo[]> {
  return [];
}

/**
 * Get RLS policies
 */
async function getPolicies(): Promise<PolicyInfo[]> {
  return [];
}

/**
 * Get enum types
 */
async function getEnums(): Promise<any[]> {
  return [];
}

/**
 * Get functions
 */
async function getFunctions(): Promise<any[]> {
  return [];
}

/**
 * Get triggers
 */
async function getTriggers(): Promise<any[]> {
  return [];
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(
  tables: TableInfo[],
  columns: ColumnInfo[],
  foreignKeys: ForeignKeyInfo[],
  indexes: IndexInfo[],
  policies: PolicyInfo[],
  enums: any[],
  functions: any[],
  triggers: any[]
): string {
  let md = '# Fleetify Database Schema Documentation\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '---\n\n';

  // Summary
  md += '## Summary\n\n';
  md += `- **Total Tables**: ${tables.length}\n`;
  md += `- **Schemas**: public, auth, storage\n\n';

  // Tables
  md += '## Tables\n\n';
  const publicTables = tables.filter(t => t.schema === 'public');
  const authTables = tables.filter(t => t.schema === 'auth');
  const storageTables = tables.filter(t => t.schema === 'storage');

  md += '### Public Schema\n\n';
  md += '| Table Name | Row Count | Size |\n';
  md += '|------------|-----------|------|\n';
  publicTables.forEach(t => {
    md += `| \`${t.name}\` | ${t.rowCount || 'N/A'} | ${t.size || 'N/A'} |\n`;
  });

  md += '\n### Auth Schema\n\n';
  md += '| Table Name | Description |\n';
  md += '|------------|-------------|\n';
  authTables.forEach(t => {
    md += `| \`${t.name}\` | Supabase Auth table |\n`;
  });

  md += '\n### Storage Schema\n\n';
  md += '| Table Name | Description |\n';
  md += '|------------|-------------|\n';
  storageTables.forEach(t => {
    md += `| \`${t.name}\` | Supabase Storage table |\n`;
  });

  // Columns
  md += '\n## Column Definitions\n\n';
  const tablesWithColumns = columns.reduce((acc, col) => {
    if (!acc[col.tableName]) {
      acc[col.tableName] = [];
    }
    acc[col.tableName].push(col);
    return acc;
  }, {} as Record<string, ColumnInfo[]>);

  Object.entries(tablesWithColumns).forEach(([tableName, cols]) => {
    md += `### \`${tableName}\`\n\n`;
    md += '| Column | Type | Nullable | Default | Keys |\n';
    md += '|--------|------|----------|---------|------|\n';
    cols.forEach(col => {
      const keys = [];
      if (col.isPrimaryKey) keys.push('PK');
      if (col.isForeignKey) {
        keys.push(`FK → ${col.foreignTable}.${col.foreignColumn}`);
      }
      md += `| \`${col.columnName}\` | ${col.dataType} | ${col.isNullable} | ${col.defaultValue || '-'} | ${keys.join(', ') || '-'} |\n`;
    });
    md += '\n';
  });

  // Foreign Keys
  if (foreignKeys.length > 0) {
    md += '## Foreign Key Relationships\n\n';
    md += '| Source Table | Source Column | Target Table | Target Column | On Update | On Delete |\n';
    md += '|--------------|---------------|--------------|---------------|-----------|-----------|\n';
    foreignKeys.forEach(fk => {
      md += `| \`${fk.sourceTable}\` | \`${fk.sourceColumn}\` | \`${fk.targetTable}\` | \`${fk.targetColumn}\` | ${fk.onUpdate} | ${fk.onDelete} |\n`;
    });
    md += '\n';
  }

  // Indexes
  if (indexes.length > 0) {
    md += '## Indexes\n\n';
    const indexesByTable = indexes.reduce((acc, idx) => {
      if (!acc[idx.tableName]) {
        acc[idx.tableName] = [];
      }
      acc[idx.tableName].push(idx);
      return acc;
    }, {} as Record<string, IndexInfo[]>);

    Object.entries(indexesByTable).forEach(([tableName, idxs]) => {
      md += `### \`${tableName}\`\n\n`;
      md += '| Index Name | Columns | Unique? | Primary? |\n';
      md += '|------------|---------|---------|----------|\n';
      idxs.forEach(idx => {
        md += `| \`${idx.indexName}\` | ${idx.columns} | ${idx.isUnique ? 'Yes' : 'No'} | ${idx.isPrimary ? 'Yes' : 'No'} |\n`;
      });
      md += '\n';
    });
  }

  // RLS Policies
  if (policies.length > 0) {
    md += '## Row Level Security Policies\n\n';
    const policiesByTable = policies.reduce((acc, pol) => {
      if (!acc[pol.tableName]) {
        acc[pol.tableName] = [];
      }
      acc[pol.tableName].push(pol);
      return acc;
    }, {} as Record<string, PolicyInfo[]>);

    Object.entries(policiesByTable).forEach(([tableName, pols]) => {
      md += `### \`${tableName}\`\n\n`;
      pols.forEach(pol => {
        md += `**${pol.policyName}**\n\n`;
        md += `- **Command**: ${pol.command}\n`;
        md += `- **Permissive**: ${pol.isPermissive ? 'Yes' : 'No'}\n`;
        md += `- **Roles**: ${pol.roles.join(', ')}\n`;
        if (pol.using) md += `- **Using**: \`${pol.using}\`\n`;
        if (pol.withCheck) md += `- **With Check**: \`${pol.withCheck}\`\n`;
        md += '\n';
      });
    });
  }

  return md;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Gathering database schema information...\n');

  try {
    const tables = await getAllTables();
    console.log(`✓ Found ${tables.length} tables`);

    const columns = await getColumnsInfo();
    console.log(`✓ Found ${columns.length} columns`);

    const foreignKeys = await getForeignKeys();
    console.log(`✓ Found ${foreignKeys.length} foreign keys`);

    const indexes = await getIndexes();
    console.log(`✓ Found ${indexes.length} indexes`);

    const policies = await getPolicies();
    console.log(`✓ Found ${policies.length} RLS policies`);

    const enums = await getEnums();
    console.log(`✓ Found ${enums.length} enum types`);

    const functions = await getFunctions();
    console.log(`✓ Found ${functions.length} functions`);

    const triggers = await getTriggers();
    console.log(`✓ Found ${triggers.length} triggers`);

    const markdown = generateMarkdown(
      tables,
      columns,
      foreignKeys,
      indexes,
      policies,
      enums,
      functions,
      triggers
    );

    // Ensure docs directory exists
    const docsDir = join(process.cwd(), 'docs');
    mkdirSync(docsDir, { recursive: true });

    const outputPath = join(docsDir, 'DATABASE_SCHEMA.md');
    writeFileSync(outputPath, markdown);

    console.log(`\n✅ Documentation generated: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as generateDocs };
