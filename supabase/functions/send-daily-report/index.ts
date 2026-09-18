/**
 * Supabase Edge Function: Send Daily Fleet Report
 * ================================================
 * Purpose: Generate and send daily fleet reports via WhatsApp
 * Integration: Ultramsg API
 * 
 * Schedule: Daily at 08:00 AM (via pg_cron)
 * Trigger: Cron job or manual invoke
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// CONFIGURATION
// ============================================
const ULTRAMSG_INSTANCE_ID = Deno.env.get('ULTRAMSG_INSTANCE_ID') || '';
const ULTRAMSG_TOKEN = Deno.env.get('ULTRAMSG_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DailyReportData {
  date: string;
  fleet: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    reserved: number;
    utilizationRate: number;
  };
  financial: {
    todayRevenue: number;
    todayCollected: number;
    totalOutstanding: number;
    overdueAmount: number;
  };
  contracts: {
    newToday: number;
    endedToday: number;
    expiringThisWeek: number;
  };
  alerts: {
    maintenanceNeeded: number;
    licensesExpiring: number;
    insurancesExpiring: number;
    overduePayments: number;
  };
}

/**
 * Format number with comma separator
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

/**
 * Format currency
 */
const formatCurrency = (amount: number, currency = 'ر.ق'): string => {
  return `${formatNumber(Math.round(amount))} ${currency}`;
};

/**
 * Format percentage
 */
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Format phone number for WhatsApp
 */
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  if (!cleaned.startsWith('974') && cleaned.length === 8) {
    cleaned = '974' + cleaned;
  }
  return cleaned;
}

/**
 * Generate daily report message
 */
function generateDailyReport(data: DailyReportData): string {
  const date = new Date(data.date).toLocaleDateString('ar-QA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasAlerts = data.alerts.maintenanceNeeded + 
                   data.alerts.licensesExpiring + 
                   data.alerts.insurancesExpiring + 
                   data.alerts.overduePayments > 0;

  let alertsSection = '✅ *لا توجد تنبيهات*';
  if (hasAlerts) {
    const alertLines: string[] = [];
    if (data.alerts.maintenanceNeeded > 0) alertLines.push(`├ صيانة مطلوبة: ${data.alerts.maintenanceNeeded} مركبة`);
    if (data.alerts.licensesExpiring > 0) alertLines.push(`├ رخص تنتهي قريباً: ${data.alerts.licensesExpiring}`);
    if (data.alerts.insurancesExpiring > 0) alertLines.push(`├ تأمين ينتهي قريباً: ${data.alerts.insurancesExpiring}`);
    if (data.alerts.overduePayments > 0) alertLines.push(`└ مدفوعات متأخرة: ${data.alerts.overduePayments}`);
    alertsSection = `⚠️ *تنبيهات:*\n${alertLines.join('\n')}`;
  }

  return `━━━━━━━━━━━━━━━━━━━
📊 *تقرير الأسطول اليومي*
📅 ${date}
━━━━━━━━━━━━━━━━━━━

🚗 *حالة الأسطول:*
├ إجمالي المركبات: ${formatNumber(data.fleet.total)}
├ متاحة: ${formatNumber(data.fleet.available)} ✅
├ مؤجرة: ${formatNumber(data.fleet.rented)} 🔴
├ صيانة: ${formatNumber(data.fleet.maintenance)} 🔧
├ محجوزة: ${formatNumber(data.fleet.reserved)} 📌
└ نسبة الإشغال: ${formatPercent(data.fleet.utilizationRate)}

💰 *المالية:*
├ إيرادات اليوم: ${formatCurrency(data.financial.todayRevenue)}
├ المتحصل: ${formatCurrency(data.financial.todayCollected)}
├ المستحق الكلي: ${formatCurrency(data.financial.totalOutstanding)}
└ المتأخر: ${formatCurrency(data.financial.overdueAmount)}

📋 *العقود:*
├ عقود جديدة: ${data.contracts.newToday}
├ عقود منتهية: ${data.contracts.endedToday}
└ تنتهي هذا الأسبوع: ${data.contracts.expiringThisWeek}

${alertsSection}
━━━━━━━━━━━━━━━━━━━
🔗 للتفاصيل: افتح التطبيق`;
}

/**
 * Send WhatsApp message via Ultramsg API
 */
async function sendWhatsAppMessage(
  phone: string, 
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const formattedPhone = formatPhone(phone);
    
    console.log(`📞 Sending to: ${formattedPhone}`);

    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: ULTRAMSG_TOKEN,
          to: formattedPhone,
          body: message,
        }),
      }
    );

    const data = await response.json();
    
    console.log('📥 Ultramsg Response:', JSON.stringify(data));
    
    if (data.sent === 'true' || data.sent === true || data.id) {
      return { success: true, messageId: data.id };
    } else {
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch daily report data from database
 */
async function fetchDailyReportData(supabase: any, companyId: string): Promise<DailyReportData | null> {
  try {
    // Get vehicles data
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('status')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const fleetStatus = {
      total: vehicles?.length || 0,
      available: vehicles?.filter((v: any) => v.status === 'available').length || 0,
      rented: vehicles?.filter((v: any) => v.status === 'rented').length || 0,
      maintenance: vehicles?.filter((v: any) => v.status === 'maintenance').length || 0,
      reserved: vehicles?.filter((v: any) => v.status === 'reserved').length || 0,
      utilizationRate: 0,
    };
    
    fleetStatus.utilizationRate = fleetStatus.total > 0 
      ? (fleetStatus.rented / fleetStatus.total) * 100 
      : 0;

    // Get today's payments
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('company_id', companyId)
      .gte('payment_date', today);

    const todayCollected = todayPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

    // Get outstanding invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, status, due_date')
      .eq('company_id', companyId)
      .in('status', ['pending', 'partially_paid', 'overdue']);

    const totalOutstanding = invoices?.reduce((sum: number, i: any) => 
      sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;

    const overdueAmount = invoices
      ?.filter((i: any) => new Date(i.due_date) < new Date())
      .reduce((sum: number, i: any) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;

    // Get new contracts today
    const { data: newContracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('company_id', companyId)
      .gte('created_at', today);

    // Get ended contracts today
    const { data: endedContracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('company_id', companyId)
      .eq('end_date', today);

    // Get contracts expiring this week
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .lte('end_date', weekEnd.toISOString().split('T')[0])
      .gte('end_date', today);

    // Get maintenance alerts
    const { data: maintenanceAlerts } = await supabase
      .from('maintenance')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'pending');

    return {
      date: today,
      fleet: fleetStatus,
      financial: {
        todayRevenue: todayCollected,
        todayCollected,
        totalOutstanding,
        overdueAmount,
      },
      contracts: {
        newToday: newContracts?.length || 0,
        endedToday: endedContracts?.length || 0,
        expiringThisWeek: expiringContracts?.length || 0,
      },
      alerts: {
        maintenanceNeeded: maintenanceAlerts?.length || 0,
        licensesExpiring: 0,
        insurancesExpiring: 0,
        overduePayments: invoices?.filter((i: any) => i.status === 'overdue').length || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching daily report data:', error);
    return null;
  }
}

/**
 * Main Edge Function handler
 */
Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Legacy daily WhatsApp report agent retired',
    }), {
      status: 410,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

    const body = await req.json().catch(() => ({}));
    
    console.log('📊 Starting Daily Report Generation...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get company ID (from body or default)
    const companyId = body.companyId || body.company_id;
    
    if (!companyId) {
      // Get all companies with WhatsApp settings
      const { data: companies } = await supabase
        .from('whatsapp_settings')
        .select('company_id, recipients, daily_report_enabled')
        .eq('daily_report_enabled', true);

      if (!companies || companies.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No companies with daily report enabled',
          sent: 0
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      let totalSent = 0;
      let totalFailed = 0;
      const results: any[] = [];

      for (const company of companies) {
        console.log(`\n📋 Processing company: ${company.company_id}`);
        
        const reportData = await fetchDailyReportData(supabase, company.company_id);
        if (!reportData) {
          console.log(`❌ Failed to fetch report data for ${company.company_id}`);
          continue;
        }

        const message = generateDailyReport(reportData);
        const recipients = (company.recipients || []).filter((r: any) => 
          r.isActive && (r.reportTypes?.includes('daily') || body.force)
        );

        for (const recipient of recipients) {
          if (!recipient.phone) continue;

          const result = await sendWhatsAppMessage(recipient.phone, message);
          
          if (result.success) {
            totalSent++;
            console.log(`✅ Sent to ${recipient.name}`);
            results.push({ company: company.company_id, recipient: recipient.name, status: 'sent' });
          } else {
            totalFailed++;
            console.log(`❌ Failed: ${recipient.name} - ${result.error}`);
            results.push({ company: company.company_id, recipient: recipient.name, status: 'failed', error: result.error });
          }

          // Log to database
          await supabase.from('whatsapp_message_logs').insert({
            company_id: company.company_id,
            recipient_id: recipient.id,
            message_type: 'daily',
            status: result.success ? 'sent' : 'failed',
            content: message.substring(0, 1000),
            error_message: result.error || null,
            sent_at: result.success ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
          }).catch(e => console.error('Failed to log:', e));

          // Delay between messages
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      const duration = Date.now() - startTime;
      
      return new Response(JSON.stringify({
        success: true,
        reportType: 'daily',
        sent: totalSent,
        failed: totalFailed,
        duration,
        results
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } else {
      // Single company
      const reportData = await fetchDailyReportData(supabase, companyId);
      
      if (!reportData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch report data'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const message = generateDailyReport(reportData);

      // Get recipients
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('recipients')
        .eq('company_id', companyId)
        .single();

      const recipients = (settings?.recipients || []).filter((r: any) => 
        r.isActive && (r.reportTypes?.includes('daily') || body.force)
      );

      let sentCount = 0;
      let failedCount = 0;
      const results: any[] = [];

      for (const recipient of recipients) {
        if (!recipient.phone) continue;

        const result = await sendWhatsAppMessage(recipient.phone, message);
        
        if (result.success) {
          sentCount++;
          results.push({ recipient: recipient.name, status: 'sent' });
        } else {
          failedCount++;
          results.push({ recipient: recipient.name, status: 'failed', error: result.error });
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const duration = Date.now() - startTime;

      return new Response(JSON.stringify({
        success: sentCount > 0,
        reportType: 'daily',
        sent: sentCount,
        failed: failedCount,
        duration,
        results
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
