import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingEntry {
  id: string
  company_id: string
  contract_id: string
  entry_type: string
  retry_count: number
  max_retries: number
  last_error?: string
  status: string
  priority: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 [PENDING_JOURNAL_ENTRIES] Starting automated processing...')

    // استخدام الدالة المحسّنة لمعالجة القيود المعلقة
    const { data: result, error: processError } = await supabase
      .rpc('process_pending_journal_entries')
    
    if (processError) {
      console.error('❌ [PENDING_JOURNAL_ENTRIES] Processing failed:', processError)
      throw processError
    }

    if (!result) {
      console.log('✅ [PENDING_JOURNAL_ENTRIES] No pending entries to process')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending journal entries to process',
          processed: 0,
          failed: 0,
          details: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const processed = parseInt(result.processed || '0')
    const failed = parseInt(result.failed || '0')
    const details = result.details || []

    console.log(`📊 [PENDING_JOURNAL_ENTRIES] Processing complete:`, {
      processed,
      failed,
      total_details: details.length
    })

    // إرسال إشعارات للعقود التي فشلت نهائياً
    if (failed > 0) {
      const failedContracts = details.filter((d: any) => d.status === 'failed')
      
      for (const failedContract of failedContracts) {
        console.log(`⚠️ [PENDING_JOURNAL_ENTRIES] Contract ${failedContract.contract_id} failed permanently`)
        
        // يمكن إضافة منطق إرسال إشعارات هنا
        // مثلاً إنشاء إشعار في جدول user_notifications
      }
    }

    // تحديث حالات العقود التي تم إنجاز قيودها بنجاح
    if (processed > 0) {
      const successfulContracts = details.filter((d: any) => d.status === 'completed')
      
      for (const successfulContract of successfulContracts) {
        console.log(`✅ [PENDING_JOURNAL_ENTRIES] Contract ${successfulContract.contract_id} activated successfully`)
        
        // تفعيل العقد إذا لم يكن مفعلاً
        await supabase
          .from('contracts')
          .update({ 
            status: 'active',
            journal_entry_id: successfulContract.journal_entry_id
          })
          .eq('id', successfulContract.contract_id)
          .eq('status', 'draft')
      }
    }

    console.log('🎉 [PENDING_JOURNAL_ENTRIES] Automated processing completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} entries, ${failed} failed`,
        processed,
        failed,
        details
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ [PENDING_JOURNAL_ENTRIES] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        processed: 0,
        failed: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})