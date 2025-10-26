import React, { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff, RotateCcw, Settings, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface DashboardWidget {
  id: string
  title: string
  titleAr: string
  component: React.ComponentType<any>
  defaultVisible: boolean
  defaultSize: 'small' | 'medium' | 'large' | 'full'
  category: 'stats' | 'charts' | 'lists' | 'actions'
  order?: number
  visible?: boolean
  size?: 'small' | 'medium' | 'large' | 'full'
}

interface CustomizableDashboardProps {
  widgets: DashboardWidget[]
  dashboardId: string
}

export function CustomizableDashboard({ widgets, dashboardId }: CustomizableDashboardProps) {
  const [editMode, setEditMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize widgets on mount
  useEffect(() => {
    const defaultWidgets = widgets.map((w, idx) => ({
      ...w,
      visible: w.visible !== false ? w.defaultVisible : false,
      order: w.order ?? idx,
      size: w.size || w.defaultSize,
    })).sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)))

    setLocalWidgets(defaultWidgets)
  }, [])

  // Save layout mutation (local only)
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      return Promise.resolve(true)
    },
    onSuccess: () => {
      toast.success('تم حفظ التخطيط بنجاح')
      setEditMode(false)
    },
    onError: () => {
      toast.error('فشل في حفظ التخطيط')
    },
  })

  // Reset to default mutation
  const resetLayoutMutation = useMutation({
    mutationFn: async () => {
      return Promise.resolve(true)
    },
    onSuccess: () => {
      toast.success('تم إعادة التخطيط الافتراضي')
      
      const defaultWidgets = widgets.map((w, idx) => ({
        ...w,
        visible: w.defaultVisible,
        order: idx,
        size: w.defaultSize,
      }))
      setLocalWidgets(defaultWidgets)
      setEditMode(false)
    },
    onError: () => {
      toast.error('فشل في إعادة التخطيط')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    setLocalWidgets((items) =>
      items.map((item) =>
        item.id === widgetId
          ? { ...item, visible: !item.visible }
          : item
      )
    )
  }

  const handleSaveLayout = () => {
    saveLayoutMutation.mutate()
  }

  const handleResetLayout = () => {
    if (confirm('هل أنت متأكد من إعادة التخطيط الافتراضي؟ سيتم فقدان جميع التخصيصات.')) {
      resetLayoutMutation.mutate()
    }
  }

  const visibleWidgets = localWidgets.filter((w) => w.visible !== false)

  const getGridColsClass = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1'
      case 'medium':
        return 'col-span-1 md:col-span-2'
      case 'large':
        return 'col-span-1 md:col-span-2 lg:col-span-3'
      case 'full':
        return 'col-span-1 md:col-span-2 lg:col-span-4'
      default:
        return 'col-span-1'
    }
  }

  if (localWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">لوحة التحكم</h2>
          {editMode && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-900 rounded">
              وضع التعديل
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(false)}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLayout}
                disabled={saveLayoutMutation.isPending}
              >
                {saveLayoutMutation.isPending ? 'جاري الحفظ...' : 'حفظ التخطيط'}
              </Button>
            </>
          ) : (
            <>
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 ml-2" />
                    إدارة العناصر
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>إدارة عناصر لوحة التحكم</DialogTitle>
                  </DialogHeader>
                  <WidgetSettingsDialog
                    widgets={localWidgets}
                    onToggle={toggleWidgetVisibility}
                  />
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <GripVertical className="h-4 w-4 ml-2" />
                تخصيص
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                disabled={resetLayoutMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 ml-2" />
                إعادة الافتراضي
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
          disabled={!editMode}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleWidgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                editMode={editMode}
                gridColsClass={getGridColsClass(widget.size || widget.defaultSize)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {visibleWidgets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Eye className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد عناصر مرئية</h3>
            <p className="text-muted-foreground text-center mb-4">
              قم بتفعيل بعض العناصر من إدارة العناصر
            </p>
            <Button onClick={() => setShowSettings(true)}>
              <Plus className="h-4 w-4 ml-2" />
              إدارة العناصر
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DraggableWidget({
  widget,
  editMode,
  gridColsClass,
}: {
  widget: DashboardWidget
  editMode: boolean
  gridColsClass: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !editMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const WidgetComponent = widget.component

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${gridColsClass} ${editMode ? 'cursor-move' : ''}`}
    >
      <div className={`relative h-full ${editMode ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}>
        {editMode && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 z-10 p-1 bg-white rounded-md shadow-md cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <WidgetComponent />
      </div>
    </div>
  )
}

function WidgetSettingsDialog({
  widgets,
  onToggle,
}: {
  widgets: DashboardWidget[]
  onToggle: (widgetId: string) => void
}) {
  const groupedWidgets = widgets.reduce((acc, widget) => {
    const category = widget.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(widget)
    return acc
  }, {} as Record<string, DashboardWidget[]>)

  const categoryLabels: Record<string, string> = {
    stats: 'إحصائيات',
    charts: 'رسوم بيانية',
    lists: 'قوائم',
    actions: 'إجراءات سريعة',
  }

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {Object.entries(groupedWidgets).map(([category, categoryWidgets]) => (
        <div key={category}>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
            {categoryLabels[category] || category}
          </h3>
          <div className="space-y-2">
            {categoryWidgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {widget.visible ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{widget.titleAr}</p>
                    <p className="text-xs text-muted-foreground">{widget.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {widget.size || widget.defaultSize}
                  </span>
                  <Switch
                    checked={widget.visible !== false}
                    onCheckedChange={() => onToggle(widget.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
