/**
 * Simple Contract Wizard - 3 Steps Version
 * Simplified contract creation flow:
 * 1. العميل والمركبة (Customer & Vehicle)
 * 2. التفاصيل والتسعير (Details & Pricing)
 * 3. المراجعة والإرسال (Review & Submit)
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Save, 
  Clock,
  User,
  Car,
  DollarSign,
  Calendar,
  FileText,
  Check,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// Import our new components
import { QuickCustomerForm } from '@/components/customers/QuickCustomerForm';
import { PricingSuggestions } from '@/components/contracts/PricingSuggestions';
import { CollapsibleSection, AdvancedOptions } from '@/components/ui/collapsible-section';
import { FormField } from '@/components/ui/form-field';

// === Schema ===
const contractSchema = z.object({
  // Step 1: Customer & Vehicle
  customer_id: z.string().min(1, 'يجب اختيار العميل'),
  vehicle_id: z.string().optional(),
  
  // Step 2: Details & Pricing
  contract_type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'corporate']),
  start_date: z.string().min(1, 'تاريخ البدء مطلوب'),
  end_date: z.string().min(1, 'تاريخ الانتهاء مطلوب'),
  rental_days: z.number().min(1, 'مدة الإيجار مطلوبة'),
  contract_amount: z.number().min(0, 'مبلغ العقد مطلوب'),
  
  // Optional fields
  notes: z.string().optional(),
  deposit_amount: z.number().optional(),
  
  // Late fines (advanced)
  late_fines_enabled: z.boolean().optional(),
  late_fine_rate: z.number().optional(),
  late_fine_grace_period: z.number().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

// === Types ===
interface SimpleContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: ContractFormData) => Promise<void>;
  preselectedCustomerId?: string;
  preselectedVehicleId?: string;
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  phone: string;
  national_id?: string;
  // Computed display name
  full_name?: string;
}

interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  status: string;
  daily_rate?: number;
}

// === Step 1: Customer & Vehicle ===
const Step1CustomerVehicle: React.FC<{
  formData: Partial<ContractFormData>;
  onUpdate: (data: Partial<ContractFormData>) => void;
  customers: Customer[];
  vehicles: Vehicle[];
  isLoadingCustomers: boolean;
  isLoadingVehicles: boolean;
}> = ({ formData, onUpdate, customers, vehicles, isLoadingCustomers, isLoadingVehicles }) => {
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.national_id?.includes(customerSearch)
  );

  const availableVehicles = vehicles.filter(v => 
    v.status === 'available' &&
    (v.plate_number.includes(vehicleSearch) ||
     `${v.make} ${v.model}`.toLowerCase().includes(vehicleSearch.toLowerCase()))
  );

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-coral-500" />
            اختيار العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Quick Add */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowQuickCustomer(true)}
              className="h-11 gap-2"
            >
              <Plus className="h-4 w-4" />
              عميل جديد
            </Button>
          </div>

          {/* Selected Customer Display */}
          {selectedCustomer ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">{selectedCustomer.full_name}</p>
                <p className="text-sm text-green-700">{selectedCustomer.phone}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUpdate({ customer_id: '' })}
              >
                تغيير
              </Button>
            </div>
          ) : (
            /* Customer List */
            <div className="max-h-48 overflow-auto space-y-2">
              {isLoadingCustomers ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-400" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-4 text-neutral-500">
                  لا توجد نتائج
                </div>
              ) : (
                filteredCustomers.slice(0, 5).map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => onUpdate({ customer_id: customer.id })}
                    className="w-full p-3 text-right bg-white border rounded-lg hover:border-coral-300 hover:bg-coral-50/50 transition-colors"
                  >
                    <p className="font-medium">{customer.full_name}</p>
                    <p className="text-sm text-neutral-500">{customer.phone}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-5 w-5 text-coral-500" />
            اختيار المركبة
            <Badge variant="secondary" className="text-xs">اختياري</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <Input
            placeholder="ابحث برقم اللوحة أو الموديل..."
            value={vehicleSearch}
            onChange={(e) => setVehicleSearch(e.target.value)}
            className="h-11"
          />

          {/* Selected Vehicle Display */}
          {selectedVehicle ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                </p>
                <p className="text-sm text-blue-700">{selectedVehicle.plate_number}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUpdate({ vehicle_id: '' })}
              >
                تغيير
              </Button>
            </div>
          ) : (
            /* Vehicle Grid */
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-auto">
              {isLoadingVehicles ? (
                <div className="col-span-2 text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-400" />
                </div>
              ) : availableVehicles.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-neutral-500">
                  لا توجد مركبات متاحة
                </div>
              ) : (
                availableVehicles.slice(0, 6).map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => onUpdate({ vehicle_id: vehicle.id })}
                    className="p-3 text-right bg-white border rounded-lg hover:border-coral-300 hover:bg-coral-50/50 transition-colors"
                  >
                    <p className="font-medium text-sm">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-xs text-neutral-500">{vehicle.plate_number}</p>
                    {vehicle.daily_rate && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {vehicle.daily_rate} ر.ق/يوم
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Customer Dialog */}
      <QuickCustomerForm
        open={showQuickCustomer}
        onOpenChange={setShowQuickCustomer}
        onCustomerCreated={(customerId) => {
          onUpdate({ customer_id: customerId });
        }}
      />
    </div>
  );
};

// === Step 2: Details & Pricing ===
const Step2DetailsPricing: React.FC<{
  formData: Partial<ContractFormData>;
  onUpdate: (data: Partial<ContractFormData>) => void;
}> = ({ formData, onUpdate }) => {
  const { formatCurrency } = useCurrencyFormatter();

  // Calculate rental days when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0 && days !== formData.rental_days) {
        onUpdate({ rental_days: days });
      }
    }
  }, [formData.start_date, formData.end_date]);

  return (
    <div className="space-y-6">
      {/* Contract Type */}
      <FormField label="نوع العقد" required>
        <Select
          value={formData.contract_type}
          onValueChange={(value) => onUpdate({ contract_type: value as ContractFormData['contract_type'] })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="اختر نوع العقد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">يومي</SelectItem>
            <SelectItem value="weekly">أسبوعي</SelectItem>
            <SelectItem value="monthly">شهري</SelectItem>
            <SelectItem value="yearly">سنوي</SelectItem>
            <SelectItem value="corporate">شركات</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="تاريخ البدء" required>
          <Input
            type="date"
            value={formData.start_date || ''}
            onChange={(e) => onUpdate({ start_date: e.target.value })}
            className="h-11"
          />
        </FormField>
        <FormField label="تاريخ الانتهاء" required>
          <Input
            type="date"
            value={formData.end_date || ''}
            onChange={(e) => onUpdate({ end_date: e.target.value })}
            min={formData.start_date}
            className="h-11"
          />
        </FormField>
      </div>

      {/* Duration Display */}
      {formData.rental_days && formData.rental_days > 0 && (
        <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg">
          <Calendar className="h-5 w-5 text-neutral-500" />
          <span className="text-neutral-700">
            مدة العقد: <strong>{formData.rental_days} يوم</strong>
          </span>
        </div>
      )}

      {/* Pricing Suggestions */}
      {formData.contract_type && formData.rental_days && formData.rental_days > 0 && (
        <PricingSuggestions
          contractType={formData.contract_type}
          rentalDays={formData.rental_days}
          vehicleId={formData.vehicle_id}
          customerId={formData.customer_id}
          currentPrice={formData.contract_amount}
          onSelectPrice={(price) => onUpdate({ contract_amount: price })}
        />
      )}

      {/* Contract Amount */}
      <FormField label="مبلغ العقد" required>
        <div className="relative">
          <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <Input
            type="number"
            value={formData.contract_amount || ''}
            onChange={(e) => onUpdate({ contract_amount: Number(e.target.value) })}
            className="h-11 pr-10"
            placeholder="أدخل المبلغ"
          />
        </div>
        {formData.contract_amount && formData.rental_days && (
          <p className="text-sm text-neutral-500 mt-1">
            ≈ {formatCurrency(formData.contract_amount / formData.rental_days)} / يوم
          </p>
        )}
      </FormField>

      {/* Notes */}
      <FormField label="ملاحظات">
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="أي ملاحظات إضافية..."
          rows={3}
        />
      </FormField>

      {/* Advanced Options */}
      <AdvancedOptions storageKey="contract_advanced">
        <div className="space-y-4">
          <FormField label="مبلغ الضمان">
            <Input
              type="number"
              value={formData.deposit_amount || ''}
              onChange={(e) => onUpdate({ deposit_amount: Number(e.target.value) })}
              className="h-11"
              placeholder="اختياري"
            />
          </FormField>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="late_fines_enabled"
              checked={formData.late_fines_enabled || false}
              onChange={(e) => onUpdate({ late_fines_enabled: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <Label htmlFor="late_fines_enabled">تفعيل غرامات التأخير</Label>
          </div>

          {formData.late_fines_enabled && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
              <FormField label="نسبة الغرامة %">
                <Input
                  type="number"
                  value={formData.late_fine_rate || 5}
                  onChange={(e) => onUpdate({ late_fine_rate: Number(e.target.value) })}
                  className="h-10"
                />
              </FormField>
              <FormField label="فترة السماح (أيام)">
                <Input
                  type="number"
                  value={formData.late_fine_grace_period || 3}
                  onChange={(e) => onUpdate({ late_fine_grace_period: Number(e.target.value) })}
                  className="h-10"
                />
              </FormField>
            </div>
          )}
        </div>
      </AdvancedOptions>
    </div>
  );
};

// === Step 3: Review & Submit ===
const Step3Review: React.FC<{
  formData: Partial<ContractFormData>;
  customers: Customer[];
  vehicles: Vehicle[];
}> = ({ formData, customers, vehicles }) => {
  const { formatCurrency } = useCurrencyFormatter();
  
  const customer = customers.find(c => c.id === formData.customer_id);
  const vehicle = vehicles.find(v => v.id === formData.vehicle_id);

  const contractTypeLabels: Record<string, string> = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    yearly: 'سنوي',
    corporate: 'شركات',
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
          <FileText className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold">مراجعة العقد</h3>
        <p className="text-neutral-500">تأكد من صحة البيانات قبل الإرسال</p>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-neutral-500">العميل</CardTitle>
        </CardHeader>
        <CardContent>
          {customer ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-coral-100 rounded-lg">
                <User className="h-5 w-5 text-coral-600" />
              </div>
              <div>
                <p className="font-semibold">{customer.full_name}</p>
                <p className="text-sm text-neutral-500">{customer.phone}</p>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500">لم يتم اختيار عميل</p>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      {vehicle && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-neutral-500">المركبة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
                <p className="text-sm text-neutral-500">{vehicle.plate_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-neutral-500">تفاصيل العقد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-neutral-500">نوع العقد</span>
            <span className="font-medium">{contractTypeLabels[formData.contract_type || 'daily']}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">تاريخ البدء</span>
            <span className="font-medium">{formData.start_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">تاريخ الانتهاء</span>
            <span className="font-medium">{formData.end_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">المدة</span>
            <span className="font-medium">{formData.rental_days} يوم</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-neutral-900 font-semibold">المبلغ الإجمالي</span>
            <span className="text-coral-600 font-bold text-lg">
              {formatCurrency(formData.contract_amount || 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Late Fines Info */}
      {formData.late_fines_enabled && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800">
              ⚠️ غرامات التأخير مفعلة: {formData.late_fine_rate}% بعد {formData.late_fine_grace_period} أيام
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// === Main Component ===
export const SimpleContractWizard: React.FC<SimpleContractWizardProps> = ({
  open,
  onOpenChange,
  onSubmit,
  preselectedCustomerId,
  preselectedVehicleId,
}) => {
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const [formData, setFormData] = useState<Partial<ContractFormData>>({
    customer_id: preselectedCustomerId || '',
    vehicle_id: preselectedVehicleId || '',
    contract_type: 'daily',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    rental_days: 1,
    contract_amount: 0,
    late_fines_enabled: false,
  });

  const totalSteps = 3;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const stepTitles = ['العميل والمركبة', 'التفاصيل والتسعير', 'المراجعة والإرسال'];

  // Load customers with correct column names
  useEffect(() => {
    if (!companyId) return;
    
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, national_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name_ar', { nullsFirst: false })
        .limit(200);

      if (!error && data) {
        // Map data to include computed full_name for display
        const customersWithFullName = data.map(c => ({
          ...c,
          full_name: c.first_name_ar && c.last_name_ar 
            ? `${c.first_name_ar} ${c.last_name_ar}`.trim()
            : c.first_name && c.last_name 
              ? `${c.first_name} ${c.last_name}`.trim()
              : c.first_name_ar || c.first_name || 'عميل غير مسمى'
        }));
        setCustomers(customersWithFullName);
      } else if (error) {
        console.error('Error loading customers:', error);
      }
      setIsLoadingCustomers(false);
    };

    fetchCustomers();
  }, [companyId]);

  // Load vehicles
  useEffect(() => {
    if (!companyId) return;
    
    const fetchVehicles = async () => {
      setIsLoadingVehicles(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, year, status, daily_rate')
        .eq('company_id', companyId)
        .order('make');

      if (!error && data) {
        setVehicles(data);
      }
      setIsLoadingVehicles(false);
    };

    fetchVehicles();
  }, [companyId]);

  const updateFormData = (updates: Partial<ContractFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!formData.customer_id;
      case 1:
        return !!(formData.contract_type && formData.start_date && formData.end_date && formData.contract_amount && formData.contract_amount > 0);
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(formData as ContractFormData);
      } else {
        // Default submission logic
        const { error } = await supabase.from('contracts').insert({
          company_id: companyId,
          customer_id: formData.customer_id,
          vehicle_id: formData.vehicle_id || null,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          rental_days: formData.rental_days,
          contract_amount: formData.contract_amount,
          deposit_amount: formData.deposit_amount || 0,
          notes: formData.notes,
          late_fines_enabled: formData.late_fines_enabled,
          late_fine_rate: formData.late_fine_rate,
          late_fine_grace_period: formData.late_fine_grace_period,
          status: 'active',
          created_by: user?.id,
        });

        if (error) throw error;
      }

      toast.success('تم إنشاء العقد بنجاح!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('فشل في إنشاء العقد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Step1CustomerVehicle
            formData={formData}
            onUpdate={updateFormData}
            customers={customers}
            vehicles={vehicles}
            isLoadingCustomers={isLoadingCustomers}
            isLoadingVehicles={isLoadingVehicles}
          />
        );
      case 1:
        return (
          <Step2DetailsPricing
            formData={formData}
            onUpdate={updateFormData}
          />
        );
      case 2:
        return (
          <Step3Review
            formData={formData}
            customers={customers}
            vehicles={vehicles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-coral-500" />
            إنشاء عقد جديد
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{stepTitles[currentStep]}</span>
            <span className="text-neutral-500">{currentStep + 1} من {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs">
            {stepTitles.map((title, index) => (
              <span
                key={index}
                className={cn(
                  'flex items-center gap-1',
                  index === currentStep && 'text-coral-600 font-medium',
                  index < currentStep && 'text-green-600'
                )}
              >
                {index < currentStep && <Check className="h-3 w-3" />}
                {title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-4 min-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || isSubmitting}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>

          {currentStep === totalSteps - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2 bg-coral-500 hover:bg-coral-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال العقد
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleContractWizard;

