/**
 * Simplified Contract Form
 * 
 * Uses the new ContractService with simplified 3-phase workflow.
 * Replaces complex 6-step process with streamlined creation.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { contractService } from '@/services';
import { useCompanyAccess } from '@/hooks/company';
import { useAuth } from '@/contexts/AuthContext';
import type { ContractCreationData } from '@/types/contracts';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// Validation Schema
const contractSchema = z.object({
  customer_id: z.string().min(1, 'العميل مطلوب'),
  vehicle_id: z.string().optional(),
  contract_type: z.enum(['rental', 'daily_rental', 'weekly_rental', 'monthly_rental', 'yearly_rental', 'rent_to_own']),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().min(1, 'تاريخ النهاية مطلوب'),
  contract_amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
  monthly_amount: z.number().optional(),
  description: z.string().optional(),
  terms: z.string().optional(),
  cost_center_id: z.string().optional()
});

type ContractFormData = z.infer<typeof contractSchema>;

// Phase indicators
const PHASES = [
  { id: 1, name: 'التحقق والتحضير', icon: AlertCircle },
  { id: 2, name: 'الإنشاء والتفعيل', icon: Loader2 },
  { id: 3, name: 'التحقق والإتمام', icon: CheckCircle }
];

export function SimplifiedContractForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompanyAccess();
  
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: 'monthly_rental',
      start_date: new Date().toISOString().split('T')[0]
    }
  });

  // Contract creation mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      if (!user?.id || !companyId) {
        throw new Error('User or company not found');
      }

      // Simulate phase updates for user feedback
      const updatePhase = (phase: number, progressValue: number) => {
        setCurrentPhase(phase);
        setProgress(progressValue);
      };

      // Phase 1: Validate and Prepare
      updatePhase(0, 20);
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual feedback

      // Phase 2: Create and Activate
      updatePhase(1, 50);
      
      const contractData: ContractCreationData = {
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id || null,
        contract_type: data.contract_type,
        start_date: data.start_date,
        end_date: data.end_date,
        contract_amount: data.contract_amount,
        monthly_amount: data.monthly_amount || data.contract_amount,
        description: data.description,
        terms: data.terms,
        cost_center_id: data.cost_center_id || null,
        created_by: user.id
      };

      const result = await contractService.createContract(contractData, user.id, companyId);

      if (!result.success) {
        throw new Error(result.error || 'فشل إنشاء العقد');
      }

      // Phase 3: Verify and Complete
      updatePhase(2, 90);
      await new Promise(resolve => setTimeout(resolve, 300)); // Visual feedback

      updatePhase(3, 100);
      return result;
    },
    onSuccess: (result) => {
      toast.success('✅ تم إنشاء العقد بنجاح!', {
        description: `رقم العقد: ${result.contract_number}`
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-stats'] });

      // Navigate to contract details
      if (result.contract_id) {
        navigate(`/contracts/${result.contract_id}`);
      }
    },
    onError: (error: Error) => {
      toast.error('❌ فشل إنشاء العقد', {
        description: error.message
      });
      setCurrentPhase(0);
      setProgress(0);
    }
  });

  const onSubmit = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const isSubmitting = createContractMutation.isPending;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">إنشاء عقد جديد</CardTitle>
        <CardDescription>
          نموذج مبسط لإنشاء العقود بسرعة وكفاءة
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Progress Indicator */}
          {isSubmitting && (
            <div className="mb-6 space-y-3">
              <Progress value={progress} className="h-2" />
              
              <div className="flex justify-between items-center">
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

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">العميل *</Label>
            <Input
              id="customer_id"
              {...register('customer_id')}
              placeholder="معرف العميل"
              disabled={isSubmitting}
            />
            {errors.customer_id && (
              <p className="text-sm text-red-600">{errors.customer_id.message}</p>
            )}
          </div>

          {/* Vehicle Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="vehicle_id">المركبة (اختياري)</Label>
            <Input
              id="vehicle_id"
              {...register('vehicle_id')}
              placeholder="معرف المركبة"
              disabled={isSubmitting}
            />
          </div>

          {/* Contract Type */}
          <div className="space-y-2">
            <Label htmlFor="contract_type">نوع العقد *</Label>
            <Select
              value={watch('contract_type')}
              onValueChange={(value) => setValue('contract_type', value as any)}
              disabled={isSubmitting}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">تاريخ البداية *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              {errors.end_date && (
                <p className="text-sm text-red-600">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_amount">مبلغ العقد *</Label>
              <Input
                id="contract_amount"
                type="number"
                step="0.01"
                {...register('contract_amount', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isSubmitting}
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
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="وصف العقد..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label htmlFor="terms">الشروط والأحكام</Label>
            <Textarea
              id="terms"
              {...register('terms')}
              placeholder="شروط وأحكام العقد..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/contracts')}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>

        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="min-w-[150px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              جاري الإنشاء...
            </>
          ) : (
            'إنشاء العقد'
          )}
        </Button>
      </CardFooter>

      {/* Success Message */}
      {currentPhase === 3 && (
        <div className="px-6 pb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">تم إنشاء العقد بنجاح!</p>
              <p className="text-xs text-green-700 mt-1">سيتم تحويلك إلى صفحة العقد...</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

