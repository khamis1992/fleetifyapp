/**
 * أداة فتح الكتاب للطباعة
 */

/**
 * فتح الكتاب في نافذة جديدة للطباعة
 */
export function openLetterForPrint(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  }
}
