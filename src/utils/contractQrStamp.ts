import type { jsPDF } from 'jspdf';
import { contractQrPayload } from './signedContractReview';

/** Reserved footer band; never overlay a QR on the contract text or signatures. */
export async function stampContractQr(doc: jsPDF, contractNumber: string) {
  const { default: QRCode } = await import('qrcode');
  const qr = await QRCode.toDataURL(contractQrPayload(contractNumber), { errorCorrectionLevel: 'M', margin: 2, width: 240 });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.addImage(qr, 'PNG', 185, 274, 20, 20);
  }
}
