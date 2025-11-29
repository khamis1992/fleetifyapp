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
        fontFamily: 'Arial, Tahoma, sans-serif',
        background: 'white',
        width: '210mm',
        minHeight: '148mm',
        padding: '15mm',
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
        paddingBottom: '15px',
        marginBottom: '20px'
      }}>
        {/* بيانات الشركة يمين */}
        <div style={{ textAlign: 'right', width: '45%' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px', margin: 0 }}>
            شركة العراف لتأجير السيارات ذ.م.م
          </h1>
          <p style={{ fontSize: '14px', color: '#374151', margin: '3px 0' }}>س.ت: 146832</p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '3px 0' }}>أم صلال محمد – الشارع التجاري</p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '3px 0' }}>مبنى (79) – الطابق الأول – مكتب (2)</p>
        </div>

        {/* العنوان إنجليزي يسار */}
        <div style={{ textAlign: 'left', width: '45%' }} dir="ltr">
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px', margin: 0 }}>
            Al-Araf Car Rental L.L.C
          </h1>
          <p style={{ fontSize: '14px', color: '#374151', margin: '3px 0' }}>C.R: 146832</p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '3px 0' }}>Umm Salal Mohammed, Commercial St.</p>
          <p style={{ fontSize: '12px', color: '#4b5563', margin: '3px 0' }}>Bldg (79), 1st Floor, Office (2)</p>
        </div>
      </header>

      {/* عنوان السند */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <div style={{
          display: 'inline-block',
          padding: '10px 40px',
          border: '2px solid #1e3a8a',
          borderRadius: '8px',
          backgroundColor: '#eff6ff'
        }}>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>سند قبض</h2>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '2px', margin: '5px 0 0 0' }}>PAYMENT VOUCHER</h3>
        </div>
      </div>

      {/* بيانات السند - رقم وتاريخ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', padding: '0 20px' }}>
        <div>
          <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '16px' }}>رقم No: </span>
          <span style={{ color: '#dc2626', fontSize: '18px', fontWeight: 'bold' }}>{receiptNumber}</span>
        </div>
        <div>
          <span style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '16px' }}>التاريخ Date: </span>
          <span style={{ fontSize: '16px' }}>{date}</span>
        </div>
      </div>

      {/* جسم السند */}
      <div style={{ padding: '0 20px', fontSize: '16px' }}>
        
        {/* المستلم منه */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '150px', fontWeight: 'bold', color: '#1e3a8a', verticalAlign: 'bottom' }}>استلمنا من السيد/</td>
                <td style={{ borderBottom: '2px dotted #9ca3af', textAlign: 'center', fontWeight: 'bold', color: '#1f2937', padding: '5px' }}>{customerName}</td>
                <td style={{ width: '150px', fontWeight: 'bold', color: '#6b7280', textAlign: 'left', verticalAlign: 'bottom', fontSize: '14px' }} dir="ltr">Received From Mr.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* المبلغ */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '150px', fontWeight: 'bold', color: '#1e3a8a', verticalAlign: 'bottom' }}>مبلغ وقدره/</td>
                <td style={{ borderBottom: '2px dotted #9ca3af', textAlign: 'center', fontWeight: 'bold', color: '#1f2937', padding: '5px' }}>{amountInWords}</td>
                <td style={{ width: '150px', fontWeight: 'bold', color: '#6b7280', textAlign: 'left', verticalAlign: 'bottom', fontSize: '14px' }} dir="ltr">The Sum of</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* المربع الرقمي للمبلغ */}
        <div style={{ textAlign: 'left', margin: '15px 0' }}>
          <div style={{
            display: 'inline-block',
            border: '2px solid #1f2937',
            borderRadius: '4px',
            padding: '8px 20px',
            backgroundColor: '#f9fafb'
          }}>
            <span style={{ fontWeight: 'bold', color: '#4b5563', marginLeft: '10px' }}>QAR</span>
            <span style={{ fontSize: '22px', fontWeight: 'bold' }}>{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* وذلك عن */}
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '150px', fontWeight: 'bold', color: '#1e3a8a', verticalAlign: 'bottom' }}>وذلك عن/</td>
                <td style={{ borderBottom: '2px dotted #9ca3af', textAlign: 'center', color: '#1f2937', padding: '5px' }}>{description}</td>
                <td style={{ width: '150px', fontWeight: 'bold', color: '#6b7280', textAlign: 'left', verticalAlign: 'bottom', fontSize: '14px' }} dir="ltr">Being</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* طريقة الدفع */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '30px',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          marginTop: '25px'
        }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a8a' }}>طريقة الدفع Payment Mode:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              border: '2px solid #333', 
              display: 'inline-block',
              textAlign: 'center',
              lineHeight: '14px',
              backgroundColor: paymentMethod === 'cash' ? '#1e3a8a' : 'white',
              color: paymentMethod === 'cash' ? 'white' : 'transparent'
            }}>✓</span>
            <span>نقداً Cash</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              border: '2px solid #333', 
              display: 'inline-block',
              textAlign: 'center',
              lineHeight: '14px',
              backgroundColor: paymentMethod === 'check' ? '#1e3a8a' : 'white',
              color: paymentMethod === 'check' ? 'white' : 'transparent'
            }}>✓</span>
            <span>شيك Cheque</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ 
              width: '18px', 
              height: '18px', 
              border: '2px solid #333', 
              display: 'inline-block',
              textAlign: 'center',
              lineHeight: '14px',
              backgroundColor: paymentMethod === 'bank_transfer' ? '#1e3a8a' : 'white',
              color: paymentMethod === 'bank_transfer' ? 'white' : 'transparent'
            }}>✓</span>
            <span>تحويل Transfer</span>
          </span>
        </div>
      </div>

      {/* التذييل */}
      <footer style={{
        marginTop: '50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '0 30px'
      }}>
        
        {/* المستلم */}
        <div style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '50px' }}>المستلم Receiver</p>
          <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '5px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المحاسب */}
        <div style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '50px' }}>المحاسب Accountant</p>
          <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '5px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>

        {/* المدير العام */}
        <div style={{ textAlign: 'center', width: '30%' }}>
          <p style={{ fontWeight: 'bold', color: '#1e3a8a' }}>المدير العام General Manager</p>
          <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937', margin: '5px 0 40px 0' }}>{managerName}</p>
          <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '5px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>التوقيع Signature</p>
          </div>
        </div>
      </footer>

      {/* تذييل الصفحة */}
      <div style={{
        position: 'absolute',
        bottom: '5mm',
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
