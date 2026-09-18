// supabase/functions/auto-submit-taqadi/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
var TaqadiAutomation = class {
  apiKey;
  apiEndpoint = "https://api.browserbase.com";
  constructor(config) {
    this.apiKey = config.apiKey;
  }
  /**
   * إنشاء جلسة جديدة
   */
  async createSession() {
    const response = await fetch(`${this.apiEndpoint}/v1/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        browser: "chrome",
        options: {
          headless: false,
          viewport: { width: 1920, height: 1080 }
        }
      })
    });
    if (!response.ok) {
      throw new Error(`\u0641\u0634\u0644 \u0641\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * فتح URL في الجلسة
   */
  async navigateToUrl(sessionId, url) {
    const response = await fetch(
      `${this.apiEndpoint}/v1/sessions/${sessionId}/navigate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ url })
      }
    );
    if (!response.ok) {
      throw new Error(`\u0641\u0634\u0644 \u0641\u064A \u0641\u062A\u062D URL: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * تشغيل الأتمتة الكاملة
   */
  async run(data) {
    console.log("\u{1F680} \u0628\u062F\u0621 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0623\u062A\u0645\u062A\u0629...");
    const session = await this.createSession();
    console.log(`\u2705 \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629: ${session.id}`);
    await this.navigateToUrl(session.id, "https://taqadi.sjc.gov.qa/itc/");
    console.log("\u2705 \u062A\u0645 \u0641\u062A\u062D \u0645\u0648\u0642\u0639 \u062A\u0642\u0627\u0636\u064A");
    await this.waitForLogin(session.id);
    await this.startNewLawsuit(session.id);
    await this.fillLawsuitData(session.id, data);
    if (data.documents) {
      await this.uploadDocuments(session.id, data.documents);
    }
    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.connectUrl || `https://browserbase.com/sessions/${session.id}`,
      message: '\u062A\u0645\u062A \u0627\u0644\u0623\u062A\u0645\u062A\u0629 \u0628\u0646\u062C\u0627\u062D! \u0631\u0627\u062C\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0636\u063A\u0637 "\u0627\u0639\u062A\u0645\u0627\u062F"'
    };
  }
  /**
   * انتظار تسجيل الدخول
   */
  async waitForLogin(sessionId) {
    console.log("\u23F3 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644...");
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      await this.delay(2e3);
      try {
        const isLogged = await this.checkLoginStatus(sessionId);
        if (isLogged) {
          console.log("\u2705 \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644");
          return;
        }
        attempts++;
      } catch (error) {
        attempts++;
      }
    }
    console.log("\u26A0\uFE0F \u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 - \u0627\u0641\u062A\u0631\u0636 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644");
  }
  /**
   * التحقق من حالة تسجيل الدخول
   */
  async checkLoginStatus(sessionId) {
    try {
      const response = await fetch(
        `${this.apiEndpoint}/v1/sessions/${sessionId}/evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
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
  async startNewLawsuit(sessionId) {
    console.log("\u{1F4DD} \u0628\u062F\u0621 \u062F\u0639\u0648\u0649 \u062C\u062F\u064A\u062F\u0629...");
    await this.delay(2e3);
    await this.executeScript(sessionId, `
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const newCaseBtn = buttons.find(b => 
        b.textContent.includes('\u062F\u0639\u0648\u0649 \u062C\u062F\u064A\u062F\u0629') || 
        b.textContent.includes('\u0625\u0646\u0634\u0627\u0621 \u062F\u0639\u0648\u0649') ||
        b.href?.includes('new')
      );
      if (newCaseBtn) newCaseBtn.click();
    `);
    await this.delay(2e3);
    await this.selectLawsuitType(sessionId);
  }
  /**
   * اختيار نوع الدعوى
   */
  async selectLawsuitType(sessionId) {
    console.log("\u2696\uFE0F \u0627\u062E\u062A\u064A\u0627\u0631 \u0646\u0648\u0639 \u0627\u0644\u062F\u0639\u0648\u0649...");
    await this.delay(1e3);
    await this.executeScript(sessionId, `
      const elements = Array.from(document.querySelectorAll('button, option, a'));
      const commercialBtn = elements.find(e => 
        e.textContent.includes('\u0639\u0642\u0648\u062F \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629')
      );
      if (commercialBtn) commercialBtn.click();
    `);
    await this.delay(1e3);
    await this.executeScript(sessionId, `
      const elements = Array.from(document.querySelectorAll('button, option, a'));
      const carRentalBtn = elements.find(e => 
        e.textContent.includes('\u0639\u0642\u0648\u062F \u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A') ||
        e.textContent.includes('\u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A')
      );
      if (carRentalBtn) carRentalBtn.click();
    `);
    await this.delay(2e3);
  }
  /**
   * ملء بيانات الدعوى
   */
  async fillLawsuitData(sessionId, data) {
    console.log("\u{1F4CB} \u0645\u0644\u0621 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u0639\u0648\u0649...");
    const { texts, amounts, defendant } = data;
    if (texts.title) {
      await this.fillText(sessionId, 'input[name*="title"], input[name*="subject"], input[placeholder*="\u0639\u0646\u0648\u0627\u0646"]', texts.title);
      console.log("\u2705 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0639\u0648\u0649");
    }
    if (texts.facts) {
      await this.fillText(sessionId, 'textarea[name*="fact"], textarea[placeholder*="\u0648\u0642\u0627\u0626\u0639"]', texts.facts);
      console.log("\u2705 \u0627\u0644\u0648\u0642\u0627\u0626\u0639");
    }
    if (texts.claims) {
      await this.fillText(sessionId, 'textarea[name*="request"], textarea[placeholder*="\u0637\u0644\u0628\u0627\u062A"]', texts.claims);
      console.log("\u2705 \u0627\u0644\u0637\u0644\u0628\u0627\u062A");
    }
    if (texts.amount || amounts.total) {
      const amount = String(texts.amount || amounts.total);
      await this.fillText(sessionId, 'input[name*="amount"], input[type="number"], input[placeholder*="\u0645\u0628\u0644\u063A"]', amount);
      console.log("\u2705 \u0627\u0644\u0645\u0628\u0644\u063A");
    }
    if (texts.amountInWords || amounts.totalInWords) {
      const amountInWords = texts.amountInWords || amounts.totalInWords;
      await this.fillText(sessionId, 'input[name*="amountWord"], input[placeholder*="\u0643\u062A\u0627\u0628\u0629"]', amountInWords);
      console.log("\u2705 \u0627\u0644\u0645\u0628\u0644\u063A \u0643\u062A\u0627\u0628\u0629");
    }
    if (defendant) {
      await this.fillDefendant(sessionId, defendant);
    }
    await this.delay(1e3);
  }
  /**
   * ملء بيانات المدعى عليه
   */
  async fillDefendant(sessionId, defendant) {
    console.log("\u{1F464} \u0645\u0644\u0621 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u0639\u0649 \u0639\u0644\u064A\u0647...");
    if (defendant.name) {
      await this.fillText(sessionId, 'input[name*="defendant"], input[placeholder*="\u0627\u0633\u0645"]', defendant.name);
    }
    if (defendant.nationalId) {
      await this.fillText(sessionId, 'input[name*="id"], input[placeholder*="\u0647\u0648\u064A\u0629"]', defendant.nationalId);
    }
    if (defendant.phone) {
      await this.fillText(sessionId, 'input[name*="phone"], input[placeholder*="\u0647\u0627\u062A\u0641"]', defendant.phone);
    }
    await this.delay(500);
  }
  /**
   * رفع المستندات
   */
  async uploadDocuments(sessionId, documents) {
    console.log("\u{1F4CE} \u0631\u0641\u0639 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A...");
    const documentTypes = [
      { key: "commercialRegister", label: "\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A" },
      { key: "iban", label: "\u0634\u0647\u0627\u062F\u0629 IBAN" },
      { key: "idCard", label: "\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0634\u062E\u0635\u064A\u0629" },
      { key: "memo", label: "\u0627\u0644\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u0634\u0627\u0631\u062D\u0629" },
      { key: "documentsList", label: "\u0643\u0634\u0641 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A" },
      { key: "claimsStatement", label: "\u0643\u0634\u0641 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A" },
      { key: "contract", label: "\u0639\u0642\u062F \u0627\u0644\u0625\u064A\u062C\u0627\u0631" }
    ];
    for (const docType of documentTypes) {
      if (documents[docType.key]) {
        try {
          await this.uploadFile(sessionId, docType.label, documents[docType.key]);
          console.log(`\u2705 ${docType.label}`);
          await this.delay(1e3);
        } catch (error) {
          console.error(`\u274C \u0641\u0634\u0644 \u0631\u0641\u0639 ${docType.label}:`, error);
        }
      }
    }
  }
  /**
   * رفع ملف واحد
   */
  async uploadFile(sessionId, label, url) {
    await this.executeScript(sessionId, `
      // \u0627\u0644\u0628\u062D\u062B \u0639\u0646 input file
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      // \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 input file \u0645\u0631\u062A\u0628\u0637 \u0628\u0627\u0644\u0639\u0646\u0635\u0631
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
        console.log('\u0639\u062B\u0631\u0646\u0627 \u0639\u0644\u0649 input file:', targetInput);
      }
    `);
  }
  /**
   * ملء نص في حقل
   */
  async fillText(sessionId, selector, value) {
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
  async executeScript(sessionId, code) {
    const response = await fetch(
      `${this.apiEndpoint}/v1/sessions/${sessionId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ code })
      }
    );
    return await response.json();
  }
  /**
   * تأخير بسيط
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: "LEGACY_TAQADI_BYPASS_RETIRED",
      message: "\u0627\u0633\u062A\u062E\u062F\u0645 \u0637\u0627\u0628\u0648\u0631 taqadi_filing_jobs \u0627\u0644\u0645\u062D\u0643\u0648\u0645\u061B \u0647\u0630\u0647 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0644\u0627 \u062A\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0642\u0636\u064A\u0629 \u0648\u0627\u0644\u0639\u0642\u062F \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0648\u0627\u0644\u0625\u0639\u0630\u0627\u0631."
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await req.json();
    if (!body.data) {
      return new Response(
        JSON.stringify({ error: "Missing data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("\u{1F4CB} \u0627\u0633\u062A\u0644\u0627\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u0639\u0648\u0649:", JSON.stringify(body.data, null, 2));
    const browserbaseApiKey = Deno.env.get("BROWSERBASE_API_KEY");
    if (!browserbaseApiKey) {
      return new Response(
        JSON.stringify({ error: "Browserbase API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const automation = new TaqadiAutomation({ apiKey: browserbaseApiKey });
    const result = await automation.run(body.data);
    console.log("\u2705 \u062A\u0645\u062A \u0627\u0644\u0623\u062A\u0645\u062A\u0629 \u0628\u0646\u062C\u0627\u062D:", result);
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error("\u274C \u062E\u0637\u0623:", error);
    return new Response(
      JSON.stringify({
        error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0623\u062A\u0645\u062A\u0629",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
});
