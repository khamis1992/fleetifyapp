import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, AlertTriangle, CheckCircle } from 'lucide-react';

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
  onDamagePointsChange: (points: DamagePoint[]) => void;
  readonly?: boolean;
}

export const VehicleConditionDiagram: React.FC<VehicleConditionDiagramProps> = ({
  damagePoints,
  onDamagePointsChange,
  readonly = false
}) => {
  const [selectedPoint, setSelectedPoint] = useState<DamagePoint | null>(null);
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);

  const handleDiagramClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readonly) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setPendingPoint({ x, y });
    setSelectedPoint({
      id: `temp_${Date.now()}`,
      x,
      y,
      severity: 'minor',
      description: '',
      photos: []
    });
    setShowDamageDialog(true);
  };

  const handleSaveDamagePoint = (point: DamagePoint) => {
    const newPoints = [...damagePoints];
    const existingIndex = newPoints.findIndex(p => p.id === point.id);
    
    if (existingIndex >= 0) {
      newPoints[existingIndex] = point;
    } else {
      const newId = `damage_${Date.now()}`;
      newPoints.push({ ...point, id: newId });
    }
    
    onDamagePointsChange(newPoints);
    setShowDamageDialog(false);
    setSelectedPoint(null);
    setPendingPoint(null);
  };

  const handleDeleteDamagePoint = (pointId: string) => {
    const newPoints = damagePoints.filter(p => p.id !== pointId);
    onDamagePointsChange(newPoints);
    setShowDamageDialog(false);
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'minor': return <CheckCircle className="h-3 w-3" />;
      case 'moderate': return <AlertTriangle className="h-3 w-3" />;
      case 'severe': return <X className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-4">
            {readonly 
              ? "Click on damage points to view details" 
              : "Click on the vehicle diagram to mark damage points"}
          </div>
          
          {/* Vehicle diagram container */}
          <div 
            className="relative w-full h-96 bg-muted rounded-lg border-2 border-dashed border-border cursor-pointer overflow-hidden"
            onClick={handleDiagramClick}
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='50' y='50' width='300' height='100' rx='20' fill='%23f1f5f9' stroke='%23cbd5e1' stroke-width='2'/%3E%3Crect x='70' y='70' width='60' height='20' rx='5' fill='%23e2e8f0'/%3E%3Crect x='270' y='70' width='60' height='20' rx='5' fill='%23e2e8f0'/%3E%3Ccircle cx='80' cy='170' r='15' fill='%23374151'/%3E%3Ccircle cx='320' cy='170' r='15' fill='%23374151'/%3E%3Ctext x='200' y='105' text-anchor='middle' fill='%23374151' font-size='12'%3EVehicle Top View%3C/text%3E%3C/svg%3E")`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
          >
            {/* Damage points */}
            {damagePoints.map((point) => (
              <div
                key={point.id}
                className={`absolute w-4 h-4 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg flex items-center justify-center ${getSeverityColor(point.severity)}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoint(point);
                  setShowDamageDialog(true);
                }}
              >
                <div className="text-white text-xs">
                  {getSeverityIcon(point.severity)}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background p-2 rounded-lg shadow-md">
              <div className="text-xs font-medium mb-2">Damage Severity</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs">Minor</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-xs">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Severe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Damage points summary */}
          {damagePoints.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Damage Points ({damagePoints.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {damagePoints.map((point) => (
                  <div 
                    key={point.id}
                    className="flex items-center gap-2 p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      setSelectedPoint(point);
                      setShowDamageDialog(true);
                    }}
                  >
                    <Badge variant={point.severity === 'severe' ? 'destructive' : point.severity === 'moderate' ? 'default' : 'secondary'}>
                      {point.severity}
                    </Badge>
                    <span className="text-sm truncate">{point.description || 'No description'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Damage point dialog */}
      <Dialog open={showDamageDialog} onOpenChange={setShowDamageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPoint?.id.startsWith('temp_') ? 'Add Damage Point' : 'Edit Damage Point'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPoint && (
            <DamagePointForm
              point={selectedPoint}
              onSave={handleSaveDamagePoint}
              onDelete={!selectedPoint.id.startsWith('temp_') ? () => handleDeleteDamagePoint(selectedPoint.id) : undefined}
              onCancel={() => {
                setShowDamageDialog(false);
                setSelectedPoint(null);
                setPendingPoint(null);
              }}
              readonly={readonly}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface DamagePointFormProps {
  point: DamagePoint;
  onSave: (point: DamagePoint) => void;
  onDelete?: () => void;
  onCancel: () => void;
  readonly?: boolean;
}

const DamagePointForm: React.FC<DamagePointFormProps> = ({
  point,
  onSave,
  onDelete,
  onCancel,
  readonly = false
}) => {
  const [formData, setFormData] = useState(point);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readonly) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Severity</label>
        <Select 
          value={formData.severity} 
          onValueChange={(value: any) => setFormData({...formData, severity: value})}
          disabled={readonly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="severe">Severe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Describe the damage..."
          rows={3}
          disabled={readonly}
        />
      </div>

      {!readonly && (
        <div>
          <label className="text-sm font-medium">Photos</label>
          <Button type="button" variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {!readonly && (
          <Button type="submit">
            {point.id.startsWith('temp_') ? 'Add Point' : 'Update Point'}
          </Button>
        )}
        {onDelete && !readonly && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          {readonly ? 'Close' : 'Cancel'}
        </Button>
      </div>
    </form>
  );
};