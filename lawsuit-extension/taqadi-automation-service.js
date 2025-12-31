// خدمة أتمتة تقاضي
// تعمل مع Browserbase API للملء التلقائي الكامل

class TaqadiAutomationService {
  constructor() {
    this.browserbaseApiKey = process.env.BROWSERBASE_API_KEY || '';
    this.apiEndpoint = 'https://api.browserbase.com';
    this.sessionId = null;
  }

  /**
   * تهيئة جلسة Browserbase جديدة
   */
  async createSession() {
    try {
      console.log('🚀 إنشاء جلسة Browserbase جديدة...');

      const response = await fetch(`${this.apiEndpoint}/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.browserbaseApiKey}`
        },
        body: JSON.stringify({
          browser: 'chrome',
          options: {
            headless: false, // إظهار المتصفح للمستخدم
            viewport: { width: 1920, height: 1080 }
          }
        })
      });

      const session = await response.json();
      this.sessionId = session.id;

      console.log(`✅ تم إنشاء الجلسة: ${this.sessionId}`);
      return session;
    } catch (error) {
      console.error('❌ خطأ في إنشاء الجلسة:', error);
      throw error;
    }
  }

  /**
   * فتح موقع تقاضي وتسجيل الدخول
   */
  async openTaqadi() {
    try {
      console.log('🌐 فتح موقع تقاضي...');

      await this.executeScript(`
        window.location.href = 'https://taqadi.sjc.gov.qa/itc/';
      `);

      // انتظار تحميل الصفحة
      await this.wait(3000);

      // التحقق من وجود زر تسجيل الدخول
      const loginButton = await this.querySelector('button:contains("توثيق")');

      if (loginButton) {
        console.log('⏳ يرجى تسجيل الدخول عبر توثيق في النافذة المفتوحة');
        
        // انتظار تسجيل الدخول
        await this.waitForLogin();
      } else {
        console.log('✅ المستخدم مسجل الدخول بالفعل');
      }

    } catch (error) {
      console.error('❌ خطأ في فتح تقاضي:', error);
      throw error;
    }
  }

  /**
   * انتظار تسجيل الدخول
   */
  async waitForLogin() {
    let attempts = 0;
    const maxAttempts = 60; // 2 دقيقة كحد أقصى

    while (attempts < maxAttempts) {
      try {
        // التحقق من أننا في لوحة التحكم
        const isDashboard = await this.executeScript(`
          document.querySelector('.dashboard') !== null ||
          document.querySelector('.main-menu') !== null ||
          window.location.href.includes('/dashboard');
        `);

        if (isDashboard) {
          console.log('✅ تم تسجيل الدخول بنجاح');
          return true;
        }

        await this.wait(2000);
        attempts++;
      } catch (error) {
        console.log(`⏳ انتظار تسجيل الدخول... (${attempts}/${maxAttempts})`);
        await this.wait(2000);
        attempts++;
      }
    }

    throw new Error('انتهت مهلة تسجيل الدخول');
  }

  /**
   * بدء إنشاء دعوى جديدة
   */
  async startNewLawsuit() {
    try {
      console.log('📝 بدء إنشاء دعوى جديدة...');

      // البحث عن زر "دعوى جديدة"
      await this.wait(2000);

      // محاولة النقر على أزرار مختلفة
      const selectors = [
        'button:contains("دعوى جديدة")',
        'button:contains("إنشاء دعوى")',
        'a:contains("دعوى جديدة")',
        '[class*="new-lawsuit"]',
        '[class*="create-case"]'
      ];

      for (const selector of selectors) {
        try {
          await this.click(selector);
          console.log(`✅ تم النقر على: ${selector}`);
          await this.wait(2000);
          break;
        } catch (error) {
          continue;
        }
      }

      // اختيار نوع الدعوى
      await this.selectLawsuitType();

    } catch (error) {
      console.error('❌ خطأ في بدء الدعوى:', error);
      throw error;
    }
  }

  /**
   * اختيار نوع الدعوى
   */
  async selectLawsuitType() {
    try {
      console.log('⚖️ اختيار نوع الدعوى...');

      await this.wait(2000);

      // اختيار "عقود الخدمات التجارية"
      const typeSelectors = [
        'select option:contains("عقود الخدمات التجارية")',
        'button:contains("عقود الخدمات التجارية")',
        '[data-type="commercial"]'
      ];

      for (const selector of typeSelectors) {
        try {
          await this.click(selector);
          console.log('✅ تم اختيار عقود الخدمات التجارية');
          await this.wait(1000);
          break;
        } catch (error) {
          continue;
        }
      }

      // اختيار "عقود إيجار السيارات"
      const subTypeSelectors = [
        'button:contains("عقود إيجار السيارات")',
        'option:contains("عقود إيجار السيارات")',
        '[data-subtype="car-rental"]'
      ];

      for (const selector of subTypeSelectors) {
        try {
          await this.click(selector);
          console.log('✅ تم اختيار عقود إيجار السيارات');
          await this.wait(1000);
          break;
        } catch (error) {
          continue;
        }
      }

      // المتابعة للخطوة التالية
      await this.wait(2000);

    } catch (error) {
      console.error('❌ خطأ في اختيار نوع الدعوى:', error);
      throw error;
    }
  }

  /**
   * ملء بيانات الدعوى
   */
  async fillLawsuitData(data) {
    try {
      console.log('📋 ملء بيانات الدعوى...');

      const { texts, amounts, defendant } = data;

      // ملء عنوان الدعوى
      if (texts.title) {
        await this.fillInput('input[name*="title"], input[name*="subject"], input[placeholder*="عنوان"]', texts.title);
        console.log('✅ تم ملء عنوان الدعوى');
      }

      // ملء الوقائع
      if (texts.facts) {
        await this.fillTextarea('textarea[name*="fact"], textarea[placeholder*="وقائع"]', texts.facts);
        console.log('✅ تم ملء الوقائع');
      }

      // ملء الطلبات
      if (texts.claims) {
        await this.fillTextarea('textarea[name*="request"], textarea[placeholder*="طلبات"]', texts.claims);
        console.log('✅ تم ملء الطلبات');
      }

      // ملء المبلغ
      if (texts.amount || amounts.total) {
        const amount = String(texts.amount || amounts.total);
        await this.fillInput('input[name*="amount"], input[type="number"], input[placeholder*="مبلغ"]', amount);
        console.log('✅ تم ملء المبلغ');
      }

      // ملء المبلغ كتابة
      if (texts.amountInWords || amounts.totalInWords) {
        const amountInWords = texts.amountInWords || amounts.totalInWords;
        await this.fillInput('input[name*="amountWord"], input[placeholder*="كتابة"]', amountInWords);
        console.log('✅ تم ملء المبلغ كتابة');
      }

      // ملء بيانات المدعى عليه
      if (defendant) {
        await this.fillDefendantData(defendant);
      }

    } catch (error) {
      console.error('❌ خطأ في ملء البيانات:', error);
      throw error;
    }
  }

  /**
   * ملء بيانات المدعى عليه
   */
  async fillDefendantData(defendant) {
    try {
      console.log('👤 ملء بيانات المدعى عليه...');

      // ملء الاسم
      if (defendant.name) {
        await this.fillInput('input[name*="defendant_name"], input[placeholder*="اسم"]', defendant.name);
        console.log('✅ تم ملء اسم المدعى عليه');
      }

      // ملء رقم الهوية
      if (defendant.nationalId) {
        await this.fillInput('input[name*="id_number"], input[placeholder*="هوية"]', defendant.nationalId);
        console.log('✅ تم ملء رقم الهوية');
      }

      // ملء رقم الهاتف
      if (defendant.phone) {
        await this.fillInput('input[name*="phone"], input[placeholder*="هاتف"]', defendant.phone);
        console.log('✅ تم ملء رقم الهاتف');
      }

    } catch (error) {
      console.error('❌ خطأ في ملء بيانات المدعى عليه:', error);
      throw error;
    }
  }

  /**
   * رفع المستندات
   */
  async uploadDocuments(documents) {
    try {
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
          await this.uploadDocument(docType.label, documents[docType.key]);
          console.log(`✅ تم رفع ${docType.label}`);
        }
      }

    } catch (error) {
      console.error('❌ خطأ في رفع المستندات:', error);
      throw error;
    }
  }

  /**
   * رفع مستند واحد
   */
  async uploadDocument(label, url) {
    try {
      // البحث عن زر رفع المستند
      const uploadSelectors = [
        `button:contains("${label}") ~ input[type="file"]`,
        `input[type="file"][accept*=".pdf"]`,
        `input[type="file"]`
      ];

      for (const selector of uploadSelectors) {
        try {
          // تحميل الملف
          const fileContent = await this.downloadFile(url);
          
          // رفع الملف
          await this.executeScript(`
            const input = document.querySelector('${selector}');
            if (input) {
              const dataTransfer = new DataTransfer();
              const file = new File([${JSON.stringify(fileContent)}], '${label}.pdf', { type: 'application/pdf' });
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `);

          console.log(`✅ تم رفع ${label}`);
          await this.wait(1000);
          break;
        } catch (error) {
          continue;
        }
      }

    } catch (error) {
      console.error(`❌ خطأ في رفع ${label}:`, error);
      throw error;
    }
  }

  /**
   * ملء input
   */
  async fillInput(selector, value) {
    const elements = await this.querySelectorAll(selector);

    for (const element of elements) {
      try {
        await this.executeScript(`
          const el = document.querySelector('${selector}');
          if (el) {
            el.value = '${value}';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          }
        `);
        return;
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * ملء textarea
   */
  async fillTextarea(selector, value) {
    await this.fillInput(selector, value);
  }

  /**
   * النقر على عنصر
   */
  async click(selector) {
    await this.executeScript(`
      const el = document.querySelector('${selector}');
      if (el) {
        el.click();
      }
    `);
  }

  /**
   * البحث عن عنصر
   */
  async querySelector(selector) {
    return await this.executeScript(`
      document.querySelector('${selector}')
    `);
  }

  /**
   * البحث عن عناصر متعددة
   */
  async querySelectorAll(selector) {
    return await this.executeScript(`
      Array.from(document.querySelectorAll('${selector}'))
    `);
  }

  /**
   * تنفيذ JavaScript في الصفحة
   */
  async executeScript(script) {
    try {
      const response = await fetch(`${this.apiEndpoint}/v1/sessions/${this.sessionId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.browserbaseApiKey}`
        },
        body: JSON.stringify({
          code: script
        })
      });

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('❌ خطأ في تنفيذ السكريبت:', error);
      throw error;
    }
  }

  /**
   * تحميل ملف من URL
   */
  async downloadFile(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64;
  }

  /**
   * الانتظار لمدة معينة
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * إغلاق الجلسة
   */
  async closeSession() {
    try {
      if (this.sessionId) {
        await fetch(`${this.apiEndpoint}/v1/sessions/${this.sessionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.browserbaseApiKey}`
          }
        });
        console.log('✅ تم إغلاق الجلسة');
        this.sessionId = null;
      }
    } catch (error) {
      console.error('❌ خطأ في إغلاق الجلسة:', error);
    }
  }

  /**
   * تشغيل الأتمتة الكاملة
   */
  async runFullAutomation(data) {
    try {
      console.log('🚀 بدء الأتمتة الكاملة...');

      // 1. إنشاء جلسة
      await this.createSession();

      // 2. فتح تقاضي وتسجيل الدخول
      await this.openTaqadi();

      // 3. بدء دعوى جديدة
      await this.startNewLawsuit();

      // 4. ملء البيانات
      await this.fillLawsuitData(data);

      // 5. رفع المستندات
      if (data.documents) {
        await this.uploadDocuments(data.documents);
      }

      console.log('✅ تمت الأتمتة بنجاح! راجع البيانات واضغط "اعتماد"');

      // عدم إغلاق الجلسة - تركها للمستخدم للاعتماد
      return {
        success: true,
        sessionId: this.sessionId,
        message: 'تمت الأتمتة بنجاح! راجع البيانات واضغط "اعتماد"'
      };

    } catch (error) {
      console.error('❌ فشلت الأتمتة:', error);
      await this.closeSession();
      throw error;
    }
  }
}

// تصدير الخدمة
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaqadiAutomationService;
}

// استخدام في المتصفح
if (typeof window !== 'undefined') {
  window.TaqadiAutomationService = TaqadiAutomationService;
}

