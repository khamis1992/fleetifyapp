import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, XCircle, Loader2, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { useUpdateContractStatus } from '@/hooks/useContractRenewal';
import { useCreateContractVehicleReturn } from '@/hooks/useContractVehicleReturn';
import { toast } from 'sonner';

interface ContractCancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
}

export const ContractCancellationDialog: React.FC<ContractCancellationDialogProps> = ({
  open,
  onOpenChange,
  contract
}) => {
  const [cancellationReason, setCancellationReason] = React.useState('');
  const [recordVehicleCondition, setRecordVehicleCondition] = React.useState(false);
  const [showVehicleSection, setShowVehicleSection] = React.useState(false);
  
  // Vehicle condition state
  const [vehicleCondition, setVehicleCondition] = React.useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [fuelLevel, setFuelLevel] = React.useState(50);
  const [odometerReading, setOdometerReading] = React.useState<number | undefined>(undefined);
  const [damagesNotes, setDamagesNotes] = React.useState('');
  
  const updateContractStatus = useUpdateContractStatus();
  const createVehicleReturn = useCreateContractVehicleReturn();

  const isProcessing = updateContractStatus.isPending || createVehicleReturn.isPending;

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setCancellationReason('');
      setRecordVehicleCondition(false);
      setShowVehicleSection(false);
      setVehicleCondition('good');
      setFuelLevel(50);
      setOdometerReading(undefined);
      setDamagesNotes('');
    }
  }, [open]);

  // Don't render anything if dialog is closed
  if (!open) {
    return null;
  }

  const handleCancellation = async () => {
    if (!cancellationReason.trim()) {
      toast.error('يرجى إدخال سبب الإلغاء');
      return;
    }
    
    try {
      // Record vehicle condition if enabled
      if (recordVehicleCondition && contract.vehicle_id) {
        await createVehicleReturn.mutateAsync({
          contract_id: contract.id,
          vehicle_id: contract.vehicle_id,
          return_date: new Date().toISOString().split('T')[0],
          vehicle_condition: vehicleCondition,
          fuel_level: fuelLevel,
          odometer_reading: odometerReading,
          notes: damagesNotes || undefined,
          damages: damagesNotes ? [{
            type: 'ملاحظات',
            description: damagesNotes,
            severity: 'minor'
          }] : []
        });
      }

      // Cancel the contract
      await updateContractStatus.mutateAsync({
        contractId: contract.id,
        status: 'cancelled',
        reason: cancellationReason.trim()
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling contract:', error);
    }
  };

  // Helper function - available for future use
  void function getConditionLabel(condition: string) {
    switch (condition) {
      case 'excellent': return 'ممتازة';
      case 'good': return 'جيدة';
      case 'fair': return 'مقبولة';
      case 'poor': return 'سيئة';
      default: return condition;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            إلغاء العقد
          </DialogTitle>
          <DialogDescription>
            رقم العقد: {contract?.contract_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>تحذير:</strong> هذا الإجراء سيؤدي إلى إلغاء العقد نهائياً. 
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDescription>
          </Alert>

          {/* Contract Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">العميل:</span>
              <span className="font-medium">
                {contract?.customers?.first_name_ar || contract?.customers?.first_name || 
                 contract?.customers?.company_name_ar || contract?.customers?.company_name || 'غير محدد'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">المركبة:</span>
              <span className="font-medium">{contract?.vehicle?.plate_number || 'غير محدد'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">الحالة الحالية:</span>
              <span className="font-medium text-green-600">
                {contract?.status === 'active' ? 'نشط' : contract?.status}
              </span>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancellation_reason" className="text-slate-700">
              سبب الإلغاء <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancellation_reason"
              placeholder="أدخل سبب إلغاء العقد..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={isProcessing}
            />
          </div>

          {/* Vehicle Condition Toggle */}
          {contract?.vehicle_id && (
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setShowVehicleSection(!showVehicleSection);
                  if (!showVehicleSection) setRecordVehicleCondition(true);
                }}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-slate-600" />
                  <span className="font-medium text-slate-700">تسجيل حالة المركبة عند الإرجاع</span>
                  <span className="text-xs text-slate-500">(اختياري)</span>
                </div>
                {showVehicleSection ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {showVehicleSection && (
                <div className="p-4 space-y-4 border-t">
                  {/* Enable/Disable */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="record_condition"
                      checked={recordVehicleCondition}
                      onCheckedChange={(checked) => setRecordVehicleCondition(checked === true)}
                    />
                    <Label htmlFor="record_condition" className="text-sm cursor-pointer">
                      تسجيل حالة المركبة قبل الإلغاء
                    </Label>
                  </div>

                  {recordVehicleCondition && (
                    <div className="space-y-4 pt-2">
                      {/* Vehicle Condition */}
                      <div className="space-y-2">
                        <Label>حالة المركبة</Label>
                        <Select value={vehicleCondition} onValueChange={(v: any) => setVehicleCondition(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">ممتازة</SelectItem>
                            <SelectItem value="good">جيدة</SelectItem>
                            <SelectItem value="fair">مقبولة</SelectItem>
                            <SelectItem value="poor">سيئة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Fuel Level */}
                      <div className="space-y-2">
                        <Label>مستوى الوقود: {fuelLevel}%</Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={fuelLevel}
                          onChange={(e) => setFuelLevel(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>فارغ</span>
                          <span>ممتلئ</span>
                        </div>
                      </div>

                      {/* Odometer */}
                      <div className="space-y-2">
                        <Label htmlFor="odometer">قراءة العداد (كم)</Label>
                        <Input
                          id="odometer"
                          type="number"
                          placeholder="مثال: 50000"
                          value={odometerReading || ''}
                          onChange={(e) => setOdometerReading(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>

                      {/* Damages Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="damages_notes">ملاحظات / أضرار</Label>
                        <Textarea
                          id="damages_notes"
                          placeholder="اذكر أي أضرار أو ملاحظات على المركبة..."
                          value={damagesNotes}
                          onChange={(e) => setDamagesNotes(e.target.value)}
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            تراجع
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancellation}
            disabled={isProcessing || !cancellationReason.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الإلغاء...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 ml-2" />
                إلغاء العقد
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
