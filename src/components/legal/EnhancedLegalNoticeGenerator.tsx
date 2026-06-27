import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Copy, Download, FileJson, Printer, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { NoticeAutoFiller } from './NoticeAutoFiller';
import { NoticeTemplates, getTemplateList, type NoticeVariables } from './NoticeTemplateManager';

interface EnhancedLegalNoticeGeneratorProps {
  companyId: string;
  onDocumentGenerated?: (document: { content: string; type: string; variables: NoticeVariables }) => void;
}

const APP_FAVICON_PATH = '/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png';

const getAbsoluteAssetUrl = (path: string) => {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char] || char));

const formatNoticeDate = (value?: string) => {
  if (!value) return new Date().toLocaleDateString('ar-QA');
  return new Date(value).toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getOfficialNoticeStyles = () => `
  @page { size: A4; margin: 15mm 20mm 20mm 20mm; }
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body { margin: 0; padding: 0; }
    .letter-container {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
    table, tr, .content, .section, .info-section, .claims-section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
  }
  body {
    font-family: 'Times New Roman (Headings CS)', 'Times New Roman', serif;
    font-size: 14px;
    line-height: 1.8;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 20px;
    direction: rtl;
  }
  .letter-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 20px 30px;
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
  .company-ar h1 {
    color: #1e3a5f;
    margin: 0;
    font-size: 20px;
    font-weight: bold;
  }
  .company-ar p { color: #000; margin: 2px 0; font-size: 11px; }
  .logo-container {
    flex: 0 0 180px;
    text-align: center;
    padding: 0 15px;
  }
  .logo-container img {
    max-height: 140px;
    max-width: 240px;
    width: auto;
    height: auto;
  }
  .company-en { flex: 1; text-align: left; }
  .company-en h1 {
    color: #1e3a5f;
    margin: 0;
    font-size: 14px;
    font-weight: bold;
  }
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
  .subject-box {
    background: #1e3a5f;
    color: #fff;
    padding: 10px 15px;
    margin-bottom: 20px;
    font-size: 14px;
    text-align: center;
  }
  .info-box {
    background: #f5f5f5;
    padding: 10px 15px;
    margin-bottom: 15px;
    border-radius: 5px;
    border-right: 4px solid #1e3a5f;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 4px;
    line-height: 1.4;
  }
  .info-label {
    font-weight: bold;
    color: #555;
    min-width: 100px;
  }
  .section { margin: 20px 0; }
  .section-title {
    font-weight: bold;
    color: #1e3a5f;
    font-size: 16px;
    margin-bottom: 10px;
    text-decoration: underline;
  }
  .section-content {
    padding: 15px;
    background: #fafafa;
    border: 1px solid #e0e0e0;
  }
  .section-content p {
    margin: 10px 0;
    line-height: 2;
    text-align: justify;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #333;
    padding: 10px 8px;
    text-align: right;
  }
  th {
    background: #1e3a5f;
    color: white;
    font-weight: bold;
  }
  tr:nth-child(even) { background: #f9f9f9; }
  .amount {
    font-weight: bold;
    color: #d32f2f;
    text-align: left;
    direction: ltr;
  }
  .total-row {
    background: #1e3a5f !important;
    color: white;
    font-weight: bold;
  }
  .total-row td { border-color: #1e3a5f; }
  .center { text-align: center; }
  .requests-list { counter-reset: request; }
  .request-item {
    margin-bottom: 10px;
    padding-right: 25px;
    position: relative;
  }
  .request-item::before {
    content: counter(request) ".";
    counter-increment: request;
    position: absolute;
    right: 0;
    font-weight: bold;
    color: #1e3a5f;
  }
  .closing {
    text-align: center;
    margin: 25px 0;
    font-size: 14px;
    color: #000;
  }
  .footer {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #ccc;
    text-align: center;
    font-size: 9px;
    color: #000;
  }
`;

const buildOfficialNoticeBody = (content: string, vars: NoticeVariables, title: string) => {
  const isDuplicateHeaderLine = (line: string) => {
    const normalizedLine = line.replace(/\s+/g, ' ').trim();
    const normalizedTitle = title.replace(/\s+/g, ' ').trim();
    const companyNames = [
      vars.companyNameAr,
      vars.companyName,
      `${vars.companyNameAr} – ذ.م.م`,
      `${vars.companyNameAr} ذ.م.م`,
    ].filter(Boolean).map((value) => value.replace(/\s+/g, ' ').trim());

    if (companyNames.includes(normalizedLine)) return true;
    if (normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine)) return true;
    if (normalizedLine.includes(vars.documentNumber)) return true;
    if (vars.commercialRegNo && normalizedLine.includes(vars.commercialRegNo) && /السجل|C\.?R/i.test(normalizedLine)) return true;
    if (vars.companyEmail && normalizedLine.includes(vars.companyEmail)) return true;
    if (vars.companyPhone && normalizedLine.includes(vars.companyPhone)) return true;
    if (vars.companyAddress && normalizedLine.includes(vars.companyAddress.replace(/\s+/g, ' ').trim())) return true;

    return /^(السجل التجاري|العنوان|الهاتف|البريد الإلكتروني|رقم الوثيقة|تاريخ الإصدار)\s*:/.test(normalizedLine)
      || /^(إلى\s*\/|السيد\/السادة|السيد|السادة)\s*/.test(normalizedLine)
      || /^(الطرف الأول|الطرف الثاني|المدعي|المدعى عليه)\s*:/.test(normalizedLine);
  };

  const cleanLines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isDuplicateHeaderLine(line));

  const paragraphs = cleanLines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
  const invoiceRows = vars.invoiceNumbers.map((number, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>فاتورة رقم ${escapeHtml(number)} بتاريخ ${escapeHtml(formatNoticeDate(vars.invoiceDates[index]))}</td>
      <td class="amount">${(vars.invoiceAmounts[index] || 0).toLocaleString('en-US')}</td>
    </tr>
  `).join('');

  return `
    <div class="letter-container">
      <div class="header">
        <div class="company-ar">
          <h1>${escapeHtml(vars.companyNameAr)}</h1>
          <p>ذ.م.م</p>
          <p>س.ت: ${escapeHtml(vars.commercialRegNo || '-')}</p>
        </div>
        <div class="logo-container">
          <img src="${escapeHtml(vars.companyLogoUrl || '/receipts/logo.png')}" alt="شعار الشركة" onerror="this.style.display='none'" />
        </div>
        <div class="company-en" dir="ltr">
          <h1>${escapeHtml(vars.companyName || 'AL-ARAF CAR RENTAL L.L.C')}</h1>
          <p>C.R: ${escapeHtml(vars.commercialRegNo || '-')}</p>
        </div>
      </div>

      <div class="address-bar">
        ${escapeHtml(vars.companyAddress || '-')}<br/>
        هاتف: ${escapeHtml(vars.companyPhone || '-')} | البريد الإلكتروني: ${escapeHtml(vars.companyEmail || '-')}
      </div>

      <div class="ref-date">
        <div><strong>الرقم المرجعي:</strong> ${escapeHtml(vars.documentNumber)}</div>
        <div><strong>التاريخ:</strong> ${formatNoticeDate(vars.dateIssued)}</div>
      </div>

      <div class="subject-box">
        <strong>${escapeHtml(title)}</strong><br>
        <span style="font-size: 12px;">مطالبة بسداد مديونية بالريال القطري قبل اتخاذ الإجراءات القانونية</span>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="info-label">الطرف الأول:</span>
          <span>${escapeHtml(vars.companyNameAr)} – ذ.م.م</span>
        </div>
        <div class="info-row">
          <span class="info-label">الطرف الثاني:</span>
          <span>${escapeHtml(vars.customerName || '-')}</span>
        </div>
        ${vars.nationalId ? `
        <div class="info-row">
          <span class="info-label">رقم الهوية:</span>
          <span>${escapeHtml(vars.nationalId)}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">رقم العقد:</span>
          <span>${escapeHtml(vars.contractNumber || '-')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">موضوع المستند:</span>
          <span>مطالبة مالية وإنذار بالسداد</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">أولاً: بيانات المطالبة المالية</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">البند</th>
              <th>البيان</th>
              <th style="width: 130px;">المبلغ (ر.ق)</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRows}
            ${vars.lateFees > 0 ? `
            <tr>
              <td class="center">${vars.invoiceNumbers.length + 1}</td>
              <td>غرامات أو رسوم تأخير</td>
              <td class="amount">${vars.lateFees.toLocaleString('en-US')}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="2" style="text-align: left; font-weight: bold;">الإجمالي المستحق</td>
              <td class="amount" style="font-size: 15px; color: white;">${vars.totalDebt.toLocaleString('en-US')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">ثانياً: نص الإنذار</div>
        <div class="section-content">
          ${paragraphs}
        </div>
      </div>

      <div class="section">
        <div class="section-title">ثالثاً: الطلبات</div>
        <div class="section-content">
          <p>بناءً على ما تقدم، تطلب الشركة من الطرف الثاني ما يلي:</p>
          <div class="requests-list">
            <div class="request-item">سداد كامل المبلغ المستحق الموضح في جدول المطالبة المالية أعلاه.</div>
            <div class="request-item">السداد خلال مدة لا تتجاوز <strong>(${vars.deadlineDays})</strong> أيام من تاريخ هذا المستند.</div>
            <div class="request-item">التواصل مع إدارة التحصيل لترتيب السداد أو التسوية قبل اتخاذ الإجراءات القانونية.</div>
          </div>
        </div>
      </div>

      <div class="closing">
        <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
      </div>

      <table style="width: 100%; margin-top: 15px; border: none; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: bottom; border: none; padding: 10px;">
            <img src="/receipts/stamp.png" alt="ختم الشركة"
                 style="width: 130px; height: 130px; object-fit: contain; transform: rotate(-5deg);"
                 onerror="this.style.display='none'" />
          </td>
          <td style="width: 50%; text-align: center; vertical-align: bottom; border: none; padding: 10px;">
            <p style="color: #1e3a5f; font-weight: bold; font-size: 15px; margin: 0 0 10px 0;">${escapeHtml(vars.companyNameAr)}</p>
            <img src="/receipts/signature.png" alt="التوقيع"
                 style="width: 120px; height: 50px; object-fit: contain; display: block; margin: 0 auto 10px auto;"
                 onerror="this.style.display='none'" />
            <div style="border-top: 2px solid #1e3a5f; padding-top: 8px; min-width: 200px;">
              <p style="font-size: 14px; font-weight: bold; color: #000; margin: 0;">${escapeHtml(vars.companyRepName || 'إدارة التحصيل')}</p>
              <p style="font-size: 11px; color: #555; margin: 3px 0 0 0;">${escapeHtml(vars.companyRepTitle || 'المخول بالتوقيع')}</p>
            </div>
          </td>
        </tr>
      </table>

      <div class="footer">
        ${escapeHtml(vars.companyAddress || '-')}<br/>
        هاتف: ${escapeHtml(vars.companyPhone || '-')} | البريد: ${escapeHtml(vars.companyEmail || '-')}
      </div>
    </div>
  `;
};

const buildOfficialNoticeHtml = (content: string, vars: NoticeVariables, title: string) => {
  const faviconUrl = getAbsoluteAssetUrl(APP_FAVICON_PATH);

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="${faviconUrl}" type="image/png" />
  <link rel="shortcut icon" href="${faviconUrl}" type="image/png" />
  <link rel="apple-touch-icon" href="${faviconUrl}" />
  <style>${getOfficialNoticeStyles()}</style>
</head>
<body>
  ${buildOfficialNoticeBody(content, vars, title)}
</body>
</html>`;
};

const templateKeyMap: Record<string, keyof typeof NoticeTemplates> = {
  pre_warning: 'preWarning',
  final_demand: 'finalDemand',
  court_filing: 'courtFiling',
  payment_acknowledgment: 'paymentAcknowledgment',
};

export const EnhancedLegalNoticeGenerator: React.FC<EnhancedLegalNoticeGeneratorProps> = ({ companyId,
  onDocumentGenerated, }) => {
  const [noticeVariables, setNoticeVariables] = useState<NoticeVariables | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('pre_warning');
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeStep, setActiveStep] = useState<'setup' | 'preview'>('setup');

  const templates = getTemplateList();
  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);
  const documentTitle = selectedTemplateObj?.nameAr || 'وثيقة قانونية';
  const officialPreviewHtml = noticeVariables && generatedContent
    ? buildOfficialNoticeHtml(generatedContent, noticeVariables, documentTitle)
    : '';

  const generateDocument = (variablesOverride?: NoticeVariables) => {
    const variables = variablesOverride || noticeVariables;
    if (!variables) {
      toast.error('يرجى ملء البيانات أولاً');
      return;
    }

    try {
      const templateKey = templateKeyMap[selectedTemplate] || selectedTemplate;
      const templateRenderer = NoticeTemplates[templateKey as keyof typeof NoticeTemplates] || NoticeTemplates.preWarning;
      const content = templateRenderer(variables);

      setNoticeVariables(variables);
      setGeneratedContent(content);
      setActiveStep('preview');

      if (onDocumentGenerated) {
        onDocumentGenerated({
          content,
          type: selectedTemplate,
          variables,
        });
      }

      toast.success('تم إنشاء الوثيقة بنجاح');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('حدث خطأ في إنشاء الوثيقة');
    }
  };

  const handleCopyDocument = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    toast.success('تم نسخ الوثيقة');
  };

  const handleDownloadText = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل الوثيقة');
  };

  const handlePrint = () => {
    if (!generatedContent || !noticeVariables) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(buildOfficialNoticeHtml(generatedContent, noticeVariables, documentTitle));
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleVariablesReady = (variables: NoticeVariables) => {
    generateDocument(variables);
  };

  if (!companyId) {
    return (
      <Card className="legal-panel">
        <CardContent className="p-6 text-sm text-[#64748B]">
          جاري تحميل بيانات الشركة...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="legal-system space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="legal-panel p-4">
          <div className="text-xs font-semibold text-[#64748B]">الخدمة</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#020617]">
            <CheckCircle2 className="h-4 w-4 text-[#22C7A1]" />
            مولد الإنذارات جاهز
          </div>
        </div>
        <div className="legal-panel p-4">
          <div className="text-xs font-semibold text-[#64748B]">البيانات</div>
          <div className="mt-2 text-sm font-semibold text-[#020617]">
            {noticeVariables ? 'تم تجهيز بيانات العميل' : 'بانتظار اختيار العميل والفواتير'}
          </div>
        </div>
        <div className="legal-panel p-4">
          <div className="text-xs font-semibold text-[#64748B]">الوثيقة</div>
          <div className="mt-2 text-sm font-semibold text-[#020617]">
            {generatedContent ? 'جاهزة للمعاينة والتصدير' : 'لم يتم إنشاؤها بعد'}
          </div>
        </div>
      </div>

      <Tabs value={activeStep} onValueChange={(value) => setActiveStep(value as 'setup' | 'preview')} className="w-full">
        <TabsList className="legal-tabbar grid w-full grid-cols-2">
          <TabsTrigger value="setup">إعداد الوثيقة</TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedContent}>
            معاينة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* Template Selection */}
          <Card className="legal-panel">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>اختر نوع الوثيقة</CardTitle>
                  <CardDescription>حدد نوع الخطاب أو القالب القانوني المناسب للحالة</CardDescription>
                </div>
                <Badge variant="secondary">{templates.length} قوالب</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`rounded-lg border p-4 text-right transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-[#38BDF8] bg-[#38BDF8]/10'
                        : 'border-[#E5EAF1] hover:border-[#38BDF8]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#020617]">{template.nameAr}</div>
                        <div className="text-sm text-muted-foreground mt-1">{template.description}</div>
                      </div>
                      {template.daysOverdue > 0 && (
                        <Badge variant="secondary">يوم +{template.daysOverdue}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auto-Fill Section */}
          <NoticeAutoFiller
            companyId={companyId}
            selectedTemplate={selectedTemplate}
            onVariablesReady={handleVariablesReady}
          />

          {/* Manual Edit Option */}
          {noticeVariables && (
            <Card className="legal-panel">
              <CardHeader>
                <CardTitle>البيانات المملوءة</CardTitle>
                <CardDescription>تم جمع البيانات من النظام تلقائياً</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">العميل</div>
                    <div className="font-semibold">{noticeVariables.customerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">المبلغ الكلي</div>
                    <div className="font-semibold">
                      {noticeVariables.totalDebt.toLocaleString('ar-QA')} ر.ق
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">أيام التأخير</div>
                    <div className="font-semibold">{noticeVariables.daysOverdue} يوم</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">مهلة السداد</div>
                    <div className="font-semibold">{noticeVariables.deadlineDays} أيام</div>
                  </div>
                </div>

                <Button onClick={() => generateDocument()} size="lg" className="legal-action-primary w-full">
                  <Sparkles className="ml-2 h-4 w-4" />
                  إنشاء الوثيقة
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {generatedContent && (
            <>
              {/* Document Preview */}
              <Card className="legal-panel">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>معاينة الوثيقة</CardTitle>
                    <CardDescription>
                      {selectedTemplateObj?.nameAr || 'وثيقة'}
                    </CardDescription>
                  </div>
                  {selectedTemplateObj && selectedTemplateObj.daysOverdue > 0 && (
                    <Badge>يوم +{selectedTemplateObj.daysOverdue}</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[#020617]">تحرير نص الوثيقة</div>
                        <div className="text-xs text-[#64748B]">
                          يمكنك تعديل الصياغة هنا قبل النسخ أو التحميل أو الطباعة.
                        </div>
                      </div>
                      <Badge variant="secondary">قابل للتعديل</Badge>
                    </div>
                    <Textarea
                      dir="rtl"
                      value={generatedContent}
                      onChange={(event) => setGeneratedContent(event.target.value)}
                      className="min-h-[520px] resize-y rounded-lg border-[#E5EAF1] bg-white font-[Cairo,Arial,sans-serif] text-sm leading-8 text-[#020617] focus:border-[#38BDF8] focus:ring-[#38BDF8]/20"
                    />
                  </div>

                  <div className="mt-5 rounded-lg border border-[#E5EAF1] bg-[#EEF2F7] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#020617]">المعاينة الرسمية</div>
                        <div className="text-xs text-[#64748B]">هذا هو الشكل الذي سيظهر عند الطباعة أو الحفظ كملف PDF.</div>
                      </div>
                      <Badge variant="secondary">A4</Badge>
                    </div>
                    <iframe
                      title="المعاينة الرسمية للإنذار القانوني"
                      srcDoc={officialPreviewHtml}
                      className="h-[760px] w-full rounded-lg border border-[#E5EAF1] bg-white"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Button
                      variant="outline"
                      onClick={handleCopyDocument}
                      size="sm"
                    >
                      <Copy className="ml-2 h-4 w-4" />
                      نسخ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadText}
                      size="sm"
                    >
                      <Download className="ml-2 h-4 w-4" />
                      نص
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      size="sm"
                    >
                      <Printer className="ml-2 h-4 w-4" />
                      طباعة
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.info('يمكنك استخدام خيار الطباعة وحفظ كـ PDF');
                      }}
                      size="sm"
                    >
                      <FileJson className="ml-2 h-4 w-4" />PDF</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Document Metadata */}
              {noticeVariables && (
                <Card className="legal-panel">
                  <CardHeader>
                    <CardTitle className="text-base">معلومات الوثيقة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم الوثيقة:</span>
                        <span className="font-semibold">{noticeVariables.documentNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الإصدار:</span>
                        <span className="font-semibold">
                          {new Date(noticeVariables.dateIssued).toLocaleDateString('ar-QA')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">نوع الوثيقة:</span>
                        <span className="font-semibold">{selectedTemplateObj?.nameAr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">حالة الوثيقة:</span>
                        <Badge variant="secondary">جاهزة للاستخدام</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedLegalNoticeGenerator;
