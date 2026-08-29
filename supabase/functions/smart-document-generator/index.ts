import { authorizeActiveCompanyUser } from "../_shared/privileged-admin.ts";
import { buildLongCatHeaders, getLongCatApiKey, LONGCAT_CHAT_COMPLETIONS_URL, LONGCAT_MODEL } from "../_shared/longcat.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LongCat API Configuration - Read from environment variables
const LONGCAT_API_KEY = getLongCatApiKey();

const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'AL-ARAF CAR RENTAL L.L.C',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  phone: '+974 3141 1919',
  email: 'info@alaraf.qa',
  cr: 'س.ت: 146832',
  logo: 'https://alaraf.online/receipts/logo.png',
  authorized_signatory: 'أسامة أحمد البشرى',
  authorized_title: 'المخول بالتوقيع',
};

// استنتاج عنوان المستلم تلقائياً بناءً على اسم الجهة
function getSmartRecipientTitle(recipient: string): { title: string; isOrganization: boolean } {
  const recipientLower = recipient.toLowerCase();
  
  // الجهات الحكومية والرسمية
  if (recipientLower.includes('مرور') || recipientLower.includes('إدارة المرور')) {
    return { title: 'سعادة مدير إدارة المرور / ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  if (recipientLower.includes('محكمة') || recipientLower.includes('قضاء')) {
    return { title: 'سعادة القاضي / ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  if (recipientLower.includes('نيابة')) {
    return { title: 'سعادة السيد المحامي العام / ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  if (recipientLower.includes('وزارة')) {
    return { title: 'سعادة وكيل ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  if (recipientLower.includes('هيئة')) {
    return { title: 'سعادة رئيس ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  if (recipientLower.includes('تنفيذ') || recipientLower.includes('قاضي التنفيذ')) {
    return { title: 'سعادة قاضي التنفيذ / ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  if (recipientLower.includes('استئناف')) {
    return { title: 'سعادة رئيس ' + recipient + ' الموقرين', isOrganization: true };
  }
  
  // الشركات
  if (recipientLower.includes('شركة') || recipientLower.includes('مؤسسة')) {
    if (recipientLower.includes('تأمين')) {
      return { title: 'سعادة المدير العام / ' + recipient + ' المحترمين', isOrganization: true };
    }
    return { title: 'السادة / ' + recipient + ' المحترمين', isOrganization: true };
  }
  
  // البنوك
  if (recipientLower.includes('بنك') || recipientLower.includes('مصرف')) {
    return { title: 'سعادة مدير عام / ' + recipient + ' المحترمين', isOrganization: true };
  }
  
  // إدارات عامة
  if (recipientLower.includes('إدارة') || recipientLower.includes('قسم')) {
    return { title: 'سعادة مدير / ' + recipient + ' المحترمين', isOrganization: true };
  }
  
  // شركات التأمين بالاسم
  const insuranceCompanies = ['qic', 'qatar insurance', 'doha insurance', 'al khaleej', 'الخليج', 'قطر للتأمين'];
  if (insuranceCompanies.some(c => recipientLower.includes(c))) {
    return { title: 'سعادة المدير العام / شركة ' + recipient + ' للتأمين المحترمين', isOrganization: true };
  }
  
  // إذا كان اسم شخص
  return { title: 'السيد / ' + recipient + ' &nbsp;&nbsp;&nbsp;&nbsp; حفظه الله ورعاه', isOrganization: false };
}

function formatDate(): string {
  return new Date().toLocaleDateString('ar-QA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generateRefNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `ARF/${year}/${month}/${random}`;
}

function generateLetterHTML(recipient: string, recipientTitle: string, subject: string, body: string): string {
  const refNumber = generateRefNumber();
  const date = formatDate();
  const formattedBody = body.split('\n').filter(p => p.trim()).map(p => `<p style="margin-bottom:15px;text-indent:20px;">${p}</p>`).join('');
  
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    @page { size: A4; margin: 20mm 20mm 25mm 20mm; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html, body { margin: 0 !important; padding: 0 !important; }
      .letter-container { box-shadow: none !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', Arial, serif;
      font-size: 14pt;
      line-height: 2;
      color: #000;
      background: #f5f5f5;
      direction: rtl;
    }
    .letter-container {
      max-width: 210mm;
      margin: 20px auto;
      background: white;
      padding: 20mm;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: relative;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1a365d;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo-section { text-align: center; flex: 0 0 200px; }
    .logo-section img { max-height: 70px; max-width: 180px; }
    .company-details { text-align: left; font-size: 10pt; color: #000; flex: 1; }
    .ref-date { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12pt; color: #000; }
    .recipient-section {
      margin-bottom: 20px;
      padding: 12px 15px;
      background: #f8f9fa;
      border-right: 4px solid #1a365d;
    }
    .recipient-section strong { color: #1a365d; }
    .subject-section {
      text-align: center;
      margin: 20px 0;
      padding: 12px 20px;
      background: #1a365d;
      color: white;
      font-weight: bold;
      font-size: 14pt;
    }
    .salutation { margin-bottom: 15px; font-size: 14pt; color: #000; }
    .intro { margin-bottom: 15px; font-size: 14pt; color: #000; }
    .body-content { text-align: justify; margin-bottom: 25px; font-size: 14pt; color: #000; }
    .body-content p { margin-bottom: 15px; }
    .closing { margin: 30px 0; text-align: center; font-size: 14pt; color: #000; }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .stamp-area {
      width: 120px;
      height: 120px;
      border: 2px dashed #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10pt;
      color: #666;
    }
    .signatory { text-align: center; flex: 1; }
    .signatory .company-name { font-weight: bold; font-size: 14pt; color: #1a365d; margin-bottom: 40px; }
    .signatory .line { border-top: 2px solid #1a365d; width: 200px; margin: 0 auto; padding-top: 10px; }
    .signatory .name { font-size: 14pt; font-weight: bold; color: #000; }
    .signatory .title { font-size: 12pt; color: #000; margin-top: 5px; }
    .sign-area { text-align: center; width: 120px; }
    .sign-line { width: 100px; height: 50px; border-bottom: 2px solid #999; margin: 0 auto 10px; }
    .sign-area span { font-size: 10pt; color: #666; }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 2px solid #1a365d;
      text-align: center;
      font-size: 10pt;
      color: #000;
      page-break-inside: avoid;
    }
    .ltr { direction: ltr; display: inline-block; }
  </style>
</head>
<body>
  <div class="letter-container">
    <div class="header">
      <div class="company-details" style="text-align: right;">
        <div style="font-weight: bold; color: #1a365d;">${COMPANY_INFO.name_ar}</div>
        <div>ذ.م.م</div>
        <div>${COMPANY_INFO.cr}</div>
      </div>
      <div class="logo-section">
        <img src="${COMPANY_INFO.logo}" alt="شعار" onerror="this.style.display='none'">
      </div>
      <div class="company-details" dir="ltr" style="text-align: left;">
        <div style="font-weight: bold; color: #1a365d;">${COMPANY_INFO.name_en}</div>
        <div>C.R: 146832</div>
      </div>
    </div>
    <div style="text-align: center; font-size: 10pt; color: #000; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
      ${COMPANY_INFO.address}<br/>
      هاتف: <span class="ltr">${COMPANY_INFO.phone}</span> | البريد: <span class="ltr">${COMPANY_INFO.email}</span>
    </div>
    <div class="ref-date">
      <div><strong>الرقم المرجعي:</strong> <span class="ltr">${refNumber}</span></div>
      <div><strong>التاريخ:</strong> ${date}</div>
    </div>
    <div class="recipient-section">
      <strong>إلى / </strong>${recipientTitle}
    </div>
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="intro">تحية طيبة وبعد،،</p>
    <div class="subject-section">الموضوع: ${subject}</div>
    <p class="intro">نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إليكم بهذا الكتاب الرسمي بخصوص الموضوع أعلاه، ونفيدكم بالآتي:</p>
    <div class="body-content">${formattedBody}</div>
    <div class="closing"><p>وتفضلوا بقبول فائق الاحترام والتقدير،،</p></div>
    <div class="signature-section">
      <div class="stamp-area">مكان الختم</div>
      <div class="signatory">
        <p class="company-name">${COMPANY_INFO.name_ar}</p>
        <div class="line">
          <p class="name">${COMPANY_INFO.authorized_signatory}</p>
          <p class="title">${COMPANY_INFO.authorized_title}</p>
        </div>
      </div>
      <div class="sign-area">
        <div class="sign-line"></div>
        <span>التوقيع</span>
      </div>
    </div>
    <div class="footer">${COMPANY_INFO.address} | ${COMPANY_INFO.cr}</div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorizeActiveCompanyUser(req);
    const body = await req.json();
    const { templateName, answers } = body;
    
    const recipient = answers.recipient || 'الجهة المعنية';
    
    // استنتاج عنوان المستلم تلقائياً
    const { title: recipientTitle, isOrganization } = getSmartRecipientTitle(recipient);
    
    const subject = answers.subject || templateName;
    let aiContent = '';
    let aiUsed = false;
    
    // Check if LongCat API key is configured
    if (!LONGCAT_API_KEY) {
      console.error('❌ LONGCAT_API_KEY environment variable is not configured');
      aiContent = `بالإشارة إلى الموضوع المذكور أعلاه، يسرنا أن نتقدم إليكم بهذا الكتاب الرسمي.\n\n${answers.content || 'نود إعلامكم بالتفاصيل المذكورة.'}\n\nنأمل التكرم باتخاذ الإجراء المناسب.\n\nنشكر لكم تعاونكم.`;
      aiUsed = false;
    } else {
      // Use LongCat API
      try {
        console.log('🤖 Calling LongCat API...');
        
        const systemPrompt = `أنت كاتب محترف متخصص في صياغة المراسلات والكتب الرسمية باللغة العربية الفصحى. تعمل لدى شركة العراف لتأجير السيارات في قطر.

قواعد الصياغة:
1. اكتب محتوى الكتاب فقط (الفقرات) - بدون ترويسة أو تاريخ أو توقيع
2. استخدم لغة عربية فصحى قوية ورسمية
3. ${isOrganization ? 'المستلم جهة رسمية - استخدم صيغة الجمع "الموقرين/المحترمين"' : 'المستلم شخص - استخدم "حفظه الله"'}
4. اكتب 3-4 فقرات متماسكة ومختصرة
5. لا تستخدم HTML أو تنسيقات خاصة
6. اكتب فقرات واضحة ومفصولة بسطر فارغ`;
        
        const userPrompt = `صِغ كتاباً رسمياً:
- نوع الكتاب: ${templateName}
- المستلم: ${recipient}
- الموضوع: ${subject}
- التفاصيل: ${answers.content || JSON.stringify(answers)}

اكتب المحتوى فقط (بدون ترويسة أو توقيع):`;
        
        const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
          method: 'POST',
          headers: buildLongCatHeaders(LONGCAT_API_KEY),
          body: JSON.stringify({
            model: LONGCAT_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          aiContent = result.choices?.[0]?.message?.content || '';
          if (aiContent && aiContent.length > 100) {
            aiUsed = true;
            console.log('✅ LongCat document generated successfully');
          }
        } else {
          const errorText = await response.text();
          console.error('LongCat API error:', response.status, errorText);
        }
      } catch (aiErr) {
        console.error('LongCat call failed:', aiErr);
      }
      
      // Fallback to template if AI fails
      if (!aiContent || aiContent.length < 100) {
        aiContent = `بالإشارة إلى الموضوع المذكور أعلاه، يسرنا أن نتقدم إليكم بهذا الكتاب الرسمي.\\n\\n${answers.content || 'نود إعلامكم بالتفاصيل المذكورة.'}\\n\\nنأمل التكرم باتخاذ الإجراء المناسب.\\n\\nنشكر لكم تعاونكم.`;
        aiUsed = false;
      }
    }
    
    const htmlContent = generateLetterHTML(recipient, recipientTitle, subject, aiContent);
    
    return new Response(JSON.stringify({ 
      success: true, 
      content: htmlContent,
      aiPowered: aiUsed,
      model: aiUsed ? LONGCAT_MODEL : 'Template'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


