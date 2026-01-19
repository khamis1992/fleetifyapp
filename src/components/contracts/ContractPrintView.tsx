/**
 * مكون صفحة طباعة العقد الكاملة
 * Contract Print View Component
 * 
 * يعرض ملخص العقد + العقد الرسمي الكامل للطباعة
 * @component ContractPrintView
 */

import { useMemo } from 'react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  FileText, 
  User, 
  Car, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Clock,
  Circle,
  Check,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileCheck,
  PenTool,
  ShieldCheck,
  FileBadge,
  Info
} from 'lucide-react';
import { AlarafOfficialContractComplete } from './AlarafOfficialContractComplete';
import type { Contract } from '@/types/contracts';
import './ContractPrintView.css';

interface ContractPrintViewProps {
  contract: Contract & {
    customer?: any;
    vehicle?: any;
  };
}

export const ContractPrintView: React.FC<ContractPrintViewProps> = ({ contract }) => {
  // حساب جدول الدفعات
  // ✅ إصلاح: حساب الأشهر المتأخرة بناءً على تاريخ الاستحقاق
  const paymentSchedule = useMemo(() => {
    if (!contract.start_date || !contract.monthly_amount) return [];

    const monthlyAmount = contract.monthly_amount;
    const totalAmount = contract.contract_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const numberOfPayments = Math.ceil(totalAmount / monthlyAmount);
    const schedule = [];

    const startDate = new Date(contract.start_date);
    const firstMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // حساب عدد الأشهر المدفوعة بناءً على المبلغ الإجمالي
    const fullyPaidMonths = Math.floor(totalPaid / monthlyAmount);

    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = addMonths(firstMonth, i);
      const dueDateOnly = new Date(dueDate);
      dueDateOnly.setHours(0, 0, 0, 0);
      
      let status: 'paid' | 'overdue' | 'pending' | 'upcoming';
      
      if (i < fullyPaidMonths) {
        status = 'paid';
      } else if (dueDateOnly < today) {
        status = 'overdue'; // متأخر - تاريخ الاستحقاق مضى ولم يُدفع
      } else if (dueDateOnly.getTime() === today.getTime()) {
        status = 'pending';
      } else {
        status = 'upcoming';
      }
      
      schedule.push({
        number: i + 1,
        dueDate,
        amount: monthlyAmount,
        status,
      });
    }

    return schedule;
  }, [contract]);

  // حساب الإحصائيات المالية
  const financialStats = useMemo(() => {
    const totalAmount = contract.contract_amount || 0;
    const monthlyAmount = contract.monthly_amount || 0;
    const totalPaid = contract.total_paid || 0;
    const balanceDue = totalAmount - totalPaid;
    
    const totalPayments = monthlyAmount > 0 ? Math.ceil(totalAmount / monthlyAmount) : 0;
    const paidPayments = monthlyAmount > 0 ? Math.floor(totalPaid / monthlyAmount) : 0;
    const percentage = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

    return {
      totalAmount,
      monthlyAmount,
      totalPaid,
      balanceDue,
      totalPayments,
      paidPayments,
      percentage,
    };
  }, [contract]);

  // تنسيق اسم العميل
  const customerName = useMemo(() => {
    if (!contract.customer) return '-';
    if (contract.customer.customer_type === 'corporate') {
      return contract.customer.company_name_ar || contract.customer.company_name || '-';
    }
    const firstName = contract.customer.first_name_ar || contract.customer.first_name || '';
    const lastName = contract.customer.last_name_ar || contract.customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || '-';
  }, [contract.customer]);

  // معلومات السيارة
  const vehicleInfo = useMemo(() => {
    if (!contract.vehicle) return '-';
    return `${contract.vehicle.make} ${contract.vehicle.model}`;
  }, [contract.vehicle]);

  // التاريخ الحالي
  const printDate = useMemo(() => {
    return format(new Date(), 'dd MMMM yyyy', { locale: ar });
  }, []);

  // مدة العقد
  const contractDuration = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return '-';
    const days = differenceInDays(new Date(contract.end_date), new Date(contract.start_date));
    const months = Math.round(days / 30);
    return `${days} يوماً (${months} شهر)`;
  }, [contract.start_date, contract.end_date]);

  return (
    <div className="contract-print-view">
      {/* صفحة 1: الملخص */}
      <div className="print-container animate-fade-in">
        
        {/* الترويسة */}
        <div className="print-header">
          <h1 className="company-name">العراف لتأجير السيارات</h1>
          <p className="company-name-en">Alaraf Car Rental</p>
          
          <div className="company-info">
            <div className="company-info-item">
              <MapPin size={16} />
              <span>الدوحة، دولة قطر</span>
            </div>
            <div className="company-info-item">
              <Phone size={16} />
              <span className="ltr">31151919</span>
            </div>
            <div className="company-info-item">
              <Mail size={16} />
              <span>info@alaraf.online</span>
            </div>
            <div className="company-info-item">
              <Globe size={16} />
              <span>www.alaraf.online</span>
            </div>
          </div>
        </div>
        
        {/* عنوان العقد */}
        <div className="contract-title">
          <h2>
            <FileText size={24} />
            ملخص تفاصيل العقد
          </h2>
          <p className="contract-subtitle">Contract Details Summary</p>
          
          <div className="contract-meta">
            <div>
              <strong>رقم العقد:</strong>
              <span className="font-mono ltr">{contract.contract_number}</span>
            </div>
            <div>
              <strong>تاريخ الطباعة:</strong>
              <span>{printDate}</span>
            </div>
          </div>
        </div>
        
        {/* معلومات العقد الأساسية */}
        <div className="card animate-card">
          <div className="card-header">
            <div className="card-icon">
              <FileText size={20} />
            </div>
            <h3 className="card-title">معلومات العقد الأساسية</h3>
          </div>
          <div className="card-content">
            <div className="info-row">
              <span className="info-label">رقم العقد</span>
              <span className="info-value mono ltr">{contract.contract_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">نوع العقد</span>
              <span className="info-value">{contract.contract_type === 'rental' ? 'إيجار سيارة' : contract.contract_type}</span>
            </div>
            <div className="info-row">
              <span className="info-label">تاريخ التوقيع</span>
              <span className="info-value">
                {contract.contract_date ? format(new Date(contract.contract_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">تاريخ البدء</span>
              <span className="info-value">
                {contract.start_date ? format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">تاريخ الانتهاء</span>
              <span className="info-value">
                {contract.end_date ? format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">مدة العقد</span>
              <span className="info-value">{contractDuration}</span>
            </div>
            <div className="info-row">
              <span className="info-label">الحالة</span>
              <span className="info-value">
                <span className={`badge badge-${contract.status === 'active' ? 'active' : 'pending'}`}>
                  <CheckCircle size={14} />
                  {contract.status === 'active' ? 'نشط' : contract.status}
                </span>
              </span>
            </div>
          </div>
        </div>
        
        {/* معلومات الأطراف والمركبة */}
        <div className="grid grid-2">
          {/* معلومات العميل */}
          <div className="card animate-card">
            <div className="card-header">
              <div className="card-icon">
                <User size={20} />
              </div>
              <h3 className="card-title">الطرف الأول (المستأجر)</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">الاسم</span>
                <span className="info-value">{customerName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">رقم العميل</span>
                <span className="info-value mono ltr">{contract.customer?.customer_code || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">نوع العميل</span>
                <span className="info-value">
                  {contract.customer?.customer_type === 'corporate' ? 'شركة' : 'فرد'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">رقم الهوية</span>
                <span className="info-value mono ltr">{contract.customer?.national_id || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">الجوال</span>
                <span className="info-value mono ltr">{contract.customer?.phone || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">البريد الإلكتروني</span>
                <span className="info-value ltr">{contract.customer?.email || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">العنوان</span>
                <span className="info-value">{contract.customer?.address || 'الدوحة، دولة قطر'}</span>
              </div>
            </div>
          </div>
          
          {/* معلومات المركبة */}
          <div className="card animate-card">
            <div className="card-header">
              <div className="card-icon">
                <Car size={20} />
              </div>
              <h3 className="card-title">معلومات المركبة</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">النوع</span>
                <span className="info-value">{vehicleInfo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">الموديل</span>
                <span className="info-value">{contract.vehicle?.year || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">رقم اللوحة</span>
                <span className="info-value mono">{contract.vehicle?.plate_number || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">اللون</span>
                <span className="info-value">{contract.vehicle?.color || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">رقم الهيكل</span>
                <span className="info-value mono ltr">{contract.vehicle?.vin_number || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">الحالة</span>
                <span className="info-value">
                  <span className="badge badge-active">{contract.vehicle?.status || '-'}</span>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">التأمين</span>
                <span className="info-value">ساري حتى {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* الملخص المالي */}
        <div className="financial-summary animate-card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} />
            الملخص المالي
          </h3>
          
          <div className="financial-row">
            <span className="financial-label">قيمة العقد الإجمالية</span>
            <span className="financial-value">{financialStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.ق</span>
          </div>
          
          <div className="financial-row">
            <span className="financial-label">المبلغ الشهري</span>
            <span className="financial-value">{financialStats.monthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.ق</span>
          </div>
          
          <div className="financial-row">
            <span className="financial-label">عدد الدفعات الكلي</span>
            <span className="financial-value">{financialStats.totalPayments} دفعة</span>
          </div>
          
          <div style={{ borderTop: '1px dashed #D1D5DB', margin: '1rem 0' }}></div>
          
          <div className="financial-row">
            <span className="financial-label">المبلغ المدفوع</span>
            <span className="financial-value" style={{ color: '#059669' }}>{financialStats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.ق</span>
          </div>
          
          <div className="financial-row">
            <span className="financial-label">عدد الدفعات المدفوعة</span>
            <span className="financial-value" style={{ color: '#059669' }}>{financialStats.paidPayments} دفعات</span>
          </div>
          
          <div style={{ borderTop: '1px dashed #D1D5DB', margin: '1rem 0' }}></div>
          
          <div className="financial-row total">
            <span className="financial-label">المبلغ المتبقي</span>
            <span className="financial-value">{financialStats.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.ق</span>
          </div>
          
          <div className="financial-row">
            <span className="financial-label">الدفعات المتبقية</span>
            <span className="financial-value">{financialStats.totalPayments - financialStats.paidPayments} دفعات</span>
          </div>
          
          {/* شريط التقدم */}
          <div className="progress-container">
            <div className="progress-label">
              <span>نسبة الإنجاز</span>
              <span className="font-bold">{financialStats.percentage}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${financialStats.percentage}%` }}>
                {financialStats.paidPayments} من {financialStats.totalPayments} دفعة
              </div>
            </div>
          </div>
        </div>
        
        {/* جدول الدفعات */}
        <div className="card animate-card">
          <div className="card-header">
            <div className="card-icon">
              <Calendar size={20} />
            </div>
            <h3 className="card-title">جدول الدفعات (ملخص)</h3>
          </div>
          <div className="card-content">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th className="table-number">#</th>
                    <th>تاريخ الاستحقاق</th>
                    <th className="table-amount">المبلغ</th>
                    <th>الحالة</th>
                    <th>تاريخ الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.map((payment) => (
                    <tr 
                      key={payment.number}
                      style={payment.status === 'pending' ? { background: '#FEF3C7' } : undefined}
                    >
                      <td className="table-number">{payment.number}</td>
                      <td>{format(payment.dueDate, 'dd MMMM yyyy', { locale: ar })}</td>
                      <td className="table-amount">
                        {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.ق
                      </td>
                      <td>
                        <span className={`badge badge-${payment.status === 'paid' ? 'paid' : payment.status === 'pending' ? 'pending' : 'unpaid'}`}>
                          {payment.status === 'paid' ? (
                            <><Check size={14} /> مدفوع</>
                          ) : payment.status === 'pending' ? (
                            <><Clock size={14} /> معلق</>
                          ) : (
                            <><Circle size={14} /> قادم</>
                          )}
                        </span>
                      </td>
                      <td>{payment.status === 'paid' ? format(payment.dueDate, 'dd MMMM yyyy', { locale: ar }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* أهم الشروط الأساسية */}
        <div className="card animate-card">
          <div className="card-header">
            <div className="card-icon">
              <FileCheck size={20} />
            </div>
            <h3 className="card-title">أهم الشروط الأساسية</h3>
          </div>
          <div className="card-content">
            <ul className="terms-list">
              <li>يلتزم المستأجر بدفع الأقساط الشهرية في مواعيدها المحددة دون تأخير</li>
              <li>المركبة مؤمنة بالكامل ضد جميع المخاطر طوال فترة العقد</li>
              <li>يتحمل المستأجر مسؤولية جميع المخالفات المرورية التي تحدث أثناء فترة الإيجار</li>
              <li>يجب إرجاع المركبة بنفس الحالة التي كانت عليها عند الاستلام (باستثناء التآكل الطبيعي)</li>
              <li>غرامة التأخير عن الدفع: 1.5% شهرياً من قيمة القسط المتأخر</li>
            </ul>
            
            <div className="terms-notice">
              <Info size={20} />
              <strong>للاطلاع على الشروط والأحكام الكاملة،</strong>
              يرجى مراجعة العقد الرسمي المرفق في الصفحات التالية
            </div>
          </div>
        </div>
        
        {/* التوقيعات */}
        <div className="signatures-section">
          <div className="signatures-grid">
            {/* توقيع المستأجر */}
            <div className="signature-box">
              <h4 className="signature-title">
                <PenTool size={20} />
                توقيع المستأجر
              </h4>
              <p className="signature-subtitle">(الطرف الأول)</p>
              
              <div className="signature-line"></div>
              
              <div className="signature-info">
                <div className="signature-field">
                  <span className="signature-field-label">الاسم:</span>
                  <span className="signature-field-value"></span>
                </div>
                <div className="signature-field">
                  <span className="signature-field-label">التاريخ:</span>
                  <span className="signature-field-value"></span>
                </div>
              </div>
            </div>
            
            {/* توقيع ممثل الشركة */}
            <div className="signature-box">
              <h4 className="signature-title">
                <PenTool size={20} />
                توقيع ممثل الشركة
              </h4>
              <p className="signature-subtitle">(الطرف الثاني)</p>
              
              <div className="signature-line"></div>
              
              <div className="signature-info">
                <div className="signature-field">
                  <span className="signature-field-label">الاسم:</span>
                  <span className="signature-field-value"></span>
                </div>
                <div className="signature-field">
                  <span className="signature-field-label">التاريخ:</span>
                  <span className="signature-field-value"></span>
                </div>
              </div>
            </div>
          </div>
          
          {/* الختم الرسمي */}
          <div className="official-seal">
            <div className="seal-box">
              <ShieldCheck size={48} />
              <div>الختم الرسمي</div>
            </div>
          </div>
        </div>
        
        {/* التذييل */}
        <div className="print-footer">
          <div className="footer-divider"></div>
          <p><strong>هذا العقد ملزم قانونياً للطرفين</strong></p>
          <p style={{ marginTop: '0.5rem', fontSize: '10pt' }}>
            للاستفسارات: info@alaraf.online | 31151919
          </p>
        </div>
        
      </div>
      
      {/* فاصل الصفحة */}
      <div className="page-break"></div>
      
      {/* صفحة 2-N: العقد الرسمي الكامل */}
      <div className="print-container">
        <div style={{ textAlign: 'center', padding: '3rem 0', background: 'linear-gradient(135deg, #FEE2E2 0%, #FFFFFF 100%)', borderRadius: '1rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', color: '#991B1B', marginBottom: '1rem' }}>
            <FileBadge size={32} style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '0.5rem' }} />
            العقد الرسمي الكامل
          </h2>
          <p style={{ color: '#4B5563', fontSize: '1.1rem' }}>
            عقد إيجار سيارة - العراف لتأجير السيارات
          </p>
          <p style={{ color: '#6B7280', marginTop: '1rem' }}>
            16 مادة قانونية + ملحقين تفصيليين
          </p>
        </div>
        
        {/* العقد الرسمي الكامل */}
        <AlarafOfficialContractComplete contract={contract} />
      </div>
    </div>
  );
};

export default ContractPrintView;

