/**
 * Supabase Edge Function - Taqadi Automation
 * يتحكم في متصفح سحابي عبر Browserbase لملء نموذج تقاضي تلقائياً
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BROWSERBASE_API_KEY = "bb_live_RqMcpDLo4ysMxVCU_RJjTbI5Z6E";
const BROWSERBASE_PROJECT_ID = "01e67253-995a-456c-814c-ba30517bfba0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentUrls {
  contractUrl?: string;
  commercialRegisterUrl?: string;
  ibanCertificateUrl?: string;
  representativeIdUrl?: string;
  establishmentRecordUrl?: string;
  explanatoryMemoUrl?: string;
  documentsListUrl?: string;
}

interface LawsuitData {
  caseTitle: string;
  facts: string;
  claims: string;
  amount: number;
  amountInWords: string;
  defendantName: string;
  defendantIdNumber?: string;
  defendantPhone?: string;
  contractNumber: string;
  vehicleInfo: string;
  contractStartDate: string;
  contractEndDate: string;
  documents?: DocumentUrls;
}

interface AutomationRequest {
  action: "start" | "status" | "cancel";
  sessionId?: string;
  lawsuitData?: LawsuitData;
}

// إنشاء جلسة متصفح جديدة
async function createBrowserSession(): Promise<{ sessionId: string; connectUrl: string; liveUrl: string }> {
  console.log("[Taqadi] Creating Browserbase session...");
  console.log("[Taqadi] Project ID:", BROWSERBASE_PROJECT_ID);
  
  const requestBody = {
    projectId: BROWSERBASE_PROJECT_ID,
    browserSettings: {
      fingerprint: {
        locales: ["ar-QA", "ar"],
        screen: { width: 1920, height: 1080 },
      },
    },
    keepAlive: true,
    timeout: 1800, // 30 دقيقة (بالثواني)
  };
  
  console.log("[Taqadi] Request body:", JSON.stringify(requestBody));
  
  const response = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[Taqadi] Browserbase response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Taqadi] Browserbase error:", errorText);
    throw new Error(`Browserbase error (${response.status}): ${errorText}`);
  }

  const session = await response.json();
  console.log("[Taqadi] Session created successfully:", session.id);
  
  return {
    sessionId: session.id,
    connectUrl: session.connectUrl,
    liveUrl: `https://www.browserbase.com/sessions/${session.id}/live`,
  };
}

// الحصول على حالة الجلسة
async function getSessionStatus(sessionId: string): Promise<any> {
  const response = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get session status");
  }

  return response.json();
}

// إلغاء الجلسة
async function cancelSession(sessionId: string): Promise<void> {
  await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY,
    },
  });
}

// توليد سكربت الأتمتة
function generateAutomationScript(data: LawsuitData): string {
  return `
// ====== سكربت أتمتة تقاضي - شركة العراف ======

const LAWSUIT_DATA = ${JSON.stringify(data, null, 2)};

// دالة الانتظار
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// دالة تعبئة حقل نصي
async function fillField(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// دالة النقر
async function clickElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// دالة اختيار من قائمة منسدلة
async function selectOption(selector, value) {
  const dropdown = document.querySelector(selector);
  if (dropdown) {
    dropdown.click();
    await sleep(500);
    const option = [...document.querySelectorAll('li.k-item')].find(el => 
      el.textContent.includes(value)
    );
    if (option) {
      option.click();
      return true;
    }
  }
  return false;
}

// الخطوة 1: انتظار تسجيل الدخول
async function waitForLogin() {
  console.log('⏳ انتظار تسجيل الدخول...');
  while (!window.location.href.includes('/home')) {
    await sleep(1000);
  }
  console.log('✅ تم تسجيل الدخول!');
}

// الخطوة 2: الذهاب لإنشاء دعوى
async function goToCreateCase() {
  console.log('🔄 جاري الذهاب لصفحة إنشاء دعوى...');
  window.location.href = 'https://taqadi.sjc.gov.qa/itc/f/caseinfo/create';
  await sleep(3000);
}

// الخطوة 3: اختيار نوع الدعوى
async function selectCaseType() {
  console.log('🔄 جاري اختيار نوع الدعوى...');
  await sleep(2000);
  
  // النقر على "عقود الخدمات التجارية"
  const serviceContracts = [...document.querySelectorAll('li.k-item')].find(el => 
    el.textContent.includes('عقود الخدمات التجارية')
  );
  if (serviceContracts) serviceContracts.click();
  await sleep(1000);
  
  // النقر على "عقود إيجار السيارات"
  const carRental = [...document.querySelectorAll('li.k-item')].find(el => 
    el.textContent.includes('عقود إيجار السيارات')
  );
  if (carRental) carRental.click();
  await sleep(1000);
  
  // النقر على التالي
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('التالي')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('✅ تم اختيار نوع الدعوى');
}

// الخطوة 4: تعبئة تفاصيل الدعوى
async function fillCaseDetails() {
  console.log('🔄 جاري تعبئة تفاصيل الدعوى...');
  await sleep(2000);
  
  // عنوان الدعوى
  const titleInput = document.querySelector('input[aria-label*="عنوان الدعوى"]') ||
                     document.querySelector('input.k-textbox');
  if (titleInput) {
    titleInput.value = LAWSUIT_DATA.caseTitle;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await sleep(500);
  
  // الوقائع
  const factsTextarea = document.querySelector('textarea[aria-label*="الوقائع"]') ||
                        document.querySelectorAll('textarea')[0];
  if (factsTextarea) {
    factsTextarea.value = LAWSUIT_DATA.facts;
    factsTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await sleep(500);
  
  // الطلبات (قد تكون في TinyMCE)
  const requestsIframe = document.querySelector('iframe[id*="caseDetails"]');
  if (requestsIframe) {
    const iframeDoc = requestsIframe.contentDocument || requestsIframe.contentWindow.document;
    iframeDoc.body.innerHTML = LAWSUIT_DATA.claims.replace(/\\n/g, '<br>');
  }
  await sleep(500);
  
  // نوع المطالبة
  const claimTypeDropdown = document.querySelector('.k-dropdownlist[aria-label*="نوع المطالبة"]');
  if (claimTypeDropdown) {
    claimTypeDropdown.click();
    await sleep(500);
    const financialClaim = [...document.querySelectorAll('li.k-item')].find(el => 
      el.textContent.includes('مطالبة مالية')
    );
    if (financialClaim) financialClaim.click();
  }
  await sleep(500);
  
  // المبلغ
  const amountInput = document.querySelector('input[type="number"]') ||
                      document.querySelector('input.k-formatted-value');
  if (amountInput) {
    amountInput.value = LAWSUIT_DATA.amount;
    amountInput.dispatchEvent(new Event('input', { bubbles: true }));
    amountInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await sleep(500);
  
  // المبلغ كتابة
  const amountWordsInput = document.querySelector('input[aria-label*="المبلغ الإجمالي كتابة"]');
  if (amountWordsInput) {
    amountWordsInput.value = LAWSUIT_DATA.amountInWords;
    amountWordsInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await sleep(500);
  
  // النقر على التالي
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('التالي')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('✅ تم تعبئة تفاصيل الدعوى');
}

// الخطوة 5: إضافة أطراف الدعوى
async function addParties() {
  console.log('🔄 جاري إضافة أطراف الدعوى...');
  await sleep(2000);
  
  // البحث عن زر إضافة مدعى عليه
  const addDefendantBtn = [...document.querySelectorAll('button, a')].find(el => 
    el.textContent.includes('إضافة مدعى عليه') || el.textContent.includes('إضافة طرف')
  );
  
  if (addDefendantBtn) {
    addDefendantBtn.click();
    await sleep(2000);
    
    // اختيار شخص طبيعي
    const personRadio = [...document.querySelectorAll('input[type="radio"]')].find(radio => {
      const label = radio.closest('label') || radio.parentElement;
      return label && (label.textContent.includes('طبيعي') || label.textContent.includes('فرد'));
    });
    if (personRadio) personRadio.click();
    await sleep(500);
    
    // تعبئة الاسم
    const nameInputs = document.querySelectorAll('input[type="text"]');
    for (const input of nameInputs) {
      const label = input.closest('div')?.querySelector('label');
      if (label && label.textContent.includes('اسم')) {
        input.value = LAWSUIT_DATA.defendantName;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
    await sleep(500);
    
    // تعبئة رقم الهوية
    for (const input of nameInputs) {
      const label = input.closest('div')?.querySelector('label');
      if (label && (label.textContent.includes('هوية') || label.textContent.includes('QID'))) {
        input.value = LAWSUIT_DATA.defendantIdNumber || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
    await sleep(500);
    
    // تعبئة الهاتف
    for (const input of nameInputs) {
      const label = input.closest('div')?.querySelector('label');
      if (label && label.textContent.includes('هاتف')) {
        input.value = LAWSUIT_DATA.defendantPhone || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
    await sleep(500);
    
    // حفظ
    const saveBtn = [...document.querySelectorAll('button, a')].find(el => 
      el.textContent.includes('حفظ') || el.textContent.includes('إضافة')
    );
    if (saveBtn) saveBtn.click();
    await sleep(2000);
  }
  
  // النقر على التالي
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('التالي')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('✅ تم إضافة أطراف الدعوى');
}

// دالة تحميل ملف من URL وتحويله لـ File
async function downloadFileAsBlob(url, filename) {
  try {
    console.log('   📥 جاري تحميل: ' + filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error('فشل التحميل');
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'application/pdf' });
  } catch (error) {
    console.error('   ❌ فشل تحميل: ' + filename, error);
    return null;
  }
}

// دالة رفع ملف لحقل input[type="file"]
async function uploadFileToInput(inputElement, file) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputElement.files = dataTransfer.files;
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(1000);
    return true;
  } catch (error) {
    console.error('   ❌ فشل رفع الملف:', error);
    return false;
  }
}

// الخطوة 6: المستندات (رفع تلقائي)
async function handleDocuments() {
  console.log('📄 جاري رفع المستندات تلقائياً...');
  await sleep(2000);
  
  const docs = LAWSUIT_DATA.documents || {};
  const documentsToUpload = [
    { url: docs.commercialRegisterUrl, name: 'السجل التجاري.pdf', label: 'السجل التجاري' },
    { url: docs.establishmentRecordUrl, name: 'قيد المنشأة.pdf', label: 'قيد المنشأة' },
    { url: docs.ibanCertificateUrl, name: 'شهادة IBAN.pdf', label: 'شهادة IBAN' },
    { url: docs.representativeIdUrl, name: 'البطاقة الشخصية.pdf', label: 'البطاقة الشخصية' },
    { url: docs.contractUrl, name: 'العقد.pdf', label: 'العقد' },
    { url: docs.explanatoryMemoUrl, name: 'المذكرة الشارحة.pdf', label: 'المذكرة الشارحة' },
  ].filter(d => d.url);
  
  let uploadedCount = 0;
  
  for (const doc of documentsToUpload) {
    try {
      console.log('   📤 جاري رفع: ' + doc.label);
      
      // البحث عن زر إضافة مستند
      const addDocBtn = [...document.querySelectorAll('button, a')].find(el => 
        el.textContent.includes('إضافة مستند') || 
        el.textContent.includes('إضافة ملف') ||
        el.textContent.includes('رفع')
      );
      
      if (addDocBtn) {
        addDocBtn.click();
        await sleep(1500);
        
        // تحميل الملف
        const file = await downloadFileAsBlob(doc.url, doc.name);
        if (!file) continue;
        
        // البحث عن حقل الملف
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          const success = await uploadFileToInput(fileInput, file);
          if (success) {
            // البحث عن قائمة نوع المستند واختيار النوع المناسب
            const docTypeDropdown = document.querySelector('.k-dropdownlist');
            if (docTypeDropdown) {
              docTypeDropdown.click();
              await sleep(500);
              const option = [...document.querySelectorAll('li.k-item')].find(el => 
                el.textContent.includes(doc.label)
              );
              if (option) option.click();
            }
            
            await sleep(500);
            
            // حفظ المستند
            const saveBtn = [...document.querySelectorAll('button')].find(el => 
              el.textContent.includes('حفظ') || el.textContent.includes('رفع') || el.textContent.includes('إضافة')
            );
            if (saveBtn) {
              saveBtn.click();
              await sleep(2000);
            }
            
            uploadedCount++;
            console.log('   ✅ تم رفع: ' + doc.label);
          }
        }
      }
    } catch (error) {
      console.error('   ❌ خطأ في رفع ' + doc.label + ':', error);
    }
  }
  
  console.log('📊 تم رفع ' + uploadedCount + ' من ' + documentsToUpload.length + ' مستندات');
  
  // إذا لم يتم رفع أي ملف أو بعض الملفات مفقودة
  if (uploadedCount < documentsToUpload.length || documentsToUpload.length === 0) {
    const missingDocs = documentsToUpload.length === 0 
      ? 'جميع المستندات' 
      : (documentsToUpload.length - uploadedCount) + ' مستندات';
    
    alert('⚠️ تنبيه:\\n\\nلم يتم رفع ' + missingDocs + ' تلقائياً.\\n\\nيرجى:\\n1. رفع المستندات المتبقية يدوياً\\n2. اضغط OK للمتابعة');
  }
  
  // النقر على التالي
  await sleep(1000);
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('التالي')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
}

// الخطوة 7: الرسوم
async function handleFees() {
  console.log('💰 صفحة الرسوم...');
  await sleep(2000);
  
  // النقر على التالي
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('التالي')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('✅ تم الانتقال لصفحة الملخص');
}

// الخطوة 8: الملخص
async function showSummary() {
  console.log('📋 صفحة ملخص الدعوى');
  console.log('✅ تم إكمال التعبئة التلقائية!');
  console.log('⚠️ يرجى مراجعة البيانات ثم الضغط على "اعتماد" لتقديم الدعوى');
  
  alert('تم إكمال التعبئة التلقائية!\\n\\nيرجى:\\n1. مراجعة جميع البيانات\\n2. الضغط على "اعتماد" لتقديم الدعوى');
}

// تشغيل الأتمتة
async function runAutomation() {
  try {
    await waitForLogin();
    await goToCreateCase();
    await selectCaseType();
    await fillCaseDetails();
    await addParties();
    await handleDocuments();
    await handleFees();
    await showSummary();
  } catch (error) {
    console.error('❌ خطأ:', error);
    alert('حدث خطأ: ' + error.message);
  }
}

// بدء التشغيل
runAutomation();
`;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const request: AutomationRequest = await req.json();
    console.log("[Taqadi] Received request:", JSON.stringify({ action: request.action, hasLawsuitData: !!request.lawsuitData }));

    switch (request.action) {
      case "start": {
        if (!request.lawsuitData) {
          throw new Error("Missing lawsuit data");
        }

        // إنشاء جلسة متصفح
        const session = await createBrowserSession();
        
        // توليد سكربت الأتمتة
        const script = generateAutomationScript(request.lawsuitData);

        return new Response(
          JSON.stringify({
            success: true,
            sessionId: session.sessionId,
            liveUrl: session.liveUrl,
            connectUrl: session.connectUrl,
            script: script,
            message: "تم إنشاء جلسة المتصفح بنجاح. افتح الرابط لمشاهدة التنفيذ.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "status": {
        if (!request.sessionId) {
          throw new Error("Missing session ID");
        }

        const status = await getSessionStatus(request.sessionId);

        return new Response(
          JSON.stringify({
            success: true,
            status: status,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "cancel": {
        if (!request.sessionId) {
          throw new Error("Missing session ID");
        }

        await cancelSession(request.sessionId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "تم إلغاء الجلسة",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error: any) {
    console.error("[Taqadi] Error:", error.message);
    console.error("[Taqadi] Error stack:", error.stack);
    // Return 200 so client can read the error message in JSON
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

