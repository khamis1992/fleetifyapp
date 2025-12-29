import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zhipu AI API Configuration
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// معلومات الشركة
const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'AL-ARAF CAR RENTAL L.L.C',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  phone: '+974 5555 5555',
  email: 'info@alaraf.qa',
  cr: 'س.ت: 146832',
  authorized_signatory: 'أسامة أحمد البشرى',
  authorized_title: 'المخول بالتوقيع',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateId, templateName, answers, documentType } = await req.json();

    console.log('Smart Document Generator Request:', { 
      templateId, 
      templateName,
      documentType,
      answersKeys: Object.keys(answers || {})
    });

    // Get Zhipu API Key from environment
    const zhipuApiKey = Deno.env.get('ZHIPU_API_KEY');
    if (!zhipuApiKey) {
      console.error('Zhipu API key not configured');
      throw new Error('Zhipu API key not configured - please add ZHIPU_API_KEY in Supabase settings');
    }

    // Build the system prompt for professional Arabic letter writing
    const systemPrompt = `أنت كاتب محترف متخصص في صياغة الكتب والمراسلات الرسمية باللغة العربية الفصحى.

مهمتك:
- صياغة كتب رسمية احترافية بأسلوب قانوني ورسمي راقٍ
- استخدام لغة عربية فصيحة وتعبيرات رسمية مناسبة
- مراعاة السياق والجهة المرسل إليها (محكمة، شركة، جهة حكومية، فرد)
- تنظيم المحتوى بشكل منطقي ومتسلسل
- إضافة العبارات الافتتاحية والختامية المناسبة

قواعد مهمة:
1. للجهات الرسمية (محكمة، وزارة، إدارة): لا تستخدم "حفظه الله" بل "الموقرة"
2. للأشخاص: استخدم "حفظه الله ورعاه" أو "المحترم"
3. استخدم صيغة المتكلم الجمع (نحن، شركتنا)
4. كن دقيقاً في الأرقام والتواريخ
5. اجعل الكتاب مختصراً ومركزاً على الهدف

معلومات الشركة المرسلة:
- الاسم: ${COMPANY_INFO.name_ar}
- العنوان: ${COMPANY_INFO.address}
- السجل التجاري: ${COMPANY_INFO.cr}
- المخول بالتوقيع: ${COMPANY_INFO.authorized_signatory}

أرجع الرد بتنسيق JSON كالتالي:
{
  "recipient": "الجهة المرسل إليها بالصيغة الصحيحة",
  "greeting": "التحية المناسبة (فارغة للجهات الرسمية)",
  "subject": "موضوع الكتاب",
  "body": "محتوى الكتاب الرئيسي (بدون HTML، نص عادي فقط)",
  "attachments": "قائمة المرفقات المقترحة"
}`;

    // Build the user prompt with template details and answers
    const userPrompt = `اكتب كتاباً رسمياً من نوع: "${templateName}"

البيانات المقدمة:
${Object.entries(answers).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

نوع الوثيقة: ${documentType || 'كتاب رسمي'}

اكتب الكتاب بأسلوب رسمي واحترافي مناسب للجهة المستلمة.`;

    console.log('Calling Zhipu AI...');

    // Call Zhipu AI API
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${zhipuApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    console.log('Zhipu AI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu AI API error:', response.status, errorText);
      throw new Error(`Zhipu AI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    console.log('Zhipu AI result received');

    if (!aiResult.choices || aiResult.choices.length === 0) {
      throw new Error('No AI response received from Zhipu');
    }

    const aiContent = aiResult.choices[0].message.content;
    console.log('AI content length:', aiContent.length);

    // Parse the AI response
    let documentData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        documentData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, create structured response from text
        documentData = {
          recipient: extractSection(aiContent, 'إلى') || 'الجهة المختصة',
          greeting: '',
          subject: extractSection(aiContent, 'الموضوع') || templateName,
          body: aiContent,
          attachments: ''
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      documentData = {
        recipient: 'الجهة المختصة',
        greeting: '',
        subject: templateName,
        body: aiContent,
        attachments: ''
      };
    }

    // Generate the final HTML document
    const htmlDocument = generateProfessionalHTML(documentData);

    return new Response(JSON.stringify({
      success: true,
      content: htmlDocument,
      rawData: documentData,
      aiModel: 'glm-4',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart document generator:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      fallback: true 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract sections from text
function extractSection(text: string, keyword: string): string {
  const regex = new RegExp(`${keyword}[:\\s]+([^\n]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// Generate professional HTML document
function generateProfessionalHTML(data: any): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const refNumber = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كتاب رسمي - ${COMPANY_INFO.name_ar}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body { margin: 0; padding: 0; }
      .letter-container { border: none !important; box-shadow: none !important; }
    }
    
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
      font-size: 14px;
      line-height: 1.9;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    
    .letter-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 25px 35px;
      background: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    
    .company-ar { flex: 1; text-align: right; }
    .company-ar h1 { color: #1e3a5f; margin: 0; font-size: 20px; font-weight: bold; }
    .company-ar p { color: #000; margin: 2px 0; font-size: 11px; }
    
    .logo-container { flex: 0 0 130px; text-align: center; padding: 0 15px; }
    .logo-container img { max-height: 70px; max-width: 120px; }
    
    .company-en { flex: 1; text-align: left; }
    .company-en h1 { color: #1e3a5f; margin: 0; font-size: 14px; font-weight: bold; }
    .company-en p { color: #000; margin: 2px 0; font-size: 10px; }
    
    .address-bar {
      text-align: center;
      color: #000;
      font-size: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    
    .ref-date {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 13px;
      color: #000;
    }
    
    .recipient-box {
      margin-bottom: 15px;
      padding: 12px 15px;
      border-right: 4px solid #1e3a5f;
      background: #f5f5f5;
    }
    .recipient-box p { margin: 0; font-size: 15px; color: #000; }
    .recipient-box .greeting { margin-top: 5px; font-size: 13px; }
    
    .salutation { margin: 15px 0 8px 0; font-size: 15px; color: #000; }
    
    .subject-box {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 15px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .intro { margin-bottom: 15px; font-size: 14px; color: #000; }
    
    .content {
      text-align: justify;
      margin-bottom: 25px;
      font-size: 14px;
      color: #000;
      padding: 15px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      line-height: 2.2;
    }
    .content p { margin: 10px 0; }
    
    .attachments {
      margin-bottom: 20px;
      background: #fffbeb;
      padding: 12px 15px;
      border: 1px solid #fcd34d;
    }
    .attachments strong { color: #92400e; font-size: 13px; }
    .attachments ul { margin: 8px 0 0 0; padding-right: 20px; color: #000; }
    .attachments li { margin: 4px 0; }
    
    .closing { text-align: center; margin: 25px 0; font-size: 14px; color: #000; }
    
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .stamp-area { text-align: center; width: 120px; }
    .stamp-circle {
      width: 100px; height: 100px;
      border: 2px dashed #999;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .stamp-circle span { color: #666; font-size: 10px; }
    
    .signatory { text-align: center; flex: 1; }
    .signatory .company-name { color: #1e3a5f; font-weight: bold; font-size: 15px; margin-bottom: 35px; }
    .signatory .line {
      border-top: 2px solid #1e3a5f;
      width: 200px;
      margin: 0 auto;
      padding-top: 8px;
    }
    .signatory .name { font-size: 15px; font-weight: bold; color: #000; margin: 0; }
    .signatory .title { font-size: 12px; color: #000; margin-top: 3px; }
    
    .sign-area { text-align: center; width: 120px; }
    .sign-line { width: 100px; height: 50px; border-bottom: 2px solid #999; margin: 0 auto 8px auto; }
    .sign-area span { color: #666; font-size: 10px; }
    
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 9px;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    <div class="header">
      <div class="company-ar">
        <h1>${COMPANY_INFO.name_ar}</h1>
        <p>ذ.م.م</p>
        <p>${COMPANY_INFO.cr}</p>
      </div>
      <div class="logo-container">
        <img src="/receipts/logo.png" alt="شعار الشركة" onerror="this.style.display='none'" />
      </div>
      <div class="company-en" dir="ltr">
        <h1>${COMPANY_INFO.name_en}</h1>
        <p>C.R: 146832</p>
      </div>
    </div>
    
    <div class="address-bar">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
    </div>
    
    <div class="ref-date">
      <div><strong>الرقم المرجعي:</strong> ${refNumber}</div>
      <div><strong>التاريخ:</strong> ${dateStr}</div>
    </div>
    
    <div class="recipient-box">
      <p><strong>إلى / </strong> ${data.recipient}</p>
      ${data.greeting ? `<p class="greeting">${data.greeting}</p>` : ''}
    </div>
    
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <div class="subject-box">
      <strong>الموضوع: </strong>${data.subject}
    </div>
    
    <p class="intro">
      نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إليكم بهذا الكتاب الرسمي بخصوص الموضوع المذكور أعلاه.
    </p>
    
    <div class="content">
      ${data.body.split('\n').filter((p: string) => p.trim()).map((p: string) => `<p>${p}</p>`).join('')}
    </div>
    
    ${data.attachments ? `
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        ${data.attachments.split(/[،,]/).map((att: string) => `<li>${att.trim()}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    <div class="closing">
      <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
    </div>
    
    <div class="signature-section">
      <div class="stamp-area">
        <div class="stamp-circle"><span>مكان الختم</span></div>
      </div>
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
    
    <div class="footer">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
    </div>
  </div>
</body>
</html>`;
}

