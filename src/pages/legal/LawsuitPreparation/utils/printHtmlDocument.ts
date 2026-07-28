function safeDocumentTitle(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document';
}

function waitForPrintableAssets(printWindow: Window): Promise<void> {
  const imagePromises = Array.from(printWindow.document.images)
    .filter((image) => !image.complete)
    .map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })
    );

  const fontsReady = printWindow.document.fonts?.ready?.then(() => undefined) ?? Promise.resolve();
  return Promise.all([fontsReady, ...imagePromises]).then(() => undefined);
}

/**
 * Uses the browser print engine so the saved PDF keeps selectable text and
 * the exact HTML print layout instead of rasterizing every page as an image.
 */
export function printHtmlDocumentAsPdf(html: string, documentName: string): Window {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = safeDocumentTitle(documentName);

  const printOverrides = printWindow.document.createElement('style');
  printOverrides.dataset.fleetifyPrint = 'true';
  printOverrides.textContent = `
    @page { size: A4 portrait; }
    @media print {
      html, body {
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, .print-button, button {
        display: none !important;
      }
    }
  `;
  (printWindow.document.head || printWindow.document.documentElement).appendChild(printOverrides);

  const openPrintDialog = () => {
    void waitForPrintableAssets(printWindow).finally(() => {
      window.setTimeout(() => {
        if (printWindow.closed) return;
        printWindow.focus();
        printWindow.print();
      }, 250);
    });
  };

  if (printWindow.document.readyState === 'complete') {
    openPrintDialog();
  } else {
    printWindow.addEventListener('load', openPrintDialog, { once: true });
  }

  return printWindow;
}
