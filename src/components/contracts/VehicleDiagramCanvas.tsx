import React, { useRef, useEffect, useState } from 'react';
import { Canvas as FabricCanvas, Circle, FabricImage, FabricText, Point } from 'fabric';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface DamagePoint {
  id: string;
  x: number;
  y: number;
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface VehicleDiagramCanvasProps {
  damagePoints: DamagePoint[];
  onDamagePointsChange: (points: DamagePoint[]) => void;
  isReadOnly?: boolean;
  vehicleImage?: string;
}

export const VehicleDiagramCanvas: React.FC<VehicleDiagramCanvasProps> = ({
  damagePoints,
  onDamagePointsChange,
  isReadOnly = false,
  vehicleImage = '/lovable-uploads/5a23ddaa-5c1d-4193-9145-7c80c4532abe.png' // Default car diagram
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DamagePoint | null>(null);
  const [isPointDialogOpen, setIsPointDialogOpen] = useState(false);
  const [newPointData, setNewPointData] = useState({
    location: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high'
  });
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#f8f9fa',
      selection: !isReadOnly,
    });

    // Load vehicle image
    FabricImage.fromURL(vehicleImage).then((img) => {
      // Scale image to fit canvas
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const imageWidth = img.width || 1;
      const imageHeight = img.height || 1;
      
      const scale = Math.min(
        (canvasWidth - 40) / imageWidth,
        (canvasHeight - 40) / imageHeight
      );

      img.scale(scale);
      img.set({
        left: (canvasWidth - (imageWidth * scale)) / 2,
        top: (canvasHeight - (imageHeight * scale)) / 2,
        selectable: false,
        evented: false,
      });

      canvas.add(img);
      canvas.renderAll();
    });

    // Add click event for adding damage points
    if (!isReadOnly) {
      canvas.on('mouse:down', (e) => {
        if (!e.pointer) return;
        
        const point = e.pointer;
        setPendingPoint({ x: point.x, y: point.y });
        setNewPointData({
          location: '',
          description: '',
          severity: 'medium'
        });
        setIsPointDialogOpen(true);
      });
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [vehicleImage, isReadOnly]);

  // Update damage points on canvas
  useEffect(() => {
    if (!fabricCanvas) return;

    // Remove existing damage point circles  
    const objects = fabricCanvas.getObjects().filter((obj: any) => obj.data?.type === 'damagePoint');
    objects.forEach(obj => fabricCanvas.remove(obj));

    // Add damage points as circles
    damagePoints.forEach((point, index) => {
      const circle = new Circle({
        left: point.x - 8,
        top: point.y - 8,
        radius: 8,
        fill: getSeverityColor(point.severity),
        stroke: '#fff',
        strokeWidth: 2,
        selectable: !isReadOnly,
        evented: !isReadOnly,
        data: { type: 'damagePoint', pointId: point.id }
      } as any);

      // Add number text
      const text = new FabricText((index + 1).toString(), {
        left: point.x - 4,
        top: point.y - 6,
        fontSize: 12,
        fill: '#fff',
        fontWeight: 'bold',
        selectable: false,
        evented: false,
        data: { type: 'damagePointText', pointId: point.id }
      } as any);

      fabricCanvas.add(circle);
      fabricCanvas.add(text);
    });

    fabricCanvas.renderAll();
  }, [damagePoints, fabricCanvas, isReadOnly]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return severity;
    }
  };

  const handleAddDamagePoint = () => {
    if (!pendingPoint || !newPointData.location || !newPointData.description) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const newPoint: DamagePoint = {
      id: Date.now().toString(),
      x: pendingPoint.x,
      y: pendingPoint.y,
      location: newPointData.location,
      description: newPointData.description,
      severity: newPointData.severity
    };

    onDamagePointsChange([...damagePoints, newPoint]);
    setIsPointDialogOpen(false);
    setPendingPoint(null);
    toast.success('تم إضافة نقطة الضرر بنجاح');
  };

  const handleRemoveDamagePoint = (pointId: string) => {
    onDamagePointsChange(damagePoints.filter(p => p.id !== pointId));
    toast.success('تم حذف نقطة الضرر');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          مخطط المركبة
        </h4>
        {!isReadOnly && (
          <Badge variant="outline" className="text-xs">
            انقر على المخطط لإضافة نقطة ضرر
          </Badge>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <canvas ref={canvasRef} className="max-w-full border rounded" />
      </div>

      {/* قائمة نقاط الضرر */}
      {damagePoints.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-medium text-sm">نقاط الضرر المحددة:</h5>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {damagePoints.map((point, index) => (
              <div key={point.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-bold"
                    style={{ backgroundColor: getSeverityColor(point.severity) }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-medium">{point.location}</span>
                    <span className="text-muted-foreground ml-2">- {point.description}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {getSeverityLabel(point.severity)}
                    </Badge>
                  </div>
                </div>
                {!isReadOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveDamagePoint(point.id)}
                    className="text-destructive hover:text-destructive h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog لإضافة نقطة ضرر */}
      <Dialog open={isPointDialogOpen} onOpenChange={setIsPointDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة نقطة ضرر</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">موقع الضرر *</Label>
              <Input
                id="location"
                placeholder="مثال: الباب الأمامي الأيمن"
                value={newPointData.location}
                onChange={(e) => setNewPointData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">وصف الضرر *</Label>
              <Textarea
                id="description"
                placeholder="وصف تفصيلي للضرر"
                value={newPointData.description}
                onChange={(e) => setNewPointData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="severity">درجة الخطورة</Label>
              <Select
                value={newPointData.severity}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setNewPointData(prev => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddDamagePoint} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                إضافة
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsPointDialogOpen(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};