import React, { useState } from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { FeatureGate, useResponsiveDesign } from '@/contexts/FeatureFlagsContext'
import { 
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveInput,
  ResponsiveDataTable,
  ResponsiveModal,
  ResponsiveStats
} from '@/components/responsive/ResponsiveComponents'
import { 
  ResponsivePageLayout,
  ResponsiveContentLayout 
} from '@/components/responsive/EnhancedLayouts'
import { 
  MobileCardItem,
  MobileSearchHeader,
  MobileFAB,
  MobilePageHeader
} from '@/components/responsive/MobileComponents'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Car,
  Fuel,
  Wrench,
  AlertTriangle,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Settings
} from 'lucide-react'

// Vehicle status types
type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'out_of_service'

// Mock vehicle data
interface Vehicle {
  id: string
  plate_number: string
  brand: string
  model: string
  year: number
  status: VehicleStatus
  current_mileage: number
  last_maintenance: string
  next_maintenance_due: string
  location: string
  daily_rate: number
  fuel_level: number
  image?: string
}

const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plate_number: 'أ ب ج 123',
    brand: 'تويوتا',
    model: 'كامري',
    year: 2023,
    status: 'available',
    current_mileage: 15000,
    last_maintenance: '2024-01-15',
    next_maintenance_due: '2024-04-15',
    location: 'الرياض - المطار',
    daily_rate: 200,
    fuel_level: 85
  },
  {
    id: '2',
    plate_number: 'د هـ و 456',
    brand: 'نيسان',
    model: 'التيما',
    year: 2022,
    status: 'rented',
    current_mileage: 22000,
    last_maintenance: '2024-02-10',
    next_maintenance_due: '2024-05-10',
    location: 'جدة - وسط المدينة',
    daily_rate: 180,
    fuel_level: 60
  },
  {
    id: '3',
    plate_number: 'ز ح ط 789',
    brand: 'هيونداي',
    model: 'إلنترا',
    year: 2021,
    status: 'maintenance',
    current_mileage: 35000,
    last_maintenance: '2024-02-20',
    next_maintenance_due: '2024-03-01',
    location: 'الدمام - الورشة',
    daily_rate: 150,
    fuel_level: 25
  }
]

// Fleet stats
const fleetStats = [
  {
    title: 'إجمالي المركبات',
    value: '156',
    change: '+5 هذا الشهر',
    trend: 'up' as const,
    icon: Car
  },
  {
    title: 'المركبات المتاحة',
    value: '89',
    change: '57% من الإجمالي',
    trend: 'neutral' as const,
    icon: TrendingUp
  },
  {
    title: 'المركبات المؤجرة',
    value: '52',
    change: '+12% عن الأسبوع الماضي',
    trend: 'up' as const,
    icon: MapPin
  },
  {
    title: 'في الصيانة',
    value: '15',
    change: '-3 عن الأسبوع الماضي',
    trend: 'down' as const,
    icon: Wrench
  }
]

// Vehicle status styling
const getStatusStyle = (status: VehicleStatus) => {
  const styles = {
    available: 'bg-green-100 text-green-800 border-green-200',
    rented: 'bg-blue-100 text-blue-800 border-blue-200',
    maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
    out_of_service: 'bg-red-100 text-red-800 border-red-200'
  }
  return styles[status]
}

const getStatusLabel = (status: VehicleStatus) => {
  const labels = {
    available: 'متاحة',
    rented: 'مؤجرة',
    maintenance: 'في الصيانة',
    out_of_service: 'خارج الخدمة'
  }
  return labels[status]
}

// Mobile Vehicle Card Component
interface MobileVehicleCardProps {
  vehicle: Vehicle
  onView: (vehicle: Vehicle) => void
  onEdit: (vehicle: Vehicle) => void
}

function MobileVehicleCard({ vehicle, onView, onEdit }: MobileVehicleCardProps) {
  return (
    <MobileCardItem
      title={`${vehicle.brand} ${vehicle.model}`}
      subtitle={vehicle.plate_number}
      description={`${vehicle.year} - ${vehicle.location}`}
      badge={getStatusLabel(vehicle.status)}
      onClick={() => onView(vehicle)}
      actions={
        <div className="flex gap-2">
          <ResponsiveButton
            variant="ghost"
            size="sm"
            onClick={() => onView(vehicle)}
          >
            <Eye size={16} />
          </ResponsiveButton>
          <ResponsiveButton
            variant="ghost"
            size="sm"
            onClick={() => onEdit(vehicle)}
          >
            <Edit size={16} />
          </ResponsiveButton>
        </div>
      }
      className={cn(
        "border-l-4",
        vehicle.status === 'available' && "border-l-green-500",
        vehicle.status === 'rented' && "border-l-blue-500",
        vehicle.status === 'maintenance' && "border-l-orange-500",
        vehicle.status === 'out_of_service' && "border-l-red-500"
      )}
    />
  )
}

// Vehicle Quick Stats Component
interface VehicleQuickStatsProps {
  vehicle: Vehicle
}

function VehicleQuickStats({ vehicle }: VehicleQuickStatsProps) {
  const { isMobile } = useEnhancedResponsive()

  const quickStats = [
    {
      label: 'الكيلومترات',
      value: `${vehicle.current_mileage.toLocaleString()} كم`,
      icon: MapPin
    },
    {
      label: 'الوقود',
      value: `${vehicle.fuel_level}%`,
      icon: Fuel
    },
    {
      label: 'الأجرة اليومية',
      value: `${vehicle.daily_rate} ريال`,
      icon: DollarSign
    }
  ]

  return (
    <div className={cn(
      "grid gap-3",
      isMobile ? "grid-cols-1" : "grid-cols-3"
    )}>
      {quickStats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Main Fleet Management Component
export function ResponsiveFleetManagement() {
  const { isMobile, isTablet, deviceType } = useEnhancedResponsive()
  const isResponsiveEnabled = useResponsiveDesign()
  
  const [vehicles] = useState<Vehicle[]>(mockVehicles)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false)

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.plate_number.includes(searchTerm) ||
    vehicle.brand.includes(searchTerm) ||
    vehicle.model.includes(searchTerm) ||
    vehicle.location.includes(searchTerm)
  )

  // Table columns configuration
  const tableColumns = [
    {
      key: 'plate_number',
      label: 'رقم اللوحة',
      priority: 'critical' as const,
      render: (value: string) => (
        <span className="font-mono font-medium">{value}</span>
      )
    },
    {
      key: 'vehicle_info',
      label: 'المركبة',
      priority: 'critical' as const,
      render: (_: any, vehicle: Vehicle) => (
        <div>
          <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
          <p className="text-sm text-muted-foreground">{vehicle.year}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'الحالة',
      priority: 'important' as const,
      render: (status: VehicleStatus) => (
        <Badge className={getStatusStyle(status)}>
          {getStatusLabel(status)}
        </Badge>
      )
    },
    {
      key: 'location',
      label: 'الموقع',
      priority: 'important' as const
    },
    {
      key: 'current_mileage',
      label: 'الكيلومترات',
      priority: 'secondary' as const,
      render: (value: number) => `${value.toLocaleString()} كم`
    },
    {
      key: 'daily_rate',
      label: 'الأجرة اليومية',
      priority: 'secondary' as const,
      render: (value: number) => `${value} ريال`
    },
    {
      key: 'fuel_level',
      label: 'الوقود',
      priority: 'optional' as const,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                value > 50 ? "bg-green-500" : value > 25 ? "bg-orange-500" : "bg-red-500"
              )}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm">{value}%</span>
        </div>
      )
    }
  ]

  // Table actions
  const tableActions = [
    {
      label: 'عرض',
      icon: Eye,
      onClick: (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle)
        setIsVehicleModalOpen(true)
      }
    },
    {
      label: 'تعديل',
      icon: Edit,
      onClick: (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle)
        setIsAddVehicleModalOpen(true)
      }
    },
    {
      label: 'الصيانة',
      icon: Wrench,
      onClick: (vehicle: Vehicle) => {
        console.log('Maintenance for vehicle:', vehicle.id)
      }
    }
  ]

  const handleViewVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsVehicleModalOpen(true)
  }

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsAddVehicleModalOpen(true)
  }

  const handleAddVehicle = () => {
    setSelectedVehicle(null)
    setIsAddVehicleModalOpen(true)
  }

  // Fallback to original design if responsive is disabled
  if (!isResponsiveEnabled) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">إدارة الأسطول</h1>
        {/* Original fleet management content would go here */}
        <div className="text-muted-foreground">
          الوضع التقليدي لإدارة الأسطول - يتم تفعيل التصميم التكيفي تدريجياً
        </div>
      </div>
    )
  }

  return (
    <FeatureGate flag="responsiveDesign">
      <div className={cn(
        "min-h-screen",
        isMobile && "pb-mobile-bottom-nav"
      )}>
        {/* Mobile Header */}
        {isMobile && (
          <MobilePageHeader
            title="إدارة الأسطول"
            actions={
              <ResponsiveButton variant="ghost" size="sm">
                <Settings size={20} />
              </ResponsiveButton>
            }
          />
        )}

        {/* Mobile Search Header */}
        {isMobile && (
          <MobileSearchHeader
            placeholder="البحث في المركبات..."
            value={searchTerm}
            onChange={setSearchTerm}
            onAdd={handleAddVehicle}
          />
        )}

        <ResponsivePageLayout
          title={!isMobile ? "إدارة الأسطول" : undefined}
          subtitle="إدارة ومتابعة أسطول المركبات"
          actions={
            !isMobile ? (
              <div className="flex gap-2">
                <ResponsiveButton variant="outline">
                  <Filter size={16} className="mr-2" />
                  تصفية
                </ResponsiveButton>
                <ResponsiveButton onClick={handleAddVehicle}>
                  <Plus size={16} className="mr-2" />
                  إضافة مركبة
                </ResponsiveButton>
              </div>
            ) : undefined
          }
        >
          {/* Fleet Statistics */}
          <ResponsiveStats stats={fleetStats} />

          {/* Main Content */}
          <ResponsiveContentLayout
            sidebar={
              !isMobile ? (
                <div className="space-y-4">
                  <ResponsiveCard title="فلاتر سريعة">
                    <div className="space-y-2">
                      <ResponsiveButton variant="ghost" fullWidth className="justify-start">
                        <Car size={16} className="mr-2" />
                        جميع المركبات
                      </ResponsiveButton>
                      <ResponsiveButton variant="ghost" fullWidth className="justify-start">
                        <TrendingUp size={16} className="mr-2" />
                        المتاحة
                      </ResponsiveButton>
                      <ResponsiveButton variant="ghost" fullWidth className="justify-start">
                        <MapPin size={16} className="mr-2" />
                        المؤجرة
                      </ResponsiveButton>
                      <ResponsiveButton variant="ghost" fullWidth className="justify-start">
                        <Wrench size={16} className="mr-2" />
                        في الصيانة
                      </ResponsiveButton>
                    </div>
                  </ResponsiveCard>

                  <ResponsiveCard title="إحصائيات سريعة">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>متوسط الاستخدام:</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>متوسط الكيلومترات:</span>
                        <span className="font-medium">25,000 كم</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الإيراد الشهري:</span>
                        <span className="font-medium">45,000 ريال</span>
                      </div>
                    </div>
                  </ResponsiveCard>
                </div>
              ) : undefined
            }
          >
            {/* Desktop/Tablet Search */}
            {!isMobile && (
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <ResponsiveInput
                    placeholder="البحث في المركبات..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Vehicles List/Table */}
            {isMobile ? (
              <div className="space-y-3">
                {filteredVehicles.map(vehicle => (
                  <MobileVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onView={handleViewVehicle}
                    onEdit={handleEditVehicle}
                  />
                ))}
              </div>
            ) : (
              <ResponsiveDataTable
                data={filteredVehicles}
                columns={tableColumns}
                actions={tableActions}
                searchable={false} // We handle search above
              />
            )}
          </ResponsiveContentLayout>
        </ResponsivePageLayout>

        {/* Mobile FAB */}
        {isMobile && (
          <MobileFAB
            onClick={handleAddVehicle}
            icon={Plus}
          />
        )}

        {/* Vehicle Details Modal */}
        <ResponsiveModal
          isOpen={isVehicleModalOpen}
          onClose={() => setIsVehicleModalOpen(false)}
          title={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : ''}
          size="lg"
        >
          {selectedVehicle && (
            <div className="space-y-6">
              {/* Vehicle Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم اللوحة</p>
                  <p className="font-mono font-medium">{selectedVehicle.plate_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className={getStatusStyle(selectedVehicle.status)}>
                    {getStatusLabel(selectedVehicle.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الموقع</p>
                  <p>{selectedVehicle.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">سنة الصنع</p>
                  <p>{selectedVehicle.year}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <VehicleQuickStats vehicle={selectedVehicle} />

              {/* Maintenance Info */}
              <ResponsiveCard title="معلومات الصيانة">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">آخر صيانة</p>
                    <p>{selectedVehicle.last_maintenance}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الصيانة القادمة</p>
                    <p>{selectedVehicle.next_maintenance_due}</p>
                  </div>
                </div>
              </ResponsiveCard>

              {/* Actions */}
              <div className="flex gap-2">
                <ResponsiveButton
                  onClick={() => handleEditVehicle(selectedVehicle)}
                  fullWidth={isMobile}
                >
                  <Edit size={16} className="mr-2" />
                  تعديل
                </ResponsiveButton>
                <ResponsiveButton
                  variant="outline"
                  fullWidth={isMobile}
                >
                  <Wrench size={16} className="mr-2" />
                  صيانة
                </ResponsiveButton>
              </div>
            </div>
          )}
        </ResponsiveModal>

        {/* Add/Edit Vehicle Modal */}
        <ResponsiveModal
          isOpen={isAddVehicleModalOpen}
          onClose={() => setIsAddVehicleModalOpen(false)}
          title={selectedVehicle ? 'تعديل المركبة' : 'إضافة مركبة جديدة'}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveInput
                label="رقم اللوحة"
                placeholder="أ ب ج 123"
                value={selectedVehicle?.plate_number || ''}
              />
              <ResponsiveInput
                label="الماركة"
                placeholder="تويوتا"
                value={selectedVehicle?.brand || ''}
              />
              <ResponsiveInput
                label="الموديل"
                placeholder="كامري"
                value={selectedVehicle?.model || ''}
              />
              <ResponsiveInput
                label="سنة الصنع"
                type="number"
                placeholder="2023"
                value={selectedVehicle?.year?.toString() || ''}
              />
              <ResponsiveInput
                label="الأجرة اليومية"
                type="number"
                placeholder="200"
                value={selectedVehicle?.daily_rate?.toString() || ''}
              />
              <ResponsiveInput
                label="الموقع"
                placeholder="الرياض - المطار"
                value={selectedVehicle?.location || ''}
              />
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <ResponsiveButton fullWidth={isMobile}>
                {selectedVehicle ? 'حفظ التعديلات' : 'إضافة المركبة'}
              </ResponsiveButton>
              <ResponsiveButton
                variant="outline"
                onClick={() => setIsAddVehicleModalOpen(false)}
                fullWidth={isMobile}
              >
                إلغاء
              </ResponsiveButton>
            </div>
          </div>
        </ResponsiveModal>
      </div>
    </FeatureGate>
  )
}