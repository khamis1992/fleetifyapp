import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Pause, AlertCircle, XCircle, RefreshCw, FileText, FileQuestion, Scale } from "lucide-react"

interface ContractStatusBadgeProps {
  status: string
  legalStatus?: string | null
  className?: string
  onClick?: (e?: React.MouseEvent) => void
  clickable?: boolean
}

export const ContractStatusBadge = ({ status, legalStatus, className, onClick, clickable = false }: ContractStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
          icon: CheckCircle,
          label: 'نشط'
        }
      case 'draft':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
          icon: Clock,
          label: 'مسودة'
        }
      case 'under_review':
        return {
          variant: 'outline' as const,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
          icon: FileQuestion,
          label: 'تحت التدقيق - معلومات ناقصة'
        }
      case 'expired':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
          icon: AlertCircle,
          label: 'منتهي الصلاحية'
        }
      case 'suspended':
        return {
          variant: 'outline' as const,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
          icon: Pause,
          label: 'معلق'
        }
      case 'cancelled':
        return {
          variant: 'outline' as const,
          className: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
          icon: XCircle,
          label: 'ملغي'
        }
      case 'renewed':
        return {
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          icon: RefreshCw,
          label: 'مجدد'
        }
      case 'under_legal_procedure':
        return {
          variant: 'destructive' as const,
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-300',
          icon: Scale,
          label: 'تحت الإجراء القانوني'
        }
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
          icon: FileText,
          label: status
        }
    }
  }

  const getLegalStatusConfig = (legalStatus: string) => {
    switch (legalStatus) {
      case 'under_legal_action':
        return {
          variant: 'destructive' as const,
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-300',
          icon: Scale,
          label: 'تحت الإجراء القانوني'
        }
      case 'legal_case_filed':
        return {
          variant: 'destructive' as const,
          className: 'bg-purple-200 text-purple-900 hover:bg-purple-200 border-purple-400',
          icon: Scale,
          label: 'تم رفع دعوى'
        }
      case 'in_court':
        return {
          variant: 'destructive' as const,
          className: 'bg-purple-300 text-purple-950 hover:bg-purple-300 border-purple-500',
          icon: Scale,
          label: 'في المحكمة'
        }
      case 'judgment_issued':
        return {
          variant: 'destructive' as const,
          className: 'bg-indigo-200 text-indigo-900 hover:bg-indigo-200 border-indigo-400',
          icon: Scale,
          label: 'صدر حكم'
        }
      case 'execution_phase':
        return {
          variant: 'destructive' as const,
          className: 'bg-indigo-300 text-indigo-950 hover:bg-indigo-300 border-indigo-500',
          icon: Scale,
          label: 'مرحلة التنفيذ'
        }
      case 'settled':
        return {
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          icon: CheckCircle,
          label: 'تم التسوية'
        }
      case 'closed':
        return {
          variant: 'outline' as const,
          className: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
          icon: XCircle,
          label: 'مغلق'
        }
      default:
        return null
    }
  }

  // معالجة حالة العقود التي status = 'under_legal_procedure' (من الكود القديم)
  // يجب عرضها كـ "نشط" + "تحت الإجراء القانوني"
  const isLegacyLegalProcedure = status === 'under_legal_procedure'
  const displayStatus = isLegacyLegalProcedure ? 'active' : status
  const effectiveLegalStatus = isLegacyLegalProcedure ? 'under_legal_action' : legalStatus

  const config = getStatusConfig(displayStatus)
  const Icon = config.icon

  // إذا كان هناك حالة قانونية، عرض الحالتين
  if (effectiveLegalStatus) {
    const legalConfig = getLegalStatusConfig(effectiveLegalStatus)
    if (legalConfig) {
      const LegalIcon = legalConfig.icon
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge 
            variant={config.variant} 
            className={`${config.className} ${className} ${clickable ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all' : ''}`}
            onClick={clickable ? (e) => onClick?.(e) : undefined}
          >
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          <Badge 
            variant={legalConfig.variant} 
            className={`${legalConfig.className} ${className} ${clickable ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all' : ''}`}
            onClick={clickable ? (e) => onClick?.(e) : undefined}
          >
            <LegalIcon className="h-3 w-3 mr-1" />
            {legalConfig.label}
          </Badge>
        </div>
      )
    }
  }

  // إذا لم يكن هناك حالة قانونية، عرض الحالة الأساسية فقط
  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className} ${clickable ? 'cursor-pointer hover:opacity-80 hover:scale-105 transition-all' : ''}`}
      onClick={clickable ? (e) => onClick?.(e) : undefined}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}