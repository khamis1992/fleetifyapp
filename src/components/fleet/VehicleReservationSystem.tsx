/**
 * Vehicle Reservation System
 * 
 * Manages vehicle reservations with hold periods and conversion to contracts
 * NOTE: This component uses mock data for vehicle_reservations table which doesn't exist yet
 */

import React, { useState, useMemo } from 'react'
import { Plus, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { differenceInHours, format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

interface Reservation {
  id: string
  company_id: string
  vehicle_id: string
  customer_id: string
  customer_name: string
  vehicle_plate: string
  vehicle_make: string
  vehicle_model: string
  start_date: string
  end_date: string
  hold_until: string
  status: 'pending' | 'confirmed' | 'converted' | 'cancelled'
  notes: string | null
  created_at: string
}

export function VehicleReservationSystem() {
  const { user } = useAuth()
  const [showNewReservation, setShowNewReservation] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showConvertDialog, setShowConvertDialog] = useState(false)

  // Mock data - Database table 'vehicle_reservations' not yet created
  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: '1',
      company_id: user?.profile?.company_id || '',
      vehicle_id: '1',
      customer_id: '1',
      customer_name: 'أحمد محمد',
      vehicle_plate: '123 ج ع',
      vehicle_make: 'تويوتا',
      vehicle_model: 'كامري',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      hold_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      notes: 'حجز تجريبي',
      created_at: new Date().toISOString(),
    },
  ])

  // Create reservation mutation (mock implementation)
  const createReservation = useMutation({
    mutationFn: async (values: any) => {
      const holdUntil = new Date()
      holdUntil.setHours(holdUntil.getHours() + (parseInt(values.holdHours) || 24))

      const newReservation: Reservation = {
        id: Math.random().toString(36).substr(2, 9),
        company_id: user?.profile?.company_id || '',
        vehicle_id: values.vehicleId || '',
        customer_id: values.customerId || '',
        customer_name: values.customerName,
        vehicle_plate: values.vehiclePlate,
        vehicle_make: values.vehicleMake,
        vehicle_model: values.vehicleModel,
        start_date: values.startDate,
        end_date: values.endDate,
        hold_until: holdUntil.toISOString(),
        status: 'pending',
        notes: values.notes || null,
        created_at: new Date().toISOString(),
      }
      return newReservation
    },
    onSuccess: (newReservation) => {
      setReservations([newReservation, ...reservations])
      toast.success('تم إنشاء الحجز بنجاح')
      setShowNewReservation(false)
    },
    onError: (error) => {
      toast.error('فشل في إنشاء الحجز')
      console.error(error)
    },
  })

  // Convert to contract mutation (mock implementation)
  const convertToContract = useMutation({
    mutationFn: async (reservationId: string) => {
      const res = reservations.find(r => r.id === reservationId)
      if (!res) throw new Error('Reservation not found')
      return res
    },
    onSuccess: () => {
      if (selectedReservation) {
        setReservations(reservations.map(r => 
          r.id === selectedReservation.id 
            ? { ...r, status: 'converted' as const }
            : r
        ))
      }
      toast.success('تم تحويل الحجز إلى عقد')
      setShowConvertDialog(false)
    },
    onError: (error) => {
      toast.error('فشل في تحويل الحجز')
      console.error(error)
    },
  })

  // Cancel reservation mutation (mock implementation)
  const cancelReservation = useMutation({
    mutationFn: async (reservationId: string) => {
      return reservationId
    },
    onSuccess: (reservationId) => {
      setReservations(reservations.map(r => 
        r.id === reservationId 
          ? { ...r, status: 'cancelled' as const }
          : r
      ))
      toast.success('تم إلغاء الحجز')
    },
    onError: (error) => {
      toast.error('فشل في إلغاء الحجز')
      console.error(error)
    },
  })

  // Calculate hold time remaining
  const getHoldTimeRemaining = (reservation: Reservation) => {
    const hoursRemaining = differenceInHours(parseISO(reservation.hold_until), new Date())
    return Math.max(0, hoursRemaining)
  }

  // Group reservations by status
  const groupedReservations = useMemo(() => {
    return {
      pending: reservations.filter(r => r.status === 'pending'),
      confirmed: reservations.filter(r => r.status === 'confirmed'),
      converted: reservations.filter(r => r.status === 'converted'),
    }
  }, [reservations])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">نظام حجز المركبات</h2>
          <p className="text-muted-foreground">إدارة حجوزات العملاء عبر الإنترنت</p>
        </div>
        <Button onClick={() => setShowNewReservation(true)} size="lg">
          <Plus className="h-4 w-4 ml-2" />
          حجز جديد
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الحجوزات قيد الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupedReservations.pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الحجوزات المؤكدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{groupedReservations.confirmed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المحولة إلى عقود</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{groupedReservations.converted.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for reservation statuses */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">قيد الانتظار ({groupedReservations.pending.length})</TabsTrigger>
          <TabsTrigger value="confirmed">مؤكدة ({groupedReservations.confirmed.length})</TabsTrigger>
          <TabsTrigger value="converted">محولة ({groupedReservations.converted.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {groupedReservations.pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد حجوزات قيد الانتظار</p>
              </CardContent>
            </Card>
          ) : (
            groupedReservations.pending.map((res) => (
              <ReservationCard
                key={res.id}
                reservation={res}
                onSelect={() => setSelectedReservation(res)}
                onConvert={() => {
                  setSelectedReservation(res)
                  setShowConvertDialog(true)
                }}
                onCancel={() => cancelReservation.mutate(res.id)}
                holdTimeRemaining={getHoldTimeRemaining(res)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {groupedReservations.confirmed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد حجوزات مؤكدة</p>
              </CardContent>
            </Card>
          ) : (
            groupedReservations.confirmed.map((res) => (
              <ReservationCard
                key={res.id}
                reservation={res}
                onSelect={() => setSelectedReservation(res)}
                onConvert={() => {
                  setSelectedReservation(res)
                  setShowConvertDialog(true)
                }}
                onCancel={() => cancelReservation.mutate(res.id)}
                holdTimeRemaining={getHoldTimeRemaining(res)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="converted" className="space-y-4">
          {groupedReservations.converted.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد حجوزات محولة</p>
              </CardContent>
            </Card>
          ) : (
            groupedReservations.converted.map((res) => (
              <ReservationCard
                key={res.id}
                reservation={res}
                onSelect={() => setSelectedReservation(res)}
                onConvert={() => {}}
                onCancel={() => {}}
                holdTimeRemaining={getHoldTimeRemaining(res)}
                isConverted
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* New Reservation Dialog */}
      <NewReservationDialog
        open={showNewReservation}
        onOpenChange={setShowNewReservation}
        onSubmit={(values) => createReservation.mutate(values)}
        isLoading={createReservation.isPending}
      />

      {/* Convert to Contract Dialog */}
      <ConvertReservationDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        reservation={selectedReservation}
        onConfirm={() => {
          if (selectedReservation) {
            convertToContract.mutate(selectedReservation.id)
          }
        }}
        isLoading={convertToContract.isPending}
      />

      {/* Reservation Details */}
      {selectedReservation && (
        <ReservationDetailsDialog
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
        />
      )}
    </div>
  )
}

function ReservationCard({
  reservation,
  onSelect,
  onConvert,
  onCancel,
  holdTimeRemaining,
  isConverted = false,
}: {
  reservation: Reservation
  onSelect: () => void
  onConvert: () => void
  onCancel: () => void
  holdTimeRemaining: number
  isConverted?: boolean
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-semibold text-lg">{reservation.customer_name}</h3>
              <Badge variant={isConverted ? 'default' : 'secondary'}>
                {reservation.status === 'pending' && 'قيد الانتظار'}
                {reservation.status === 'confirmed' && 'مؤكدة'}
                {reservation.status === 'converted' && 'محولة إلى عقد'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <p className="text-muted-foreground">المركبة</p>
                <p className="font-medium">{reservation.vehicle_plate} - {reservation.vehicle_make} {reservation.vehicle_model}</p>
              </div>
              <div>
                <p className="text-muted-foreground">التواريخ</p>
                <p className="font-medium">
                  {format(parseISO(reservation.start_date), 'dd MMM', { locale: ar })} - {format(parseISO(reservation.end_date), 'dd MMM', { locale: ar })}
                </p>
              </div>
            </div>

            {!isConverted && reservation.status === 'pending' && (
              <Alert className="mb-3 bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  الحجز محجوز لمدة {holdTimeRemaining} ساعة من الآن
                </AlertDescription>
              </Alert>
            )}

            {reservation.notes && (
              <p className="text-sm text-muted-foreground mb-3">
                <strong>ملاحظات:</strong> {reservation.notes}
              </p>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={onSelect}>
              التفاصيل
            </Button>
            {!isConverted && (
              <>
                <Button size="sm" onClick={onConvert}>
                  تحويل لعقد
                </Button>
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  إلغاء
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewReservationDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    vehiclePlate: '',
    vehicleMake: '',
    vehicleModel: '',
    startDate: '',
    endDate: '',
    holdHours: '24',
    notes: '',
  })

  const handleSubmit = () => {
    if (!formData.customerName || !formData.vehiclePlate || !formData.startDate || !formData.endDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>حجز جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>اسم العميل</Label>
            <Input
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="أدخل اسم العميل"
            />
          </div>

          <div>
            <Label>لوحة المركبة</Label>
            <Input
              value={formData.vehiclePlate}
              onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
              placeholder="مثال: 123 ج ع"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>الماركة</Label>
              <Input
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                placeholder="مثال: تويوتا"
              />
            </div>
            <div>
              <Label>الموديل</Label>
              <Input
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                placeholder="مثال: كامري"
              />
            </div>
          </div>

          <div>
            <Label>تاريخ البداية</Label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div>
            <Label>تاريخ النهاية</Label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div>
            <Label>مدة الحجز بالساعات</Label>
            <Select value={formData.holdHours} onValueChange={(value) => setFormData({ ...formData, holdHours: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 ساعات</SelectItem>
                <SelectItem value="12">12 ساعة</SelectItem>
                <SelectItem value="24">24 ساعة</SelectItem>
                <SelectItem value="48">48 ساعة</SelectItem>
                <SelectItem value="72">72 ساعة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="ملاحظات إضافية"
              maxLength={500}
            />
          </div>

          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? 'جاري الإنشاء...' : 'إنشاء الحجز'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConvertReservationDialog({
  open,
  onOpenChange,
  reservation,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  onConfirm: () => void
  isLoading: boolean
}) {
  if (!reservation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تحويل الحجز إلى عقد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              هل أنت متأكد من رغبتك في تحويل هذا الحجز إلى عقد إيجار؟
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p><strong>العميل:</strong> {reservation.customer_name}</p>
            <p><strong>المركبة:</strong> {reservation.vehicle_plate}</p>
            <p><strong>من:</strong> {format(parseISO(reservation.start_date), 'dd/MM/yyyy', { locale: ar })}</p>
            <p><strong>إلى:</strong> {format(parseISO(reservation.end_date), 'dd/MM/yyyy', { locale: ar })}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'جاري التحويل...' : 'تحويل'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReservationDetailsDialog({
  reservation,
  onClose,
}: {
  reservation: Reservation
  onClose: () => void
}) {
  return (
    <Dialog open={!!reservation} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تفاصيل الحجز</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">اسم العميل</p>
            <p className="font-medium">{reservation.customer_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">رقم الحجز</p>
            <p className="font-medium">{reservation.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">المركبة</p>
            <p className="font-medium">{reservation.vehicle_plate} - {reservation.vehicle_make} {reservation.vehicle_model}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الحالة</p>
            <Badge>{reservation.status}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">تاريخ البداية</p>
            <p className="font-medium">{format(parseISO(reservation.start_date), 'dd/MM/yyyy', { locale: ar })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">تاريخ النهاية</p>
            <p className="font-medium">{format(parseISO(reservation.end_date), 'dd/MM/yyyy', { locale: ar })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">محجوز حتى</p>
            <p className="font-medium">{format(parseISO(reservation.hold_until), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
          </div>
          <div>
            <p className="text-muted-foreground">وقت الإنشاء</p>
            <p className="font-medium">{format(parseISO(reservation.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
          </div>
        </div>

        {reservation.notes && (
          <div>
            <p className="text-muted-foreground">ملاحظات</p>
            <p className="font-medium">{reservation.notes}</p>
          </div>
        )}

        <Button onClick={onClose} className="w-full mt-4">
          إغلاق
        </Button>
      </DialogContent>
    </Dialog>
  )
}
