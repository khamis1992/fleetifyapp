/**
 * مساعد الذكاء الاصطناعي لفهم صفحات تقاضي
 * يستخدم OpenAI GPT-4 لتحليل HTML وتحديد الحقول
 */

const OpenAI = require('openai');

class AIHelper {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('مفتاح OpenAI API مطلوب');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * تحليل HTML للصفحة وإرجاع selectors للحقول المطلوبة
   */
  async analyzePageForFields(htmlContent, fieldsToFind) {
    const prompt = `أنت خبير في تحليل صفحات الويب العربية. 
    
لدي صفحة نموذج إلكتروني وأريد العثور على الحقول التالية:
${fieldsToFind.map((f, i) => `${i + 1}. ${f.name} - ${f.description}`).join('\n')}

هذا جزء من HTML الصفحة:
\`\`\`html
${htmlContent.substring(0, 15000)}
\`\`\`

أريدك أن ترجع لي JSON يحتوي على:
1. selector: الـ CSS selector للحقل
2. type: نوع الحقل (input, textarea, tinymce, kendo-input, kendo-numeric)
3. found: هل تم العثور على الحقل (true/false)
4. notes: أي ملاحظات

مثال للإخراج:
{
  "fields": [
    { "name": "عنوان الدعوى", "selector": "input.k-textbox", "type": "kendo-input", "found": true, "notes": "" },
    { "name": "الوقائع", "selector": "#facts", "type": "textarea", "found": true, "notes": "" }
  ]
}

أرجع JSON فقط بدون أي نص إضافي.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'أنت مساعد لتحليل HTML وإيجاد selectors للحقول. أرجع JSON فقط.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      
      // استخراج JSON من الرد
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('لم يتم العثور على JSON في الرد');
    } catch (error) {
      console.error('خطأ في تحليل AI:', error.message);
      return null;
    }
  }

  /**
   * توليد كود JavaScript لتعبئة حقل معين
   */
  async generateFillCode(htmlContent, fieldName, value) {
    const prompt = `أنت خبير JavaScript. أريد كود لتعبئة حقل "${fieldName}" بقيمة معينة.

جزء من HTML:
\`\`\`html
${htmlContent.substring(0, 8000)}
\`\`\`

القيمة المراد تعبئتها: "${value.substring(0, 200)}..."

أريد كود JavaScript يعمل داخل المتصفح (page.evaluate) للعثور على الحقل وتعبئته.
الكود يجب أن:
1. يبحث عن الحقل بعدة طرق
2. يعبئ القيمة
3. يطلق أحداث input و change
4. يرجع true إذا نجح، false إذا فشل

أرجع الكود فقط بدون شرح، داخل:
\`\`\`javascript
// الكود هنا
\`\`\``;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'أنت مبرمج JavaScript خبير. أرجع كود فقط.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      
      // استخراج الكود
      const codeMatch = content.match(/```javascript\n([\s\S]*?)\n```/);
      if (codeMatch) {
        return codeMatch[1];
      }
      
      // محاولة استخراج أي كود
      const anyCodeMatch = content.match(/```\n?([\s\S]*?)\n?```/);
      if (anyCodeMatch) {
        return anyCodeMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('خطأ في توليد الكود:', error.message);
      return null;
    }
  }

  /**
   * تحليل screenshot باستخدام Vision
   */
  async analyzeScreenshot(screenshotBase64, question) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: question
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${screenshotBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('خطأ في تحليل الصورة:', error.message);
      return null;
    }
  }
}

module.exports = AIHelper;

