/**
 * Supabase Edge Function: Send WhatsApp Reminders
 * ================================================
 * Purpose: Process automated payment reminders via WhatsApp
 * Integration: Ultramsg API
 * 
 * Schedule:
 * - Day 28: Pre-due reminder (3 days before due date)
 * - Day 2: Late payment notice with penalty
 * - Day 5: Final warning
 * - Day 10: Legal action notice
 * 
 * Trigger: Cron job or manual invoke
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// ULTRAMSG CONFIGURATION
// ============================================
const ULTRAMSG_INSTANCE_ID = 'instance148672';
const ULTRAMSG_TOKEN = 'rls3i8flwugsei1j';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Company info
const COMPANY_NAME = 'شركة العراف لتأجير السيارات';
const DAILY_LATE_FEE = 120; // QAR per day

// Reminder types
type ReminderType = 'pre_due' | 'overdue_day2' | 'final_warning' | 'legal_action';

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  monthly_amount: number;
  customer: {
    first_name_ar?: string;
    last_name_ar?: string;
    first_name?: string;
    last_name?: string;
    company_name_ar?: string;
    company_name?: string;
    customer_type?: string;
    phone?: string;
  };
}

/**
 * Get customer display name
 */
function getCustomerName(customer: Contract['customer']): string {
  if (customer.customer_type === 'corporate') {
    return customer.company_name_ar || customer.company_name || 'العميل الكريم';
  }
  const firstName = customer.first_name_ar || customer.first_name || '';
  const lastName = customer.last_name_ar || customer.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'العميل الكريم';
}

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
 * Generate reminder message based on type
 */
function generateMessage(
  type: ReminderType,
  customerName: string,
  contractNumber: string,
  amount: number,
  daysLate: number = 0
): string {
  switch (type) {
    case 'pre_due':
      return `السلام عليكم ورحمة الله وبركاته

${customerName} الكريم،

نود تذكيركم بأن موعد سداد الإيجار الشهري سيحين يوم 1 من الشهر القادم.

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${contractNumber}
💰 المبلغ المستحق: ${amount.toLocaleString()} ر.ق
📅 تاريخ الاستحقاق: اليوم الأول من الشهر
━━━━━━━━━━━━━━━━━━

⚠️ تنويه هام:
في حال التأخر عن السداد، سيتم احتساب غرامة تأخير بقيمة ${DAILY_LATE_FEE} ر.ق عن كل يوم تأخير.

نأمل منكم التكرم بترتيب السداد في الموعد المحدد لتجنب أي رسوم إضافية.

شاكرين لكم حسن تعاونكم،
${COMPANY_NAME}`;

    case 'overdue_day2':
      const penalty2 = DAILY_LATE_FEE * daysLate;
      return `السلام عليكم ورحمة الله وبركاته

${customerName} الكريم،

⚠️ إشعار تأخر سداد

نفيدكم بأنه لم يتم سداد قيمة الإيجار المستحق في موعده.

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${contractNumber}
💰 المبلغ الأصلي: ${amount.toLocaleString()} ر.ق
💸 غرامة التأخير: ${penalty2.toLocaleString()} ر.ق (${daysLate} يوم × ${DAILY_LATE_FEE})
💵 الإجمالي: ${(amount + penalty2).toLocaleString()} ر.ق
⏰ الحالة: متأخر عن السداد
━━━━━━━━━━━━━━━━━━

🔴 تم تطبيق غرامة التأخير:
• غرامة يومية: ${DAILY_LATE_FEE} ر.ق عن كل يوم تأخير
• تبدأ الغرامة من تاريخ الاستحقاق (يوم 1)

يرجى تسوية قيمة الإيجار في أقرب وقت ممكن لتجنب تراكم غرامات التأخير.

للتواصل والسداد:
${COMPANY_NAME}`;

    case 'final_warning':
      const penalty5 = DAILY_LATE_FEE * daysLate;
      return `السلام عليكم ورحمة الله وبركاته

${customerName} الكريم،

🚨 إنذار نهائي

بالإشارة إلى رسائلنا السابقة بخصوص الإيجار المتأخر، وحيث لم يتم السداد حتى تاريخه:

━━━━━━━━━━━━━━━━━━
📋 رقم العقد: ${contractNumber}
💰 المبلغ الأصلي: ${amount.toLocaleString()} ر.ق
💸 غرامة التأخير: ${penalty5.toLocaleString()} ر.ق (${daysLate} يوم × ${DAILY_LATE_FEE})
💵 الإجمالي المستحق: ${(amount + penalty5).toLocaleString()} ر.ق
⚠️ الحالة: إنذار نهائي
━━━━━━━━━━━━━━━━━━

⚠️ تنبيه هام:
في حال عدم السداد خلال 5 أيام من تاريخ هذه الرسالة:
• سيتم تحويل الملف للشؤون القانونية
• سيتم اتخاذ الإجراءات القانونية اللازمة
• ستتحمل كافة التكاليف القانونية الإضافية

نأمل تفادي هذه الإجراءات بالتواصل الفوري معنا.

${COMPANY_NAME}
قسم التحصيل`;

    case 'legal_action':
      const penalty10 = DAILY_LATE_FEE * daysLate;
      return `السلام عليكم ورحمة الله وبركاته

${customerName} الكريم،

إشعار نهائي بشأن مخالفة بنود العقد واتخاذ إجراءات قانونية

بناءً على عدم الاستجابة لمراسلاتنا المتكررة وتنبيهاتنا السابقة بخصوص المبالغ المستحقة والمتأخرة، ونظراً لتخلفك عن الوفاء بالالتزامات المترتبة عليك وفقاً لبنود العقد المبرم بيننا، نفيدك بما يلي:

────────────────────────────────────────
بيان المستحقات والمخالفات
────────────────────────────────────────

رقم العقد: ${contractNumber}
المبلغ الأصلي المستحق: ${amount.toLocaleString()} ريال قطري
غرامة التأخير: ${penalty10.toLocaleString()} ريال قطري (عن ${daysLate} يوم تأخير بمعدل ${DAILY_LATE_FEE} ريال قطري يومياً)
إجمالي المبالغ المستحقة: ${(amount + penalty10).toLocaleString()} ريال قطري
حالة الحساب: متأخر عن السداد

────────────────────────────────────────

أولاً: تخلفك عن الوفاء بالالتزامات

أنت قد خالفت بنود العقد المبرم بيننا وتحديداً المادة المتعلقة بالسداد التي تنص على التزامك بسداد قيمة الإيجار الشهري في موعده المحدد. وبما أنك لم تقم بالسداد رغم مرور أكثر من عشرة أيام على تاريخ الاستحقاق، فقد أصبحت مخالفاً لبنود العقد بشكل واضح وصريح.

ثانياً: الإجراءات القانونية الجارية

نفيدك بأنه تم اتخاذ الإجراءات القانونية التالية:

1. تحويل ملفك إلى الشؤون القانونية للبدء في الإجراءات القضائية
2. إعداد ملف الدعوى القضائية ضدك

ثالثاً: إشعار برفع دعوى قضائية

بموجب هذا الإشعار، نخطرك رسمياً بأننا سنقوم برفع دعوى قضائية ضدك خلال 24 ساعة من استلامك هذه الرسالة، وسيتم المطالبة بما يلي:

1. كامل المبلغ الأصلي المستحق: ${amount.toLocaleString()} ريال قطري
2. جميع غرامات التأخير المتراكمة: ${penalty10.toLocaleString()} ريال قطري
3. رسوم التقاضي والمصاريف القضائية
4. أتعاب المحاماة والاستشارات القانونية
5. الفوائد القانونية عن المبالغ المتأخرة

────────────────────────────────────────

المبلغ الواجب سداده فوراً: ${(amount + penalty10).toLocaleString()} ريال قطري

طرق التواصل والسداد:
${COMPANY_NAME}
الشؤون القانونية والتحصيل

────────────────────────────────────────

هذا الإشعار بمثابة إنذار رسمي وقانوني، وأي تأخير إضافي سيؤدي إلى تنفيذ الإجراءات المذكورة أعلاه دون إشعار إضافي.

${COMPANY_NAME}
الشؤون القانونية`;

    default:
      return '';
  }
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
 * Main Edge Function handler
 */
serve(async (req) => {
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

    const body = await req.json().catch(() => ({}));
    
    // Test mode - send single message
    if (body.test && body.phone && body.message) {
      console.log('🧪 Test mode');
      const result = await sendWhatsAppMessage(body.phone, body.message);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log('🚀 Starting automated reminders...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get today's day of month
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    console.log(`📅 Today is day ${dayOfMonth} of the month`);

    // Determine reminder type based on day
    let reminderType: ReminderType | null = null;
    let daysLate = 0;
    
    if (dayOfMonth === 27 || dayOfMonth === 28) {
      reminderType = 'pre_due';
    } else if (dayOfMonth === 2) {
      reminderType = 'overdue_day2';
      daysLate = 2;
    } else if (dayOfMonth === 5) {
      reminderType = 'final_warning';
      daysLate = 5;
    } else if (dayOfMonth === 10) {
      reminderType = 'legal_action';
      daysLate = 10;
    }

    // Allow manual override
    if (body.reminderType) {
      reminderType = body.reminderType;
      daysLate = body.daysLate || daysLate;
    }

    if (!reminderType) {
      console.log('📭 No reminders scheduled for today');
      return new Response(JSON.stringify({
        success: true,
        message: `No reminders for day ${dayOfMonth}. Reminders are sent on days 28, 2, 5, and 10.`,
        sent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log(`📨 Processing ${reminderType} reminders...`);

    // Get active contracts with unpaid current month
    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        customer_id,
        monthly_amount,
        customer:customers!customer_id(
          first_name_ar,
          last_name_ar,
          first_name,
          last_name,
          company_name_ar,
          company_name,
          customer_type,
          phone
        )
      `)
      .eq('status', 'active')
      .not('customer.phone', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!contracts || contracts.length === 0) {
      console.log('📭 No active contracts found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No active contracts',
        sent: 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log(`📋 Found ${contracts.length} active contracts`);

    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const contract of contracts) {
      const customer = contract.customer as Contract['customer'];
      
      if (!customer?.phone) {
        console.log(`⏭️ Skipping ${contract.contract_number} - no phone`);
        continue;
      }

      const customerName = getCustomerName(customer);
      const message = generateMessage(
        reminderType,
        customerName,
        contract.contract_number,
        contract.monthly_amount,
        daysLate
      );

      const result = await sendWhatsAppMessage(customer.phone, message);

      if (result.success) {
        successCount++;
        console.log(`✅ Sent to ${customerName} (${contract.contract_number})`);
        results.push({
          contract: contract.contract_number,
          customer: customerName,
          status: 'sent',
          messageId: result.messageId
        });
      } else {
        failedCount++;
        console.log(`❌ Failed: ${customerName} - ${result.error}`);
        results.push({
          contract: contract.contract_number,
          customer: customerName,
          status: 'failed',
          error: result.error
        });
      }

      // Log to reminder_history
      await supabase.from('reminder_history').insert({
        contract_id: contract.id,
        customer_id: contract.customer_id,
        reminder_type: reminderType,
        phone_number: customer.phone,
        message_sent: message,
        success: result.success,
        error_message: result.error || null,
        sent_at: new Date().toISOString()
      }).catch(e => console.error('Failed to log:', e));

      // Delay between messages
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Complete: ${successCount} sent, ${failedCount} failed in ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      reminderType,
      dayOfMonth,
      sent: successCount,
      failed: failedCount,
      total: contracts.length,
      duration,
      results
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

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
