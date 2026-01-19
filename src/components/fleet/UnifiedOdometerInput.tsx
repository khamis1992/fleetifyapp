import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Gauge, Fuel, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useCurrentVehicleOdometer, useValidateOdometerIncrement } from '@/hooks/useUnifiedOdometerManagement';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface UnifiedOdometerInputProps {
  vehicleId: string;
  odometerValue: number | string;
  onOdometerChange: (value: number) => void;
  fuelLevel?: number;
  onFuelLevelChange?: (value: number) => void;
  disabled?: boolean;
  required?: boolean;
  showCurrentReading?: boolean;
  showFuelInput?: boolean;
  className?: string;
}

export const UnifiedOdometerInput: React.FC<UnifiedOdometerInputProps> = ({
  vehicleId,
  odometerValue,
  onOdometerChange,
  fuelLevel,
  onFuelLevelChange,
  disabled = false,
  required = true,
  showCurrentReading = true,
  showFuelInput = true,
  className = ""
}) => {
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: true });
  
  const { toast } = useToast();
  const { data: currentOdometer, refetch: refetchOdometer, isLoading } = useCurrentVehicleOdometer(vehicleId);
  const validateOdometer = useValidateOdometerIncrement();

  // Auto-fill with current reading + reasonable increment when first loaded
  useEffect(() => {
    if (currentOdometer && (!odometerValue || odometerValue === 0)) {
      // Suggest current reading + 1 km as minimum increment
      const suggestedReading = currentOdometer.current_reading + 1;
      onOdometerChange(suggestedReading);
    }
  }, [currentOdometer, odometerValue, onOdometerChange]);

  const handleOdometerChange = async (value: string) => {
    const numericValue = parseInt(value) || 0;
    onOdometerChange(numericValue);

    // Validate the new reading
    if (numericValue > 0) {
      const validation = await validateOdometer(vehicleId, numericValue);
      setValidationStatus(validation);
      
      if (!validation.isValid) {
        toast({
          title: "تحذير في قراءة العداد",
          description: validation.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleUseCurrent = () => {
    if (currentOdometer) {
      onOdometerChange(currentOdometer.current_reading);
    }
  };

  const handleRefresh = () => {
    refetchOdometer();
  };

  const getOdometerIncrement = () => {
    if (currentOdometer && typeof odometerValue === 'number' && odometerValue > 0) {
      return odometerValue - currentOdometer.current_reading;
    }
    return 0;
  };

  const increment = getOdometerIncrement();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Reading Display */}
      {showCurrentReading && currentOdometer && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">العداد الحالي للمركبة</p>
                  <p className="text-lg font-bold text-primary">
                    {currentOdometer.current_reading.toLocaleString()} كم
                  </p>
                  <p className="text-xs text-muted-foreground">
                    آخر تحديث: {new Date(currentOdometer.last_update).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrent}
                  disabled={disabled}
                >
                  استخدم الحالي
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Odometer Input */}
      <div className="space-y-2">
        <Label htmlFor="odometer" className="flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          قراءة العداد الجديدة (كم)
          {required && <span className="text-destructive">*</span>}
        </Label>
        
        <div className="space-y-2">
          <Input
            id="odometer"
            type="number"
            min="0"
            step="1"
            value={odometerValue}
            onChange={(e) => handleOdometerChange(e.target.value)}
            placeholder={currentOdometer ? `أدخل قراءة أكبر من ${currentOdometer.current_reading.toLocaleString()}` : "أدخل قراءة العداد"}
            disabled={disabled}
            required={required}
            className={`text-center text-lg ${!validationStatus.isValid ? 'border-destructive' : ''}`}
            dir="ltr"
          />
          
          {/* Validation Status */}
          {!validationStatus.isValid && validationStatus.message && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{validationStatus.message}</span>
            </div>
          )}
          
          {/* Increment Display */}
          {increment > 0 && validationStatus.isValid && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Info className="h-4 w-4" />
              <span>زيادة العداد: {increment.toLocaleString()} كم</span>
              {increment > 5000 && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  زيادة كبيرة
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fuel Level Input */}
      {showFuelInput && (
        <div className="space-y-2">
          <Label htmlFor="fuel-level" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            مستوى الوقود (%)
          </Label>
          
          <div className="space-y-2">
            <Input
              id="fuel-level"
              type="number"
              min="0"
              max="100"
              step="1"
              value={fuelLevel || ''}
              onChange={(e) => onFuelLevelChange?.(parseInt(e.target.value) || 0)}
              placeholder="أدخل مستوى الوقود (0-100)"
              disabled={disabled}
              className="text-center"
              dir="ltr"
            />
            
            {/* Fuel Level Visual */}
            {fuelLevel !== undefined && fuelLevel >= 0 && fuelLevel <= 100 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      fuelLevel >= 75 ? 'bg-green-600' :
                      fuelLevel >= 50 ? 'bg-yellow-600' :
                      fuelLevel >= 25 ? 'bg-orange-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${fuelLevel}%` }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[45px]">{fuelLevel}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">إرشادات تسجيل العداد:</p>
            <ul className="space-y-1">
              <li>• قراءة العداد يجب أن تكون أكبر من القراءة الحالية</li>
              <li>• تأكد من دقة القراءة قبل الحفظ</li>
              <li>• سيتم تحديث العداد تلقائياً في نظام إدارة الأسطول</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};