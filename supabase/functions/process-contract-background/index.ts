import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { contractId, contractData } = await req.json()

    console.log('🔄 [BACKGROUND_PROCESSING] بدء المعالجة الخلفية للعقد:', contractId)

    // 1. ربط تقرير حالة المركبة إذا وجد
    if (contractData.vehicle_condition_report_id) {
      try {
        await supabase
          .from('vehicle_condition_reports')
          .update({ contract_id: contractId })
          .eq('id', contractData.vehicle_condition_report_id)
        
        console.log('✅ [BACKGROUND_PROCESSING] تم ربط تقرير حالة المركبة')
      } catch (error) {
        console.error('❌ [BACKGROUND_PROCESSING] خطأ في ربط تقرير المركبة:', error)
      }
    }

    // 2. جلب بيانات العميل لإنشاء PDF
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name_ar, last_name_ar, company_name_ar, customer_type')
        .eq('id', contractData.customer_id)
        .single()

      const customerName = customer?.customer_type === 'corporate' 
        ? customer.company_name_ar || 'شركة'
        : `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() || 'عميل'

      console.log('✅ [BACKGROUND_PROCESSING] تم جلب بيانات العميل:', customerName)

      // 3. معالجة PDF في الخلفية (محاكاة)
      // في التطبيق الحقيقي، يمكن إضافة منطق إنشاء PDF هنا
      console.log('📄 [BACKGROUND_PROCESSING] معالجة PDF للعقد:', contractData.contract_number)
      
    } catch (error) {
      console.error('❌ [BACKGROUND_PROCESSING] خطأ في معالجة بيانات العميل:', error)
    }

    // 4. تحديث الإحصائيات
    try {
      // إنشاء سجل إحصائي
      await supabase
        .from('contract_statistics')
        .insert({
          contract_id: contractId,
          contract_type: contractData.contract_type,
          contract_amount: contractData.contract_amount,
          processed_at: new Date().toISOString(),
          processing_method: 'ultra_fast'
        })
        .select()
        .single()

      console.log('📊 [BACKGROUND_PROCESSING] تم تحديث الإحصائيات')
    } catch (error) {
      console.warn('⚠️ [BACKGROUND_PROCESSING] فشل في تحديث الإحصائيات:', error)
    }

    // 5. إرسال إشعارات (اختياري)
    try {
      console.log('🔔 [BACKGROUND_PROCESSING] إرسال الإشعارات...')
      // يمكن إضافة منطق الإشعارات هنا
    } catch (error) {
      console.warn('⚠️ [BACKGROUND_PROCESSING] فشل في إرسال الإشعارات:', error)
    }

    console.log('🎉 [BACKGROUND_PROCESSING] اكتملت المعالجة الخلفية للعقد:', contractId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تمت المعالجة الخلفية بنجاح',
        contractId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('💥 [BACKGROUND_PROCESSING] خطأ في المعالجة الخلفية:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})