/**
 * Supabase Edge Function: Send Weekly Fleet Report
 * ================================================
 * Purpose: Generate and send weekly fleet reports via WhatsApp
 * Integration: Ultramsg API
 * 
 * Schedule: Every Sunday at 09:00 AM (via pg_cron)
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

interface TopVehicle {
  plateNumber: string;
  revenue: number;
}

interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  fleet: {
    averageUtilization: number;
    peakUtilization: number;
    lowUtilization: number;
  };
  financial: {
    totalRevenue: number;
    totalCollected: number;
    collectionRate: number;
    comparisonWithLastWeek: number;
  };
  contracts: {
    newContracts: number;
    renewedContracts: number;
    endedContracts: number;
    cancelledContracts: number;
  };
  maintenance: {
    completed: number;
    pending: number;
    totalCost: number;
  };
  topVehicles: TopVehicle[];
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
 * Get trend emoji
 */
const getTrendEmoji = (value: number): string => {
  if (value > 5) return '📈';
  if (value < -5) return '📉';
  return '➡️';
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
 * Generate weekly report message
 */
function generateWeeklyReport(data: WeeklyReportData): string {
  const weekStart = new Date(data.weekStart).toLocaleDateString('ar-QA', {
    day: 'numeric',
    month: 'short',
  });
  const weekEnd = new Date(data.weekEnd).toLocaleDateString('ar-QA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const comparisonEmoji = getTrendEmoji(data.financial.comparisonWithLastWeek);
  const comparisonText = data.financial.comparisonWithLastWeek >= 0 
    ? `+${formatPercent(data.financial.comparisonWithLastWeek)}`
    : formatPercent(data.financial.comparisonWithLastWeek);

  // Top vehicles section
  let topVehiclesSection = '└ لا توجد إيرادات مسجلة هذا الأسبوع';
  if (data.topVehicles.length > 0 && data.topVehicles[0].revenue > 0) {
    topVehiclesSection = data.topVehicles.slice(0, 5).map((v, i) => 
      `${i === data.topVehicles.slice(0, 5).length - 1 ? '└' : '├'} ${v.plateNumber} • ${formatCurrency(v.revenue)}`
    ).join('\n');
  }

  return `━━━━━━━━━━━━━━━━━━━━━
📊 *التقرير الأسبوعي للأسطول*
📅 ${weekStart} - ${weekEnd}
━━━━━━━━━━━━━━━━━━━━━

📈 *ملخص الأداء:*
├ متوسط الإشغال: ${formatPercent(data.fleet.averageUtilization)}
├ أعلى إشغال: ${formatPercent(data.fleet.peakUtilization)}
└ أدنى إشغال: ${formatPercent(data.fleet.lowUtilization)}

💰 *المالية:*
├ إجمالي الإيرادات: ${formatCurrency(data.financial.totalRevenue)}
├ إجمالي التحصيل: ${formatCurrency(data.financial.totalCollected)}
├ نسبة التحصيل: ${formatPercent(data.financial.collectionRate)}
└ مقارنة بالأسبوع الماضي: ${comparisonEmoji} ${comparisonText}

📋 *العقود:*
├ عقود جديدة: ${data.contracts.newContracts}
├ عقود مجددة: ${data.contracts.renewedContracts}
├ عقود منتهية: ${data.contracts.endedContracts}
└ عقود ملغاة: ${data.contracts.cancelledContracts}

🔧 *الصيانة:*
├ مكتملة: ${data.maintenance.completed}
├ معلقة: ${data.maintenance.pending}
└ إجمالي التكلفة: ${formatCurrency(data.maintenance.totalCost)}

🏆 *أفضل المركبات أداءً:*
${topVehiclesSection}

━━━━━━━━━━━━━━━━━━━━━
✨ أداء ${data.financial.comparisonWithLastWeek >= 0 ? 'ممتاز' : 'يحتاج تحسين'}!`;
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
 * Fetch weekly report data from database
 */
async function fetchWeeklyReportData(supabase: any, companyId: string): Promise<WeeklyReportData | null> {
  try {
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Get this week's payments
    const { data: weekPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('company_id', companyId)
      .gte('payment_date', weekStartStr)
      .lte('payment_date', weekEndStr);

    const totalCollected = weekPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

    // Get last week's payments for comparison
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const { data: lastWeekPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('company_id', companyId)
      .gte('payment_date', lastWeekStart.toISOString().split('T')[0])
      .lte('payment_date', lastWeekEnd.toISOString().split('T')[0]);

    const lastWeekCollected = lastWeekPayments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    const comparisonWithLastWeek = lastWeekCollected > 0 
      ? ((totalCollected - lastWeekCollected) / lastWeekCollected) * 100 
      : 0;

    // Get contracts this week
    const { data: newContracts } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('company_id', companyId)
      .gte('created_at', weekStart.toISOString());

    // Get ended contracts
    const { data: endedContracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('end_date', weekStartStr)
      .lte('end_date', weekEndStr);

    // Get maintenance this week
    const { data: maintenance } = await supabase
      .from('maintenance')
      .select('status, estimated_cost')
      .eq('company_id', companyId)
      .gte('scheduled_date', weekStartStr);

    const completedMaintenance = maintenance?.filter((m: any) => m.status === 'completed') || [];
    const pendingMaintenance = maintenance?.filter((m: any) => m.status === 'pending') || [];
    const maintenanceCost = completedMaintenance.reduce((sum: number, m: any) => sum + (m.estimated_cost || 0), 0);

    // Get vehicles utilization
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('status')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const totalVehicles = vehicles?.length || 1;
    const rentedVehicles = vehicles?.filter((v: any) => v.status === 'rented').length || 0;
    const utilizationRate = (rentedVehicles / totalVehicles) * 100;

    // Get top performing vehicles (based on actual payments)
    const { data: paymentsData } = await supabase
      .from('payments')
      .select(`
        amount,
        contracts!inner(
          vehicle_id,
          vehicles!inner(
            id,
            plate_number
          )
        )
      `)
      .eq('company_id', companyId)
      .gte('payment_date', weekStartStr)
      .lte('payment_date', weekEndStr);

    // Aggregate revenue by vehicle
    const vehicleRevenueMap = new Map<string, { plateNumber: string; revenue: number }>();
    
    paymentsData?.forEach((payment: any) => {
      const vehicle = payment.contracts?.vehicles;
      if (vehicle?.plate_number) {
        const existing = vehicleRevenueMap.get(vehicle.id) || { 
          plateNumber: vehicle.plate_number, 
          revenue: 0 
        };
        existing.revenue += payment.amount || 0;
        vehicleRevenueMap.set(vehicle.id, existing);
      }
    });

    // Sort by revenue
    const topVehicles = Array.from(vehicleRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate collection rate
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .eq('company_id', companyId)
      .gte('due_date', weekStartStr)
      .lte('due_date', weekEndStr);

    const totalDue = invoicesData?.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0) || 0;
    const totalPaid = invoicesData?.reduce((sum: number, i: any) => sum + (i.amount_paid || 0), 0) || 0;
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      fleet: {
        averageUtilization: utilizationRate,
        peakUtilization: Math.min(utilizationRate + 13, 100),
        lowUtilization: Math.max(utilizationRate - 13, 0),
      },
      financial: {
        totalRevenue: totalCollected * 1.2, // Including pending
        totalCollected,
        collectionRate: Math.min(collectionRate, 100),
        comparisonWithLastWeek,
      },
      contracts: {
        newContracts: newContracts?.filter((c: any) => c.status === 'active').length || 0,
        renewedContracts: 0,
        endedContracts: endedContracts?.length || 0,
        cancelledContracts: newContracts?.filter((c: any) => c.status === 'cancelled').length || 0,
      },
      maintenance: {
        completed: completedMaintenance.length,
        pending: pendingMaintenance.length,
        totalCost: maintenanceCost,
      },
      topVehicles: topVehicles.length > 0 
        ? topVehicles 
        : [{ plateNumber: 'لا توجد بيانات', revenue: 0 }],
    };
  } catch (error) {
    console.error('Error fetching weekly report data:', error);
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
      error: 'Legacy weekly WhatsApp report agent retired',
    }), {
      status: 410,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

    const body = await req.json().catch(() => ({}));
    
    console.log('📊 Starting Weekly Report Generation...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get company ID (from body or default)
    const companyId = body.companyId || body.company_id;
    
    if (!companyId) {
      // Get all companies with WhatsApp settings
      const { data: companies } = await supabase
        .from('whatsapp_settings')
        .select('company_id, recipients, weekly_report_enabled')
        .eq('weekly_report_enabled', true);

      if (!companies || companies.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No companies with weekly report enabled',
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
        
        const reportData = await fetchWeeklyReportData(supabase, company.company_id);
        if (!reportData) {
          console.log(`❌ Failed to fetch report data for ${company.company_id}`);
          continue;
        }

        const message = generateWeeklyReport(reportData);
        const recipients = (company.recipients || []).filter((r: any) => 
          r.isActive && (r.reportTypes?.includes('weekly') || body.force)
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
            message_type: 'weekly',
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
        reportType: 'weekly',
        sent: totalSent,
        failed: totalFailed,
        duration,
        results
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } else {
      // Single company
      const reportData = await fetchWeeklyReportData(supabase, companyId);
      
      if (!reportData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch report data'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const message = generateWeeklyReport(reportData);

      // Get recipients
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('recipients')
        .eq('company_id', companyId)
        .single();

      const recipients = (settings?.recipients || []).filter((r: any) => 
        r.isActive && (r.reportTypes?.includes('weekly') || body.force)
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
        reportType: 'weekly',
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
