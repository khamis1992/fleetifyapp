import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertTriangle, Download, FileText } from 'lucide-react';
import { useDamageReportExport } from '@/hooks/useDamageReportExport';

interface DamagePoint {
  id: string;
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photos?: string[];
}

interface VehicleConditionDiagramProps {
  damagePoints: DamagePoint[];
  onDamagePointsChange?: (points: DamagePoint[]) => void;
  readOnly?: boolean;
  onExport?: (imageBlob: Blob) => Promise<void>;
  conditionReportId?: string; // For HTML report export
}

export const VehicleConditionDiagram: React.FC<VehicleConditionDiagramProps> = ({
  damagePoints,
  onDamagePointsChange,
  readOnly = false,
  onExport,
  conditionReportId
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<DamagePoint | null>(null);
  const [pendingPoint, setPendingPoint] = useState<{x: number, y: number} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const { exportDamageReport, isExporting: isExportingReport } = useDamageReportExport();

  const handleDiagramClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setPendingPoint({ x, y });
    setSelectedPoint({
      id: '',
      x,
      y,
      severity: 'minor',
      description: ''
    });
    setShowDialog(true);
  };

  const exportDiagram = useCallback(async () => {
    if (!diagramRef.current || !onExport) return;
    
    setIsExporting(true);
    try {
      // Create a canvas to render the diagram
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = diagramRef.current.getBoundingClientRect();
      canvas.width = 800;
      canvas.height = 480;

      // Load and draw the vehicle image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        // Draw the vehicle image
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw damage points
        damagePoints.forEach((point) => {
          const x = (point.x / 100) * canvas.width;
          const y = (point.y / 100) * canvas.height;
          
          // Draw damage point circle
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          
          // Set color based on severity
          switch (point.severity) {
            case 'minor':
              ctx.fillStyle = '#eab308';
              break;
            case 'moderate':
              ctx.fillStyle = '#f97316';
              break;
            case 'severe':
              ctx.fillStyle = '#ef4444';
              break;
            default:
              ctx.fillStyle = '#6b7280';
          }
          
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // Convert to blob and call onExport
        canvas.toBlob(async (blob) => {
          if (blob) {
            await onExport(blob);
          }
          setIsExporting(false);
        }, 'image/png');
      };
      
      img.src = '/lovable-uploads/c3d3679c-5f97-4d37-a138-1c52edad03f8.png';
    } catch (error) {
      console.error('Error exporting diagram:', error);
      setIsExporting(false);
    }
  }, [damagePoints, onExport]);

  const handleSaveDamagePoint = (pointData: Omit<DamagePoint, 'id'>) => {
    if (!onDamagePointsChange) return;
    
    if (selectedPoint?.id) {
      // Edit existing point
      console.log('📝 [DAMAGE_DIAGRAM] Editing existing damage point:', selectedPoint.id);
      const updatedPoints = damagePoints.map(point =>
        point.id === selectedPoint.id ? { ...pointData, id: selectedPoint.id } : point
      );
      onDamagePointsChange(updatedPoints);
    } else {
      // Add new point
      console.log('📝 [DAMAGE_DIAGRAM] Adding new damage point:', pointData);
      const newPoint: DamagePoint = {
        ...pointData,
        id: `damage_${Date.now()}`
      };
      console.log('📝 [DAMAGE_DIAGRAM] New point created with ID:', newPoint.id);
      onDamagePointsChange([...damagePoints, newPoint]);
    }
    
    setShowDialog(false);
    setSelectedPoint(null);
    setPendingPoint(null);
  };

  const handleDeleteDamagePoint = (pointId: string) => {
    if (!onDamagePointsChange) return;
    
    const updatedPoints = damagePoints.filter(point => point.id !== pointId);
    onDamagePointsChange(updatedPoints);
    setShowDialog(false);
    setSelectedPoint(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-yellow-500';
      case 'moderate': return 'bg-orange-500';
      case 'severe': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'minor': return 'ضرر بسيط';
      case 'moderate': return 'ضرر متوسط';
      case 'severe': return 'ضرر خطير';
      default: return severity;
    }
  };

  const handleExportReport = async () => {
    if (!conditionReportId) return;
    
    await exportDamageReport({
      conditionReportId,
      damagePoints,
      title: 'تقرير أضرار المركبة'
    });
  };

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        {conditionReportId && (
          <Button
            onClick={handleExportReport}
            disabled={isExportingReport}
            variant="outline"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isExportingReport ? 'جاري إنشاء التقرير...' : 'تصدير تقرير HTML'}
          </Button>
        )}
        {onExport && (
          <Button
            onClick={exportDiagram}
            disabled={isExporting}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير المخطط'}
          </Button>
        )}
      </div>

      {/* Vehicle Diagram */}
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        <div
          ref={diagramRef}
          className={`relative w-full bg-white ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
          style={{ paddingBottom: '60%' }} // Aspect ratio for the diagram
          onClick={handleDiagramClick}
        >
          {/* Vehicle Diagram Background */}
          <div className="absolute inset-0">
            <img
              src="/lovable-uploads/c3d3679c-5f97-4d37-a138-1c52edad03f8.png"
              alt="مخطط المركبة"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
          
          {/* Damage Points */}
          {damagePoints.map((point) => (
            <div
              key={point.id}
              className={`absolute w-4 h-4 rounded-full border-2 border-white cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${getSeverityColor(point.severity)}`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                zIndex: 10
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) {
                  setSelectedPoint(point);
                  setShowDialog(true);
                }
              }}
              title={point.description}
            >
              <div className="w-full h-full rounded-full animate-pulse" />
            </div>
          ))}
          
          {/* Instructions Overlay */}
          {damagePoints.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
              <div className="text-center p-4 bg-white rounded-lg shadow-lg">
                <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">اضغط على أي مكان في المخطط لإضافة نقطة ضرر</p>
              </div>
            </div>
          )}
          
          {/* Read-only overlay */}
          {damagePoints.length === 0 && readOnly && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-5">
              <div className="text-center p-4 bg-white rounded-lg shadow-lg">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">لا توجد أضرار مسجلة على هذه المركبة</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Damage Points Summary */}
      {damagePoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            نقاط الأضرار المسجلة ({damagePoints.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {damagePoints.map((point, index) => (
              <div key={point.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(point.severity)}`} />
                  <span>نقطة {index + 1}</span>
                  <Badge variant="outline" className="text-xs">
                    {getSeverityText(point.severity)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPoint(point);
                    setShowDialog(true);
                  }}
                >
                  تعديل
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Damage Point Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {selectedPoint?.id ? 'تعديل نقطة الضرر' : 'إضافة نقطة ضرر جديدة'}
            </DialogTitle>
          </DialogHeader>
          
          <DamagePointForm
            point={selectedPoint}
            onSave={handleSaveDamagePoint}
            onDelete={selectedPoint?.id ? () => handleDeleteDamagePoint(selectedPoint.id) : undefined}
            onCancel={() => {
              setShowDialog(false);
              setSelectedPoint(null);
              setPendingPoint(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface DamagePointFormProps {
  point: DamagePoint | null;
  onSave: (point: Omit<DamagePoint, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const DamagePointForm: React.FC<DamagePointFormProps> = ({
  point,
  onSave,
  onDelete,
  onCancel
}) => {
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'severe'>(point?.severity || 'minor');
  const [description, setDescription] = useState(point?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    onSave({
      x: point?.x || 0,
      y: point?.y || 0,
      severity,
      description: description.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">درجة الضرر</label>
        <Select value={severity} onValueChange={(value: 'minor' | 'moderate' | 'severe') => setSeverity(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">ضرر بسيط</SelectItem>
            <SelectItem value="moderate">ضرر متوسط</SelectItem>
            <SelectItem value="severe">ضرر خطير</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">وصف الضرر</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اكتب وصفاً مفصلاً للضرر..."
          rows={3}
          required
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={!description.trim()}>
          {point?.id ? 'حفظ التعديل' : 'إضافة النقطة'}
        </Button>
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
};