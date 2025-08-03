import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseDocument {
  id: string
  file_path: string | null
  contract_id: string
  document_type: string
  created_at: string
}

interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🧹 [CLEANUP] Starting orphaned file cleanup process...')

    // Step 1: Get all files from storage
    const { data: storageFiles, error: storageError } = await supabaseClient.storage
      .from('contract-documents')
      .list('', {
        limit: 1000,
        offset: 0
      })

    if (storageError) {
      console.error('❌ [CLEANUP] Failed to list storage files:', storageError)
      throw storageError
    }

    console.log(`📁 [CLEANUP] Found ${storageFiles?.length || 0} files in storage`)

    // Step 2: Get all database records with file paths
    const { data: dbDocuments, error: dbError } = await supabaseClient
      .from('contract_documents')
      .select('id, file_path, contract_id, document_type, created_at')
      .not('file_path', 'is', null)

    if (dbError) {
      console.error('❌ [CLEANUP] Failed to fetch database documents:', dbError)
      throw dbError
    }

    console.log(`📄 [CLEANUP] Found ${dbDocuments?.length || 0} documents in database`)

    // Step 3: Find orphaned files (files in storage without database records)
    const dbFilePaths = new Set((dbDocuments || []).map(doc => doc.file_path))
    const orphanedFiles: StorageFile[] = []
    const orphanedDbRecords: DatabaseDocument[] = []

    // Check files in storage root
    if (storageFiles) {
      for (const file of storageFiles) {
        if (file.name && !dbFilePaths.has(file.name)) {
          orphanedFiles.push(file as StorageFile)
        }
      }
    }

    // Step 4: Check subdirectories (contract folders)
    const contractFolders = storageFiles?.filter(item => !item.name.includes('.')) || []
    
    for (const folder of contractFolders) {
      const { data: folderFiles } = await supabaseClient.storage
        .from('contract-documents')
        .list(folder.name, { limit: 100 })

      if (folderFiles) {
        for (const file of folderFiles) {
          const fullPath = `${folder.name}/${file.name}`
          if (!dbFilePaths.has(fullPath)) {
            orphanedFiles.push({ ...file as StorageFile, name: fullPath })
          }
        }
      }
    }

    // Step 5: Find orphaned database records (database records without files)
    for (const doc of dbDocuments || []) {
      if (doc.file_path) {
        const { data: fileExists } = await supabaseClient.storage
          .from('contract-documents')
          .download(doc.file_path)
        
        if (!fileExists) {
          orphanedDbRecords.push(doc)
        }
      }
    }

    console.log(`🗑️ [CLEANUP] Found ${orphanedFiles.length} orphaned files`)
    console.log(`🗑️ [CLEANUP] Found ${orphanedDbRecords.length} orphaned database records`)

    // Step 6: Clean up orphaned files (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    let filesDeleted = 0

    for (const file of orphanedFiles) {
      const fileDate = new Date(file.created_at)
      if (fileDate < oneDayAgo) {
        const { error: deleteError } = await supabaseClient.storage
          .from('contract-documents')
          .remove([file.name])

        if (!deleteError) {
          filesDeleted++
          console.log(`🗑️ [CLEANUP] Deleted orphaned file: ${file.name}`)
        } else {
          console.error(`❌ [CLEANUP] Failed to delete file ${file.name}:`, deleteError)
        }
      }
    }

    // Step 7: Clean up orphaned database records (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    let recordsDeleted = 0

    for (const record of orphanedDbRecords) {
      const recordDate = new Date(record.created_at)
      if (recordDate < oneHourAgo) {
        const { error: deleteError } = await supabaseClient
          .from('contract_documents')
          .delete()
          .eq('id', record.id)

        if (!deleteError) {
          recordsDeleted++
          console.log(`🗑️ [CLEANUP] Deleted orphaned record: ${record.id}`)
        } else {
          console.error(`❌ [CLEANUP] Failed to delete record ${record.id}:`, deleteError)
        }
      }
    }

    // Step 8: Log cleanup results
    await supabaseClient
      .from('contract_document_operation_log')
      .insert({
        company_id: '00000000-0000-0000-0000-000000000000',
        operation_type: 'cleanup_orphaned_files',
        operation_status: 'completed',
        metadata: {
          total_storage_files: storageFiles?.length || 0,
          total_db_records: dbDocuments?.length || 0,
          orphaned_files_found: orphanedFiles.length,
          orphaned_records_found: orphanedDbRecords.length,
          files_deleted: filesDeleted,
          records_deleted: recordsDeleted,
          cleanup_threshold_hours: 24
        },
        performed_by: null
      })

    console.log(`✅ [CLEANUP] Cleanup completed. Files deleted: ${filesDeleted}, Records deleted: ${recordsDeleted}`)

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalStorageFiles: storageFiles?.length || 0,
          totalDbRecords: dbDocuments?.length || 0,
          orphanedFilesFound: orphanedFiles.length,
          orphanedRecordsFound: orphanedDbRecords.length,
          filesDeleted,
          recordsDeleted
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 [CLEANUP] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})