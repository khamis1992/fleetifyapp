import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error('Company ID is required');
    }

    console.log(`🔍 بدء حساب الغرامات للشركة: ${company_id}`);

    // جلب إعدادات الغرامات للشركة
    const { data: settings, error: settingsError } = await supabaseClient
      .from('late_fine_settings')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .single();

    if (settingsError) {
      console.log('❌ لم يتم العثور على إعدادات الغرامات أو أنها غير مفعلة');
      return new Response(
        JSON.stringify({ message: 'لم يتم العثور على إعدادات الغرامات', updated_contracts: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('⚙️ إعدادات الغرامات:', settings);

    // جلب العقود النشطة للشركة
    const { data: contracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select('id, contract_number, end_date, contract_amount, monthly_amount, late_fine_amount, days_overdue')
      .eq('company_id', company_id)
      .eq('status', 'active');

    if (contractsError) {
      throw contractsError;
    }

    console.log(`📋 تم العثور على ${contracts?.length || 0} عقد نشط`);

    let updatedContracts = 0;
    const today = new Date();

    for (const contract of contracts || []) {
      const endDate = new Date(contract.end_date);
      const timeDiff = today.getTime() - endDate.getTime();
      const daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      let fineAmount = 0;
      
      // التحقق من أن العقد متأخر فعلاً وبعد فترة السماح
      if (daysOverdue > settings.grace_period_days) {
        const actualOverdueDays = daysOverdue - settings.grace_period_days;
        const baseAmount = contract.monthly_amount || contract.contract_amount;
        
        if (settings.fine_type === 'percentage') {
          // حساب الغرامة كنسبة من المبلغ الأساسي
          fineAmount = (baseAmount * settings.fine_rate / 100) * actualOverdueDays;
        } else {
          // حساب الغرامة كمبلغ ثابت يومي
          fineAmount = settings.fine_rate * actualOverdueDays;
        }
        
        // تطبيق الحد الأقصى للغرامة إذا كان محدداً
        if (settings.max_fine_amount && settings.max_fine_amount > 0 && fineAmount > settings.max_fine_amount) {
          fineAmount = settings.max_fine_amount;
        }
        
        // تقريب إلى 3 منازل عشرية
        fineAmount = Math.round(fineAmount * 1000) / 1000;
      }

      // تحديث العقد بالغرامة وعدد الأيام المتأخرة
      const { error: updateError } = await supabaseClient
        .from('contracts')
        .update({
          days_overdue: Math.max(0, daysOverdue),
          late_fine_amount: fineAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (updateError) {
        console.error(`❌ خطأ في تحديث العقد ${contract.contract_number}:`, updateError);
      } else {
        updatedContracts++;
        console.log(`✅ تم تحديث العقد ${contract.contract_number}: ${daysOverdue} يوم تأخير، غرامة: ${fineAmount} د.ك`);
      }
    }

    console.log(`🎉 تم تحديث ${updatedContracts} عقد بنجاح`);

    return new Response(
      JSON.stringify({
        message: 'تم حساب الغرامات بنجاح',
        updated_contracts: updatedContracts,
        settings_used: {
          fine_type: settings.fine_type,
          fine_rate: settings.fine_rate,
          grace_period_days: settings.grace_period_days,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ خطأ في حساب الغرامات:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});