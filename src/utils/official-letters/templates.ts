/**
 * قوالب الترويسة والتوقيع للكتب الرسمية
 */

import { COMPANY_INFO } from './shared';

/**
 * توليد ترويسة الكتاب الرسمي
 */
export function generateOfficialHeader(refNumber: string, currentDate: string): string {
  return `
    <!-- الترويسة -->
    <div class="header">
      <div class="company-ar">
        <h1>${COMPANY_INFO.name_ar}</h1>
        <p>ذ.م.م</p>
        <p>${COMPANY_INFO.cr}</p>
      </div>
      
      <div class="logo-container">
        <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" />
      </div>
      
      <div class="company-en" dir="ltr">
        <h1>${COMPANY_INFO.name_en}</h1>
        <p>C.R: 146832</p>
      </div>
    </div>
    
    <!-- العنوان -->
    <div class="address-bar">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
    </div>
    
    <!-- التاريخ والرقم المرجعي -->
    <div class="ref-date">
      <div><strong>الرقم المرجعي:</strong> ${refNumber}</div>
      <div><strong>التاريخ:</strong> ${currentDate}</div>
    </div>
  `;
}

/**
 * توليد قسم التوقيع مع الختم والتوقيع الفعلي
 */
export function generateSignatureSection(): string {
  return `
    <div style="page-break-inside: avoid;">
      <!-- الختام -->
      <div class="closing">
        <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
      </div>
      
      <!-- التوقيع والختم -->
      <table style="width: 100%; margin-top: 15px; border: none;">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: bottom; border: none; padding: 10px;">
            <!-- الختم -->
            <img src="/receipts/stamp.png" alt="ختم الشركة" 
                 style="width: 120px; height: 120px; object-fit: contain; transform: rotate(-5deg);"
                 onerror="this.style.display='none'" />
          </td>
          <td style="width: 50%; text-align: center; vertical-align: bottom; border: none; padding: 10px;">
            <!-- التوقيع ومعلومات الموقع -->
            <p style="color: #1e3a5f; font-weight: bold; font-size: 14px; margin: 0 0 5px 0;">${COMPANY_INFO.name_ar}</p>
            <img src="/receipts/signature.png" alt="التوقيع" 
                 style="width: 100px; height: 40px; object-fit: contain;"
                 onerror="this.style.display='none'" />
            <div style="border-top: 1px solid #1e3a5f; padding-top: 5px; margin-top: 5px;">
              <p style="font-size: 13px; font-weight: bold; color: #000; margin: 0;">${COMPANY_INFO.authorized_signatory}</p>
              <p style="font-size: 10px; color: #555; margin: 2px 0 0 0;">${COMPANY_INFO.authorized_title}</p>
            </div>
          </td>
        </tr>
      </table>
      
      <!-- الذيل -->
      <div class="footer">
        ${COMPANY_INFO.address}<br/>
        هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
      </div>
    </div>
  `;
}
