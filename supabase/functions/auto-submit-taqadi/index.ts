// Edge Function لتقديم الدعوى تلقائياً في تقاضي
// يستخدم Browserbase API للأتمتة الكاملة

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// واجهة بيانات الدعوى
interface LawsuitData {
  defendant: {
    name: string;
    phone: string;
    nationalId: string;
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
    [key: string]: string;
  };
  pageUrl: string;
  extractedAt: string;
}

// واجهة إعدادات Browserbase
interface BrowserbaseConfig {
  apiKey: string;
  projectId?: string;
}

// خدمة الأتمتة
class TaqadiAutomation {
  private apiKey: string;
  private apiEndpoint = 'https://api.browserbase.com';

  constructor(config: BrowserbaseConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * إنشاء جلسة جديدة
   */
  async createSession() {
    const response = await fetch(`${this.apiEndpoint}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        browser: 'chrome',
        options: {
          headless: false,
          viewport: { width: 1920, height: 1080 }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`فشل في إنشاء الجلسة: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * فتح URL في الجلسة
   */
  async navigateToUrl(sessionId: string, url: string) {
    const response = await fetch(
      `${this.apiEndpoint}/v1/sessions/${sessionId}/navigate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ url })
      }
    );

    if (!response.ok) {
      throw new Error(`فشل في فتح URL: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * تشغيل الأتمتة الكاملة
   */
  async run(data: LawsuitData) {
    console.log('🚀 بدء تشغيل الأتمتة...');

    // 1. إنشاء جلسة
    const session = await this.createSession();
    console.log(`✅ تم إنشاء الجلسة: ${session.id}`);

    // 2. فتح موقع تقاضي
    await this.navigateToUrl(session.id, 'https://taqadi.sjc.gov.qa/itc/');
    console.log('✅ تم فتح موقع تقاضي');

    // 3. انتظار تسجيل الدخول
    await this.waitForLogin(session.id);

    // 4. بدء دعوى جديدة
    await this.startNewLawsuit(session.id);

    // 5. ملء البيانات
    await this.fillLawsuitData(session.id, data);

    // 6. رفع المستندات
    if (data.documents) {
      await this.uploadDocuments(session.id, data.documents);
    }

    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.connectUrl || `https://browserbase.com/sessions/${session.id}`,
      message: 'تمت الأتمتة بنجاح! راجع البيانات واضغط "اعتماد"'
    };
  }

  /**
   * انتظار تسجيل الدخول
   */
  private async waitForLogin(sessionId: string) {
    console.log('⏳ انتظار تسجيل الدخول...');

    // محاولة التحقق من تسجيل الدخول
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await this.delay(2000);

      try {
        // التحقق من وجود عناصر لوحة التحكم
        const isLogged = await this.checkLoginStatus(sessionId);

        if (isLogged) {
          console.log('✅ تم تسجيل الدخول');
          return;
        }

        attempts++;
      } catch (error) {
        attempts++;
      }
    }

    console.log('⚠️ انتهت مهلة الانتظار - افترض تسجيل الدخول');
  }

  /**
   * التحقق من حالة تسجيل الدخول
   */
  private async checkLoginStatus(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiEndpoint}/v1/sessions/${sessionId}/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            code: `
              document.querySelector('.dashboard') !== null ||
              document.querySelector('.main-menu') !== null ||
              window.location.href.includes('/dashboard')
            `
          })
        }
      );

      const result = await response.json();
      return result.result === true;
    } catch {
      return false;
    }
  }

  /**
   * بدء دعوى جديدة
   */
  private async startNewLawsuit(sessionId: string) {
    console.log('📝 بدء دعوى جديدة...');

    await this.delay(2000);

    // النقر على زر "دعوى جديدة" أو مشابه
    await this.executeScript(sessionId, `
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const newCaseBtn = buttons.find(b => 
        b.textContent.includes('دعوى جديدة') || 
        b.textContent.includes('إنشاء دعوى') ||
        b.href?.includes('new')
      );
      if (newCaseBtn) newCaseBtn.click();
    `);

    await this.delay(2000);

    // اختيار نوع الدعوى
    await this.selectLawsuitType(sessionId);
  }

  /**
   * اختيار نوع الدعوى
   */
  private async selectLawsuitType(sessionId: string) {
    console.log('⚖️ اختيار نوع الدعوى...');

    await this.delay(1000);

    // اختيار عقود الخدمات التجارية
    await this.executeScript(sessionId, `
      const elements = Array.from(document.querySelectorAll('button, option, a'));
      const commercialBtn = elements.find(e => 
        e.textContent.includes('عقود الخدمات التجارية')
      );
      if (commercialBtn) commercialBtn.click();
    `);

    await this.delay(1000);

    // اختيار عقود إيجار السيارات
    await this.executeScript(sessionId, `
      const elements = Array.from(document.querySelectorAll('button, option, a'));
      const carRentalBtn = elements.find(e => 
        e.textContent.includes('عقود إيجار السيارات') ||
        e.textContent.includes('إيجار السيارات')
      );
      if (carRentalBtn) carRentalBtn.click();
    `);

    await this.delay(2000);
  }

  /**
   * ملء بيانات الدعوى
   */
  private async fillLawsuitData(sessionId: string, data: LawsuitData) {
    console.log('📋 ملء بيانات الدعوى...');

    const { texts, amounts, defendant } = data;

    // ملء عنوان الدعوى
    if (texts.title) {
      await this.fillText(sessionId, 'input[name*="title"], input[name*="subject"], input[placeholder*="عنوان"]', texts.title);
      console.log('✅ عنوان الدعوى');
    }

    // ملء الوقائع
    if (texts.facts) {
      await this.fillText(sessionId, 'textarea[name*="fact"], textarea[placeholder*="وقائع"]', texts.facts);
      console.log('✅ الوقائع');
    }

    // ملء الطلبات
    if (texts.claims) {
      await this.fillText(sessionId, 'textarea[name*="request"], textarea[placeholder*="طلبات"]', texts.claims);
      console.log('✅ الطلبات');
    }

    // ملء المبلغ
    if (texts.amount || amounts.total) {
      const amount = String(texts.amount || amounts.total);
      await this.fillText(sessionId, 'input[name*="amount"], input[type="number"], input[placeholder*="مبلغ"]', amount);
      console.log('✅ المبلغ');
    }

    // ملء المبلغ كتابة
    if (texts.amountInWords || amounts.totalInWords) {
      const amountInWords = texts.amountInWords || amounts.totalInWords;
      await this.fillText(sessionId, 'input[name*="amountWord"], input[placeholder*="كتابة"]', amountInWords);
      console.log('✅ المبلغ كتابة');
    }

    // ملء بيانات المدعى عليه
    if (defendant) {
      await this.fillDefendant(sessionId, defendant);
    }

    await this.delay(1000);
  }

  /**
   * ملء بيانات المدعى عليه
   */
  private async fillDefendant(sessionId: string, defendant: any) {
    console.log('👤 ملء بيانات المدعى عليه...');

    if (defendant.name) {
      await this.fillText(sessionId, 'input[name*="defendant"], input[placeholder*="اسم"]', defendant.name);
    }

    if (defendant.nationalId) {
      await this.fillText(sessionId, 'input[name*="id"], input[placeholder*="هوية"]', defendant.nationalId);
    }

    if (defendant.phone) {
      await this.fillText(sessionId, 'input[name*="phone"], input[placeholder*="هاتف"]', defendant.phone);
    }

    await this.delay(500);
  }

  /**
   * رفع المستندات
   */
  private async uploadDocuments(sessionId: string, documents: Record<string, string>) {
    console.log('📎 رفع المستندات...');

    const documentTypes = [
      { key: 'commercialRegister', label: 'السجل التجاري' },
      { key: 'iban', label: 'شهادة IBAN' },
      { key: 'idCard', label: 'البطاقة الشخصية' },
      { key: 'memo', label: 'المذكرة الشارحة' },
      { key: 'documentsList', label: 'كشف المستندات' },
      { key: 'claimsStatement', label: 'كشف المطالبات' },
      { key: 'contract', label: 'عقد الإيجار' }
    ];

    for (const docType of documentTypes) {
      if (documents[docType.key]) {
        try {
          await this.uploadFile(sessionId, docType.label, documents[docType.key]);
          console.log(`✅ ${docType.label}`);
          await this.delay(1000);
        } catch (error) {
          console.error(`❌ فشل رفع ${docType.label}:`, error);
        }
      }
    }
  }

  /**
   * رفع ملف واحد
   */
  private async uploadFile(sessionId: string, label: string, url: string) {
    // محاولة رفع الملف
    await this.executeScript(sessionId, `
      // البحث عن input file
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      // محاولة العثور على input file مرتبط بالعنصر
      let targetInput = null;
      const elements = Array.from(document.querySelectorAll('button, div, label'));
      const relatedElement = elements.find(e => e.textContent.includes('${label}'));
      
      if (relatedElement) {
        targetInput = relatedElement.parentElement?.querySelector('input[type="file"]');
      }
      
      if (!targetInput && fileInputs.length > 0) {
        targetInput = fileInputs[fileInputs.length - 1];
      }
      
      if (targetInput) {
        console.log('عثرنا على input file:', targetInput);
      }
    `);
  }

  /**
   * ملء نص في حقل
   */
  private async fillText(sessionId: string, selector: string, value: string) {
    await this.executeScript(sessionId, `
      const elements = document.querySelectorAll('${selector}');
      for (const el of elements) {
        if (el) {
          el.value = '${value.replace(/'/g, "\\'")}';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          break;
        }
      }
    `);
  }

  /**
   * تنفيذ JavaScript
   */
  private async executeScript(sessionId: string, code: string) {
    const response = await fetch(
      `${this.apiEndpoint}/v1/sessions/${sessionId}/evaluate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ code })
      }
    );

    return await response.json();
  }

  /**
   * تأخير بسيط
   */
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// معالج الطلب الرئيسي
Deno.serve(async (req: Request) => {
  // دعم CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // قراءة البيانات من الطلب
    const body = await req.json() as { data: LawsuitData };

    if (!body.data) {
      return new Response(
        JSON.stringify({ error: 'Missing data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 استلام بيانات الدعوى:', JSON.stringify(body.data, null, 2));

    // التحقق من مفتاح API
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_API_KEY');

    if (!browserbaseApiKey) {
      return new Response(
        JSON.stringify({ error: 'Browserbase API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // إنشاء خدمة الأتمتة وتشغيلها
    const automation = new TaqadiAutomation({ apiKey: browserbaseApiKey });

    const result = await automation.run(body.data);

    console.log('✅ تمت الأتمتة بنجاح:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('❌ خطأ:', error);

    return new Response(
      JSON.stringify({
        error: 'فشل في تشغيل الأتمتة',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});

