/**
 * Simple Contract Wizard - 3 Steps Version
 * Redesigned to match Dashboard color scheme (coral-500 theme)
 * 
 * Steps:
 * 1. العميل والمركبة (Customer & Vehicle)
 * 2. التفاصيل والتسعير (Details & Pricing)
 * 3. المراجعة والإرسال (Review & Submit)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  User,
  Car,
  DollarSign,
  Calendar,
  FileText,
  Check,
  Plus,
  Loader2,
  Search,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// Import our new components
import { EnhancedCustomerDialog } from '@/components/customers/EnhancedCustomerForm';
import { PricingSuggestions } from '@/components/contracts/PricingSuggestions';
import { AdvancedOptions } from '@/components/ui/collapsible-section';
import { FormField } from '@/components/ui/form-field';
import { EmployeeAssistant } from '@/components/employee-assistant';

// === Schema ===
const contractSchema = z.object({
  customer_id: z.string().min(1, 'يجب اختيار العميل'),
  vehicle_id: z.string().optional(),
  contract_type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'corporate']),
  start_date: z.string().min(1, 'تاريخ البدء مطلوب'),
  end_date: z.string().min(1, 'تاريخ الانتهاء مطلوب'),
  rental_days: z.number().min(1, 'مدة الإيجار مطلوبة'),
  monthly_amount: z.number().min(0, 'الإيجار الشهري مطلوب'),
  contract_amount: z.number().min(0, 'مبلغ العقد مطلوب'),
  notes: z.string().optional(),
  deposit_amount: z.number().optional(),
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
  showAssistant?: boolean;
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  phone: string;
  national_id?: string;
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

// === Step Progress Indicator ===
const StepIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}> = ({ currentStep, totalSteps, stepTitles }) => {
  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute top-5 left-0 right-0 h-1 bg-neutral-200 rounded-full mx-8" />
      
      {/* Progress bar fill */}
      <motion.div 
        className="absolute top-5 right-0 h-1 bg-gradient-to-l from-coral-500 to-orange-400 rounded-full mx-8"
        initial={{ width: '0%' }}
        animate={{ width: `${((currentStep) / (totalSteps - 1)) * 100}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      
      {/* Step circles */}
      <div className="flex justify-between relative">
        {stepTitles.map((title, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={index} className="flex flex-col items-center z-10">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  isCompleted && 'bg-gradient-to-br from-coral-500 to-orange-500 border-coral-500 text-white shadow-lg shadow-coral-500/30',
                  isCurrent && 'bg-white border-coral-500 text-coral-600 shadow-lg shadow-coral-500/20',
                  !isCompleted && !isCurrent && 'bg-neutral-100 border-neutral-300 text-neutral-400'
                )}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </motion.div>
              <span className={cn(
                'mt-2 text-xs font-medium',
                isCurrent && 'text-coral-600',
                isCompleted && 'text-neutral-700',
                !isCompleted && !isCurrent && 'text-neutral-400'
              )}>
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// === Step 1: Customer & Vehicle ===
const Step1CustomerVehicle: React.FC<{
  formData: Partial<ContractFormData>;
  onUpdate: (data: Partial<ContractFormData>) => void;
  customers: Customer[];
  vehicles: Vehicle[];
  isLoadingCustomers: boolean;
  isLoadingVehicles: boolean;
  onCustomerCreated?: (customer: Customer) => void;
}> = ({ formData, onUpdate, customers, vehicles, isLoadingCustomers, isLoadingVehicles, onCustomerCreated }) => {
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Customer Selection Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-l from-coral-50 to-orange-50 px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg shadow-coral-500/30">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">اختيار العميل</h3>
              <p className="text-sm text-neutral-500">ابحث عن عميل موجود أو أضف عميل جديد</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Search & Quick Add */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <Input
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="h-12 pr-11 rounded-xl border-neutral-200 focus:border-coral-400 focus:ring-coral-400/20"
              />
            </div>
            <Button
              type="button"
              onClick={() => setShowQuickCustomer(true)}
              className="h-12 gap-2 bg-gradient-to-l from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 rounded-xl shadow-lg shadow-coral-500/30 hover:shadow-coral-500/40 transition-all"
            >
              <Plus className="h-4 w-4" />
              عميل جديد
            </Button>
          </div>

          {/* Selected Customer Display */}
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 bg-gradient-to-l from-green-50 to-emerald-50 border border-green-200 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900">{selectedCustomer.full_name}</p>
                    <p className="text-sm text-green-700">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({ customer_id: '' })}
                  className="text-green-700 hover:text-green-900 hover:bg-green-100"
                >
                  تغيير
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-h-56 overflow-auto space-y-2 scrollbar-thin scrollbar-thumb-neutral-200"
              >
                {isLoadingCustomers ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-coral-500 mb-2" />
                    <p className="text-neutral-500 text-sm">جاري تحميل العملاء...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                    <Search className="h-10 w-10 mb-2" />
                    <p>لا توجد نتائج</p>
                  </div>
                ) : (
                  filteredCustomers.slice(0, 6).map((customer, index) => (
                    <motion.button
                      key={customer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                      type="button"
                      onClick={() => onUpdate({ customer_id: customer.id })}
                      className="w-full p-4 text-right bg-neutral-50 border border-neutral-200 rounded-xl hover:border-coral-300 hover:bg-coral-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-200 group-hover:bg-coral-100 flex items-center justify-center transition-colors">
                          <User className="h-5 w-5 text-neutral-500 group-hover:text-coral-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-900">{customer.full_name}</p>
                          <p className="text-sm text-neutral-500">{customer.phone}</p>
                        </div>
                        <ChevronLeft className="h-5 w-5 text-neutral-300 group-hover:text-coral-500 transition-colors" />
                      </div>
                    </motion.button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Vehicle Selection Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-gradient-to-l from-blue-50 to-indigo-50 px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">اختيار المركبة</h3>
                <p className="text-sm text-neutral-500">اختر مركبة من الأسطول المتاح</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0">
              اختياري
            </Badge>
          </div>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <Input
              placeholder="ابحث برقم اللوحة أو الموديل..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="h-12 pr-11 rounded-xl border-neutral-200 focus:border-blue-400 focus:ring-blue-400/20"
            />
          </div>

          {/* Selected Vehicle Display */}
          <AnimatePresence mode="wait">
            {selectedVehicle ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-900">
                      {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                    </p>
                    <p className="text-sm text-blue-700">{selectedVehicle.plate_number}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate({ vehicle_id: '' })}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  تغيير
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-3 max-h-56 overflow-auto scrollbar-thin scrollbar-thumb-neutral-200"
              >
                {isLoadingVehicles ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                    <p className="text-neutral-500 text-sm">جاري تحميل المركبات...</p>
                  </div>
                ) : availableVehicles.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-8 text-neutral-400">
                    <Car className="h-10 w-10 mb-2" />
                    <p>لا توجد مركبات متاحة</p>
                  </div>
                ) : (
                  availableVehicles.slice(0, 8).map((vehicle, index) => (
                    <motion.button
                      key={vehicle.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.03 } }}
                      type="button"
                      onClick={() => onUpdate({ vehicle_id: vehicle.id })}
                      className="p-4 text-right bg-neutral-50 border border-neutral-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-200 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Car className="h-5 w-5 text-neutral-500 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 text-sm truncate">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-neutral-500">{vehicle.plate_number}</p>
                        </div>
                      </div>
                      {vehicle.daily_rate && (
                        <Badge className="mt-2 bg-gradient-to-l from-coral-100 to-orange-100 text-coral-700 border-0">
                          {vehicle.daily_rate} ر.ق/يوم
                        </Badge>
                      )}
                    </motion.button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Quick Customer Dialog - موحد مع نظام العملاء */}
      <EnhancedCustomerDialog
        open={showQuickCustomer}
        onOpenChange={setShowQuickCustomer}
        variant="quick"
        context="contract"
        onSuccess={(customer) => {
          // Add the new customer to the list and select it
          const newCustomer: Customer = {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            first_name_ar: customer.first_name_ar,
            last_name_ar: customer.last_name_ar,
            phone: customer.phone,
            national_id: customer.national_id,
            full_name: customer.first_name_ar && customer.last_name_ar
              ? `${customer.first_name_ar} ${customer.last_name_ar}`.trim()
              : customer.first_name && customer.last_name
                ? `${customer.first_name} ${customer.last_name}`.trim()
                : customer.first_name_ar || customer.first_name || 'عميل جديد'
          };
          onCustomerCreated?.(newCustomer);
          onUpdate({ customer_id: customer.id });
        }}
      />
    </motion.div>
  );
};

// === Step 2: Details & Pricing ===
const Step2DetailsPricing: React.FC<{
  formData: Partial<ContractFormData>;
  onUpdate: (data: Partial<ContractFormData>) => void;
}> = ({ formData, onUpdate }) => {
  const { formatCurrency } = useCurrencyFormatter();

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0 && days !== formData.rental_days) {
        // إعادة حساب إجمالي العقد إذا كان الإيجار الشهري موجود
        const months = Math.ceil(days / 30);
        const totalAmount = formData.monthly_amount ? formData.monthly_amount * months : formData.contract_amount;
        onUpdate({ 
          rental_days: days,
          contract_amount: totalAmount
        });
      }
    }
  }, [formData.start_date, formData.end_date, formData.monthly_amount]);

  const contractTypes = [
    { value: 'daily', label: 'يومي', icon: '📅' },
    { value: 'weekly', label: 'أسبوعي', icon: '📆' },
    { value: 'monthly', label: 'شهري', icon: '🗓️' },
    { value: 'yearly', label: 'سنوي', icon: '📅' },
    { value: 'corporate', label: 'شركات', icon: '🏢' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Contract Type Selection */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-coral-500" />
          نوع العقد
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {contractTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onUpdate({ contract_type: type.value as ContractFormData['contract_type'] })}
              className={cn(
                'p-3 rounded-xl border-2 transition-all text-center',
                formData.contract_type === type.value
                  ? 'border-coral-500 bg-gradient-to-br from-coral-50 to-orange-50 shadow-lg shadow-coral-500/20'
                  : 'border-neutral-200 bg-white hover:border-coral-200 hover:bg-coral-50/30'
              )}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className={cn(
                'text-sm font-medium',
                formData.contract_type === type.value ? 'text-coral-700' : 'text-neutral-600'
              )}>
                {type.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dates Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-coral-500" />
          مدة العقد
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-neutral-600 mb-2 block">تاريخ البدء</Label>
            <Input
              type="date"
              value={formData.start_date || ''}
              onChange={(e) => onUpdate({ start_date: e.target.value })}
              className="h-12 rounded-xl border-neutral-200 focus:border-coral-400"
            />
          </div>
          <div>
            <Label className="text-neutral-600 mb-2 block">تاريخ الانتهاء</Label>
            <Input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => onUpdate({ end_date: e.target.value })}
              min={formData.start_date}
              className="h-12 rounded-xl border-neutral-200 focus:border-coral-400"
            />
          </div>
        </div>

        {/* Duration Display */}
        <AnimatePresence>
          {formData.rental_days && formData.rental_days > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-gradient-to-l from-coral-50 to-orange-50 rounded-xl flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow">
                <Clock className="h-6 w-6 text-coral-500" />
              </div>
              <div>
                <p className="text-neutral-600">مدة العقد</p>
                <p className="text-2xl font-bold text-coral-600">{formData.rental_days} <span className="text-base font-normal">يوم</span></p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

      {/* Monthly Rent & Contract Amount Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-coral-500" />
          الإيجار الشهري
        </h3>
        
        <div className="space-y-4">
          {/* Monthly Amount Input */}
          <div>
            <Label className="text-neutral-600 mb-2 block">قيمة الإيجار الشهري *</Label>
            <div className="relative">
              <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <Input
                type="number"
                value={formData.monthly_amount || ''}
                onChange={(e) => {
                  const monthlyAmount = Number(e.target.value);
                  // حساب عدد الأشهر من عدد الأيام
                  const months = formData.rental_days ? Math.ceil(formData.rental_days / 30) : 1;
                  const totalAmount = monthlyAmount * months;
                  onUpdate({ 
                    monthly_amount: monthlyAmount,
                    contract_amount: totalAmount 
                  });
                }}
                className="h-14 pr-12 text-xl font-bold rounded-xl border-neutral-200 focus:border-coral-400"
                placeholder="أدخل الإيجار الشهري"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">ر.ق/شهر</span>
            </div>
          </div>

          {/* Total Contract Amount Display */}
          {formData.monthly_amount && formData.rental_days && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-l from-coral-50 to-orange-50 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow">
                    <Sparkles className="h-5 w-5 text-coral-500" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">إجمالي قيمة العقد</p>
                    <p className="text-xs text-neutral-500">
                      {formData.monthly_amount} × {Math.ceil(formData.rental_days / 30)} شهر
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-coral-600">{formatCurrency(formData.contract_amount || 0)}</p>
                  <p className="text-xs text-neutral-500">
                    ≈ {formatCurrency((formData.contract_amount || 0) / formData.rental_days)} / يوم
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div>
            <Label className="text-neutral-600 mb-2 block">ملاحظات</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="أي ملاحظات إضافية..."
              rows={3}
              className="rounded-xl border-neutral-200 focus:border-coral-400"
            />
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <AdvancedOptions storageKey="contract_advanced">
        <div className="space-y-4">
          <div>
            <Label className="text-neutral-600 mb-2 block">مبلغ الضمان</Label>
            <Input
              type="number"
              value={formData.deposit_amount || ''}
              onChange={(e) => onUpdate({ deposit_amount: Number(e.target.value) })}
              className="h-12 rounded-xl"
              placeholder="اختياري"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
            <input
              type="checkbox"
              id="late_fines_enabled"
              checked={formData.late_fines_enabled || false}
              onChange={(e) => onUpdate({ late_fines_enabled: e.target.checked })}
              className="h-5 w-5 rounded text-coral-500 focus:ring-coral-400"
            />
            <Label htmlFor="late_fines_enabled" className="cursor-pointer">تفعيل غرامات التأخير</Label>
          </div>

          <AnimatePresence>
            {formData.late_fines_enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200"
              >
                <div>
                  <Label className="text-amber-700 mb-2 block text-sm">نسبة الغرامة %</Label>
                  <Input
                    type="number"
                    value={formData.late_fine_rate || 5}
                    onChange={(e) => onUpdate({ late_fine_rate: Number(e.target.value) })}
                    className="h-10 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-amber-700 mb-2 block text-sm">فترة السماح (أيام)</Label>
                  <Input
                    type="number"
                    value={formData.late_fine_grace_period || 3}
                    onChange={(e) => onUpdate({ late_fine_grace_period: Number(e.target.value) })}
                    className="h-10 rounded-lg"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AdvancedOptions>
    </motion.div>
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Success Header */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4 shadow-lg shadow-green-500/40"
        >
          <FileText className="h-10 w-10 text-white" />
        </motion.div>
        <h3 className="text-xl font-bold text-neutral-900">مراجعة العقد</h3>
        <p className="text-neutral-500 mt-1">تأكد من صحة البيانات قبل الإرسال</p>
      </motion.div>

      {/* Customer Info Card */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">العميل</span>
          <Badge className="bg-coral-100 text-coral-700 border-0">إلزامي</Badge>
        </div>
        {customer ? (
          <div className="flex items-center gap-4 mt-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-coral-100 to-orange-100 flex items-center justify-center">
              <User className="h-7 w-7 text-coral-600" />
            </div>
            <div>
              <p className="font-bold text-lg text-neutral-900">{customer.full_name}</p>
              <p className="text-neutral-500">{customer.phone}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>لم يتم اختيار عميل</span>
          </div>
        )}
      </motion.div>

      {/* Vehicle Info Card */}
      {vehicle && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm"
        >
          <span className="text-sm text-neutral-500">المركبة</span>
          <div className="flex items-center gap-4 mt-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Car className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-lg text-neutral-900">{vehicle.make} {vehicle.model}</p>
              <p className="text-neutral-500">{vehicle.plate_number} • {vehicle.year}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Contract Details Card */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm"
      >
        <div className="p-5 border-b border-neutral-100">
          <span className="text-sm text-neutral-500">تفاصيل العقد</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-neutral-500">نوع العقد</span>
            <Badge className="bg-neutral-100 text-neutral-700 border-0 text-sm">
              {contractTypeLabels[formData.contract_type || 'daily']}
            </Badge>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-neutral-100">
            <span className="text-neutral-500">تاريخ البدء</span>
            <span className="font-medium text-neutral-900">{formData.start_date}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-neutral-100">
            <span className="text-neutral-500">تاريخ الانتهاء</span>
            <span className="font-medium text-neutral-900">{formData.end_date}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-neutral-100">
            <span className="text-neutral-500">المدة</span>
            <Badge className="bg-coral-100 text-coral-700 border-0">
              {formData.rental_days} يوم
            </Badge>
          </div>
        </div>
        
        {/* Monthly & Total Amount */}
        <div className="bg-gradient-to-l from-coral-500 to-orange-500 p-5 space-y-3">
          {formData.monthly_amount && (
            <div className="flex justify-between items-center text-white/90">
              <span className="font-medium">الإيجار الشهري</span>
              <span className="text-xl font-bold">
                {formatCurrency(formData.monthly_amount)} / شهر
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-white border-t border-white/20 pt-3">
            <div>
              <span className="font-medium">المبلغ الإجمالي</span>
              {formData.monthly_amount && formData.rental_days && (
                <p className="text-xs text-white/70">
                  {formData.monthly_amount} × {Math.ceil(formData.rental_days / 30)} شهر
                </p>
              )}
            </div>
            <span className="text-3xl font-bold">
              {formatCurrency(formData.contract_amount || 0)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Late Fines Warning */}
      <AnimatePresence>
        {formData.late_fines_enabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">غرامات التأخير مفعلة</p>
              <p className="text-sm text-amber-700 mt-1">
                {formData.late_fine_rate}% بعد {formData.late_fine_grace_period} أيام من تاريخ الانتهاء
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// === Main Component ===
export const SimpleContractWizard: React.FC<SimpleContractWizardProps> = ({
  open,
  onOpenChange,
  onSubmit,
  preselectedCustomerId,
  preselectedVehicleId,
  showAssistant = true,
}) => {
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

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
  const stepTitles = ['العميل والمركبة', 'التفاصيل والتسعير', 'المراجعة والإرسال'];

  // Load customers
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
        const customersWithFullName = data.map(c => ({
          ...c,
          full_name: c.first_name_ar && c.last_name_ar 
            ? `${c.first_name_ar} ${c.last_name_ar}`.trim()
            : c.first_name && c.last_name 
              ? `${c.first_name} ${c.last_name}`.trim()
              : c.first_name_ar || c.first_name || 'عميل غير مسمى'
        }));
        setCustomers(customersWithFullName);
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
        // Generate contract number
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const contractNumber = `C-${timestamp}-${random}`;
        
        const { error } = await supabase.from('contracts').insert({
          company_id: companyId,
          customer_id: formData.customer_id,
          vehicle_id: formData.vehicle_id || null,
          contract_type: formData.contract_type,
          contract_number: contractNumber,
          contract_date: formData.start_date,
          start_date: formData.start_date,
          end_date: formData.end_date,
          monthly_amount: formData.monthly_amount || 0,
          contract_amount: formData.contract_amount || 0,
          description: formData.notes || null,
          status: 'active',
          created_by: user?.id,
        });

        if (error) {
          console.error('Contract insert error:', error);
          throw error;
        }
        
        // Update vehicle status if vehicle is selected
        if (formData.vehicle_id) {
          await supabase
            .from('vehicles')
            .update({ status: 'rented' })
            .eq('id', formData.vehicle_id);
        }
      }

      toast.success('تم إنشاء العقد بنجاح!');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast.error(error?.message || 'فشل في إنشاء العقد');
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
            onCustomerCreated={(newCustomer) => {
              // Add new customer to the list
              setCustomers(prev => [newCustomer, ...prev]);
            }}
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

  // بيانات المساعد
  const assistantData = {
    customer: customers.find(c => c.id === formData.customer_id),
    vehicle: vehicles.find(v => v.id === formData.vehicle_id),
    payment_method: 'cash', // يمكن تعديلها حسب اختيار المستخدم
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden flex flex-col bg-[#f0efed] p-0 transition-all",
        isAssistantOpen ? "max-w-5xl" : "max-w-2xl"
      )}>
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-neutral-200">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg shadow-coral-500/30">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                إنشاء عقد جديد
              </div>
              {showAssistant && (
                <Button
                  type="button"
                  variant={isAssistantOpen ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                  className={cn(
                    "gap-2 rounded-xl transition-all",
                    isAssistantOpen 
                      ? "bg-gradient-to-l from-coral-500 to-orange-500 text-white shadow-lg shadow-coral-500/30" 
                      : "border-coral-200 text-coral-600 hover:bg-coral-50"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  {isAssistantOpen ? 'إخفاء المساعد' : 'مساعد الموظف'}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="mt-6">
            <StepIndicator 
              currentStep={currentStep} 
              totalSteps={totalSteps} 
              stepTitles={stepTitles} 
            />
          </div>
        </div>

        {/* Content with Assistant */}
        <div className="flex-1 overflow-hidden flex">
          {/* Step Content */}
          <div className={cn(
            "flex-1 overflow-y-auto p-6 transition-all",
            isAssistantOpen ? "w-1/2" : "w-full"
          )}>
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>
          
          {/* Employee Assistant Panel */}
          <AnimatePresence>
            {isAssistantOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "50%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-r border-neutral-200 overflow-y-auto bg-white"
              >
                <div className="p-4">
                  <EmployeeAssistant
                    workflowType="new_contract"
                    data={assistantData}
                    onComplete={() => {
                      // يمكن إضافة منطق إضافي هنا
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || isSubmitting}
            className="gap-2 h-12 px-6 rounded-xl border-neutral-300 hover:bg-neutral-100"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>

          {currentStep === totalSteps - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2 h-12 px-8 rounded-xl bg-gradient-to-l from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 shadow-lg shadow-coral-500/30 hover:shadow-coral-500/40 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  إرسال العقد
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 h-12 px-8 rounded-xl bg-gradient-to-l from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 shadow-lg shadow-coral-500/30 hover:shadow-coral-500/40 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              التالي
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleContractWizard;
