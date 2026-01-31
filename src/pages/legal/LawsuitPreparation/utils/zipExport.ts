/**
 * ZIP Export Utilities
 * أدوات تصدير ZIP
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { LawsuitPreparationState, DocumentsState } from '../store';
import { formatCustomerName } from '@/utils/formatCustomerName';

interface ContentRefs {
  memoHtml: string | null;
  claimsHtml: string | null;
  criminalComplaintHtml: string | null;
  violationsTransferHtml: string | null;
}

/**
 * Convert HTML to PDF Blob
 * Note: This is a simplified version. In production, you might want to use
 * a server-side solution for better PDF quality.
 */
async function htmlToPdfBlob(html: string, filename: string): Promise<Blob | null> {
  try {
    // Dynamic import for heavy libraries
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    
    // Create iframe for rendering
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
    
    // Write HTML to iframe
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Capture canvas
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
    });
    
    // Create PDF
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
    
    // Add pages if content is long
    let heightLeft = contentHeight;
    let position = 0;
    let pageCount = 0;
    
    while (heightLeft > 0 && pageCount < 10) {
      if (pageCount > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, contentHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
      position -= pdfHeight;
      pageCount++;
    }
    
    // Cleanup
    document.body.removeChild(iframe);
    
    return pdf.output('blob');
  } catch (error) {
    console.error('Error converting HTML to PDF:', error);
    return null;
  }
}

/**
 * Fetch file as blob from URL
 */
async function fetchFileAsBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    return await response.blob();
  } catch (error) {
    console.error('Error fetching file:', error);
    return null;
  }
}

/**
 * Export all documents as ZIP
 */
export async function exportDocumentsAsZip(
  state: LawsuitPreparationState,
  contentRefs: ContentRefs
): Promise<void> {
  const { contract, customer, documents, companyDocuments } = state;
  
  if (!contract) {
    throw new Error('بيانات العقد غير متوفرة');
  }
  
  const customerName = formatCustomerName(customer);
  const folderName = `دعوى_${customerName}_${contract.contract_number}`.replace(/[/\\?%*:|"<>]/g, '-');
  
  const zip = new JSZip();
  
  let fileIndex = 1;
  
  // 1. Add Explanatory Memo as PDF
  if (contentRefs.memoHtml) {
    try {
      const pdfBlob = await htmlToPdfBlob(contentRefs.memoHtml, 'المذكرة_الشارحة.pdf');
      if (pdfBlob) {
        zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_المذكرة_الشارحة.pdf`, pdfBlob);
        fileIndex++;
      }
    } catch (error) {
      console.error('Error adding memo to ZIP:', error);
    }
  }
  
  // 2. Add Claims Statement as HTML
  if (contentRefs.claimsHtml) {
    zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_كشف_المطالبات_المالية.html`, contentRefs.claimsHtml);
    fileIndex++;
  }
  
  // 3. Add Criminal Complaint if available
  if (contentRefs.criminalComplaintHtml) {
    zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_بلاغ_سرقة_المركبة.html`, contentRefs.criminalComplaintHtml);
    fileIndex++;
  }
  
  // 4. Add Violations Transfer if available
  if (contentRefs.violationsTransferHtml) {
    zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_طلب_تحويل_المخالفات.html`, contentRefs.violationsTransferHtml);
    fileIndex++;
  }
  
  // 5. Add Company Documents
  const companyDocMappings = [
    { type: 'commercial_register', name: 'السجل_التجاري' },
    { type: 'iban_certificate', name: 'شهادة_IBAN' },
    { type: 'representative_id', name: 'البطاقة_الشخصية_للممثل' },
  ] as const;
  
  for (const mapping of companyDocMappings) {
    const doc = companyDocuments.find(d => d.document_type === mapping.type);
    if (doc?.file_url) {
      try {
        const blob = await fetchFileAsBlob(doc.file_url);
        if (blob) {
          const ext = blob.type.includes('pdf') ? 'pdf' : 
                      blob.type.includes('image') ? 'jpg' : 'file';
          zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_${mapping.name}.${ext}`, blob);
          fileIndex++;
        }
      } catch (error) {
        console.error(`Error fetching ${mapping.name}:`, error);
      }
    }
  }
  
  // 6. Add Contract if available
  if (documents.contract.url) {
    try {
      const blob = await fetchFileAsBlob(documents.contract.url);
      if (blob) {
        const ext = blob.type.includes('pdf') ? 'pdf' : 
                    blob.type.includes('image') ? 'jpg' : 'file';
        zip.file(`${folderName}/${String(fileIndex).padStart(2, '0')}_عقد_الإيجار.${ext}`, blob);
        fileIndex++;
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    }
  }
  
  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${folderName}.zip`);
}

/**
 * Generate a text summary of the case
 */
export function generateCaseSummary(state: LawsuitPreparationState): string {
  const { contract, customer, calculations, taqadiData, overdueInvoices } = state;
  
  if (!contract || !calculations) return '';
  
  const customerName = formatCustomerName(customer);
  
  return `
ملخص القضية
============

العميل: ${customerName}
رقم العقد: ${contract.contract_number}
تاريخ العقد: ${contract.start_date}

المطالبات المالية:
- إيجار متأخر: ${calculations.overdueRent.toLocaleString('en-US')} ر.ق
- غرامات تأخير: ${calculations.lateFees.toLocaleString('en-US')} ر.ق
- مخالفات مرورية: ${calculations.violationsFines.toLocaleString('en-US')} ر.ق (${calculations.violationsCount} مخالفة)
- إجمالي المطالبة: ${calculations.total.toLocaleString('en-US')} ر.ق

الفواتير المتأخرة: ${overdueInvoices.length} فاتورة

عنوان الدعوى: ${taqadiData?.caseTitle || ''}

تاريخ التجهيز: ${new Date().toLocaleDateString('ar-QA')}
`.trim();
}
