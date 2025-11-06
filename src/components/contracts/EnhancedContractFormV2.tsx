/**
 * Enhanced Contract Form V2
 * 
 * Updated version using new Services and Hooks.
 * Replaces complex logic with simplified service calls.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Services & Hooks
import { useCreateContract } from '@/hooks/data/useContracts';
import { useCompanyAccess, useCompanyPermissions } from '@/hooks/company';
import { useAuth } from '@/contexts/AuthContext';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';

// Validation Schema
const schema = z.object({
  customer_id: z.string().min(1, 'العميل مطلوب'),
  vehicle_id: z.string().optional(),
  contract_type: z.enum(['rental', 'daily_rental', 'weekly_rental', 'monthly_rental', 'yearly_rental', 'rent_to_own']),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().min(1, 'تاريخ النهاية مطلوب'),
  contract_amount: z.number().min(1, 'المبلغ مطلوب'),
  monthly_amount: z.number().optional(),
  description: z.string().optional(),
  terms: z.string().optional()
});

type FormData = z.infer<typeof schema>;

interface EnhancedContractFormV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCustomerId?: string | null;
}

const PHASES = [
  { id: 1, name: 'التحقق والتحضير', icon: AlertCircle },
  { id: 2, name: 'الإنشاء والتفعيل', icon: Loader2 },
  { id: 3, name: 'التحقق والإتمام', icon: CheckCircle }
];

export function EnhancedContractFormV2({
  open,
  onOpenChange,
  preselectedCustomerId
}: EnhancedContractFormV2Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompanyAccess();
  const { hasFullCompanyControl } = useCompanyPermissions();
  
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: preselectedCustomerId || '',
      contract_type: 'monthly_rental',
      start_date: new Date().toISOString().split('T')[0]
    }
  });

  const createContract = useCreateContract();

  const onSubmit = async (data: FormData) => {
    if (!user?.id || !companyId) {
      return;
    }

    // Update phases for visual feedback
    const updatePhase = (phase: number, progressValue: number) => {
      setCurrentPhase(phase);
      setProgress(progressValue);
    };

    try {
      updatePhase(0, 20);
      await new Promise(resolve => setTimeout(resolve, 500));

      updatePhase(1, 50);

      await createContract.mutateAsync({
        data: {
          ...data,
          created_by: user.id
        },
        userId: user.id,
        companyId
      });

      updatePhase(2, 90);
      await new Promise(resolve => setTimeout(resolve, 300));

      updatePhase(3, 100);
      
      // Reset and close
      reset();
      setTimeout(() => {
        onOpenChange(false);
        setCurrentPhase(0);
        setProgress(0);
      }, 1000);

    } catch (error) {
      setCurrentPhase(0);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6" />
            إنشاء عقد جديد
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Progress Indicator */}
          {createContract.isPending && (
            <div className="space-y-3 mb-6">
              <Progress value={progress} className="h-2" />
              
              <div className="flex justify-between">
                {PHASES.map((phase, index) => {
                  const Icon = phase.icon;
                  const isActive = index === currentPhase;
                  const isCompleted = index < currentPhase;
                  
                  return (
                    <div
                      key={phase.id}
                      className={`flex items-center gap-2 text-sm ${
                        isActive ? 'text-blue-600 font-semibold' :
                        isCompleted ? 'text-green-600' :
                        'text-gray-400'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'animate-spin' : ''}`} />
                      <span>{phase.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="customer_id">العميل *</Label>
              <Input
                id="customer_id"
                {...register('customer_id')}
                disabled={createContract.isPending}
              />
              {errors.customer_id && (
                <p className="text-sm text-red-600">{errors.customer_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_type">نوع العقد *</Label>
              <Select
                value={watch('contract_type')}
                onValueChange={(value) => setValue('contract_type', value as any)}
                disabled={createContract.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_rental">تأجير شهري</SelectItem>
                  <SelectItem value="yearly_rental">تأجير سنوي</SelectItem>
                  <SelectItem value="daily_rental">تأجير يومي</SelectItem>
                  <SelectItem value="weekly_rental">تأجير أسبوعي</SelectItem>
                  <SelectItem value="rent_to_own">تأجير مع التملك</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_id">المركبة (اختياري)</Label>
              <Input
                id="vehicle_id"
                {...register('vehicle_id')}
                disabled={createContract.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">تاريخ البداية *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                disabled={createContract.isPending}
              />
              {errors.start_date && (
                <p className="text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">تاريخ النهاية *</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                disabled={createContract.isPending}
              />
              {errors.end_date && (
                <p className="text-sm text-red-600">{errors.end_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_amount">مبلغ العقد *</Label>
              <Input
                id="contract_amount"
                type="number"
                step="0.01"
                {...register('contract_amount', { valueAsNumber: true })}
                disabled={createContract.isPending}
              />
              {errors.contract_amount && (
                <p className="text-sm text-red-600">{errors.contract_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_amount">القسط الشهري</Label>
              <Input
                id="monthly_amount"
                type="number"
                step="0.01"
                {...register('monthly_amount', { valueAsNumber: true })}
                disabled={createContract.isPending}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                {...register('description')}
                rows={3}
                disabled={createContract.isPending}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="terms">الشروط والأحكام</Label>
              <Textarea
                id="terms"
                {...register('terms')}
                rows={4}
                disabled={createContract.isPending}
              />
            </div>
          </div>

          {/* Success Message */}
          {currentPhase === 3 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                تم إنشاء العقد بنجاح! سيتم إغلاق النافذة...
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createContract.isPending}
            >
              إلغاء
            </Button>

            <Button
              type="submit"
              disabled={createContract.isPending}
              className="min-w-[150px]"
            >
              {createContract.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  إنشاء العقد
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

