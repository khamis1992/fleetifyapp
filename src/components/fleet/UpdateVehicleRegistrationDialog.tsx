/**
 * UpdateVehicleRegistrationDialog - نافذة تحديث بيانات استمارة المركبة
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateVehicle } from '@/hooks/useVehicles';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Shield, 
  Gauge, 
  Fuel, 
  MapPin,
  Calendar,
  Loader2,
  Save
} from 'lucide-react';

interface VehicleData {
  id: string;
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  registration_expiry?: string | null;
  insurance_expiry?: string | null;
  current_mileage?: number | null;
  fuel_level?: number | null;
  location?: string | null;
}

interface UpdateVehicleRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleData | null;
  onSuccess?: () => void;
}

export const UpdateVehicleRegistrationDialog: React.FC<UpdateVehicleRegistrationDialogProps> = ({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}) => {
  const { toast } = useToast();
  const updateVehicle = useUpdateVehicle();
  
  const [formData, setFormData] = useState({
    registration_expiry: '',
    insurance_expiry: '',
    current_mileage: '',
    fuel_level: '',
    location: '',
  });

  // تحميل البيانات الحالية
  useEffect(() => {
    if (vehicle && open) {
      setFormData({
        registration_expiry: vehicle.registration_expiry || '',
        insurance_expiry: vehicle.insurance_expiry || '',
        current_mileage: vehicle.current_mileage?.toString() || '',
        fuel_level: vehicle.fuel_level?.toString() || '',
        location: vehicle.location || '',
      });
    }
  }, [vehicle, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicle?.id) {
      toast({
        title: 'خطأ',
        description: 'معرف المركبة غير موجود',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateVehicle.mutateAsync({
        id: vehicle.id,
        registration_expiry: formData.registration_expiry || null,
        insurance_expiry: formData.insurance_expiry || null,
        current_mileage: formData.current_mileage ? parseInt(formData.current_mileage) : null,
        fuel_level: formData.fuel_level ? parseInt(formData.fuel_level) : null,
        location: formData.location || null,
      });

      toast({
        title: 'تم التحديث بنجاح',
        description: 'تم تحديث بيانات استمارة المركبة',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating vehicle registration:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث بيانات المركبة',
        variant: 'destructive',
      });
    }
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-coral-500" />
            تحديث بيانات الاستمارة
          </DialogTitle>
          <DialogDescription>
            {vehicle.make} {vehicle.model} - {vehicle.plate_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* تاريخ انتهاء الاستمارة */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-blue-500" />
              تاريخ انتهاء الاستمارة
            </Label>
            <Input
              type="date"
              value={formData.registration_expiry}
              onChange={(e) => setFormData(prev => ({ ...prev, registration_expiry: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          {/* تاريخ انتهاء التأمين */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4 text-green-500" />
              تاريخ انتهاء التأمين
            </Label>
            <Input
              type="date"
              value={formData.insurance_expiry}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          {/* الكيلومترات */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Gauge className="w-4 h-4 text-amber-500" />
              الكيلومترات الحالية
            </Label>
            <Input
              type="number"
              value={formData.current_mileage}
              onChange={(e) => setFormData(prev => ({ ...prev, current_mileage: e.target.value }))}
              placeholder="مثال: 50000"
              className="rounded-xl"
              min="0"
            />
          </div>

          {/* مستوى الوقود */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Fuel className="w-4 h-4 text-red-500" />
              مستوى الوقود (%)
            </Label>
            <Input
              type="number"
              value={formData.fuel_level}
              onChange={(e) => setFormData(prev => ({ ...prev, fuel_level: e.target.value }))}
              placeholder="مثال: 75"
              className="rounded-xl"
              min="0"
              max="100"
            />
          </div>

          {/* الموقع */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-purple-500" />
              الموقع الحالي
            </Label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="مثال: المستودع الرئيسي"
              className="rounded-xl"
            />
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-coral-500 hover:bg-coral-600 rounded-xl"
              disabled={updateVehicle.isPending}
            >
              {updateVehicle.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={updateVehicle.isPending}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateVehicleRegistrationDialog;

