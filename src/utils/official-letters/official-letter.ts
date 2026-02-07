/**
 * توليد كتاب رسمي موحد
 */

import { COMPANY_INFO, generateRefNumber, formatDateAr } from './shared';
import { getOfficialLetterStyles } from './styles';
import { generateOfficialHeader, generateSignatureSection } from './templates';
import type { OfficialLetterData } from './types';

/**
 * توليد كتاب رسمي موحد
 */
export function generateOfficialLetter(data: OfficialLetterData): string {
  const refNumber = data.refNumber || generateRefNumber();
  const currentDate = formatDateAr(data.date);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كتاب رسمي - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> ${data.recipient}</p>
      ${data.recipientGreeting ? `<p class="greeting">${data.recipientGreeting}</p>` : ''}
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>${data.subject}
    </div>
    
    <!-- المقدمة -->
    <p class="intro">
      نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إليكم بهذا الكتاب الرسمي بخصوص الموضوع المذكور أعلاه، ونفيدكم بالآتي:
    </p>
    
    <!-- المحتوى -->
    <div class="content">
      ${data.body.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
    </div>
    
    ${data.attachments && data.attachments.length > 0 ? `
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        ${data.attachments.map(att => `<li>${att}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}
