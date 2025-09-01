import React, { useState } from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { getResponsiveProps } from '@/utils/responsiveUtils'
import { cn } from '@/lib/utils'
import {
  ResponsiveDataTable,
  ResponsiveCard,
  ResponsiveForm,
  ResponsiveInput,
  ResponsiveButton,
  ResponsiveModal,
  ResponsiveStats
} from '@/components/responsive/ResponsiveComponents'
import { ResponsiveLayout, AdaptiveGrid } from '@/components/responsive/ResponsiveLayouts'
import { FeatureGate } from '@/contexts/FeatureFlagsContext'
import {
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Car,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter
} from 'lucide-react'

// Contract data interfaces
interface Contract {
  id: string
  contractNumber: string
  customerName: string
  customerNameEn: string
  vehicleInfo: string
  contractType: string
  startDate: string
  endDate: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'active' | 'expired' | 'pending' | 'terminated'
  priority: 'critical' | 'important' | 'secondary' | 'optional'
}

// Contract statistics interface
interface ContractStats {
  totalContracts: number
  activeContracts: number
  expiredContracts: number
  pendingContracts: number
  totalRevenue: number
  monthlyRevenue: number
  averageContractValue: number
  renewalRate: number
}

// Props interfaces
interface ResponsiveContractsManagementProps {
  contracts: Contract[]
  stats: ContractStats
  onCreateContract: () => void
  onEditContract: (contract: Contract) => void
  onDeleteContract: (contractId: string) => void
  onViewContract: (contract: Contract) => void
  className?: string
}

interface ContractFormProps {
  contract?: Contract
  isOpen: boolean
  onClose: () => void
  onSave: (contract: Partial<Contract>) => void
}

interface ContractDetailsProps {
  contract: Contract
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

// Contract statistics component
function ContractStatistics({ stats }: { stats: ContractStats }) {
  const { deviceType } = useEnhancedResponsive()

  const statItems = [
    {
      title: 'إجمالي العقود',
      value: stats.totalContracts.toLocaleString('ar-SA'),
      change: '+12% من الشهر الماضي',
      trend: 'up' as const,
      icon: FileText,
      priority: 'critical' as const
    },
    {
      title: 'العقود النشطة',
      value: stats.activeContracts.toLocaleString('ar-SA'),
      change: '+5% من الشهر الماضي',
      trend: 'up' as const,
      icon: CheckCircle,
      priority: 'critical' as const
    },
    {
      title: 'العقود المنتهية',
      value: stats.expiredContracts.toLocaleString('ar-SA'),
      change: '-3% من الشهر الماضي',
      trend: 'down' as const,
      icon: AlertTriangle,
      priority: 'important' as const
    },
    {
      title: 'العقود المعلقة',
      value: stats.pendingContracts.toLocaleString('ar-SA'),
      change: '+8% من الشهر الماضي',
      trend: 'up' as const,
      icon: Clock,
      priority: 'important' as const
    },
    {
      title: 'إجمالي الإيرادات',
      value: `${stats.totalRevenue.toLocaleString('ar-SA')} ر.س`,
      change: '+15% من الشهر الماضي',
      trend: 'up' as const,
      icon: DollarSign,
      priority: 'critical' as const
    },
    {
      title: 'الإيرادات الشهرية',
      value: `${stats.monthlyRevenue.toLocaleString('ar-SA')} ر.س`,
      change: '+22% من الشهر الماضي',
      trend: 'up' as const,
      icon: Calendar,
      priority: 'important' as const
    },
    {
      title: 'متوسط قيمة العقد',
      value: `${stats.averageContractValue.toLocaleString('ar-SA')} ر.س`,
      change: '+7% من الشهر الماضي',
      trend: 'up' as const,
      icon: DollarSign,
      priority: 'secondary' as const
    },
    {
      title: 'معدل التجديد',
      value: `${stats.renewalRate}%`,
      change: '+4% من الشهر الماضي',
      trend: 'up' as const,
      icon: Users,
      priority: 'secondary' as const
    }
  ]

  // Filter stats based on device type
  const visibleStats = statItems.filter(stat => {
    if (deviceType === 'mobile') {
      return ['critical', 'important'].includes(stat.priority)
    }
    if (deviceType === 'tablet') {
      return ['critical', 'important', 'secondary'].includes(stat.priority)
    }
    return true
  })

  return <ResponsiveStats stats={visibleStats} />
}

// Contract form component
function ContractForm({ contract, isOpen, onClose, onSave }: ContractFormProps) {
  const { deviceType } = useEnhancedResponsive()
  const [formData, setFormData] = useState({
    contractNumber: contract?.contractNumber || '',
    customerName: contract?.customerName || '',
    vehicleInfo: contract?.vehicleInfo || '',
    contractType: contract?.contractType || '',
    startDate: contract?.startDate || '',
    endDate: contract?.endDate || '',
    totalAmount: contract?.totalAmount || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? 'تعديل العقد' : 'إضافة عقد جديد'}
      size={deviceType === 'mobile' ? 'sm' : 'lg'}
    >
      <ResponsiveForm
        onSubmit={handleSubmit}
        actions={
          <>
            <ResponsiveButton className="flex-1">
              {contract ? 'تحديث' : 'إضافة'}
            </ResponsiveButton>
            <ResponsiveButton 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              إلغاء
            </ResponsiveButton>
          </>
        }
      >
        <ResponsiveInput
          label="رقم العقد"
          value={formData.contractNumber}
          onChange={(value) => handleChange('contractNumber', value)}
          placeholder="أدخل رقم العقد"
        />

        <ResponsiveInput
          label="اسم العميل"
          value={formData.customerName}
          onChange={(value) => handleChange('customerName', value)}
          placeholder="أدخل اسم العميل"
        />

        <ResponsiveInput
          label="معلومات المركبة"
          value={formData.vehicleInfo}
          onChange={(value) => handleChange('vehicleInfo', value)}
          placeholder="أدخل معلومات المركبة"
        />

        <ResponsiveInput
          label="نوع العقد"
          value={formData.contractType}
          onChange={(value) => handleChange('contractType', value)}
          placeholder="أدخل نوع العقد"
        />

        <ResponsiveInput
          label="تاريخ البداية"
          type="date"
          value={formData.startDate}
          onChange={(value) => handleChange('startDate', value)}
        />

        <ResponsiveInput
          label="تاريخ الانتهاء"
          type="date"
          value={formData.endDate}
          onChange={(value) => handleChange('endDate', value)}
        />

        <ResponsiveInput
          label="المبلغ الإجمالي"
          type="number"
          value={formData.totalAmount.toString()}
          onChange={(value) => handleChange('totalAmount', parseFloat(value) || 0)}
          placeholder="أدخل المبلغ الإجمالي"
        />
      </ResponsiveForm>
    </ResponsiveModal>
  )
}

// Contract details modal
function ContractDetails({ contract, isOpen, onClose, onEdit, onDelete }: ContractDetailsProps) {
  const { isMobile } = useEnhancedResponsive()

  const getStatusBadge = (status: Contract['status']) => {
    const badges = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
      expired: { label: 'منتهي', color: 'bg-red-100 text-red-800' },
      pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
      terminated: { label: 'ملغي', color: 'bg-gray-100 text-gray-800' }
    }
    
    const badge = badges[status]
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', badge.color)}>
        {badge.label}
      </span>
    )
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل العقد"
      size={isMobile ? 'sm' : 'xl'}
    >
      <div className="space-y-6">
        {/* Contract Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{contract.contractNumber}</h3>
            {getStatusBadge(contract.status)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">اسم العميل</label>
              <p className="text-sm font-medium">{contract.customerName}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">معلومات المركبة</label>
              <p className="text-sm font-medium">{contract.vehicleInfo}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">نوع العقد</label>
              <p className="text-sm font-medium">{contract.contractType}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">المدة</label>
              <p className="text-sm font-medium">
                {new Date(contract.startDate).toLocaleDateString('ar-SA')} - {new Date(contract.endDate).toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <ResponsiveCard title="المعلومات المالية">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
              <p className="text-lg font-bold text-blue-600">
                {contract.totalAmount.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
              <p className="text-lg font-bold text-green-600">
                {contract.paidAmount.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-muted-foreground">المبلغ المتبقي</p>
              <p className="text-lg font-bold text-orange-600">
                {contract.remainingAmount.toLocaleString('ar-SA')} ر.س
              </p>
            </div>
          </div>
        </ResponsiveCard>

        {/* Actions */}
        <div className={cn(
          "flex gap-3 pt-4 border-t",
          isMobile && "flex-col"
        )}>
          <ResponsiveButton onClick={onEdit} className="flex-1">
            <Edit size={16} className="mr-2" />
            تعديل العقد
          </ResponsiveButton>
          
          <ResponsiveButton variant="outline" className="flex-1">
            <Download size={16} className="mr-2" />
            تحميل PDF
          </ResponsiveButton>
          
          <ResponsiveButton variant="destructive" onClick={onDelete} className="flex-1">
            <Trash2 size={16} className="mr-2" />
            حذف العقد
          </ResponsiveButton>
        </div>
      </div>
    </ResponsiveModal>
  )
}

// Main contracts management component
export function ResponsiveContractsManagement({
  contracts,
  stats,
  onCreateContract,
  onEditContract,
  onDeleteContract,
  onViewContract,
  className
}: ResponsiveContractsManagementProps) {
  const { deviceType, isMobile, getOptimalSpacing } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)
  
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Contract table columns configuration
  const columns = [
    {
      key: 'contractNumber',
      label: 'رقم العقد',
      priority: 'critical' as const,
      sortable: true,
      render: (value: string, row: Contract) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'customerName',
      label: 'اسم العميل',
      priority: 'critical' as const,
      sortable: true
    },
    {
      key: 'vehicleInfo',
      label: 'المركبة',
      priority: 'important' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Car size={16} className="text-muted-foreground" />
          <span className="text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'contractType',
      label: 'نوع العقد',
      priority: 'secondary' as const
    },
    {
      key: 'status',
      label: 'الحالة',
      priority: 'important' as const,
      render: (value: Contract['status']) => {
        const statusMap = {
          active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
          expired: { label: 'منتهي', color: 'bg-red-100 text-red-800' },
          pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
          terminated: { label: 'ملغي', color: 'bg-gray-100 text-gray-800' }
        }
        
        const status = statusMap[value]
        return (
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', status.color)}>
            {status.label}
          </span>
        )
      }
    },
    {
      key: 'totalAmount',
      label: 'المبلغ الإجمالي',
      priority: 'important' as const,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString('ar-SA')} ر.س</span>
      )
    },
    {
      key: 'endDate',
      label: 'تاريخ الانتهاء',
      priority: 'secondary' as const,
      render: (value: string) => new Date(value).toLocaleDateString('ar-SA')
    }
  ]

  // Table actions
  const actions = [
    {
      label: 'عرض',
      icon: Eye,
      onClick: (contract: Contract) => {
        setSelectedContract(contract)
        setIsDetailsOpen(true)
        onViewContract(contract)
      },
      variant: 'outline' as const
    },
    {
      label: 'تعديل',
      icon: Edit,
      onClick: (contract: Contract) => {
        setSelectedContract(contract)
        setIsFormOpen(true)
      },
      variant: 'outline' as const
    },
    {
      label: 'حذف',
      icon: Trash2,
      onClick: (contract: Contract) => {
        if (window.confirm('هل أنت متأكد من حذف هذا العقد؟')) {
          onDeleteContract(contract.id)
        }
      },
      variant: 'destructive' as const
    }
  ]

  // Filter contracts based on search
  const filteredContracts = contracts.filter(contract =>
    contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.vehicleInfo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <FeatureGate flag="responsiveContracts" fallback={<div>Loading original contracts view...</div>}>
      <ResponsiveLayout className={cn(getOptimalSpacing(), className)}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className={cn(
              "font-bold",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              إدارة العقود
            </h1>
            
            <div className={cn(
              "flex gap-2",
              isMobile && "flex-col w-full mt-4"
            )}>
              <ResponsiveButton onClick={onCreateContract}>
                <FileText size={16} className="mr-2" />
                عقد جديد
              </ResponsiveButton>
              
              <ResponsiveButton variant="outline">
                <Upload size={16} className="mr-2" />
                استيراد
              </ResponsiveButton>
              
              <ResponsiveButton variant="outline">
                <Download size={16} className="mr-2" />
                تصدير
              </ResponsiveButton>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <ContractStatistics stats={stats} />
        </div>

        {/* Contracts Table */}
        <ResponsiveCard title="قائمة العقود">
          <ResponsiveDataTable
            data={filteredContracts}
            columns={columns}
            actions={actions}
            searchable
            filterable
          />
        </ResponsiveCard>

        {/* Contract Form Modal */}
        <ContractForm
          contract={selectedContract || undefined}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setSelectedContract(null)
          }}
          onSave={(contractData) => {
            if (selectedContract) {
              onEditContract({ ...selectedContract, ...contractData })
            } else {
              // Handle new contract creation
              console.log('Creating new contract:', contractData)
            }
          }}
        />

        {/* Contract Details Modal */}
        {selectedContract && (
          <ContractDetails
            contract={selectedContract}
            isOpen={isDetailsOpen}
            onClose={() => {
              setIsDetailsOpen(false)
              setSelectedContract(null)
            }}
            onEdit={() => {
              setIsDetailsOpen(false)
              setIsFormOpen(true)
            }}
            onDelete={() => {
              if (window.confirm('هل أنت متأكد من حذف هذا العقد؟')) {
                onDeleteContract(selectedContract.id)
                setIsDetailsOpen(false)
                setSelectedContract(null)
              }
            }}
          />
        )}
      </ResponsiveLayout>
    </FeatureGate>
  )
}

// Export types for use in other components
export type { Contract, ContractStats }
export { ContractForm, ContractDetails, ContractStatistics }