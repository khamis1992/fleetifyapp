import React, { forwardRef } from 'react';

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
  return (
    <div 
      ref={ref}
      dir="rtl" 
      style={{
        fontFamily: 'Cairo, sans-serif',
        background: 'white',
        width: '210mm',
        minHeight: '148mm',
        padding: '10mm',
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
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
            شركة العراف لتأجير السيارات <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#4b5563' }}>ذ.م.م</span>
          </h1>
          <p style={{ fontSize: '12px', color: '#374151' }}>س.ت: 146832</p>
          <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>أم صلال محمد – الشارع التجاري</p>
          <p style={{ fontSize: '10px', color: '#4b5563' }}>مبنى (79) – الطابق الأول – مكتب (2)</p>
        </div>

        {/* الشعار وسط */}
        <div style={{ width: '33%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 16px' }}>
          <img 
            src="/receipts/logo.png" 
            alt="شعار الشركة" 
            style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* العنوان إنجليزي يسار */}
        <div style={{ textAlign: 'left', width: '33%' }} dir="ltr">
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
            Al-Araf Car Rental <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#4b5563' }}>L.L.C</span>
          </h1>
          <p style={{ fontSize: '12px', color: '#374151' }}>C.R: 146832</p>
          <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>Umm Salal Mohammed, Commercial St.</p>
          <p style={{ fontSize: '10px', color: '#4b5563' }}>Bldg (79), 1st Floor, Office (2)</p>
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
          <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '18px' }}>رقم: .No</span>
          <span style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold' }}>{receiptNumber}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', color: '#1f2937' }}>التاريخ: Date</span>
          <span style={{ borderBottom: '1px solid #9ca3af', width: '120px', textAlign: 'center', fontFamily: 'monospace' }}>{date}</span>
        </div>
      </div>

      {/* جسم السند */}
      <div style={{ padding: '0 16px', fontSize: '16px' }}>
        
        {/* المستلم منه */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '20px' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a8a', marginLeft: '8px', whiteSpace: 'nowrap', width: '120px' }}>استلمنا من السيد/</span>
          <div style={{ 
            borderBottom: '2px dotted #9ca3af', 
            flexGrow: 1, 
            textAlign: 'center', 
            color: '#1f2937', 
            fontWeight: 'bold',
            paddingBottom: '4px'
          }}>{customerName}</div>
          <span style={{ fontWeight: 'bold', color: '#6b7280', marginRight: '8px', whiteSpace: 'nowrap', width: '120px', textAlign: 'left', fontSize: '12px' }} dir="ltr">Received From Mr.</span>
        </div>

        {/* المبلغ */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '20px' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a8a', marginLeft: '8px', whiteSpace: 'nowrap', width: '120px' }}>مبلغ وقدره/</span>
          <div style={{ 
            borderBottom: '2px dotted #9ca3af', 
            flexGrow: 1, 
            textAlign: 'center', 
            color: '#1f2937', 
            fontWeight: 'bold',
            paddingBottom: '4px'
          }}>{amountInWords}</div>
          <span style={{ fontWeight: 'bold', color: '#6b7280', marginRight: '8px', whiteSpace: 'nowrap', width: '120px', textAlign: 'left', fontSize: '12px' }} dir="ltr">The Sum of</span>
        </div>

        {/* المربع الرقمي للمبلغ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}>
          <div style={{
            border: '2px solid #1f2937',
            borderRadius: '4px',
            padding: '4px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f9fafb'
          }}>
            <span style={{ fontWeight: 'bold', color: '#4b5563' }}>QAR</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* وذلك عن */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '20px' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a8a', marginLeft: '8px', whiteSpace: 'nowrap', width: '120px' }}>وذلك عن/</span>
          <div style={{ 
            borderBottom: '2px dotted #9ca3af', 
            flexGrow: 1, 
            textAlign: 'center', 
            color: '#1f2937',
            paddingBottom: '4px'
          }}>{description}</div>
          <span style={{ fontWeight: 'bold', color: '#6b7280', marginRight: '8px', whiteSpace: 'nowrap', width: '120px', textAlign: 'left', fontSize: '12px' }} dir="ltr">Being</span>
        </div>

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
            <input type="checkbox" checked={paymentMethod === 'cash'} readOnly style={{ width: '18px', height: '18px' }} />
            <span>نقداً Cash</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={paymentMethod === 'check'} readOnly style={{ width: '18px', height: '18px' }} />
            <span>شيك Cheque</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={paymentMethod === 'bank_transfer'} readOnly style={{ width: '18px', height: '18px' }} />
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
        <div style={{ textAlign: 'center', width: '33%' }}>
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '48px' }}>المستلم Receiver</p>
          <div style={{ borderTop: '1px solid #9ca3af', width: '66%', margin: '0 auto', paddingTop: '4px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المحاسب */}
        <div style={{ textAlign: 'center', width: '33%', position: 'relative' }}>
          {/* الختم */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%) rotate(-10deg)',
            opacity: 0.9,
            width: '120px',
            height: '120px',
            zIndex: 10
          }}>
            <img 
              src="/receipts/stamp.png" 
              alt="ختم الشركة" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '48px', position: 'relative', zIndex: 20 }}>المحاسب Accountant</p>
          <div style={{ borderTop: '1px solid #9ca3af', width: '66%', margin: '0 auto', paddingTop: '4px', position: 'relative', zIndex: 20 }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المدير العام */}
        <div style={{ textAlign: 'center', width: '33%', position: 'relative' }}>
          <p style={{ fontWeight: 'bold', color: '#1e3a8a' }}>المدير العام General Manager</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937', marginTop: '4px' }}>{managerName}</p>
          
          {/* التوقيع */}
          <div style={{
            position: 'relative',
            width: '120px',
            height: '60px',
            margin: '8px auto'
          }}>
            <img 
              src="/receipts/signature.png" 
              alt="توقيع المدير" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                mixBlendMode: 'multiply'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          
          <div style={{ borderTop: '1px solid #9ca3af', width: '66%', margin: '0 auto', paddingTop: '4px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>التوقيع Signature</p>
          </div>
        </div>
      </footer>

      {/* تذييل الصفحة */}
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        textAlign: 'center',
        padding: '8px',
        fontSize: '10px',
        color: '#9ca3af',
        borderTop: '1px solid #e5e7eb'
      }}>
        Al-Araf Car Rental System - Generated Document
      </div>
    </div>
  );
});

PaymentReceipt.displayName = 'PaymentReceipt';

export default PaymentReceipt;

