import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { VehicleConditionDiagram } from './VehicleConditionDiagram';
import { useUpdateConditionReport } from '@/hooks/useVehicleCondition';
import type { VehicleConditionReport as VehicleConditionReportType, UpdateConditionReportData } from '@/hooks/useVehicleCondition';
import { CheckCircle, AlertTriangle, X, FileText } from 'lucide-react';

interface VehicleConditionReportProps {
  report: VehicleConditionReportType;
  readonly?: boolean;
  onStatusChange?: (status: string) => void;
}

export const VehicleConditionReport: React.FC<VehicleConditionReportProps> = ({
  report,
  readonly = false,
  onStatusChange
}) => {
  const [formData, setFormData] = useState({
    overall_condition: report.overall_condition,
    mileage_reading: report.mileage_reading || 0,
    fuel_level: report.fuel_level || 100,
    notes: report.notes || '',
    condition_items: report.condition_items,
    damage_items: report.damage_items,
    status: report.status
  });

  const updateMutation = useUpdateConditionReport();

  const handleSave = async () => {
    if (readonly) return;

    const updateData: UpdateConditionReportData = {
      overall_condition: formData.overall_condition,
      mileage_reading: formData.mileage_reading,
      fuel_level: formData.fuel_level,
      notes: formData.notes,
      condition_items: formData.condition_items,
      damage_items: formData.damage_items,
      status: formData.status
    };

    await updateMutation.mutateAsync({ id: report.id, updates: updateData });
    onStatusChange?.(formData.status);
  };

  const handleConditionItemChange = (category: string, item: string, value: any) => {
    const updatedItems = {
      ...formData.condition_items,
      [category]: {
        ...formData.condition_items[category],
        [item]: value
      }
    };
    setFormData({ ...formData, condition_items: updatedItems });
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'fair': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor': return <X className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'requires_attention': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Vehicle Condition Report
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(formData.status)}>
                {formData.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {getConditionIcon(formData.overall_condition)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Overall Condition</label>
              <Select
                value={formData.overall_condition}
                onValueChange={(value: any) => setFormData({ ...formData, overall_condition: value })}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Mileage Reading</label>
              <Input
                type="number"
                value={formData.mileage_reading}
                onChange={(e) => setFormData({ ...formData, mileage_reading: parseInt(e.target.value) || 0 })}
                disabled={readonly}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Fuel Level (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.fuel_level}
                onChange={(e) => setFormData({ ...formData, fuel_level: parseInt(e.target.value) || 0 })}
                disabled={readonly}
              />
            </div>
          </div>

          {!readonly && (
            <div>
              <label className="text-sm font-medium">Report Status</label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="requires_attention">Requires Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Condition Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Condition Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(formData.condition_items).map(([category, items]: [string, any]) => (
            <div key={category}>
              <h4 className="font-medium mb-3 capitalize">{category.replace('_', ' ')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(items).map(([item, value]: [string, any]) => (
                  <div key={item} className="flex items-center justify-between">
                    <label className="text-sm capitalize">{item.replace('_', ' ')}</label>
                    {typeof value === 'boolean' ? (
                      <Checkbox
                        checked={value}
                        onCheckedChange={(checked) => handleConditionItemChange(category, item, checked)}
                        disabled={readonly}
                      />
                    ) : (
                      <Select
                        value={value}
                        onValueChange={(newValue) => handleConditionItemChange(category, item, newValue)}
                        disabled={readonly}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="working">Working</SelectItem>
                          <SelectItem value="not_working">Not Working</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
              {category !== Object.keys(formData.condition_items)[Object.keys(formData.condition_items).length - 1] && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vehicle Damage Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Damage Points</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleConditionDiagram
            damagePoints={formData.damage_items}
            onDamagePointsChange={(points) => setFormData({ ...formData, damage_items: points })}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any additional notes about the vehicle condition..."
            rows={4}
            disabled={readonly}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readonly && (
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Report'}
          </Button>
          <Button variant="outline">
            Generate PDF
          </Button>
        </div>
      )}
    </div>
  );
};