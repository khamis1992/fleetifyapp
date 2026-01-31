/**
 * Legal Header Component
 * رأس الصفحة القانونية
 * 
 * Professional legal header with case title, progress, and navigation
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Gavel, 
  ArrowLeft, 
  Scale, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLawsuitPreparationContext } from '../store';
import { formatCustomerName } from '@/utils/formatCustomerName';

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function LegalHeader() {
  const navigate = useNavigate();
  const { state } = useLawsuitPreparationContext();
  const { contract, customer, vehicle, calculations, documents } = state;
  
  // Calculate document readiness
  const mandatoryDocs = ['memo', 'claims', 'docsList', 'contract', 'commercialRegister', 'ibanCertificate', 'representativeId'] as const;
  const readyCount = mandatoryDocs.filter(docId => documents[docId]?.status === 'ready').length;
  const totalCount = mandatoryDocs.length;
  const progress = Math.round((readyCount / totalCount) * 100);
  
  // Get status color and icon
  const getStatusInfo = () => {
    if (progress === 100) return { 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      label: 'جاهز للتقديم'
    };
    if (progress >= 50) return {
      color: 'text-teal-500',
      bg: 'bg-teal-600/10',
      border: 'border-teal-600/30',
      icon: Clock,
      label: 'قيد التجهيز'
    };
    return { 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      icon: AlertTriangle,
      label: 'يبدأ التجهيز'
    };
  };
  
  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  
  return (
    <div className="legal-header">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-600/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-100/50 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
      
      {/* Main Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-gradient-to-br from-slate-50 via-white to-white border border-slate-200 rounded-2xl p-8 shadow-2xl shadow-slate-200/50"
      >
        {/* Top Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
            
            <div className="h-6 w-px bg-slate-300" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/legal/lawsuit-data')}
              className="text-teal-600 hover:text-teal-500 hover:bg-teal-600/10"
            >
              <Scale className="h-4 w-4 ml-2" />
              جميع القضايا
            </Button>
          </div>
          
          {/* Status Badge */}
          <div className={`
            flex items-center gap-2 px-4 py-2 rounded-full border
            ${statusInfo.bg} ${statusInfo.border} ${statusInfo.color}
          `}>
            <StatusIcon className="h-4 w-4" />
            <span className="font-semibold text-sm">{statusInfo.label}</span>
            <span className="text-xs opacity-70">({readyCount}/{totalCount})</span>
          </div>
        </div>
        
        {/* Title Section */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600/20 to-teal-700/20 border border-teal-600/30 flex items-center justify-center shadow-lg shadow-teal-600/10">
              <Gavel className="h-10 w-10 text-teal-600" />
            </div>
          </div>
          
          {/* Title Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              تجهيز الدعوى القضائية
            </h1>
            <p className="text-slate-600 text-lg mb-4">
              إعداد وتحضير المستندات القانونية لرفع دعوى تحصيل المستحقات
            </p>
            
            {/* Contract & Customer Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <FileText className="h-4 w-4 text-teal-600" />
                <span>عقد: <span className="font-semibold text-slate-800">{contract?.contract_number}</span></span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-teal-600">العميل:</span>
                <span className="font-semibold text-slate-800">{formatCustomerName(customer)}</span>
              </div>

              {vehicle && (
                <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-teal-600">السيارة:</span>
                  <span className="font-semibold text-slate-800">
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Amount Card */}
          {calculations && (
            <div className="flex-shrink-0">
              <div className="bg-gradient-to-br from-teal-600/10 to-teal-700/5 border border-teal-600/30 rounded-xl p-6 min-w-[200px]">
                <div className="text-teal-600/70 text-sm mb-1">إجمالي المطالبة</div>
                <div className="text-3xl font-bold text-teal-600">
                  {formatCurrency(calculations.total)}
                </div>
                <div className="text-xs text-teal-600/50 mt-2">ريال قطري</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress Section */}
        <div className="bg-slate-100 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-700 font-semibold">تقدم إعداد المستندات</span>
            <span className={`font-bold ${statusInfo.color}`}>{progress}%</span>
          </div>
          <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`
                absolute inset-y-0 right-0 rounded-full
                ${progress === 100 ? 'bg-gradient-to-l from-emerald-500 to-emerald-400' :
                  progress >= 50 ? 'bg-gradient-to-l from-teal-600 to-teal-500' :
                  'bg-gradient-to-l from-rose-500 to-rose-400'}
              `}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            <span>المستندات الجاهزة: {readyCount}</span>
            <span>المتبقي: {totalCount - readyCount}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default LegalHeader;
