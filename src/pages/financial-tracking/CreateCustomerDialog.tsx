// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerRent: string;
  onCustomerRentChange: (rent: string) => void;
  onSubmit: () => void;
  isCreating: boolean;
}

const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({
  open,
  onOpenChange,
  customerName,
  onCustomerNameChange,
  customerRent,
  onCustomerRentChange,
  onSubmit,
  isCreating,
}) => {
  const handleCancel = () => {
    onOpenChange(false);
    onCustomerNameChange('');
    onCustomerRentChange('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            إنشاء عميل جديد
          </DialogTitle>
          <DialogDescription>
            قم بإدخال بيانات العميل الجديد للبدء في تتبع مدفوعاته
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">اسم العميل</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="مثال: محمد أحمد"
              disabled={isCreating}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-rent">الإيجار الشهري (ريال)</Label>
            <Input
              id="monthly-rent"
              type="number"
              value={customerRent}
              onChange={(e) => onCustomerRentChange(e.target.value)}
              placeholder="مثال: 5000"
              disabled={isCreating}
              className="text-lg"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>ملاحظة:</strong> سيتم إنشاء عقد إيجار سيارة تلقائياً لهذا العميل. يمكنك تعديل العقد لاحقاً من صفحة العقود.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            إلغاء
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isCreating || !customerName.trim() || !customerRent}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 ml-2" />
                إنشاء العميل
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCustomerDialog;
