import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ContractVehicleReturnForm } from './ContractVehicleReturnForm';
import { 
  useContractVehicleReturnByContract, 
  useCreateContractVehicleReturn,
  useApproveContractVehicleReturn,
  useRejectContractVehicleReturn,
  CreateContractVehicleReturnData 
} from '@/hooks/useContractVehicleReturn';
import { useUpdateContractStatus } from '@/hooks/useContractRenewal';

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
  const [currentStep, setCurrentStep] = useState<'vehicle-return' | 'approval' | 'cancellation'>('vehicle-return');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { data: vehicleReturn, isLoading: isLoadingReturn } = useContractVehicleReturnByContract(contract?.id);
  const createVehicleReturn = useCreateContractVehicleReturn();
  const approveVehicleReturn = useApproveContractVehicleReturn();
  const rejectVehicleReturn = useRejectContractVehicleReturn();
  const updateContractStatus = useUpdateContractStatus();

  React.useEffect(() => {
    if (vehicleReturn) {
      if (vehicleReturn.status === 'approved') {
        setCurrentStep('cancellation');
      } else {
        setCurrentStep('approval');
      }
    } else {
      setCurrentStep('vehicle-return');
    }
  }, [vehicleReturn]);

  const handleCreateVehicleReturn = async (data: CreateContractVehicleReturnData) => {
    try {
      await createVehicleReturn.mutateAsync(data);
      setCurrentStep('approval');
    } catch (error) {
      console.error('Error creating vehicle return:', error);
    }
  };

  const handleApproveReturn = async () => {
    if (!vehicleReturn) return;
    
    try {
      await approveVehicleReturn.mutateAsync(vehicleReturn.id);
      setCurrentStep('cancellation');
    } catch (error) {
      console.error('Error approving vehicle return:', error);
    }
  };

  const handleRejectReturn = async () => {
    if (!vehicleReturn || !rejectionReason.trim()) return;
    
    try {
      await rejectVehicleReturn.mutateAsync({
        returnId: vehicleReturn.id,
        rejectionReason: rejectionReason.trim()
      });
      setCurrentStep('vehicle-return');
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting vehicle return:', error);
    }
  };

  const handleFinalCancellation = async () => {
    try {
      await updateContractStatus.mutateAsync({
        contractId: contract.id,
        status: 'cancelled',
        reason: 'Contract cancelled after vehicle return approval'
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error cancelling contract:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoadingReturn) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>جاري تحميل معلومات إرجاع المركبة...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          إلغاء العقد: {contract?.contract_number}
        </DialogTitle>
        <DialogDescription>
          لإلغاء هذا العقد، يجب إكمال نموذج إرجاع المركبة والموافقة عليه.
        </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div className={`flex items-center gap-2 ${currentStep === 'vehicle-return' ? 'text-primary font-semibold' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              vehicleReturn ? 'bg-green-500 text-white' : currentStep === 'vehicle-return' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              {vehicleReturn ? '✓' : '1'}
            </div>
            <span>إرجاع المركبة</span>
          </div>
          
          <div className="h-px bg-gray-300 flex-1 mx-4"></div>
          
          <div className={`flex items-center gap-2 ${currentStep === 'approval' ? 'text-primary font-semibold' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              vehicleReturn?.status === 'approved' ? 'bg-green-500 text-white' : currentStep === 'approval' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              {vehicleReturn?.status === 'approved' ? '✓' : '2'}
            </div>
            <span>الموافقة</span>
          </div>
          
          <div className="h-px bg-gray-300 flex-1 mx-4"></div>
          
          <div className={`flex items-center gap-2 ${currentStep === 'cancellation' ? 'text-primary font-semibold' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'cancellation' ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span>الإلغاء</span>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 'vehicle-return' && !vehicleReturn && (
          <div>
            {/* Check for missing data */}
            {(!contract?.customer || !contract?.vehicle) && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تحذير: بعض البيانات المطلوبة مفقودة من العقد:
                  {!contract?.customer && <div>• بيانات العميل مفقودة</div>}
                  {!contract?.vehicle && <div>• بيانات المركبة مفقودة</div>}
                  يرجى التأكد من اكتمال بيانات العقد قبل المتابعة.
                </AlertDescription>
              </Alert>
            )}
            
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                قبل إلغاء هذا العقد، يرجى إكمال نموذج إرجاع المركبة لتوثيق حالة المركبة.
              </AlertDescription>
            </Alert>
            
            <ContractVehicleReturnForm
              contract={contract}
              onSubmit={handleCreateVehicleReturn}
              onCancel={() => onOpenChange(false)}
              isSubmitting={createVehicleReturn.isPending}
            />
          </div>
        )}

        {currentStep === 'approval' && vehicleReturn && vehicleReturn.status === 'pending' && (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تم تقديم نموذج إرجاع المركبة. يرجى المراجعة والموافقة قبل المتابعة مع إلغاء العقد.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">تفاصيل إرجاع المركبة</h3>
                <Badge className={getStatusColor(vehicleReturn.status)}>
                  {getStatusIcon(vehicleReturn.status)}
                  <span className="ml-1 capitalize">{vehicleReturn.status}</span>
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>تاريخ الإرجاع:</strong> {new Date(vehicleReturn.return_date).toLocaleDateString('ar-EG')}
                </div>
                <div>
                  <strong>الحالة:</strong> {vehicleReturn.vehicle_condition === 'excellent' ? 'ممتازة' : 
                    vehicleReturn.vehicle_condition === 'good' ? 'جيدة' : 
                    vehicleReturn.vehicle_condition === 'fair' ? 'مقبولة' : 'سيئة'}
                </div>
                <div>
                  <strong>مستوى الوقود:</strong> {vehicleReturn.fuel_level}%
                </div>
                {vehicleReturn.odometer_reading && (
                  <div>
                    <strong>قراءة العداد:</strong> {vehicleReturn.odometer_reading} كم
                  </div>
                )}
              </div>
              
              {vehicleReturn.damages && Array.isArray(vehicleReturn.damages) && vehicleReturn.damages.length > 0 && (
                <div className="mt-4">
                  <strong>الأضرار:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {vehicleReturn.damages.map((damage: any, index: number) => (
                      <li key={index} className="text-sm">
                        {damage.type}: {damage.description} ({damage.severity})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {vehicleReturn.notes && (
                <div className="mt-4">
                  <strong>ملاحظات:</strong>
                  <p className="text-sm mt-1">{vehicleReturn.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection_reason">سبب الرفض (في حالة الرفض)</Label>
                <Textarea
                  id="rejection_reason"
                  placeholder="أدخل سبب الرفض..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={handleRejectReturn}
                disabled={!rejectionReason.trim() || rejectVehicleReturn.isPending}
              >
                رفض الإرجاع
              </Button>
              <Button 
                onClick={handleApproveReturn}
                disabled={approveVehicleReturn.isPending}
              >
                الموافقة على الإرجاع
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'approval' && vehicleReturn && vehicleReturn.status === 'rejected' && (
          <div className="space-y-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                تم رفض نموذج إرجاع المركبة. يرجى إنشاء نموذج إرجاع جديد.
              </AlertDescription>
            </Alert>
            
            {vehicleReturn.rejection_reason && (
              <div className="bg-red-50 p-4 rounded-lg">
                <strong>سبب الرفض:</strong>
                <p className="mt-1">{vehicleReturn.rejection_reason}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep('vehicle-return')}>
                إنشاء نموذج إرجاع جديد
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'cancellation' && vehicleReturn && vehicleReturn.status === 'approved' && (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تمت الموافقة على إرجاع المركبة. يمكنك الآن المتابعة مع إلغاء العقد.
              </AlertDescription>
            </Alert>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">تأكيد نهائي</h4>
                  <p className="text-yellow-700 mt-1">
                    هذا الإجراء سيؤدي إلى إلغاء العقد نهائياً. لا يمكن التراجع عن هذا الإجراء.
                    سيتم تغيير حالة العقد إلى "ملغي" ولن يعود نشطاً.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                الاحتفاظ بالعقد نشطاً
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleFinalCancellation}
                disabled={updateContractStatus.isPending}
              >
                {updateContractStatus.isPending ? 'جاري الإلغاء...' : 'إلغاء العقد'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};