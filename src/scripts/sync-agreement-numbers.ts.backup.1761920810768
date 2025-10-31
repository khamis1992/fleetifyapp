import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// WARNING: Do not run this script on a production database without a backup.
// This script is intended for a one-time data migration.

// Simple function to load .env file manually
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

// Load environment variables
loadEnvFile();

const SUPABASE_URL = "https://qwhunliohlkkahbspfiu.supabase.co";
// IMPORTANT: Use the SERVICE_ROLE_KEY for admin-level operations. 
// This key should be stored securely and not be exposed on the client-side.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_KEY environment variable is not set.");
  console.error("Please create a .env file in the root of the project and add the key.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SQL_FILE_PATH = path.join(__dirname, '../../.qoder/agreements_with_details.sql');

interface AgreementUpdate {
  id: string;
  agreement_number: string;
}

async function parseSqlFile(): Promise<AgreementUpdate[]> {
  console.log(`Reading SQL file from: ${SQL_FILE_PATH}`);
  const fileContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');
  const lines = fileContent.split('\n');
  const updates: AgreementUpdate[] = [];

  const insertRegex = /INSERT INTO agreements_with_details VALUES \('([^']*)', '([^']*)',/i;

  for (const line of lines) {
    const match = line.match(insertRegex);
    if (match) {
      const id = match[1];
      const agreement_number = match[2];
      if (id && agreement_number) {
        updates.push({ id, agreement_number });
      }
    }
  }

  console.log(`Found ${updates.length} records to update.`);
  return updates;
}

async function updateDatabase(updates: AgreementUpdate[]) {
  if (updates.length === 0) {
    console.log("No updates to perform.");
    return;
  }

  console.log("Starting database update process...");

  for (const update of updates) {
    try {
      const { data, error } = await supabase
        .from('agreements')
        .update({ agreement_number: update.agreement_number })
        .eq('id', update.id);
      
      if (error) {
        console.error(`Error updating record ${update.id}:`, error.message);
      } else {
        console.log(`Successfully updated agreement ${update.id} with number ${update.agreement_number}`);
      }
    } catch (e) {
        console.error(`An unexpected error occurred for record ${update.id}:`, e);
    }
  }

  console.log("Database update process finished.");
}

async function main() {
  try {
    const updates = await parseSqlFile();
    await updateDatabase(updates);
  } catch (error) {
    console.error("An error occurred during the script execution:", error);
  }
}

main();
