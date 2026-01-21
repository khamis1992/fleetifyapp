#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAllDuplicates(dryRun = true) {
  console.log(`🧹 ${dryRun ? '[DRY RUN] ' : ''}Cleaning duplicate documents from ALL tables...\n`);

  const tables = [
    { 
      name: 'customer_documents', 
      idField: 'customer_id', 
      nameField: 'document_name', 
      pathField: 'file_path',
      typeField: 'document_type'
    },
    { 
      name: 'vehicle_documents', 
      idField: 'vehicle_id', 
      nameField: 'document_name', 
      pathField: 'document_url',
      typeField: 'document_type'
    },
    { 
      name: 'contract_documents', 
      idField: 'contract_id', 
      nameField: 'document_name', 
      pathField: 'file_path',
      typeField: 'document_type'
    }
  ];

  for (const table of tables) {
    console.log(`📁 Table: ${table.name}`);
    
    // Check total count first
    const { count: totalCount, error: countError } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`   ❌ Error fetching count: ${countError.message}`);
      continue;
    }

    console.log(`   Total rows: ${totalCount || 0}`);
    if (!totalCount || totalCount === 0) {
      console.log('   ⏭️  Skipping empty table.\n');
      continue;
    }

    // Fetch all records
    const { data: allDocs, error: fetchError } = await supabase
      .from(table.name)
      .select(`id, ${table.idField}, ${table.typeField}, ${table.nameField}, ${table.pathField}, created_at`)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(`   ❌ Error fetching records: ${fetchError.message}`);
      continue;
    }

    const unique = new Map();
    const toDelete = [];

    allDocs?.forEach(doc => {
      // Define a key for uniqueness: ID + Type + (Name or Path)
      const targetId = doc[table.idField];
      const docType = doc[table.typeField];
      const docName = doc[table.nameField];
      const docPath = doc[table.pathField];
      
      const key = `${targetId}-${docType}-${docName || docPath}`;
      
      if (unique.has(key)) {
        toDelete.push({ id: doc.id, name: docName || docPath, date: doc.created_at });
      } else {
        unique.set(key, doc.id);
      }
    });

    if (toDelete.length > 0) {
      console.log(`   ⚠️ Found ${toDelete.length} duplicates.`);
      if (!dryRun) {
        console.log(`   🗑️ Deleting duplicates...`);
        const idsToDelete = toDelete.map(d => d.id);
        
        // Delete in chunks of 50 to avoid request size limits
        for (let i = 0; i < idsToDelete.length; i += 50) {
          const chunk = idsToDelete.slice(i, i + 50);
          const { error: delError } = await supabase
            .from(table.name)
            .delete()
            .in('id', chunk);
          
          if (delError) {
            console.error(`   ❌ Delete error at chunk ${i/50 + 1}:`, delError.message);
          }
        }
        console.log('   ✅ Table cleaned successfully.');
      } else {
        console.log('   👀 Dry run: No actual deletions performed.');
        toDelete.slice(0, 5).forEach(d => console.log(`      - Would delete ID: ${d.id}, Name: ${d.name}, Created: ${d.date}`));
        if (toDelete.length > 5) console.log(`      ... and ${toDelete.length - 5} more.`);
      }
    } else {
      console.log('   ✅ No duplicates found.');
    }
    console.log('');
  }
}

// Default to DRY RUN for safety
const isActualRun = process.argv.includes('--execute');
cleanAllDuplicates(!isActualRun);
