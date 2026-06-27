/**
 * LegalTaqadi Component - Court System Data Display
 * مكون بيانات تقاضي - عرض بيانات نظام المحاكم
 * 
 * Displays organized Taqadi data with copy-to-clipboard functionality
 * in a professional legal theme with dark slate background.
 */

import { motion } from 'framer-motion';
import { 
  Gavel, 
  Copy, 
  Check, 
  FileText, 
  User, 
  Car, 
  Calendar,
  CreditCard,
  Hash,
  Globe,
  Phone,
  Mail,
  MapPin,
  Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLawsuitPreparationContext } from '../store';

// ==========================================
// Copyable Field Component
// ==========================================

interface CopyableFieldProps {
  label: string;
  value: string;
  fieldId: string;
  icon?: React.ReactNode;
  isMultiline?: boolean;
  className?: string;
}

function CopyableField({ 
  label, 
  value, 
  fieldId, 
  icon, 
  isMultiline = false,
  className = ''
}: CopyableFieldProps) {
  const { state, actions } = useLawsuitPreparationContext();
  const isCopied = state.ui.copiedField === fieldId;
  const displayValue = value || 'غير محدد';
  
  return (
    <div
      className={`
        group relative p-4 bg-slate-100 rounded-xl
        border border-slate-200 hover:border-slate-300
        transition-all duration-200
        ${isMultiline ? '' : 'flex items-center justify-between'}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-teal-600/70">{icon}</span>}
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">{label}</p>
        </div>
        <p
          className={`
            text-slate-900 font-semibold
            ${isMultiline ? 'text-sm whitespace-pre-wrap leading-relaxed' : 'text-base truncate'}
          `}
          dir="auto"
        >
          {displayValue}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => actions.copyToClipboard(value || '', fieldId)}
        className={`
          flex-shrink-0 mr-2 opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          ${isCopied ? 'opacity-100' : ''}
          hover:bg-slate-200 text-slate-500 hover:text-slate-800
        `}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ==========================================
// Section Card Component
// ==========================================

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

function SectionCard({ title, icon, children, delay = 0 }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-slate-50 border-slate-200 overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 bg-white">
          <CardTitle className="text-lg flex items-center gap-3 text-slate-900">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600/20 to-teal-700/20
                          border border-teal-600/30 flex items-center justify-center">
              {icon}
            </div>
            <span className="font-bold">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function LegalTaqadi() {
  const { state } = useLawsuitPreparationContext();
  const { taqadiData } = state;
  
  if (!taqadiData) {
    return (
      <div className="p-8 text-center text-slate-600">
        <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>جاري تحميل بيانات التقاضي...</p>
      </div>
    );
  }
  
  const { caseTitle, facts, claims, amount, amountInWords, defendant, contract, vehicle } = taqadiData;
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600/20 to-teal-700/20
                       border border-teal-600/30 flex items-center justify-center shadow-lg shadow-teal-600/10">
          <Gavel className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">بيانات نظام التقاضي</h2>
          <p className="text-slate-600 text-sm">بيانات جاهزة للنسخ إلى نظام المحاكم الإلكتروني</p>
        </div>
      </motion.div>
      
      {/* Case Data Section */}
      <SectionCard
        title="بيانات الدعوى"
        icon={<FileText className="h-5 w-5 text-teal-600" />}
        delay={0.1}
      >
        <CopyableField
          label="عنوان الدعوى"
          value={caseTitle}
          fieldId="case-title"
          icon={<Briefcase className="h-4 w-4" />}
        />
        
        <CopyableField
          label="الوقائع"
          value={facts}
          fieldId="case-facts"
          icon={<FileText className="h-4 w-4" />}
          isMultiline
        />
        
        <CopyableField
          label="الطلبات / المطالبات"
          value={claims}
          fieldId="case-claims"
          icon={<Gavel className="h-4 w-4" />}
          isMultiline
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="المبلغ المطالب به"
            value={`${Math.round(amount)} QAR`}
            fieldId="case-amount"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <CopyableField
            label="المبلغ كتابةً"
            value={amountInWords}
            fieldId="case-amount-words"
            icon={<FileText className="h-4 w-4" />}
          />
        </div>
      </SectionCard>
      
      {/* Defendant Data Section */}
      <SectionCard
        title="بيانات المدعى عليه"
        icon={<User className="h-5 w-5 text-teal-600" />}
        delay={0.2}
      >
        <CopyableField
          label="الاسم الكامل"
          value={defendant.fullName}
          fieldId="defendant-fullname"
          icon={<User className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CopyableField
            label="الاسم الأول"
            value={defendant.firstName || ''}
            fieldId="defendant-firstname"
          />
          <CopyableField
            label="الاسم الأوسط"
            value={defendant.middleName || ''}
            fieldId="defendant-middlename"
          />
          <CopyableField
            label="اسم العائلة"
            value={defendant.lastName || ''}
            fieldId="defendant-lastname"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="رقم الهوية / جواز السفر"
            value={defendant.idNumber || ''}
            fieldId="defendant-id"
            icon={<Hash className="h-4 w-4" />}
          />
          <CopyableField
            label="نوع الهوية"
            value={defendant.idType || ''}
            fieldId="defendant-id-type"
            icon={<CreditCard className="h-4 w-4" />}
          />
        </div>
        
        <CopyableField
          label="الجنسية"
          value={defendant.nationality || ''}
          fieldId="defendant-nationality"
          icon={<Globe className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="رقم الهاتف"
            value={defendant.phone || ''}
            fieldId="defendant-phone"
            icon={<Phone className="h-4 w-4" />}
          />
          <CopyableField
            label="البريد الإلكتروني"
            value={defendant.email || ''}
            fieldId="defendant-email"
            icon={<Mail className="h-4 w-4" />}
          />
        </div>
        
        <CopyableField
          label="العنوان"
          value={defendant.address || ''}
          fieldId="defendant-address"
          icon={<MapPin className="h-4 w-4" />}
          isMultiline
        />
      </SectionCard>
      
      {/* Contract Data Section */}
      <SectionCard
        title="بيانات العقد"
        icon={<Briefcase className="h-5 w-5 text-teal-600" />}
        delay={0.3}
      >
        <CopyableField
          label="رقم العقد"
          value={contract.contractNumber}
          fieldId="contract-number"
          icon={<Hash className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="تاريخ بدء العقد"
            value={new Date(contract.startDate).toLocaleDateString('ar-QA')}
            fieldId="contract-start"
            icon={<Calendar className="h-4 w-4" />}
          />
          <CopyableField
            label="تاريخ انتهاء العقد"
            value={contract.endDate 
              ? new Date(contract.endDate).toLocaleDateString('ar-QA')
              : 'غير محدد'
            }
            fieldId="contract-end"
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>
        
        <CopyableField
          label="القيمة الإيجارية الشهرية"
          value={contract.monthlyAmount 
            ? `${Math.round(contract.monthlyAmount)} QAR`
            : 'غير محدد'
          }
          fieldId="contract-monthly"
          icon={<CreditCard className="h-4 w-4" />}
        />
      </SectionCard>
      
      {/* Vehicle Data Section */}
      <SectionCard
        title="بيانات السيارة"
        icon={<Car className="h-5 w-5 text-teal-600" />}
        delay={0.4}
      >
        <CopyableField
          label="الوصف الكامل"
          value={vehicle.fullDescription}
          fieldId="vehicle-full"
          icon={<Car className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="الماركة"
            value={vehicle.make || ''}
            fieldId="vehicle-make"
          />
          <CopyableField
            label="الموديل"
            value={vehicle.model || ''}
            fieldId="vehicle-model"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CopyableField
            label="سنة الصنع"
            value={vehicle.year ? String(vehicle.year) : ''}
            fieldId="vehicle-year"
          />
          <CopyableField
            label="رقم اللوحة"
            value={vehicle.plateNumber || ''}
            fieldId="vehicle-plate"
          />
          <CopyableField
            label="اللون"
            value={vehicle.color || ''}
            fieldId="vehicle-color"
          />
        </div>
        
        <CopyableField
          label="رقم الشاسيه (VIN)"
          value={vehicle.vin || ''}
          fieldId="vehicle-vin"
          icon={<Hash className="h-4 w-4" />}
        />
      </SectionCard>
      
    </div>
  );
}

export default LegalTaqadi;
