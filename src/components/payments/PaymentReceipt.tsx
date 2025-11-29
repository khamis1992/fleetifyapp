import React, { forwardRef, useState, useEffect } from 'react';

interface PaymentReceiptProps {
  receiptNumber: string;
  date: string;
  customerName: string;
  amountInWords: string;
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other';
  managerName?: string;
  // إضافة خيار لتغيير عنوان المستند
  documentTitle?: {
    ar: string;
    en: string;
  };
  // إضافة خيار لإخفاء طريقة الدفع (للفواتير غير المدفوعة)
  hidePaymentMethod?: boolean;
}

// دالة لتحويل الصورة إلى Base64
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', url, error);
    return '';
  }
}

export const PaymentReceipt = forwardRef<HTMLDivElement, PaymentReceiptProps>(({
  receiptNumber,
  date,
  customerName,
  amountInWords,
  amount,
  description,
  paymentMethod,
  managerName = 'خميس هاشم الجبر',
  documentTitle = { ar: 'سند قبض', en: 'PAYMENT VOUCHER' },
  hidePaymentMethod = false
}, ref) => {
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [stampBase64, setStampBase64] = useState<string>('');
  const [signatureBase64, setSignatureBase64] = useState<string>('');
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // تحميل الصور وتحويلها إلى Base64 عند التحميل
  useEffect(() => {
    async function loadImages() {
      const [logo, stamp, signature] = await Promise.all([
        imageToBase64('/receipts/logo.png'),
        imageToBase64('/receipts/stamp.png'),
        imageToBase64('/receipts/signature.png'),
      ]);
      setLogoBase64(logo);
      setStampBase64(stamp);
      setSignatureBase64(signature);
      setImagesLoaded(true);
    }
    loadImages();
  }, []);

  return (
    <div 
      ref={ref}
      dir="rtl"
      className="payment-receipt"
      style={{
        fontFamily: 'Arial, Tahoma, sans-serif',
        background: 'white',
        width: '100%',
        maxWidth: '794px',
        minHeight: 'auto',
        padding: 'clamp(16px, 4vw, 40px)',
        position: 'relative',
        border: '3px double #1f2937',
        borderRadius: '8px',
        boxSizing: 'border-box',
        margin: '0 auto'
      }}
    >
      {/* CSS للتجاوب */}
      <style>{`
        .payment-receipt {
          font-size: clamp(12px, 2.5vw, 16px);
        }
        
        .receipt-header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #1f2937;
          padding-bottom: 12px;
          margin-bottom: 16px;
          gap: 8px;
        }
        
        .receipt-header-item {
          flex: 1;
          min-width: 0;
        }
        
        .receipt-title-box {
          display: inline-block;
          padding: clamp(6px, 2vw, 8px) clamp(16px, 4vw, 32px);
          border: 2px solid #1e3a8a;
          border-radius: 8px;
          background-color: #eff6ff;
          text-align: center;
        }
        
        .receipt-info-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 8px;
          gap: 12px;
        }
        
        .receipt-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        
        .receipt-table td {
          padding: 4px;
          vertical-align: middle;
        }
        
        .receipt-table .label-cell {
          width: auto;
          min-width: 80px;
          white-space: nowrap;
        }
        
        .receipt-table .value-cell {
          border-bottom: 2px dotted #9ca3af;
          text-align: center;
          font-weight: bold;
          color: #1f2937;
          word-break: break-word;
        }
        
        .receipt-table .label-cell-en {
          width: auto;
          min-width: 60px;
          white-space: nowrap;
          text-align: left;
          font-size: 0.75em;
        }
        
        .payment-mode-container {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: clamp(8px, 2vw, 32px);
          justify-content: center;
          background-color: #f9fafb;
          padding: clamp(8px, 2vw, 12px);
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          margin-top: 16px;
        }
        
        .payment-mode-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: clamp(11px, 2.2vw, 14px);
        }
        
        .receipt-footer {
          margin-top: clamp(24px, 5vw, 48px);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 8px;
          gap: 16px;
        }
        
        .footer-item {
          text-align: center;
          flex: 1;
          min-width: 100px;
          position: relative;
        }
        
        .amount-box {
          border: 2px solid #1f2937;
          border-radius: 4px;
          padding: 4px clamp(8px, 2vw, 16px);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: #f9fafb;
        }
        
        /* تخطيط للشاشات الصغيرة */
        @media (max-width: 480px) {
          .receipt-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .receipt-header-item {
            width: 100%;
            text-align: center !important;
          }
          
          .receipt-header-item[dir="ltr"] {
            text-align: center !important;
          }
          
          .receipt-info-row {
            flex-direction: column;
            align-items: stretch;
          }
          
          .receipt-info-item {
            justify-content: center;
          }
          
          .receipt-table .label-cell,
          .receipt-table .label-cell-en {
            display: none;
          }
          
          .receipt-table .value-cell {
            width: 100%;
          }
          
          .payment-mode-container {
            flex-direction: column;
            align-items: center;
          }
          
          .receipt-footer {
            flex-direction: column;
            align-items: center;
          }
          
          .footer-item {
            width: 100%;
            margin-bottom: 16px;
          }
        }
        
        /* طباعة */
        @media print {
          .payment-receipt {
            width: 100% !important;
            max-width: none !important;
            border: 3px double #1f2937 !important;
            padding: 40px !important;
            font-size: 14px !important;
          }
          
          .receipt-header {
            flex-direction: row !important;
          }
          
          .receipt-header-item {
            width: 33% !important;
          }
          
          .receipt-table .label-cell,
          .receipt-table .label-cell-en {
            display: table-cell !important;
          }
          
          .receipt-footer {
            flex-direction: row !important;
          }
          
          .footer-item {
            width: 30% !important;
          }
        }
      `}</style>

      {/* الترويسة */}
      <header className="receipt-header">
        {/* بيانات الشركة يمين */}
        <div className="receipt-header-item" style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', margin: 0 }}>
            شركة العراف لتأجير السيارات <span style={{ fontSize: '0.75em', fontWeight: 'normal', color: '#4b5563' }}>ذ.م.م</span>
          </h1>
          <p style={{ fontSize: '0.85em', color: '#374151', margin: '4px 0' }}>س.ت: 146832</p>
          <p style={{ fontSize: '0.7em', color: '#4b5563', margin: '2px 0' }}>أم صلال محمد – الشارع التجاري</p>
          <p style={{ fontSize: '0.7em', color: '#4b5563', margin: '2px 0' }}>مبنى (79) – الطابق الأول – مكتب (2)</p>
        </div>

        {/* الشعار وسط */}
        <div className="receipt-header-item" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px' }}>
          {logoBase64 && (
            <img 
              src={logoBase64}
              alt="شعار الشركة" 
              style={{ maxHeight: 'clamp(50px, 10vw, 80px)', maxWidth: '100%', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* العنوان إنجليزي يسار */}
        <div className="receipt-header-item" style={{ textAlign: 'left' }} dir="ltr">
          <h1 style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', margin: 0 }}>
            Al-Araf Car Rental <span style={{ fontSize: '0.75em', fontWeight: 'normal', color: '#4b5563' }}>L.L.C</span>
          </h1>
          <p style={{ fontSize: '0.85em', color: '#374151', margin: '4px 0' }}>C.R: 146832</p>
          <p style={{ fontSize: '0.7em', color: '#4b5563', margin: '2px 0' }}>Umm Salal Mohammed, Commercial St.</p>
          <p style={{ fontSize: '0.7em', color: '#4b5563', margin: '2px 0' }}>Bldg (79), 1st Floor, Office (2)</p>
        </div>
      </header>

      {/* عنوان السند */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(16px, 4vw, 32px)' }}>
        <span className="receipt-title-box">
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{documentTitle.ar}</h2>
          <h3 style={{ fontSize: 'clamp(12px, 2.5vw, 16px)', fontWeight: 'bold', color: '#4b5563', letterSpacing: '2px', margin: 0 }}>{documentTitle.en}</h3>
        </span>
      </div>

      {/* بيانات السند */}
      <div className="receipt-info-row">
        <div className="receipt-info-item">
          <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: 'clamp(14px, 3vw, 18px)' }}>رقم: No.</span>
          <span style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 'bold' }}>{receiptNumber}</span>
        </div>
        <div className="receipt-info-item">
          <span style={{ fontWeight: 'bold', color: '#1f2937' }}>التاريخ: Date</span>
          <span style={{ borderBottom: '1px solid #9ca3af', padding: '0 12px', textAlign: 'center', fontFamily: 'monospace' }}>{date}</span>
        </div>
      </div>

      {/* جسم السند */}
      <div style={{ padding: '0 8px' }}>
        
        {/* المستلم منه */}
        <table className="receipt-table">
          <tbody>
            <tr>
              <td className="label-cell" style={{ fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', paddingLeft: '8px' }}>استلمنا من السيد/</td>
              <td className="value-cell">{customerName}</td>
              <td className="label-cell-en" style={{ fontWeight: 'bold', color: '#6b7280', paddingRight: '8px' }} dir="ltr">Received From Mr.</td>
            </tr>
          </tbody>
        </table>

        {/* المبلغ */}
        <table className="receipt-table">
          <tbody>
            <tr>
              <td className="label-cell" style={{ fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', paddingLeft: '8px' }}>مبلغ وقدره/</td>
              <td className="value-cell">{amountInWords}</td>
              <td className="label-cell-en" style={{ fontWeight: 'bold', color: '#6b7280', paddingRight: '8px' }} dir="ltr">The Sum of</td>
            </tr>
          </tbody>
        </table>

        {/* المربع الرقمي للمبلغ */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '8px 8px' }}>
          <div className="amount-box">
            <span style={{ fontWeight: 'bold', color: '#4b5563' }}>QAR</span>
            <span style={{ fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 'bold', fontFamily: 'monospace' }}>{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* وذلك عن */}
        <table className="receipt-table">
          <tbody>
            <tr>
              <td className="label-cell" style={{ fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', paddingLeft: '8px' }}>وذلك عن/</td>
              <td className="value-cell" style={{ fontWeight: 'normal' }}>{description}</td>
              <td className="label-cell-en" style={{ fontWeight: 'bold', color: '#6b7280', paddingRight: '8px' }} dir="ltr">Being</td>
            </tr>
          </tbody>
        </table>

        {/* طريقة الدفع */}
        {!hidePaymentMethod && (
          <div className="payment-mode-container">
            <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: 'clamp(11px, 2.2vw, 14px)' }}>طريقة الدفع:</span>
            <label className="payment-mode-label">
              <span style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #333',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: paymentMethod === 'cash' ? '#1e3a8a' : 'white',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>{paymentMethod === 'cash' ? '✓' : ''}</span>
              <span>نقداً Cash</span>
            </label>
            <label className="payment-mode-label">
              <span style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #333',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: paymentMethod === 'check' ? '#1e3a8a' : 'white',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>{paymentMethod === 'check' ? '✓' : ''}</span>
              <span>شيك Cheque</span>
            </label>
            <label className="payment-mode-label">
              <span style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #333',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: paymentMethod === 'bank_transfer' ? '#1e3a8a' : 'white',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>{paymentMethod === 'bank_transfer' ? '✓' : ''}</span>
              <span>تحويل Transfer</span>
            </label>
          </div>
        )}
      </div>

      {/* التذييل */}
      <footer className="receipt-footer">
        
        {/* المستلم */}
        <div className="footer-item">
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: 'clamp(24px, 6vw, 48px)', fontSize: 'clamp(11px, 2.2vw, 14px)' }}>المستلم Receiver</p>
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto', paddingTop: '4px' }}>
            <p style={{ fontSize: '0.7em', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المحاسب */}
        <div className="footer-item">
          {/* الختم */}
          {stampBase64 && (
            <div style={{
              position: 'absolute',
              top: 'clamp(-50px, -8vw, -80px)',
              left: '50%',
              transform: 'translateX(-50%) rotate(-10deg)',
              opacity: 0.85,
              width: 'clamp(60px, 12vw, 100px)',
              height: 'clamp(60px, 12vw, 100px)',
              zIndex: 10
            }}>
              <img 
                src={stampBase64}
                alt="ختم الشركة" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                crossOrigin="anonymous"
              />
            </div>
          )}
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: 'clamp(24px, 6vw, 48px)', position: 'relative', zIndex: 20, fontSize: 'clamp(11px, 2.2vw, 14px)' }}>المحاسب Accountant</p>
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto', paddingTop: '4px', position: 'relative', zIndex: 20 }}>
            <p style={{ fontSize: '0.7em', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المدير العام */}
        <div className="footer-item">
          <p style={{ fontWeight: 'bold', color: '#1e3a8a', margin: 0, fontSize: 'clamp(11px, 2.2vw, 14px)' }}>المدير العام General Manager</p>
          <p style={{ fontWeight: 'bold', fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#1f2937', margin: '4px 0' }}>{managerName}</p>
          
          {/* التوقيع */}
          {signatureBase64 && (
            <div style={{
              position: 'relative',
              width: 'clamp(60px, 12vw, 100px)',
              height: 'clamp(30px, 6vw, 50px)',
              margin: '8px auto'
            }}>
              <img 
                src={signatureBase64}
                alt="توقيع المدير" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain'
                }}
                crossOrigin="anonymous"
              />
            </div>
          )}
          
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto', paddingTop: '4px' }}>
            <p style={{ fontSize: '0.7em', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>
      </footer>

      {/* تذييل الصفحة */}
      <div style={{
        marginTop: '16px',
        textAlign: 'center',
        fontSize: 'clamp(8px, 1.8vw, 10px)',
        color: '#9ca3af'
      }}>
        Al-Araf Car Rental System - Generated Document
      </div>
    </div>
  );
});

PaymentReceipt.displayName = 'PaymentReceipt';

export default PaymentReceipt;
