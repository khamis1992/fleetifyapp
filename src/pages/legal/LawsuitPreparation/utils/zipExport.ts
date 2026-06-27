import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import type { LawsuitPreparationState, DocumentsState } from '../store';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { renderOfficialInvoicePdfBlob } from '@/utils/renderOfficialInvoicePdf';

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

function shouldIncludeGeneratedDocument(state: LawsuitPreparationState, docId: keyof DocumentsState): boolean {
  const document = state.documents[docId];
  if (document.status !== 'ready') return false;
  if (docId === 'violations') return state.trafficViolations.length > 0;
  return true;
}

function getBlobExtension(blob: Blob): string {
  if (blob.type.includes('pdf')) return 'pdf';
  if (blob.type.includes('png')) return 'png';
  if (blob.type.includes('jpeg') || blob.type.includes('jpg')) return 'jpg';
  if (blob.type.includes('word')) return 'docx';
  return 'file';
}

async function htmlToPdfBlob(html: string): Promise<Blob | null> {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '794px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return null;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    await new Promise((resolve) => setTimeout(resolve, 800));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const contentHeight = imgHeight * ratio;

    let heightLeft = contentHeight;
    let position = 0;
    let pageCount = 0;

    while (heightLeft > 0 && pageCount < 20) {
      if (pageCount > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
      position -= pdfHeight;
      pageCount++;
    }

    document.body.removeChild(iframe);
    return pdf.output('blob');
  } catch (error) {
    console.error('[ZIP Export] Error converting HTML to PDF:', error);
    return null;
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

  const invoicesFolder = zip.folder(`${folderName}/الفواتير`);
  if (!invoicesFolder) return;

  const customerName = formatCustomerName(state.customer) || undefined;

  for (let index = 0; index < state.overdueInvoices.length; index++) {
    const invoice = state.overdueInvoices[index];

    try {
      const pdfBlob = await renderOfficialInvoicePdfBlob(invoice, customerName);
      const fileName = `فاتورة_${safeFileName(invoice.invoice_number || String(index + 1))}.pdf`;
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

export function generateCaseSummary(state: LawsuitPreparationState): string {
  const { contract, customer, calculations, taqadiData, overdueInvoices, trafficViolations, documents } = state;

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
- غرامات تأخير: ${(calculations?.lateFees || 0).toLocaleString('en-US')} ر.ق
- مخالفات مرورية: ${(calculations?.violationsFines || 0).toLocaleString('en-US')} ر.ق (${calculations?.violationsCount || trafficViolations.length} مخالفة)
- إجمالي المطالبة: ${(calculations?.total || 0).toLocaleString('en-US')} ر.ق

الفواتير المتأخرة: ${overdueInvoices.length} فاتورة
عنوان الدعوى: ${taqadiData?.caseTitle || ''}

المستندات الجاهزة:
${readyDocuments || '- لا توجد مستندات جاهزة'}

تاريخ التجهيز: ${new Date().toLocaleDateString('ar-QA')}
`.trim();
}
