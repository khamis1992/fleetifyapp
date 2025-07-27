import { useState } from "react"
import { Plus, Palette, Settings, MoreVertical, Edit, Trash2, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { useVehicleGroups, useCreateVehicleGroup, VehicleGroup } from "@/hooks/useVehicles"
import { useCostCenters } from "@/hooks/useCostCenters"

const GROUP_COLORS = [
  { value: '#3B82F6', label: 'أزرق' },
  { value: '#10B981', label: 'أخضر' },
  { value: '#F59E0B', label: 'برتقالي' },
  { value: '#EF4444', label: 'أحمر' },
  { value: '#8B5CF6', label: 'بنفسجي' },
  { value: '#06B6D4', label: 'فيروزي' },
  { value: '#84CC16', label: 'أخضر فاتح' },
  { value: '#F97316', label: 'برتقالي داكن' },
  { value: '#EC4899', label: 'وردي' },
  { value: '#6B7280', label: 'رمادي' }
]

interface VehicleGroupFormProps {
  group?: VehicleGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}

function VehicleGroupForm({ group, open, onOpenChange }: VehicleGroupFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createGroupMutation = useCreateVehicleGroup()
  const { data: costCenters } = useCostCenters()

  const form = useForm({
    defaultValues: {
      group_name: '',
      group_name_ar: '',
      description: '',
      group_color: '#3B82F6',
      default_cost_center_id: '',
      default_depreciation_rate: '20',
      default_useful_life_years: '5'
    }
  })

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      await createGroupMutation.mutateAsync({
        group_name: data.group_name,
        group_name_ar: data.group_name_ar,
        description: data.description,
        group_color: data.group_color,
        default_cost_center_id: data.default_cost_center_id || null,
        default_depreciation_rate: parseFloat(data.default_depreciation_rate),
        default_useful_life_years: parseInt(data.default_useful_life_years),
        is_active: true,
        company_id: ''  // This will be set by the hook
      })
      
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {group ? 'تعديل مجموعة المركبات' : 'إضافة مجموعة مركبات جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group_name">اسم المجموعة (English)</Label>
              <Input
                id="group_name"
                {...form.register('group_name')}
                placeholder="Passenger Cars"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_name_ar">اسم المجموعة (العربية)</Label>
              <Input
                id="group_name_ar"
                {...form.register('group_name_ar')}
                placeholder="سيارات الركوب"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="وصف المجموعة..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group_color">لون المجموعة</Label>
              <Select
                value={form.watch('group_color')}
                onValueChange={(value) => form.setValue('group_color', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_cost_center_id">مركز التكلفة الافتراضي</Label>
              <Select
                value={form.watch('default_cost_center_id')}
                onValueChange={(value) => form.setValue('default_cost_center_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركز التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters?.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.center_name_ar || center.center_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_depreciation_rate">معدل الإهلاك الافتراضي (%)</Label>
              <Input
                id="default_depreciation_rate"
                type="number"
                step="0.1"
                {...form.register('default_depreciation_rate')}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_useful_life_years">العمر الإنتاجي الافتراضي (سنة)</Label>
              <Input
                id="default_useful_life_years"
                type="number"
                {...form.register('default_useful_life_years')}
                placeholder="5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
              {group ? 'تحديث المجموعة' : 'إضافة المجموعة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function VehicleGroupsManagement() {
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<VehicleGroup | null>(null)
  const { data: vehicleGroups, isLoading } = useVehicleGroups()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة مجموعات المركبات</h1>
          <p className="text-muted-foreground">
            تنظيم وإدارة مجموعات المركبات حسب النوع والاستخدام
          </p>
        </div>
        <Button onClick={() => setShowGroupForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة مجموعة جديدة
        </Button>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vehicleGroups?.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: group.group_color }}
                  />
                  <CardTitle className="text-lg">
                    {group.group_name_ar || group.group_name}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      setSelectedGroup(group)
                      setShowGroupForm(true)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      تعديل المجموعة
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف المجموعة
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {group.description && (
                <CardDescription className="mt-2">
                  {group.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Group Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">معدل الإهلاك الافتراضي:</span>
                  <Badge variant="secondary">
                    {group.default_depreciation_rate}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">العمر الإنتاجي الافتراضي:</span>
                  <Badge variant="secondary">
                    {group.default_useful_life_years} سنة
                  </Badge>
                </div>
              </div>

              {/* Group Stats */}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>عدد المركبات: 0</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  إعدادات
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Car className="h-4 w-4 mr-2" />
                  عرض المركبات
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {vehicleGroups?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مجموعات بعد</h3>
            <p className="text-muted-foreground text-center mb-4">
              ابدأ في تنظيم أسطولك عن طريق إنشاء مجموعات للمركبات
            </p>
            <Button onClick={() => setShowGroupForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة مجموعة جديدة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Group Form Dialog */}
      <VehicleGroupForm 
        group={selectedGroup || undefined}
        open={showGroupForm} 
        onOpenChange={(open) => {
          setShowGroupForm(open)
          if (!open) setSelectedGroup(null)
        }}
      />
    </div>
  )
}