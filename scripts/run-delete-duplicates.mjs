#!/usr/bin/env node

/**
 * Run delete-duplicate-vehicles.sql script
 * This script executes the SQL to delete duplicate vehicles and add constraints
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n   Example:');
  console.error('   $env:SUPABASE_URL="https://xxx.supabase.co"');
  console.error('   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('   node scripts/run-delete-duplicates.mjs');
  process.exit(1);
}

// Create Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Split SQL script into individual statements
 */
function splitSQLStatements(sql) {
  // Remove comments but keep structure
  // Split by semicolons that are not inside strings or DO blocks
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = null;
  let inDOBlock = false;
  let doBlockDepth = 0;
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // Handle string literals
    if ((char === "'" || char === '"') && !inDOBlock) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && sql[i - 1] !== '\\') {
        inString = false;
        stringChar = null;
      }
      current += char;
      i++;
      continue;
    }

    // Handle DO $$ blocks
    if (!inString) {
      if (sql.substring(i, i + 3) === 'DO ' && sql.substring(i + 3, i + 6) === '$$') {
        inDOBlock = true;
        doBlockDepth = 1;
        current += sql.substring(i, i + 6);
        i += 6;
        continue;
      }

      if (inDOBlock) {
        if (sql.substring(i, i + 2) === '$$') {
          const before = sql[i - 1];
          const after = sql[i + 2];
          // Check if this is the end of the DO block
          if (before && before !== '$' && (!after || after === ';' || after === '\n' || after === '\r')) {
            doBlockDepth--;
            if (doBlockDepth === 0) {
              inDOBlock = false;
              current += '$$';
              i += 2;
              // Skip to semicolon
              while (i < sql.length && sql[i] !== ';') {
                current += sql[i];
                i++;
              }
              current += ';';
              statements.push(current.trim());
              current = '';
              i++;
              continue;
            }
          } else if (sql.substring(i - 1, i + 3) === '$$$$') {
            // Nested $$
            doBlockDepth++;
            current += '$$';
            i += 2;
            continue;
          }
        }
        current += char;
        i++;
        continue;
      }
    }

    // Check for statement separator (semicolon outside strings and DO blocks)
    if (char === ';' && !inString && !inDOBlock) {
      current += char;
      const trimmed = current.trim();
      // Only add non-empty statements (skip comments-only lines)
      if (trimmed && !trimmed.match(/^--/)) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  // Add any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s && !s.match(/^--/));
}

/**
 * Execute a single SQL statement via exec_sql RPC
 */
async function executeStatement(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Check if exec_sql function exists
      if (error.message.includes('function exec_sql') || error.code === '42883') {
        throw new Error(
          'exec_sql RPC function not found. Please create it first or run the SQL manually in Supabase Dashboard.'
        );
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Main execution function
 */
async function runScript() {
  console.log('🚀 Starting delete duplicate vehicles script...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'delete-duplicate-vehicles.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL file loaded successfully\n');

    // Split into statements
    // Note: We'll handle this more carefully - the script has 6 distinct steps
    const steps = [
      {
        name: 'STEP 1: Check duplicates',
        sql: sql.match(/-- STEP 1:.*?(?=-- STEP 2:|$)/s)?.[0].replace(/^-- STEP 1:.*?\n/, '').trim() || ''
      },
      {
        name: 'STEP 2: List duplicate plates (optional)',
        sql: sql.match(/-- STEP 2:.*?(?=-- STEP 3:|$)/s)?.[0].replace(/^-- STEP 2:.*?\n/, '').trim() || '',
        optional: true
      },
      {
        name: 'STEP 3: Delete duplicates',
        sql: sql.match(/-- STEP 3:.*?(?=-- STEP 4:|$)/s)?.[0].replace(/^-- STEP 3:.*?\n/, '').trim() || ''
      },
      {
        name: 'STEP 4: Verify deletion',
        sql: sql.match(/-- STEP 4:.*?(?=-- STEP 5:|$)/s)?.[0].replace(/^-- STEP 4:.*?\n/, '').trim() || ''
      },
      {
        name: 'STEP 5: Create unique index',
        sql: sql.match(/-- STEP 5:.*?(?=-- STEP 6:|$)/s)?.[0].replace(/^-- STEP 5:.*?\n/, '').trim() || ''
      },
      {
        name: 'STEP 6: Create regular index',
        sql: sql.match(/-- STEP 6:.*?(?=-- =|$)/s)?.[0].replace(/^-- STEP 6:.*?\n/, '').trim() || ''
      }
    ].filter(step => step.sql);

    // Execute each step
    for (const [index, step] of steps.entries()) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📌 ${step.name}`);
      console.log('='.repeat(60));

      if (step.optional) {
        console.log('⏭️  Skipping optional step (STEP 2)');
        console.log('   You can run it manually in Supabase Dashboard if needed');
        continue;
      }

      // Clean up SQL (remove comments)
      let cleanSQL = step.sql
        .split('\n')
        .filter(line => !line.trim().match(/^--/))
        .join('\n')
        .trim();

      if (!cleanSQL) {
        console.log('⚠️  Empty SQL, skipping...');
        continue;
      }

      // Execute
      const result = await executeStatement(cleanSQL);

      if (result.error) {
        console.error(`❌ Error executing ${step.name}:`);
        console.error('   ', result.error.message);

        // If it's the exec_sql not found error, provide instructions
        if (result.error.message.includes('exec_sql RPC function not found')) {
          console.error('\n📋 To fix this, you have two options:');
          console.error('\n   1. Run the SQL manually in Supabase Dashboard:');
          console.error('      https://supabase.com/dashboard/project/_/sql/new');
          console.error('      Copy and paste the contents of:');
          console.error(`      ${sqlPath}`);
          console.error('\n   2. Or create the exec_sql function first (see supabase/migrations)');
          process.exit(1);
        }

        // For other errors, continue might be ok (e.g., index already exists)
        if (index === 4 || index === 5) {
          console.log('   ⚠️  This might be ok if the index already exists');
        } else {
          throw result.error;
        }
      } else {
        console.log('✅ Executed successfully');
        if (result.data && typeof result.data === 'object') {
          console.log('   Result:', JSON.stringify(result.data, null, 2));
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Script completed successfully!');
    console.log('='.repeat(60));
    console.log('\nYour database now:');
    console.log('  ✅ Has no duplicate vehicles');
    console.log('  ✅ Has a unique index to prevent future duplicates');
    console.log('  ✅ Is optimized with indexes\n');
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error('\n💡 Alternative: Run the SQL manually in Supabase Dashboard');
    console.error('   https://supabase.com/dashboard/project/_/sql/new');
    process.exit(1);
  }
}

// Run the script
runScript();
