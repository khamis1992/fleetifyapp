import { useState } from "react"
import { Edit, Trash2, Fuel, Calendar, Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FuelRecordForm } from "./FuelRecordForm"
import { useDeleteFuelRecord } from "@/hooks/useFuelManagement"
import { useVehicles } from "@/hooks/useVehicles"
import type { FuelRecord } from "@/hooks/useFuelManagement"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface FuelRecordsListProps {
  fuelRecords: FuelRecord[]
}

const fuelTypeLabels = {
  gasoline: "بنزين",
  diesel: "ديزل",
  lpg: "غاز"
}

export function FuelRecordsList({ fuelRecords }: FuelRecordsListProps) {
  const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const { data: vehicles } = useVehicles()
  const deleteFuelRecord = useDeleteFuelRecord()

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}` : 'مركبة غير معروفة'
  }

  const handleEdit = (record: FuelRecord) => {
    setSelectedRecord(record)
    setShowEditForm(true)
  }

  const handleDelete = async (recordId: string) => {
    await deleteFuelRecord.mutateAsync(recordId)
  }

  if (fuelRecords.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد سجلات وقود</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {fuelRecords.map((record) => (
        <Card key={record.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{getVehicleInfo(record.vehicle_id)}</h3>
                  <Badge variant="outline">
                    {fuelTypeLabels[record.fuel_type as keyof typeof fuelTypeLabels] || record.fuel_type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(record.fuel_date).toLocaleDateString('ar-SA')}
                  </span>
                  {record.fuel_station && (
                    <span>{record.fuel_station}</span>
                  )}
                  {record.receipt_number && (
                    <span className="flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      {record.receipt_number}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الكمية: </span>
                    <span className="font-medium">{record.quantity_liters} لتر</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">سعر اللتر: </span>
                    <span className="font-medium">{record.cost_per_liter.toFixed(3)} د.ك</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">التكلفة: </span>
                    <span className="font-medium text-primary">{record.total_cost.toFixed(3)} د.ك</span>
                  </div>
                </div>

                {record.odometer_reading && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">قراءة العداد: </span>
                    <span className="font-medium">{record.odometer_reading.toLocaleString()} كم</span>
                  </div>
                )}

                {record.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">ملاحظات: </span>
                    <span>{record.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(record)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف سجل الوقود هذا؟ لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(record.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        حذف
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* نموذج التعديل */}
      {showEditForm && selectedRecord && (
        <FuelRecordForm
          open={showEditForm}
          onOpenChange={(open) => {
            setShowEditForm(open)
            if (!open) setSelectedRecord(null)
          }}
          fuelRecord={selectedRecord}
        />
      )}
    </div>
  )
}