import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MANUS_API_KEY = Deno.env.get('MANUS_API_KEY');
const MANUS_API_URL = 'https://api.manus.ai/v1/tasks';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LawsuitData {
  defendant: {
    name: string;
    nationalId: string;
    phone: string;
  };
  texts: {
    title: string;
    facts: string;
    claims: string;
    amount: number;
    amountInWords: string;
  };
  amounts: {
    overdueRent: number;
    lateFees: number;
    violations: number;
    otherFees: number;
    total: number;
    totalInWords: string;
  };
  vehicle: {
    model: string;
    plate: string;
    contractNumber: string;
  };
  documents: {
    commercialRegister?: string;
    iban?: string;
    idCard?: string;
    memo?: string;
    contract?: string;
    documentsList?: string;
    claimsStatement?: string;
  };
}

function generateTaqadiPrompt(data: LawsuitData): string {
  const documentsSection = Object.entries(data.documents || {})
    .filter(([_, url]) => url)
    .map(([type, url]) => {
      const labels: Record<string, string> = {
        commercialRegister: 'السجل التجاري',
        iban: 'شهادة IBAN',
        idCard: 'البطاقة الشخصية للممثل',
        memo: 'المذكرة الشارحة',
        contract: 'عقد الإيجار',
        documentsList: 'كشف المستندات',
        claimsStatement: 'كشف المطالبات'
      };
      return `- ${labels[type] || type}: ${url}`;
    })
    .join('\n');

  return `
أنت مساعد قانوني متخصص في رفع الدعاوى في نظام تقاضي القطري.

## المهمة
افتح موقع تقاضي وارفع دعوى جديدة بالبيانات التالية.

## الخطوات المطلوبة

### 1. فتح الموقع
- افتح الرابط: https://taqadi.sjc.gov.qa/itc/
- إذا طُلب تسجيل الدخول، اضغط على "توثيق" وانتظر المستخدم لإكمال التسجيل
- بعد تسجيل الدخول، تابع للخطوة التالية

### 2. بدء دعوى جديدة
- اضغط على زر "دعوى جديدة" أو "إنشاء دعوى"
- انتظر تحميل الصفحة

### 3. اختيار نوع الدعوى
- اختر التصنيف: "عقود الخدمات التجارية"
- ثم اختر النوع الفرعي: "عقود إيجار السيارات وخدمات الليموزين"
- انتظر تحميل نموذج الدعوى

### 4. ملء بيانات الدعوى
املأ الحقول التالية بالقيم المحددة:

**عنوان الدعوى / موضوع الدعوى:**
${data.texts.title}

**الوقائع / سرد الوقائع:**
${data.texts.facts}

**الطلبات / المطالبات:**
${data.texts.claims}

**المبلغ المطالب به (رقماً):**
${data.texts.amount || data.amounts.total}

**المبلغ كتابةً:**
${data.texts.amountInWords || data.amounts.totalInWords}

### 5. بيانات المدعى عليه (إذا كان هناك قسم لذلك)
- الاسم: ${data.defendant.name}
- رقم الهوية: ${data.defendant.nationalId}
- رقم الهاتف: ${data.defendant.phone}

### 6. رفع المستندات
ارفع الملفات التالية في أماكنها المناسبة:
${documentsSection}

لكل ملف:
1. اضغط على زر "رفع" أو "إضافة مستند"
2. حمّل الملف من الرابط المذكور
3. تأكد من رفعه بنجاح

### 7. المراجعة النهائية
- راجع جميع البيانات المدخلة
- تأكد من صحة المعلومات
- أخبر المستخدم أن الدعوى جاهزة للاعتماد
- انتظر المستخدم ليضغط "اعتماد" بنفسه

## ملاحظات مهمة
- إذا واجهت أي تحقق (CAPTCHA، رمز SMS)، اطلب من المستخدم إكماله عبر Take Over
- إذا كان أي حقل غير موجود، تجاوزه وأكمل الباقي
- لا تضغط على "اعتماد" أو "إرسال" النهائي - اترك ذلك للمستخدم
- أبلغ المستخدم بأي مشاكل تواجهها

## معلومات إضافية
- رقم العقد: ${data.vehicle.contractNumber}
- السيارة: ${data.vehicle.model}
- رقم اللوحة: ${data.vehicle.plate}
`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!MANUS_API_KEY) {
      throw new Error('MANUS_API_KEY not configured');
    }

    const { lawsuitData, useBrowserOperator = true } = await req.json() as {
      lawsuitData: LawsuitData;
      useBrowserOperator?: boolean;
    };

    if (!lawsuitData) {
      throw new Error('lawsuitData is required');
    }

    // Generate the prompt for Manus
    const prompt = generateTaqadiPrompt(lawsuitData);

    console.log('Sending task to Manus API...');
    console.log('Prompt length:', prompt.length);

    // Create task in Manus
    const response = await fetch(MANUS_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'API_KEY': MANUS_API_KEY
      },
      body: JSON.stringify({
        prompt: prompt,
        // Request Browser Operator (My Browser) for local execution
        browser_mode: useBrowserOperator ? 'my_browser' : 'cloud',
        // Additional metadata
        metadata: {
          source: 'fleetify-app',
          type: 'taqadi-lawsuit',
          contractNumber: lawsuitData.vehicle.contractNumber,
          defendantName: lawsuitData.defendant.name,
          amount: lawsuitData.amounts.total
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Manus API error:', errorText);
      throw new Error(`Manus API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Manus task created:', result);

    return new Response(
      JSON.stringify({
        success: true,
        taskId: result.id || result.task_id,
        message: 'تم إرسال المهمة إلى Manus! سيفتح متصفحك قريباً.',
        manusResponse: result
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

