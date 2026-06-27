import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, FileText, Scale, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { useLawsuitPreparationContext } from '../store';

const mandatoryDocIds = ['memo', 'claims', 'docsList', 'contract', 'commercialRegister', 'ibanCertificate', 'representativeId'] as const;

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

export function LegalHeader() {
  const navigate = useNavigate();
  const { state } = useLawsuitPreparationContext();
  const { calculations, contract, customer, documents, vehicle } = state;
  const readyCount = mandatoryDocIds.filter((docId) => documents[docId].status === 'ready').length;
  const readiness = Math.round((readyCount / mandatoryDocIds.length) * 100);
  const customerName = formatCustomerName(customer) || 'عميل غير محدد';
  const vehicleLabel = vehicle
    ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')
    : contract?.license_plate || 'مركبة غير محددة';

  return (
    <motion.header
      className="lawsuit-header-redesign"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="lawsuit-header-toolbar">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          رجوع
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate('/legal/cases?view=cases')} className="gap-2">
          <Scale className="h-4 w-4" />
          سجل القضايا
        </Button>
      </div>

      <div className="lawsuit-header-main">
        <div className="min-w-0">
          <Badge className="mb-3 bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">ملف تحصيل قانوني</Badge>
          <h2>ملف الدعوى لعقد {contract?.contract_number || '-'}</h2>
          <p>ملخص تنفيذي للعميل والعقد والمطالبة قبل تجهيز الحافظة وبيانات التقاضي.</p>
        </div>

        <div className="lawsuit-header-amount">
          <span>إجمالي المطالبة</span>
          <strong>{formatQar(calculations?.total)}</strong>
          <small>{readiness}% جاهزية المستندات</small>
        </div>
      </div>

      <div className="lawsuit-header-facts">
        <div>
          <UserRound className="h-4 w-4" />
          <span>العميل</span>
          <strong>{customerName}</strong>
        </div>
        <div>
          <FileText className="h-4 w-4" />
          <span>العقد</span>
          <strong>{contract?.contract_number || '-'}</strong>
        </div>
        <div>
          <BriefcaseBusiness className="h-4 w-4" />
          <span>المركبة</span>
          <strong>{vehicleLabel || '-'}</strong>
        </div>
        <div>
          <CalendarDays className="h-4 w-4" />
          <span>مدة العقد</span>
          <strong>{formatDate(contract?.start_date)} - {formatDate(contract?.end_date)}</strong>
        </div>
      </div>

      <div className="lawsuit-header-progress" aria-label="جاهزية المستندات">
        <span style={{ width: `${readiness}%` }} />
      </div>
    </motion.header>
  );
}

export default LegalHeader;
