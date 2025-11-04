import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Pause, AlertCircle, XCircle, RefreshCw, FileText, FileQuestion } from "lucide-react"

interface ContractStatusBadgeProps {
  status: string
  className?: string
  onClick?: () => void
  clickable?: boolean
}

export const ContractStatusBadge = ({ status, className, onClick, clickable = false }: ContractStatusBadgeProps) => {
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
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
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
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
          icon: FileText,
          label: status
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className} ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}