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
  managerName = 'خميس هاشم الجبر'
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
      style={{
        fontFamily: 'Arial, Tahoma, sans-serif',
        background: 'white',
        width: '794px', // A4 width in pixels at 96 DPI
        minHeight: '560px',
        padding: '40px',
        position: 'relative',
        border: '3px double #1f2937',
        borderRadius: '8px',
        boxSizing: 'border-box'
      }}
    >
      {/* الترويسة */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '2px solid #1f2937',
        paddingBottom: '16px',
        marginBottom: '24px'
      }}>
        {/* بيانات الشركة يمين */}
        <div style={{ textAlign: 'right', width: '33%' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', margin: 0 }}>
            شركة العراف لتأجير السيارات <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#4b5563' }}>ذ.م.م</span>
          </h1>
          <p style={{ fontSize: '12px', color: '#374151', margin: '4px 0' }}>س.ت: 146832</p>
          <p style={{ fontSize: '10px', color: '#4b5563', margin: '2px 0' }}>أم صلال محمد – الشارع التجاري</p>
          <p style={{ fontSize: '10px', color: '#4b5563', margin: '2px 0' }}>مبنى (79) – الطابق الأول – مكتب (2)</p>
        </div>

        {/* الشعار وسط */}
        <div style={{ width: '33%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 16px' }}>
          {logoBase64 && (
            <img 
              src={logoBase64}
              alt="شعار الشركة" 
              style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* العنوان إنجليزي يسار */}
        <div style={{ textAlign: 'left', width: '33%' }} dir="ltr">
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px', margin: 0 }}>
            Al-Araf Car Rental <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#4b5563' }}>L.L.C</span>
          </h1>
          <p style={{ fontSize: '12px', color: '#374151', margin: '4px 0' }}>C.R: 146832</p>
          <p style={{ fontSize: '10px', color: '#4b5563', margin: '2px 0' }}>Umm Salal Mohammed, Commercial St.</p>
          <p style={{ fontSize: '10px', color: '#4b5563', margin: '2px 0' }}>Bldg (79), 1st Floor, Office (2)</p>
        </div>
      </header>

      {/* عنوان السند */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <span style={{
          display: 'inline-block',
          padding: '8px 32px',
          border: '2px solid #1e3a8a',
          borderRadius: '8px',
          backgroundColor: '#eff6ff',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>سند قبض</h2>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '3px', margin: 0 }}>PAYMENT VOUCHER</h3>
        </span>
      </div>

      {/* بيانات السند */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '18px' }}>رقم: No.</span>
          <span style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold' }}>{receiptNumber}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', color: '#1f2937' }}>التاريخ: Date</span>
          <span style={{ borderBottom: '1px solid #9ca3af', padding: '0 20px', textAlign: 'center', fontFamily: 'monospace' }}>{date}</span>
        </div>
      </div>

      {/* جسم السند */}
      <div style={{ padding: '0 16px', fontSize: '16px' }}>
        
        {/* المستلم منه */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td style={{ width: '130px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', paddingLeft: '8px' }}>استلمنا من السيد/</td>
              <td style={{ borderBottom: '2px dotted #9ca3af', textAlign: 'center', fontWeight: 'bold', color: '#1f2937', padding: '4px' }}>{customerName}</td>
              <td style={{ width: '130px', fontWeight: 'bold', color: '#6b7280', textAlign: 'left', paddingRight: '8px', fontSize: '12px' }} dir="ltr">Received From Mr.</td>
            </tr>
          </tbody>
        </table>

        {/* المبلغ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td style={{ width: '130px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', paddingLeft: '8px' }}>مبلغ وقدره/</td>
              <td style={{ borderBottom: '2px dotted #9ca3af', textAlign: 'center', fontWeight: 'bold', color: '#1f2937', padding: '4px' }}>{amountInWords}</td>
              <td style={{ width: '130px', fontWeight: 'bold', color: '#6b7280', textAlign: 'left', paddingRight: '8px', fontSize: '12px' }} dir="ltr">The Sum of</td>
            </tr>
          </tbody>
        </table>

        {/* المربع الرقمي للمبلغ */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '8px 16px' }}>
          <div style={{
            border: '2px solid #1f2937',
            borderRadius: '4px',
            padding: '4px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f9fafb'
          }}>
            <span style={{ fontWeight: 'bold', color: '#4b5563' }}>QAR</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* وذلك عن */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <tbody>
            <tr>
              <td style={{ width: '130px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'right', paddingLeft: '8px' }}>وذلك عن/</td>
              <td style={{ borderBottom: '2px dotted #9ca3af', textAlign: 'center', color: '#1f2937', padding: '4px' }}>{description}</td>
              <td style={{ width: '130px', fontWeight: 'bold', color: '#6b7280', textAlign: 'left', paddingRight: '8px', fontSize: '12px' }} dir="ltr">Being</td>
            </tr>
          </tbody>
        </table>

        {/* طريقة الدفع */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '12px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          marginTop: '24px'
        }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>طريقة الدفع Payment Mode:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              border: '2px solid #333',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: paymentMethod === 'cash' ? '#1e3a8a' : 'white',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>{paymentMethod === 'cash' ? '✓' : ''}</span>
            <span>نقداً Cash</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              border: '2px solid #333',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: paymentMethod === 'check' ? '#1e3a8a' : 'white',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>{paymentMethod === 'check' ? '✓' : ''}</span>
            <span>شيك Cheque</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              border: '2px solid #333',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: paymentMethod === 'bank_transfer' ? '#1e3a8a' : 'white',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>{paymentMethod === 'bank_transfer' ? '✓' : ''}</span>
            <span>تحويل Transfer</span>
          </label>
        </div>
      </div>

      {/* التذييل */}
      <footer style={{
        marginTop: '48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '0 32px',
        position: 'relative'
      }}>
        
        {/* المستلم */}
        <div style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '48px' }}>المستلم Receiver</p>
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto', paddingTop: '4px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المحاسب */}
        <div style={{ textAlign: 'center', width: '30%', position: 'relative' }}>
          {/* الختم */}
          {stampBase64 && (
            <div style={{
              position: 'absolute',
              top: '-80px',
              left: '50%',
              transform: 'translateX(-50%) rotate(-10deg)',
              opacity: 0.85,
              width: '100px',
              height: '100px',
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
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '48px', position: 'relative', zIndex: 20 }}>المحاسب Accountant</p>
          <div style={{ borderTop: '1px solid #9ca3af', width: '80%', margin: '0 auto', paddingTop: '4px', position: 'relative', zIndex: 20 }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المدير العام */}
        <div style={{ textAlign: 'center', width: '30%', position: 'relative' }}>
          <p style={{ fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>المدير العام General Manager</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937', margin: '4px 0' }}>{managerName}</p>
          
          {/* التوقيع */}
          {signatureBase64 && (
            <div style={{
              position: 'relative',
              width: '100px',
              height: '50px',
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
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>
      </footer>

      {/* تذييل الصفحة */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '0',
        right: '0',
        textAlign: 'center',
        fontSize: '10px',
        color: '#9ca3af'
      }}>
        Al-Araf Car Rental System - Generated Document
      </div>
    </div>
  );
});

PaymentReceipt.displayName = 'PaymentReceipt';

export default PaymentReceipt;
