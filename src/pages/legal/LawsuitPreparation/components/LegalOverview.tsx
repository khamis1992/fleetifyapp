import { motion } from 'framer-motion';
import { AlertTriangle, Car, Coins, FileText, Receipt, ShieldAlert, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { useLawsuitPreparationContext } from '../store';

function formatQar(amount?: number | null) {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ar-QA');
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="lawsuit-info-row">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function AmountTile({ label, value, tone = 'default' }: { label: string; value?: number | null; tone?: 'default' | 'danger' | 'warning' | 'total' }) {
  return (
    <div className={`lawsuit-amount-tile is-${tone}`}>
      <span>{label}</span>
      <strong>{formatQar(value)}</strong>
    </div>
  );
}

export function LegalOverview() {
  const { state } = useLawsuitPreparationContext();
  const { calculations, contract, customer, overdueInvoices, trafficViolations, vehicle } = state;

  if (!contract || !calculations) {
    return (
      <div className="lawsuit-empty-panel">
        <strong>جاري تجهيز بيانات القضية</strong>
        <span>سيتم عرض ملخص العقد والمبالغ فور تحميل البيانات.</span>
      </div>
    );
  }

  const customerName = formatCustomerName(customer) || 'غير محدد';
  const vehicleName = vehicle ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') : 'غير محدد';
  const plateNumber = vehicle?.plate_number || contract.license_plate || 'غير محدد';

  return (
    <motion.div className="lawsuit-overview-redesign" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading">
          <div>
            <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">لوحة القضية</Badge>
            <h2>العميل والعقد والمبالغ</h2>
            <p>مراجعة مركزة للبيانات التي ستدخل في المستندات الرسمية وبيانات التقاضي.</p>
          </div>
          <div className="lawsuit-case-value">
            <span>قيمة المطالبة</span>
            <strong>{formatQar(calculations.total)}</strong>
          </div>
        </div>

        <div className="lawsuit-overview-grid">
          <article className="lawsuit-data-card">
            <div className="lawsuit-data-card-title">
              <UserRound className="h-5 w-5" />
              <h3>بيانات العميل</h3>
            </div>
            <InfoRow label="الاسم" value={customerName} />
            <InfoRow label="الرقم الشخصي" value={customer?.national_id} />
            <InfoRow label="الهاتف" value={customer?.phone} />
            <InfoRow label="الجنسية" value={customer?.nationality || customer?.country} />
          </article>

          <article className="lawsuit-data-card">
            <div className="lawsuit-data-card-title">
              <FileText className="h-5 w-5" />
              <h3>بيانات العقد</h3>
            </div>
            <InfoRow label="رقم العقد" value={contract.contract_number} />
            <InfoRow label="تاريخ البداية" value={formatDate(contract.start_date)} />
            <InfoRow label="تاريخ النهاية" value={formatDate(contract.end_date)} />
            <InfoRow label="القيمة الشهرية" value={formatQar(contract.monthly_amount)} />
          </article>

          <article className="lawsuit-data-card">
            <div className="lawsuit-data-card-title">
              <Car className="h-5 w-5" />
              <h3>بيانات المركبة</h3>
            </div>
            <InfoRow label="المركبة" value={vehicleName} />
            <InfoRow label="رقم اللوحة" value={plateNumber} />
            <InfoRow label="اللون" value={vehicle?.color} />
            <InfoRow label="رقم الشاصي" value={vehicle?.vin} />
          </article>
        </div>
      </section>

      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading compact">
          <div>
            <h2>ملخص المطالبة المالية</h2>
            <p>الأرقام المعتمدة لتوليد المذكرة الشارحة وكشف المطالبات.</p>
          </div>
          <Badge variant="outline">{overdueInvoices.length} فاتورة متأخرة</Badge>
        </div>

        <div className="lawsuit-amount-grid">
          <AmountTile label="الإيجار المتأخر" value={calculations.overdueRent} tone="danger" />
          <AmountTile label="غرامات التأخير" value={calculations.lateFees} tone="warning" />
          <AmountTile label="رسوم الأضرار" value={calculations.damagesFee} />
          <AmountTile label="المخالفات المرورية" value={calculations.violationsFines} tone="danger" />
          <AmountTile label="الإجمالي" value={calculations.total} tone="total" />
        </div>
      </section>

      <section className="lawsuit-signal-grid">
        <article>
          <Receipt className="h-5 w-5" />
          <span>الفواتير غير المسددة</span>
          <strong>{overdueInvoices.length}</strong>
          <small>متوسط التأخير {calculations.avgDaysOverdue || 0} يوم</small>
        </article>
        <article>
          <AlertTriangle className="h-5 w-5" />
          <span>المخالفات المرورية</span>
          <strong>{trafficViolations.length}</strong>
          <small>{formatQar(calculations.violationsFines)}</small>
        </article>
        <article>
          <ShieldAlert className="h-5 w-5" />
          <span>جاهزية الإجراء</span>
          <strong>{calculations.total > 0 ? 'توجد مطالبة' : 'لا توجد مطالبة'}</strong>
          <small>راجع الحافظة قبل الإغلاق</small>
        </article>
        <article>
          <Coins className="h-5 w-5" />
          <span>المبلغ كتابة</span>
          <strong>{calculations.amountInWords || '-'}</strong>
          <small>بالريال القطري</small>
        </article>
      </section>
    </motion.div>
  );
}

export default LegalOverview;
