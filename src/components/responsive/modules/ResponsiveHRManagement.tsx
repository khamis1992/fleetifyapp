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
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  BadgeCheck
} from 'lucide-react'

// Employee data interfaces
interface Employee {
  id: string
  employeeNumber: string
  name: string
  nameEn: string
  position: string
  department: string
  email: string
  phone: string
  hireDate: string
  salary: number
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  avatar?: string
  priority: 'critical' | 'important' | 'secondary' | 'optional'
}

// Payroll data interface
interface PayrollData {
  id: string
  employeeId: string
  employeeName: string
  basicSalary: number
  allowances: number
  deductions: number
  overtime: number
  netSalary: number
  paymentDate: string
  status: 'paid' | 'pending' | 'processing'
}

// Attendance data interface
interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  timeIn: string
  timeOut: string
  hoursWorked: number
  status: 'present' | 'absent' | 'late' | 'early_leave'
}

// HR statistics interface
interface HRStats {
  totalEmployees: number
  activeEmployees: number
  onLeave: number
  newHires: number
  totalPayroll: number
  averageSalary: number
  attendanceRate: number
  turnoverRate: number
}

// Props interfaces
interface ResponsiveHRManagementProps {
  employees: Employee[]
  payroll: PayrollData[]
  attendance: AttendanceRecord[]
  stats: HRStats
  onCreateEmployee: () => void
  onEditEmployee: (employee: Employee) => void
  onDeleteEmployee: (employeeId: string) => void
  onViewEmployee: (employee: Employee) => void
  onProcessPayroll: () => void
  className?: string
}

interface EmployeeFormProps {
  employee?: Employee
  isOpen: boolean
  onClose: () => void
  onSave: (employee: Partial<Employee>) => void
}

interface EmployeeDetailsProps {
  employee: Employee
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

// HR statistics component
function HRStatistics({ stats }: { stats: HRStats }) {
  const { deviceType } = useEnhancedResponsive()

  const statItems = [
    {
      title: 'إجمالي الموظفين',
      value: stats.totalEmployees.toLocaleString('ar-SA'),
      change: '+5% من الشهر الماضي',
      trend: 'up' as const,
      icon: Users,
      priority: 'critical' as const
    },
    {
      title: 'الموظفون النشطون',
      value: stats.activeEmployees.toLocaleString('ar-SA'),
      change: '+3% من الشهر الماضي',
      trend: 'up' as const,
      icon: CheckCircle,
      priority: 'critical' as const
    },
    {
      title: 'في إجازة',
      value: stats.onLeave.toLocaleString('ar-SA'),
      change: '+12% من الشهر الماضي',
      trend: 'up' as const,
      icon: Calendar,
      priority: 'important' as const
    },
    {
      title: 'التوظيفات الجديدة',
      value: stats.newHires.toLocaleString('ar-SA'),
      change: '+25% من الشهر الماضي',
      trend: 'up' as const,
      icon: UserPlus,
      priority: 'important' as const
    },
    {
      title: 'إجمالي الرواتب',
      value: `${stats.totalPayroll.toLocaleString('ar-SA')} ر.س`,
      change: '+8% من الشهر الماضي',
      trend: 'up' as const,
      icon: DollarSign,
      priority: 'critical' as const
    },
    {
      title: 'متوسط الراتب',
      value: `${stats.averageSalary.toLocaleString('ar-SA')} ر.س`,
      change: '+6% من الشهر الماضي',
      trend: 'up' as const,
      icon: Award,
      priority: 'important' as const
    },
    {
      title: 'معدل الحضور',
      value: `${stats.attendanceRate}%`,
      change: '+2% من الشهر الماضي',
      trend: 'up' as const,
      icon: Clock,
      priority: 'secondary' as const
    },
    {
      title: 'معدل دوران الموظفين',
      value: `${stats.turnoverRate}%`,
      change: '-1% من الشهر الماضي',
      trend: 'down' as const,
      icon: AlertTriangle,
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

// Employee form component
function EmployeeForm({ employee, isOpen, onClose, onSave }: EmployeeFormProps) {
  const { deviceType } = useEnhancedResponsive()
  const [formData, setFormData] = useState({
    employeeNumber: employee?.employeeNumber || '',
    name: employee?.name || '',
    nameEn: employee?.nameEn || '',
    position: employee?.position || '',
    department: employee?.department || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    hireDate: employee?.hireDate || '',
    salary: employee?.salary || 0
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
      title={employee ? 'تعديل الموظف' : 'إضافة موظف جديد'}
      size={deviceType === 'mobile' ? 'sm' : 'lg'}
    >
      <ResponsiveForm
        onSubmit={handleSubmit}
        actions={
          <>
            <ResponsiveButton type="submit" className="flex-1">
              {employee ? 'تحديث' : 'إضافة'}
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
          label="رقم الموظف"
          value={formData.employeeNumber}
          onChange={(value) => handleChange('employeeNumber', value)}
          placeholder="أدخل رقم الموظف"
        />

        <ResponsiveInput
          label="الاسم (عربي)"
          value={formData.name}
          onChange={(value) => handleChange('name', value)}
          placeholder="أدخل اسم الموظف"
        />

        <ResponsiveInput
          label="الاسم (إنجليزي)"
          value={formData.nameEn}
          onChange={(value) => handleChange('nameEn', value)}
          placeholder="Enter employee name in English"
        />

        <ResponsiveInput
          label="المنصب"
          value={formData.position}
          onChange={(value) => handleChange('position', value)}
          placeholder="أدخل المنصب"
        />

        <ResponsiveInput
          label="القسم"
          value={formData.department}
          onChange={(value) => handleChange('department', value)}
          placeholder="أدخل القسم"
        />

        <ResponsiveInput
          label="البريد الإلكتروني"
          type="email"
          value={formData.email}
          onChange={(value) => handleChange('email', value)}
          placeholder="أدخل البريد الإلكتروني"
        />

        <ResponsiveInput
          label="رقم الهاتف"
          value={formData.phone}
          onChange={(value) => handleChange('phone', value)}
          placeholder="أدخل رقم الهاتف"
        />

        <ResponsiveInput
          label="تاريخ التوظيف"
          type="date"
          value={formData.hireDate}
          onChange={(value) => handleChange('hireDate', value)}
        />

        <ResponsiveInput
          label="الراتب الأساسي"
          type="number"
          value={formData.salary}
          onChange={(value) => handleChange('salary', parseFloat(value) || 0)}
          placeholder="أدخل الراتب الأساسي"
        />
      </ResponsiveForm>
    </ResponsiveModal>
  )
}

// Employee details modal
function EmployeeDetails({ employee, isOpen, onClose, onEdit, onDelete }: EmployeeDetailsProps) {
  const { isMobile } = useEnhancedResponsive()

  const getStatusBadge = (status: Employee['status']) => {
    const badges = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
      inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800' },
      on_leave: { label: 'في إجازة', color: 'bg-yellow-100 text-yellow-800' },
      terminated: { label: 'منتهي الخدمة', color: 'bg-red-100 text-red-800' }
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
      title="تفاصيل الموظف"
      size={isMobile ? 'sm' : 'xl'}
    >
      <div className="space-y-6">
        {/* Employee Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {employee.avatar ? (
                <img 
                  src={employee.avatar} 
                  alt={employee.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users size={24} className="text-primary" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{employee.name}</h3>
                <p className="text-sm text-muted-foreground">{employee.position}</p>
              </div>
            </div>
            {getStatusBadge(employee.status)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">رقم الموظف</label>
              <p className="text-sm font-medium">{employee.employeeNumber}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">القسم</label>
              <p className="text-sm font-medium">{employee.department}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">تاريخ التوظيف</label>
              <p className="text-sm font-medium">
                {new Date(employee.hireDate).toLocaleDateString('ar-SA')}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">سنوات الخدمة</label>
              <p className="text-sm font-medium">
                {Math.floor((Date.now() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <ResponsiveCard title="معلومات الاتصال">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-muted-foreground" />
              <span className="text-sm">{employee.email}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-muted-foreground" />
              <span className="text-sm">{employee.phone}</span>
            </div>
          </div>
        </ResponsiveCard>

        {/* Salary Information */}
        <ResponsiveCard title="معلومات الراتب">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
            <p className="text-lg font-bold text-blue-600">
              {employee.salary.toLocaleString('ar-SA')} ر.س
            </p>
          </div>
        </ResponsiveCard>

        {/* Actions */}
        <div className={cn(
          "flex gap-3 pt-4 border-t",
          isMobile && "flex-col"
        )}>
          <ResponsiveButton onClick={onEdit} className="flex-1">
            <Edit size={16} className="mr-2" />
            تعديل الموظف
          </ResponsiveButton>
          
          <ResponsiveButton variant="outline" className="flex-1">
            <Download size={16} className="mr-2" />
            تقرير الموظف
          </ResponsiveButton>
          
          <ResponsiveButton variant="destructive" onClick={onDelete} className="flex-1">
            <Trash2 size={16} className="mr-2" />
            حذف الموظف
          </ResponsiveButton>
        </div>
      </div>
    </ResponsiveModal>
  )
}

// Payroll dashboard component
function PayrollDashboard({ payroll }: { payroll: PayrollData[] }) {
  const { isMobile } = useEnhancedResponsive()

  const columns = [
    {
      key: 'employeeName',
      label: 'اسم الموظف',
      priority: 'critical' as const,
      sortable: true
    },
    {
      key: 'basicSalary',
      label: 'الراتب الأساسي',
      priority: 'critical' as const,
      render: (value: number) => `${value.toLocaleString('ar-SA')} ر.س`
    },
    {
      key: 'allowances',
      label: 'البدلات',
      priority: 'important' as const,
      render: (value: number) => `${value.toLocaleString('ar-SA')} ر.س`
    },
    {
      key: 'deductions',
      label: 'الاستقطاعات',
      priority: 'important' as const,
      render: (value: number) => `${value.toLocaleString('ar-SA')} ر.س`
    },
    {
      key: 'netSalary',
      label: 'صافي الراتب',
      priority: 'critical' as const,
      render: (value: number) => (
        <span className="font-bold text-green-600">
          {value.toLocaleString('ar-SA')} ر.س
        </span>
      )
    },
    {
      key: 'status',
      label: 'حالة الدفع',
      priority: 'important' as const,
      render: (value: PayrollData['status']) => {
        const statusMap = {
          paid: { label: 'مدفوع', color: 'bg-green-100 text-green-800' },
          pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800' },
          processing: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800' }
        }
        
        const status = statusMap[value]
        return (
          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', status.color)}>
            {status.label}
          </span>
        )
      }
    }
  ]

  return (
    <ResponsiveCard title="كشف الرواتب">
      <ResponsiveDataTable
        data={payroll}
        columns={columns}
        searchable
      />
    </ResponsiveCard>
  )
}

// Main HR management component
export function ResponsiveHRManagement({
  employees,
  payroll,
  attendance,
  stats,
  onCreateEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onViewEmployee,
  onProcessPayroll,
  className
}: ResponsiveHRManagementProps) {
  const { deviceType, isMobile, getOptimalSpacing } = useEnhancedResponsive()
  const responsiveProps = getResponsiveProps(deviceType)
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'attendance'>('employees')

  // Employee table columns configuration
  const employeeColumns = [
    {
      key: 'employeeNumber',
      label: 'رقم الموظف',
      priority: 'critical' as const,
      sortable: true,
      render: (value: string, row: Employee) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'name',
      label: 'اسم الموظف',
      priority: 'critical' as const,
      sortable: true,
      render: (value: string, row: Employee) => (
        <div className="flex items-center gap-2">
          {row.avatar ? (
            <img 
              src={row.avatar} 
              alt={value}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Users size={16} className="text-primary" />
            </div>
          )}
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'position',
      label: 'المنصب',
      priority: 'important' as const
    },
    {
      key: 'department',
      label: 'القسم',
      priority: 'important' as const
    },
    {
      key: 'email',
      label: 'البريد الإلكتروني',
      priority: 'secondary' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-muted-foreground" />
          <span className="text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'الهاتف',
      priority: 'secondary' as const,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-muted-foreground" />
          <span className="text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'الحالة',
      priority: 'important' as const,
      render: (value: Employee['status']) => {
        const statusMap = {
          active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
          inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800' },
          on_leave: { label: 'في إجازة', color: 'bg-yellow-100 text-yellow-800' },
          terminated: { label: 'منتهي الخدمة', color: 'bg-red-100 text-red-800' }
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
      key: 'salary',
      label: 'الراتب',
      priority: 'important' as const,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString('ar-SA')} ر.س</span>
      )
    }
  ]

  // Employee actions
  const employeeActions = [
    {
      label: 'عرض',
      icon: Eye,
      onClick: (employee: Employee) => {
        setSelectedEmployee(employee)
        setIsDetailsOpen(true)
        onViewEmployee(employee)
      },
      variant: 'outline' as const
    },
    {
      label: 'تعديل',
      icon: Edit,
      onClick: (employee: Employee) => {
        setSelectedEmployee(employee)
        setIsFormOpen(true)
      },
      variant: 'outline' as const
    },
    {
      label: 'حذف',
      icon: Trash2,
      onClick: (employee: Employee) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
          onDeleteEmployee(employee.id)
        }
      },
      variant: 'destructive' as const
    }
  ]

  return (
    <FeatureGate flag="responsiveHR" fallback={<div>Loading original HR view...</div>}>
      <ResponsiveLayout className={cn(getOptimalSpacing(), className)}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h1 className={cn(
              "font-bold",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              إدارة الموارد البشرية
            </h1>
            
            <div className={cn(
              "flex gap-2",
              isMobile && "flex-col w-full mt-4"
            )}>
              <ResponsiveButton onClick={onCreateEmployee}>
                <UserPlus size={16} className="mr-2" />
                موظف جديد
              </ResponsiveButton>
              
              <ResponsiveButton variant="outline" onClick={onProcessPayroll}>
                <DollarSign size={16} className="mr-2" />
                معالجة الرواتب
              </ResponsiveButton>
              
              <ResponsiveButton variant="outline">
                <Download size={16} className="mr-2" />
                تقارير HR
              </ResponsiveButton>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <HRStatistics stats={stats} />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className={cn(
            "flex border-b",
            isMobile && "flex-col"
          )}>
            {[
              { key: 'employees', label: 'الموظفون', icon: Users },
              { key: 'payroll', label: 'الرواتب', icon: DollarSign },
              { key: 'attendance', label: 'الحضور', icon: Clock }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors",
                  isMobile && "w-full justify-center",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'employees' && (
          <ResponsiveCard title="قائمة الموظفين">
            <ResponsiveDataTable
              data={employees}
              columns={employeeColumns}
              actions={employeeActions}
              searchable
              filterable
            />
          </ResponsiveCard>
        )}

        {activeTab === 'payroll' && (
          <PayrollDashboard payroll={payroll} />
        )}

        {activeTab === 'attendance' && (
          <ResponsiveCard title="سجل الحضور">
            <div className="text-center py-8 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-4" />
              <p>سيتم إضافة نظام الحضور قريباً</p>
            </div>
          </ResponsiveCard>
        )}

        {/* Employee Form Modal */}
        <EmployeeForm
          employee={selectedEmployee || undefined}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setSelectedEmployee(null)
          }}
          onSave={(employeeData) => {
            if (selectedEmployee) {
              onEditEmployee({ ...selectedEmployee, ...employeeData })
            } else {
              // Handle new employee creation
              console.log('Creating new employee:', employeeData)
            }
          }}
        />

        {/* Employee Details Modal */}
        {selectedEmployee && (
          <EmployeeDetails
            employee={selectedEmployee}
            isOpen={isDetailsOpen}
            onClose={() => {
              setIsDetailsOpen(false)
              setSelectedEmployee(null)
            }}
            onEdit={() => {
              setIsDetailsOpen(false)
              setIsFormOpen(true)
            }}
            onDelete={() => {
              if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
                onDeleteEmployee(selectedEmployee.id)
                setIsDetailsOpen(false)
                setSelectedEmployee(null)
              }
            }}
          />
        )}
      </ResponsiveLayout>
    </FeatureGate>
  )
}

// Export types for use in other components
export type { Employee, PayrollData, AttendanceRecord, HRStats }
export { EmployeeForm, EmployeeDetails, HRStatistics, PayrollDashboard }