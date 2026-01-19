import React, { useState } from 'react'
import { Plus, Edit2, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'

interface Driver {
  id: string
  company_id: string
  full_name: string
  phone_number: string
  email: string
  license_number: string
  license_expiry: string
  status: 'active' | 'inactive' | 'on_leave'
  commission_rate: number
  total_earnings: number
  total_trips: number
  rating: number
}

interface DriverAssignment {
  id: string
  driver_id: string
  contract_id: string
  start_date: string
  end_date: string
  status: 'scheduled' | 'in_progress' | 'completed'
  pickup_location: string
  dropoff_location: string
  trip_distance: number
  commission_amount: number
}

export function DriverAssignmentModule() {
  const { user } = useAuth()
  const [showNewDriver, setShowNewDriver] = useState(false)
  const [showNewAssignment, setShowNewAssignment] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)

  // Mock data - Database tables 'drivers' and 'driver_assignments' not yet created
  const [drivers, setDrivers] = useState<Driver[]>([
    {
      id: '1',
      company_id: user?.profile?.company_id || '',
      full_name: 'أحمد محمد',
      phone_number: '+966501234567',
      email: 'ahmad@example.com',
      license_number: 'DL-001',
      license_expiry: '2026-12-31',
      status: 'active',
      commission_rate: 10,
      total_earnings: 5000,
      total_trips: 45,
      rating: 4.8,
    },
  ])
  const [assignments] = useState<DriverAssignment[]>([])
  const driversLoading = false

  // Mock create driver handler
  const handleCreateDriver = (values: any) => {
    const newDriver: Driver = {
      id: Math.random().toString(),
      company_id: user?.profile?.company_id || '',
      full_name: values.fullName,
      phone_number: values.phoneNumber,
      email: values.email,
      license_number: values.licenseNumber,
      license_expiry: values.licenseExpiry,
      status: 'active',
      commission_rate: parseFloat(values.commissionRate),
      total_earnings: 0,
      total_trips: 0,
      rating: 5.0,
    }
    setDrivers([newDriver, ...drivers])
    toast.success('تم إضافة السائق')
    setShowNewDriver(false)
  }

  const stats = {
    totalDrivers: drivers.length,
    activeDrivers: drivers.filter(d => d.status === 'active').length,
    totalTrips: drivers.reduce((sum, d) => sum + d.total_trips, 0),
    totalEarnings: drivers.reduce((sum, d) => sum + d.total_earnings, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة السائقين</h2>
          <p className="text-muted-foreground">إدارة السائقين والتعيينات والعمولات</p>
        </div>
        <Button onClick={() => setShowNewDriver(true)} size="lg">
          <Plus className="h-4 w-4 ml-2" />
          إضافة سائق
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">إجمالي السائقين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">نشطون</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الرحلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الأرباح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="drivers">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drivers">السائقون ({drivers.length})</TabsTrigger>
          <TabsTrigger value="assignments">التعيينات ({assignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4">
          {driversLoading ? (
            <p className="text-center py-8">جاري التحميل...</p>
          ) : drivers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد سائقون</p>
              </CardContent>
            </Card>
          ) : (
            drivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} onEdit={() => setEditingDriver(driver)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Button onClick={() => setShowNewAssignment(true)} className="w-full">
            <Plus className="h-4 w-4 ml-2" />
            تعيين جديد
          </Button>
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">لا توجد تعيينات</p>
              </CardContent>
            </Card>
          ) : (
            assignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} drivers={drivers} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DriverFormDialog
        open={showNewDriver}
        onOpenChange={setShowNewDriver}
        onSubmit={handleCreateDriver}
        isLoading={false}
      />

      {editingDriver && (
        <DriverFormDialog
          open={!!editingDriver}
          onOpenChange={() => setEditingDriver(null)}
          driver={editingDriver}
          onSubmit={() => {}}
          isLoading={false}
        />
      )}
    </div>
  )
}

function DriverCard({ driver, onEdit }: { driver: Driver; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{driver.full_name}</h3>
            <p className="text-sm text-muted-foreground">{driver.phone_number}</p>
            <div className="flex gap-3 mt-2">
              <Badge variant={driver.status === 'active' ? 'default' : 'secondary'}>{driver.status}</Badge>
              <span className="text-sm">⭐ {driver.rating.toFixed(1)}</span>
              <span className="text-sm">🚗 {driver.total_trips} رحلات</span>
              <span className="text-sm">💵 {driver.total_earnings.toFixed(2)}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AssignmentCard({ assignment, drivers }: { assignment: DriverAssignment; drivers: Driver[] }) {
  const driver = drivers.find(d => d.id === assignment.driver_id)
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{driver?.full_name || 'سائق'}</h3>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(assignment.start_date), 'dd/MM', { locale: ar })} - {format(parseISO(assignment.end_date), 'dd/MM', { locale: ar })}
            </p>
            <div className="flex gap-2 mt-2 text-sm">
              <span>{assignment.pickup_location} → {assignment.dropoff_location}</span>
            </div>
          </div>
          <Badge>{assignment.status}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function DriverFormDialog({
  open,
  onOpenChange,
  driver,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver?: Driver
  onSubmit: (values: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState(driver ? {
    fullName: driver.full_name,
    phoneNumber: driver.phone_number,
    email: driver.email,
    licenseNumber: driver.license_number,
    licenseExpiry: driver.license_expiry,
    commissionRate: driver.commission_rate.toString(),
  } : {
    fullName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    licenseExpiry: '',
    commissionRate: '10',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{driver ? 'تعديل السائق' : 'إضافة سائق'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>الاسم</Label>
            <Input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
          </div>
          <div>
            <Label>البريد</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <Label>رقم الرخصة</Label>
            <Input value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} />
          </div>
          <div>
            <Label>انتهاء الرخصة</Label>
            <Input type="date" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} />
          </div>
          <div>
            <Label>العمولة (%)</Label>
            <Input type="number" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} />
          </div>
          <Button onClick={() => onSubmit(formData)} disabled={isLoading} className="w-full">
            {isLoading ? 'جاري...' : 'حفظ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
