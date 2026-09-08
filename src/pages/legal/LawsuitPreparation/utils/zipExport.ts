import { paginatePdfContent } from './pdfPagination';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import type { LawsuitPreparationState, DocumentsState } from '../store';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { renderOfficialInvoicePdfBlob } from '@/utils/renderOfficialInvoicePdf';
import { getCriminalComplaintEligibility } from './legalCaseWorkflow';

interface ContentRefs {
  memoHtml: string | null;
  claimsHtml: string | null;
  criminalComplaintHtml: string | null;
  violationsTransferHtml: string | null;
}

const generatedDocumentOrder: (keyof DocumentsState)[] = [
  'memo',
  'claims',
  'docsList',
  'violations',
  'criminalComplaint',
  'violationsTransfer',
];

function safeFileName(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
}

function getGeneratedDocumentHtml(
  state: LawsuitPreparationState,
  contentRefs: ContentRefs,
  docId: keyof DocumentsState
): string | null {
  const document = state.documents[docId];
  if (document.htmlContent) return document.htmlContent;
  if (docId === 'memo') return contentRefs.memoHtml;
  if (docId === 'claims') return contentRefs.claimsHtml;
  if (docId === 'criminalComplaint') return contentRefs.criminalComplaintHtml;
  if (docId === 'violationsTransfer') return contentRefs.violationsTransferHtml;
  return null;
}

export function shouldIncludeGeneratedDocument(state: LawsuitPreparationState, docId: keyof DocumentsState): boolean {
  const document = state.documents[docId];
  if (document.status !== 'ready') return false;
  if (docId === 'violations') return Number(state.calculations?.violationsCount || 0) > 0;
  if (docId === 'violationsTransfer') {
    return state.ui.includeViolationsTransfer
      && Number(state.calculations?.violationsCount || 0) > 0;
  }
  if (docId === 'criminalComplaint') {
    return state.ui.includeCriminalComplaint
      && getCriminalComplaintEligibility(state).eligible;
  }
  return true;
}

function getBlobExtension(blob: Blob): string {
  if (blob.type.includes('pdf')) return 'pdf';
  if (blob.type.includes('png')) return 'png';
  if (blob.type.includes('jpeg') || blob.type.includes('jpg')) return 'jpg';
  if (blob.type.includes('word')) return 'docx';
  return 'file';
}

export async function htmlToPdfBlob(html: string): Promise<Blob | null> {
  let iframe: HTMLIFrameElement | null = null;
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '794px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return null;
    }

    const frameLoaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('تعذر تحميل تنسيق المستند للطباعة')), 30000);
      iframe!.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    await frameLoaded;
    await iframeDoc.fonts.ready;
    await Promise.all(Array.from(iframeDoc.images).map(image => image.decode().catch(() => undefined)));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    let contentBlocks: { top: number; bottom: number }[] = [];
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      onclone: (clonedDocument) => {
        // Exclude controls explicitly marked as non-printable.
        clonedDocument.querySelectorAll('.no-print').forEach(element => element.remove());
        const bodyTop = clonedDocument.body.getBoundingClientRect().top;
        contentBlocks = Array.from(clonedDocument.body.querySelectorAll(
          'tr, p, li, h1, h2, h3, h4, .section, .info-section, .closing, .legal-article, .request-item, .section-title, .footer',
        )).map(element => {
          const rect = element.getBoundingClientRect();
          const following = element.matches('h1, h2, h3, h4, .section-title')
            ? element.nextElementSibling : null;
          const firstContent = following?.querySelector('p, tr, li, .request-item') ?? following;
          const bottom = firstContent ? Math.max(rect.bottom, firstContent.getBoundingClientRect().bottom) : rect.bottom;
          return { top: rect.top - bodyTop, bottom: bottom - bodyTop };
        });
      },
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    if (!canvas.width || !canvas.height) throw new Error('تعذر تصوير المستند كاملاً');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentWidth = pdfWidth - 2 * margin;
    const ratio = contentWidth / canvas.width;
    const pages = paginatePdfContent(canvas.height, Math.floor((pdfHeight - 2 * margin) / ratio),
      contentBlocks.map(block => ({ top: Math.floor(block.top * canvas.width / 794), bottom: Math.ceil(block.bottom * canvas.width / 794) })));
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    for (const [index, page] of pages.entries()) {
      pageCanvas.height = page.bottom - page.top;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('تعذر إنشاء صفحة المستند');
      context.drawImage(canvas, 0, page.top, canvas.width, pageCanvas.height,
        0, 0, canvas.width, pageCanvas.height);
      if (index > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin,
        contentWidth, pageCanvas.height * ratio, undefined, 'FAST');
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('[ZIP Export] Error converting HTML to PDF:', error);
    return null;
  } finally {
    iframe?.remove();
  }
}

async function htmlToDocxBlob(html: string): Promise<Blob | null> {
  try {
    const { dynamicImportWithRetry } = await import('@/utils/lazyWithRetry');
    const { convertHtmlToWordBlob } = await dynamicImportWithRetry(() => import('@/utils/document-export'));
    return convertHtmlToWordBlob(html);
  } catch (error) {
    console.error('[ZIP Export] Error converting HTML to Word:', error);
    return null;
  }
}

async function fetchFileAsBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    return await response.blob();
  } catch (error) {
    console.error('[ZIP Export] Error fetching file:', error);
    return null;
  }
}

async function addGeneratedDocuments(
  zip: JSZip,
  folderName: string,
  state: LawsuitPreparationState,
  contentRefs: ContentRefs,
  startIndex: number
): Promise<{ nextIndex: number; docxConversionFailed: boolean }> {
  let fileIndex = startIndex;
  let docxConversionFailed = false;

  for (const docId of generatedDocumentOrder) {
    if (!shouldIncludeGeneratedDocument(state, docId)) continue;

    const document = state.documents[docId];
    const html = getGeneratedDocumentHtml(state, contentRefs, docId);
    if (!html) continue;

    const pdfBlob = await htmlToPdfBlob(html);
    if (pdfBlob) {
      zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_${safeFileName(document.name)}.pdf`, pdfBlob);
      fileIndex++;
    }

    if (docId === 'memo') {
      const docxBlob = await htmlToDocxBlob(html);
      if (docxBlob) {
        zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_${safeFileName(document.name)}.doc`, docxBlob);
        fileIndex++;
      } else {
        docxConversionFailed = true;
      }
    }
  }

  return { nextIndex: fileIndex, docxConversionFailed };
}

async function addInvoices(zip: JSZip, folderName: string, state: LawsuitPreparationState): Promise<void> {
  if (!state.overdueInvoices.length) return;

  const containsScheduleClaims = state.overdueInvoices.some(
    (invoice) => invoice.source === 'payment_schedule',
  );
  const invoicesFolder = zip.folder(
    `${folderName}/${containsScheduleClaims ? 'مستندات الاستحقاق' : 'الفواتير'}`,
  );
  if (!invoicesFolder) return;

  const customerName = formatCustomerName(state.customer) || undefined;

  for (let index = 0; index < state.overdueInvoices.length; index++) {
    const invoice = state.overdueInvoices[index];

    try {
      const pdfBlob = await renderOfficialInvoicePdfBlob(invoice, customerName);
      const filePrefix = invoice.source === 'payment_schedule' ? 'استحقاق_تعاقدي' : 'فاتورة';
      const fileName = `${filePrefix}_${safeFileName(invoice.invoice_number || String(index + 1))}.pdf`;
      invoicesFolder.file(fileName, pdfBlob);
    } catch (error) {
      console.error(`[ZIP Export] Error adding invoice ${invoice.invoice_number}:`, error);
    }
  }
}

async function addExternalDocuments(
  zip: JSZip,
  folderName: string,
  state: LawsuitPreparationState,
  startIndex: number
): Promise<number> {
  let fileIndex = startIndex;
  const { documents, companyDocuments } = state;

  const companyDocMappings = [
    { type: 'commercial_register', documentId: 'commercialRegister', name: 'السجل_التجاري' },
    { type: 'iban_certificate', documentId: 'ibanCertificate', name: 'شهادة_IBAN' },
    { type: 'representative_id', documentId: 'representativeId', name: 'البطاقة_الشخصية_للممثل' },
  ] as const;

  for (const mapping of companyDocMappings) {
    const companyDoc = companyDocuments.find((doc) => doc.document_type === mapping.type);
    const fileUrl = documents[mapping.documentId].url || companyDoc?.file_url;
    if (!fileUrl) continue;

    const blob = await fetchFileAsBlob(fileUrl);
    if (!blob) continue;

    zip.file(
      `${folderName}/${String(fileIndex).padStart(2, '0')}_${mapping.name}.${getBlobExtension(blob)}`,
      blob
    );
    fileIndex++;
  }

  if (documents.contract.url) {
    const blob = await fetchFileAsBlob(documents.contract.url);
    if (blob) {
      zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_عقد_الإيجار.${getBlobExtension(blob)}`, blob);
      fileIndex++;
    }
  }

  for (let index = 0; index < state.violationEvidenceDocuments.length; index++) {
    const evidenceDocument = state.violationEvidenceDocuments[index];
    const blob = await fetchFileAsBlob(evidenceDocument.url);
    if (!blob) continue;

    const suffix = state.violationEvidenceDocuments.length > 1 ? `_${index + 1}` : '';
    zip.file(
      `${folderName}/${String(fileIndex).padStart(2, '0')}_تقرير_مخالفات_وزارة_الداخلية${suffix}.${getBlobExtension(blob)}`,
      blob
    );
    fileIndex++;
  }

  return fileIndex;
}

export async function exportDocumentsAsZip(
  state: LawsuitPreparationState,
  contentRefs: ContentRefs
): Promise<void> {
  const { contract, customer } = state;

  if (!contract) {
    throw new Error('بيانات العقد غير متوفرة');
  }

  const customerName = formatCustomerName(customer) || 'عميل';
  const folderName = safeFileName(`دعوى_${customerName}_${contract.contract_number}`);
  const zip = new JSZip();

  let fileIndex = 1;
  zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_ملخص_الدعوى.txt`, generateCaseSummary(state));
  fileIndex++;

  const generatedResult = await addGeneratedDocuments(zip, folderName, state, contentRefs, fileIndex);
  fileIndex = generatedResult.nextIndex;

  await addInvoices(zip, folderName, state);
  fileIndex = await addExternalDocuments(zip, folderName, state, fileIndex);

  if (fileIndex === 2 && !state.overdueInvoices.length) {
    throw new Error('لا توجد مستندات جاهزة للتحميل داخل الحافظة');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${folderName}.zip`);

  if (generatedResult.docxConversionFailed) {
    toast.warning('تم تحميل الحافظة، لكن تعذر إنشاء نسخة Word من المذكرة. نسخة PDF موجودة داخل الحافظة.');
  }
}

/**
 * يبني حزمة المستندات كملف بدون تحميلها — للأرشفة التلقائية في سجل القضية.
 */
export async function buildDocumentsZipBlob(
  state: LawsuitPreparationState,
  contentRefs: ContentRefs
): Promise<{ blob: Blob; fileName: string }> {
  const { contract, customer } = state;

  if (!contract) {
    throw new Error('بيانات العقد غير متوفرة');
  }

  const customerName = formatCustomerName(customer) || 'عميل';
  const folderName = safeFileName(`دعوى_${customerName}_${contract.contract_number}`);
  const zip = new JSZip();

  let fileIndex = 1;
  zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_ملخص_الدعوى.txt`, generateCaseSummary(state));
  fileIndex++;

  const generatedResult = await addGeneratedDocuments(zip, folderName, state, contentRefs, fileIndex);
  fileIndex = generatedResult.nextIndex;

  await addInvoices(zip, folderName, state);
  fileIndex = await addExternalDocuments(zip, folderName, state, fileIndex);

  if (fileIndex === 2 && !state.overdueInvoices.length) {
    throw new Error('لا توجد مستندات جاهزة للتحميل داخل الحافظة');
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, fileName: `${folderName}.zip` };
}

export function generateCaseSummary(state: LawsuitPreparationState): string {
  const { contract, customer, calculations, taqadiData, overdueInvoices, documents } = state;

  if (!contract) return '';

  const customerName = formatCustomerName(customer) || 'غير محدد';
  const readyDocuments = Object.values(documents)
    .filter((document) => document.status === 'ready')
    .map((document) => `- ${document.name}`)
    .join('\n');

  return `
ملخص القضية
============

العميل: ${customerName}
رقم العقد: ${contract.contract_number}
تاريخ العقد: ${contract.start_date || 'غير محدد'}

المطالبات المالية:
- إيجار متأخر: ${(calculations?.overdueRent || 0).toLocaleString('en-US')} ر.ق
- تعويض اتفاقي موثق: ${(calculations?.lateFees || 0).toLocaleString('en-US')} ر.ق
- مخالفات مرورية مدعومة بمستخرج رسمي: ${(calculations?.violationsFines || 0).toLocaleString('en-US')} ر.ق (${calculations?.violationsCount || 0} مخالفة)
- إجمالي المطالبة: ${(calculations?.total || 0).toLocaleString('en-US')} ر.ق

الاستحقاقات الحالّة الداخلة في المطالبة: ${overdueInvoices.length}
عنوان الدعوى: ${taqadiData?.caseTitle || ''}

المستندات الجاهزة:
${readyDocuments || '- لا توجد مستندات جاهزة'}

تاريخ التجهيز: ${new Date().toLocaleDateString('ar-QA')}
`.trim();
}
