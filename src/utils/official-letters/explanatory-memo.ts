/**
 * توليد المذكرة الشارحة للدعوى
 */

import { generateRefNumber, formatDateAr } from './shared';
import { generateOfficialLetter } from './official-letter';
import type { ExplanatoryMemoData } from './types';

/**
 * توليد مذكرة شارحة للدعوى
 * النص مطابق للمذكرة المستخدمة في صفحة العملاء المتأخرين
 */
export function generateExplanatoryMemoHtml(data: ExplanatoryMemoData): string {
  const refNumber = generateRefNumber();
  const currentDate = formatDateAr();

  // حساب المبالغ
  const overdueRent = data.overdueRent || 0;
  const latePenalty = data.latePenalty || 0;
  const damagesAmount = data.damages || Math.round(data.amount * 0.3);
  const totalClaim = overdueRent + latePenalty + damagesAmount;
  const monthlyRent = data.monthlyRent || 0;
  const daysOverdue = data.daysOverdue || 0;
  const monthsUnpaid = data.monthsUnpaid || 0;
  const violationsCount = data.violationsCount || 0;
  const violationsAmount = data.violationsAmount || 0;
  const hasViolations = data.hasViolations || violationsCount > 0;

  // توليد نص الوقائع المفصل
  let factsText = `أبرمت الشركة عقد إيجار مركبة رقم (${data.contractNumber})${data.contractStartDate ? ` بتاريخ ${data.contractStartDate}` : ''} مع المدعى عليه، التزم بموجبه بدفع الإيجار الشهري${monthlyRent > 0 ? ` البالغ (${monthlyRent.toLocaleString('ar-QA')}) ريال قطري` : ''} والمحافظة على المركبة${data.vehiclePlate ? ` رقم (${data.vehiclePlate})` : ''}${data.vehicleInfo ? ` ${data.vehicleInfo}` : ''} وسداد جميع الالتزامات المترتبة على استخدامها.\r\n\r\nإلا أن المدعى عليه أخلَّ بهذه الالتزامات إخلالاً واضحًا، إذ تأخر في سداد الإيجارات المستحقة${monthsUnpaid > 0 ? ` لمدة (${monthsUnpaid}) شهر` : ''}${daysOverdue > 0 ? `، بإجمالي (${daysOverdue}) يوم تأخير` : ''}${hasViolations ? `، وسُجلت على المركبة (${violationsCount}) مخالفة مرورية بقيمة إجمالية (${violationsAmount.toLocaleString('ar-QA')}) ريال قطري ناتجة عن استخدامه الشخصي` : ''}، ورفض تسليم المركبة وسداد المستحقات دون مبرر مشروع.`;

  if (hasViolations) {
    factsText += `\r\n\r\nونظرًا لأن المخالفات المرورية تصدر باسم مالك المركبة (الشركة) بحكم النظام، فإن الشركة لا تطلب من عدالتكم الموقرة إلزام المدعى عليه بسداد قيمتها نقدًا، وإنما تلتمس تحويل هذه المخالفات رسميًا على رقمه الشخصي باعتباره السائق والمستخدم الفعلي للمركبة وقت وقوعها، وذلك استنادًا إلى سجلات المخالفات الصادرة من الإدارة العامة للمرور.`;
  }

  // توليد جدول المطالبات المالية
  const claimsTable = `\r\n┌─────────────────────────────────────────────────────────────────┐\r\n│ البند │ البيان                                      │ المبلغ (ر.ق) │\r\n├───────┼─────────────────────────────────────────────┼──────────────┤\r\n│   1   │ غرامات تأخير في سداد الإيجار الشهري         │ ${latePenalty.toLocaleString('ar-QA').padStart(12, ' ')} │\r\n│   2   │ إيجار متأخر غير مسدد                        │ ${overdueRent.toLocaleString('ar-QA').padStart(12, ' ')} │\r\n│   3   │ تعويض عن الأضرار المادية والمعنوية          │ ${damagesAmount.toLocaleString('ar-QA').padStart(12, ' ')} │\r\n├───────┼─────────────────────────────────────────────┼──────────────┤\r\n│       │ الإجمالي                                    │ ${(totalClaim > 0 ? totalClaim : data.amount).toLocaleString('ar-QA').padStart(12, ' ')} │\r\n└─────────────────────────────────────────────────────────────────┘`;

  // توليد نص الطلبات المفصل
  let requestsText = `1. إلزام المدعى عليه بسداد المبلغ الإجمالي وقدره (${(totalClaim > 0 ? totalClaim : data.amount).toLocaleString('ar-QA')} ريال قطري).`;
  
  if (hasViolations) {
    requestsText += `\r\n2. إصدار أمر بتحويل جميع المخالفات المرورية المسجلة على المركبة خلال فترة الإيجار إلى الرقم الشخصي للمدعى عليه${data.defendantIdNumber ? ` (${data.defendantIdNumber})` : ''}.\r\n3. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.`;
  } else {
    requestsText += `\r\n2. تحميل المدعى عليه رسوم الدعوى والمصاريف وأتعاب المحاماة.`;
  }

  // توليد المحتوى الكامل للمذكرة
  let body = `\r\nأولاً: الوقائع\r\n\r\n${factsText}\r\n\r\nثانياً: المطالبات المالية المباشرة\r\n\r\n${claimsTable}\r\n\r\nالإجمالي: ${(totalClaim > 0 ? totalClaim : data.amount).toLocaleString('ar-QA')} ريال قطري\r\n(${data.amountInWords})\r\n`;

  if (hasViolations) {
    body += `\r\nثالثاً: الطلب المتعلق بالمخالفات المرورية\r\n\r\nتلتمس الشركة من عدالتكم الموقرة عدم إدخال قيمة المخالفات المرورية ضمن المطالبة المالية، والاكتفاء بإصدار أمر بتحويلها إلى الرقم الشخصي للمدعى عليه${data.defendantIdNumber ? ` (${data.defendantIdNumber})` : ''} لدى الإدارة العامة للمرور، وذلك لتجنب تحميل الشركة ما لا يلزمها به القانون، إذ أن المخالفات ناتجة عن تصرفات المستأجر لا عن مالك المركبة.\r\n\r\nعدد المخالفات: ${violationsCount} مخالفة\r\nقيمة المخالفات: ${violationsAmount.toLocaleString('ar-QA')} ريال قطري\r\n\r\nرابعاً: الأساس القانوني\r\n`;
  } else {
    body += `\r\nثالثاً: الأساس القانوني\r\n`;
  }

  body += `\r\nتستند هذه الدعوى إلى أحكام القانون المدني القطري، ولا سيما المواد:\r\n\r\n• المادة (171): العقد شريعة المتعاقدين، ولا يجوز نقضه أو تعديله إلا باتفاق الطرفين أو للأسباب التي يقرها القانون.\r\n\r\n• المادة (263): يلتزم المدين بتعويض الضرر الناتج عن إخلاله بالتزامه.\r\n\r\n• المادة (589): يلتزم المستأجر بالمحافظة على العين المؤجرة وردها بالحالة التي تسلمها بها.\r\n\r\n• المادة (267): يقدر التعويض بقدر الضرر المباشر المتوقع عادة وقت التعاقد.\r\n\r\nوبناءً عليه، فإن المطالبات المالية الواردة أعلاه هي عن التزامات تعاقدية مباشرة، في حين أن الغرامات المرورية ينبغي أن تُحوّل إداريًا إلى المستأجر.\r\n\r\n${hasViolations ? 'خامساً' : 'رابعاً'}: الطلبات\r\n\r\nتلتمس الشركة من عدالتكم الموقرة ما يلي:\r\n\r\n${requestsText}\r\n  `.trim();

  // تجهيز قائمة المرفقات
  const attachments = [
    'صورة من عقد الإيجار',
    'صورة من السجل التجاري',
    'شهادة IBAN',
    'كشف بالمطالبات المالية',
  ];
  
  // إضافة كشف المخالفات المرورية إن وجدت
  if (hasViolations) {
    attachments.push('كشف بالمخالفات المرورية');
  }

  return generateOfficialLetter({
    recipient: 'المحكمة المدنية الابتدائية',
    recipientGreeting: 'حفظها الله',
    subject: `مذكرة شارحة - مطالبة مالية${hasViolations ? ' وتحويل الغرامات المرورية إلى الرقم الشخصي للمستأجر' : ''}`,
    body,
    refNumber,
    attachments,
  });
}
