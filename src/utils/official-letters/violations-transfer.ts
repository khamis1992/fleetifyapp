/**
 * توليد طلب تحويل المخالفات المرورية وبلاغ جنائي بالامتناع عن رد المركبة
 */

import { COMPANY_INFO, generateRefNumber, formatDateAr } from './shared';
import { getOfficialLetterStyles } from './styles';
import { generateOfficialHeader, generateSignatureSection } from './templates';
import type { ViolationsTransferData, CriminalComplaintData } from './types';

/**
 * توليد طلب تحويل المخالفات المرورية
 */
export function generateViolationsTransferHtml(data: ViolationsTransferData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طلب تحويل مخالفات مرورية - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> سعادة رئيس نيابة المرور</p>
      <p style="margin-right: 40px;">النيابة العامة</p>
      <p style="margin-right: 40px;">الدوحة - دولة قطر</p>
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>طلب تحويل مخالفات مرورية من مالك المركبة إلى المستأجر
    </div>
    
    <!-- المقدمة -->
    <div class="content">
      <p>
        نحن <strong>${COMPANY_INFO.name_ar}</strong>، نتقدم إلى سعادتكم بطلب تحويل المخالفات المرورية المسجلة على المركبة المملوكة لشركتنا إلى المستأجر الذي كان يقودها وقت ارتكاب المخالفات، وذلك استناداً إلى عقد الإيجار المبرم بيننا.
      </p>
    </div>
    
    <!-- بيانات المستأجر -->
    <div class="info-box">
      <div class="section-title">بيانات المستأجر (المسؤول عن المخالفات)</div>
      <div class="info-row">
        <span class="info-label">الاسم:</span>
        <span>${data.customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerId}</span>
      </div>
      ${data.customerMobile ? `
      <div class="info-row">
        <span class="info-label">رقم الجوال:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerMobile}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- بيانات العقد والمركبة -->
    <div class="info-box">
      <div class="section-title">بيانات العقد والمركبة</div>
      <div class="info-row">
        <span class="info-label">رقم العقد:</span>
        <span>${data.contractNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">فترة العقد:</span>
        <span>${data.contractDate} - ${data.contractEndDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">نوع المركبة:</span>
        <span>${data.vehicleType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم اللوحة:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.plateNumber}</span>
      </div>
    </div>
    
    <!-- جدول المخالفات -->
    <div class="section">
      <div class="section-title">المخالفات المطلوب تحويلها</div>
      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>رقم المخالفة</th>
            <th>تاريخ المخالفة</th>
            <th>نوع المخالفة</th>
            <th>المبلغ (ر.ق)</th>
          </tr>
        </thead>
        <tbody>
          ${data.violations.map((v, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${v.violationNumber}</td>
              <td>${v.violationDate}</td>
              <td>${v.violationType}</td>
              <td style="direction: ltr; unicode-bidi: embed;">${v.fineAmount.toLocaleString('en-US')}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4"><strong>إجمالي المخالفات</strong></td>
            <td style="direction: ltr; unicode-bidi: embed;"><strong>${data.totalFines.toLocaleString('en-US')} ر.ق</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- السند القانوني -->
    <div class="content">
      <p>
        <strong>السند القانوني:</strong> استناداً إلى المادة (3) من قانون المرور القطري رقم (19) لسنة 2007 والتي تنص على أن "مستعمل المركبة يكون مسؤولاً عن المخالفات التي ترتكب أثناء استعماله لها"، وحيث أن المخالفات المذكورة أعلاه قد ارتكبت خلال فترة الإيجار من قبل المستأجر المذكور، فإننا نطلب تحويل هذه المخالفات إلى اسمه.
      </p>
    </div>
    
    <!-- الطلب -->
    <div class="section">
      <div class="section-title">الطلب</div>
      <div class="content" style="margin-top: 0;">
        <p>
          نرجو من سعادتكم التكرم بالموافقة على تحويل المخالفات المرورية المذكورة أعلاه من سجل الشركة إلى سجل المستأجر المذكور، مع إرفاق نسخة من عقد الإيجار كإثبات.
        </p>
      </div>
    </div>
    
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        <li>صورة من عقد الإيجار</li>
        <li>صورة من الهوية الشخصية للمستأجر</li>
        <li>كشف بالمخالفات المرورية</li>
      </ul>
    </div>
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}

/**
 * توليد بلاغ جنائي بواقعة امتناع عن تسليم مركبة
 */
export function generateCriminalComplaintHtml(data: CriminalComplaintData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بلاغ جنائي - ${COMPANY_INFO.name_ar}</title>
  <style>${getOfficialLetterStyles()}</style>
</head>
<body>
  <div class="letter-container">
    ${generateOfficialHeader(refNumber, currentDate)}
    
    <!-- المرسل إليه -->
    <div class="recipient-box">
      <p><strong>إلى / </strong> السيد / رئيس النيابة العامة</p>
      <p style="margin-right: 40px;">الدوحة - دولة قطر</p>
    </div>
    
    <!-- التحية -->
    <p class="salutation">السلام عليكم ورحمة الله وبركاته،</p>
    <p class="salutation" style="margin-top: 0;">تحية طيبة وبعد،،،</p>
    
    <!-- الموضوع -->
    <div class="subject-box">
      <strong>الموضوع: </strong>بلاغ جنائي بواقعة امتناع عن تسليم مركبة بعد انتهاء عقد الإيجار
    </div>
    
    <!-- بيانات المشكو في حقه -->
    <div class="info-box">
      <div class="section-title">بيانات المشكو في حقه</div>
      <div class="info-row">
        <span class="info-label">الاسم:</span>
        <span>${data.customerName}</span>
      </div>
      ${data.customerNationality ? `
      <div class="info-row">
        <span class="info-label">الجنسية:</span>
        <span>${data.customerNationality}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerId}</span>
      </div>
      ${data.customerMobile ? `
      <div class="info-row">
        <span class="info-label">رقم الجوال:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.customerMobile}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- بيانات المركبة -->
    <div class="info-box">
      <div class="section-title">بيانات المركبة</div>
      <div class="info-row">
        <span class="info-label">نوع المركبة:</span>
        <span>${data.vehicleType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم اللوحة:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.plateNumber}</span>
      </div>
      ${data.plateType ? `
      <div class="info-row">
        <span class="info-label">نوع اللوحة:</span>
        <span>${data.plateType}</span>
      </div>
      ` : ''}
      ${data.manufactureYear ? `
      <div class="info-row">
        <span class="info-label">سنة الصنع:</span>
        <span>${data.manufactureYear}</span>
      </div>
      ` : ''}
      ${data.chassisNumber ? `
      <div class="info-row">
        <span class="info-label">رقم الشاسيه:</span>
        <span style="direction: ltr; unicode-bidi: embed;">${data.chassisNumber}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- الوقائع -->
    <div class="content">
      <p>
        نتقدم إلى سعادتكم بهذا البلاغ ضد الشخص المذكور أعلاه، حيث قام باستئجار مركبة من شركتنا بموجب عقد إيجار قانوني مؤرخ بتاريخ <strong>${data.contractDate}</strong>، وانتهت مدة العقد بتاريخ <strong>${data.contractEndDate}</strong>، إلا أنه امتنع عن تسليم المركبة رغم انتهاء العلاقة التعاقدية.
      </p>
      <p>
        ورغم محاولاتنا المتكررة للتواصل معه ومطالبته بإعادة المركبة بالطرق الودية والرسمية، فقد رفض تسليمها دون أي مسوغ قانوني، ولا تزال المركبة بحوزته حتى تاريخه، الأمر الذي يشكل تعدياً على حقوق الشركة وضرراً مادياً مباشراً.
      </p>
      <p>
        ويُعد هذا التصرف استيلاءً غير مشروع على مال مملوك للغير، وإساءة استعمال للثقة، واحتفاظاً بالمركبة دون وجه حق بعد انتهاء سبب الحيازة القانونية.
      </p>
    </div>
    
    <!-- السند القانوني -->
    <div class="section">
      <div class="section-title" style="background: #1e3a5f;">السند القانوني</div>
      <table>
        <thead>
          <tr>
            <th>القانون</th>
            <th>المادة</th>
            <th>التهمة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>قانون العقوبات القطري</td>
            <td>المادة (321)</td>
            <td>جريمة خيانة الأمانة - الاستيلاء على مال منقول مملوك للغير</td>
          </tr>
          <tr>
            <td>قانون العقوبات القطري</td>
            <td>المادة (324)</td>
            <td>إساءة استعمال الأمانة - الاحتفاظ بالمركبة بعد انتهاء سبب الحيازة</td>
          </tr>
          <tr>
            <td>قانون العقوبات القطري</td>
            <td>المادة (333)</td>
            <td>الاستيلاء غير المشروع على مال منقول</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- الطلبات -->
    <div class="section">
      <div class="section-title">الطلبات</div>
      <ol style="margin: 15px 30px; line-height: 2;">
        <li>قيد البلاغ ضد المشكو في حقه بالوصف القانوني الصحيح</li>
        <li>إصدار أمر بضبط وإحضار المركبة</li>
        <li>اتخاذ الإجراءات الجزائية اللازمة بحق المتهم</li>
        <li>إلزام المتهم بإعادة المركبة وتعويض الشركة عن كافة الأضرار</li>
      </ol>
    </div>
    
    <!-- المرفقات -->
    <div class="attachments">
      <strong>📎 المرفقات:</strong>
      <ul>
        <li>صورة من عقد الإيجار</li>
        <li>صورة من البطاقة الشخصية للمستأجر</li>
        <li>ما يثبت المطالبة بإعادة المركبة (مراسلات / إشعارات)</li>
      </ul>
    </div>
    
    ${generateSignatureSection()}
  </div>
</body>
</html>
  `;
}
