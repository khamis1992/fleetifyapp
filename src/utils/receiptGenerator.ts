import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * انتظار تحميل جميع الصور في العنصر
 */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // تجاهل الصور التي فشل تحميلها
    });
  });
  await Promise.all(promises);
}

/**
 * Generate PDF from HTML element
 */
export async function generateReceiptPDF(element: HTMLElement, filename: string): Promise<Blob> {
  // انتظار تحميل جميع الصور
  await waitForImages(element);
  
  // انتظار قليل للتأكد من اكتمال الرسم
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Create canvas from HTML element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
    removeContainer: true,
  });

  // Calculate dimensions for A4 landscape
  const pdfWidth = 297; // A4 landscape width in mm
  const pdfHeight = 210; // A4 landscape height in mm
  
  // Calculate scaling to fit the content
  const canvasRatio = canvas.width / canvas.height;
  let imgWidth = pdfWidth - 20; // margins
  let imgHeight = imgWidth / canvasRatio;
  
  if (imgHeight > pdfHeight - 20) {
    imgHeight = pdfHeight - 20;
    imgWidth = imgHeight * canvasRatio;
  }

  // Create PDF in landscape
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Center the image
  const xOffset = (pdfWidth - imgWidth) / 2;
  const yOffset = (pdfHeight - imgHeight) / 2;

  // Add image to PDF
  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

  // Return as blob
  return pdf.output('blob');
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert number to Arabic words
 */
export function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف'];
  
  // Handle whole number and decimal parts
  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  
  let result = '';
  
  // Convert whole part
  if (wholePart >= 1000) {
    const thousandDigit = Math.floor(wholePart / 1000);
    if (thousandDigit === 1) {
      result += 'ألف';
    } else if (thousandDigit === 2) {
      result += 'ألفان';
    } else if (thousandDigit <= 10) {
      result += thousands[thousandDigit];
    } else {
      result += convertUnder1000(thousandDigit) + ' ألف';
    }
  }
  
  const remainder = wholePart % 1000;
  if (remainder > 0) {
    if (result) result += ' و';
    result += convertUnder1000(remainder);
  }
  
  // Add currency
  result += ' ريال قطري';
  
  // Handle decimals
  if (decimalPart > 0) {
    result += ' و' + convertUnder1000(decimalPart) + ' درهم';
  }
  
  result += ' فقط لا غير';
  
  return result;
  
  function convertUnder1000(n: number): string {
    if (n === 0) return '';
    
    let str = '';
    
    // Hundreds
    if (n >= 100) {
      str += hundreds[Math.floor(n / 100)];
      n = n % 100;
      if (n > 0) str += ' و';
    }
    
    // Tens and ones
    if (n >= 20) {
      const tensDigit = Math.floor(n / 10);
      const onesDigit = n % 10;
      if (onesDigit > 0) {
        str += ones[onesDigit] + ' و';
      }
      str += tens[tensDigit];
    } else if (n >= 10) {
      str += teens[n - 10];
    } else if (n > 0) {
      str += ones[n];
    }
    
    return str;
  }
}

/**
 * Generate receipt number
 */
export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `RV-${year}${month}-${random}`;
}

/**
 * Format date for receipt
 */
export function formatReceiptDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

