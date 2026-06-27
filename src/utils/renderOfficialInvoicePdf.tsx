import { createRoot } from "react-dom/client";
import { PaymentReceipt } from "@/components/payments/PaymentReceipt";
import { buildOfficialInvoiceReceiptProps } from "@/utils/officialInvoiceReceipt";

export async function renderOfficialInvoicePdfBlob(invoice: any, customerName?: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const receiptProps = buildOfficialInvoiceReceiptProps(invoice, customerName);
  const renderHost = document.createElement("div");
  renderHost.setAttribute("dir", "rtl");
  renderHost.style.position = "fixed";
  renderHost.style.left = "-10000px";
  renderHost.style.top = "0";
  renderHost.style.width = "794px";
  renderHost.style.background = "#ffffff";
  renderHost.style.padding = "24px";
  renderHost.style.zIndex = "-1";
  document.body.appendChild(renderHost);

  const root = createRoot(renderHost);

  try {
    root.render(<PaymentReceipt {...receiptProps} />);
    await new Promise((resolve) => setTimeout(resolve, 900));

    const canvas = await html2canvas(renderHost, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const contentHeight = imgHeight * ratio;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, contentHeight, undefined, "FAST");

    return pdf.output("blob");
  } finally {
    root.unmount();
    document.body.removeChild(renderHost);
  }
}
