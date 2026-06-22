import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Car as CarIcon,
  Calendar,
  CreditCard,
  FileText,
  Camera,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  customer_code: string;
}

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  license_plate: string | null;
  year: number | null;
  daily_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  status: string;
}

interface FormData {
  // Step 1
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;

  // Step 2
  contractType: 'daily' | 'weekly' | 'monthly';
  monthlyAmount: number;
  paymentDay: number;
  autoRenew: boolean;
  notes: string;

  // Step 3
  fuelLevel: number;
  mileage: number;
  exteriorCondition: string;
  interiorCondition: string;
  existingDamage: string;
  photos: string[];
}

type Step = 1 | 2 | 3 | 4;

const MobileContractWizard: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    customerId: '',
    vehicleId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contractType: 'monthly',
    monthlyAmount: 0,
    paymentDay: 1,
    autoRenew: false,
    notes: '',
    fuelLevel: 80,
    mileage: 0,
    exteriorCondition: '',
    interiorCondition: '',
    existingDamage: '',
    photos: [],
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
    fetchVehicles();
  }, [user]);

  const fetchCustomers = async () => {
    if (!user) return;
    const companyId = user?.profile?.company_id || user?.company?.id || '';

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    setCustomers(data || []);
  };

  const fetchVehicles = async () => {
    if (!user) return;
    const companyId = user?.profile?.company_id || user?.company?.id || '';

    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    setVehicles(data || []);
  };

  // Update amount when vehicle is selected
  useEffect(() => {
    if (selectedVehicle && formData.contractType) {
      let rate = 0;
      if (formData.contractType === 'daily') rate = selectedVehicle.daily_rate || 0;
      else if (formData.contractType === 'weekly') rate = selectedVehicle.weekly_rate || 0;
      else if (formData.contractType === 'monthly') rate = selectedVehicle.monthly_rate || 0;

      setFormData(prev => ({ ...prev, monthlyAmount: rate }));
    }
  }, [selectedVehicle, formData.contractType]);

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        return !!(formData.customerId && formData.vehicleId && formData.startDate && formData.endDate);
      case 2:
        return !!(formData.monthlyAmount > 0);
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((currentStep + 1) as Step);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const calculateTotalAmount = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (formData.contractType === 'daily') {
      return (selectedVehicle?.daily_rate || 0) * days;
    } else if (formData.contractType === 'weekly') {
      const weeks = Math.ceil(days / 7);
      return (selectedVehicle?.weekly_rate || 0) * weeks;
    } else {
      const months = Math.ceil(days / 30);
      return formData.monthlyAmount * months;
    }
  };

  const handleCreateContract = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      const companyId = user?.profile?.company_id || user?.company?.id || '';

      // Generate contract number
      const { data: contractNumData } = await supabase.rpc('generate_contract_number', {
        p_company_id: companyId,
      });

      const contractNumber = contractNumData || `CNT-${Date.now()}`;

      // Create contract
      const { error } = await supabase
        .from('contracts')
        .insert({
          company_id: companyId,
          contract_number: contractNumber,
          customer_id: formData.customerId,
          vehicle_id: formData.vehicleId,
          contract_date: formData.startDate,
          start_date: formData.startDate,
          end_date: formData.endDate,
          contract_type: formData.contractType,
          monthly_amount: formData.monthlyAmount,
          contract_amount: calculateTotalAmount(),
          payment_day: formData.paymentDay,
          auto_renew_enabled: formData.autoRenew,
          terms: formData.notes,
          status: 'active',
          created_via: 'mobile',
          license_plate: selectedVehicle?.license_plate,
          make: selectedVehicle?.make,
          model: selectedVehicle?.model,
          year: selectedVehicle?.year,
          vehicle_status: 'rented',
        });

      if (error) throw error;

      // Update vehicle status
      if (formData.vehicleId) {
        await supabase
          .from('vehicles')
          .update({ status: 'rented' })
          .eq('id', formData.vehicleId);
      }

      alert('تم إنشاء العقد بنجاح!');
      navigate('/mobile/contracts');
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('فشل إنشاء العقد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => navigate('/mobile/contracts')} className="p-2">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-900">عقد جديد</h1>
            <p className="text-xs text-slate-500">
              الخطوة {currentStep} من 4
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  currentStep >= step
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-500'
                )}>
                  {currentStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 4 && (
                  <div className={cn(
                    'flex-1 h-1 mx-2 rounded-full transition-colors',
                    currentStep > step ? 'bg-teal-500' : 'bg-slate-200'
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <Step1CustomerVehicle
              formData={formData}
              setFormData={setFormData}
              customers={customers}
              vehicles={vehicles}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={setSelectedVehicle}
            />
          )}

          {currentStep === 2 && (
            <Step2PricingTerms
              formData={formData}
              setFormData={setFormData}
              selectedVehicle={selectedVehicle}
            />
          )}

          {currentStep === 3 && (
            <Step3VehicleCondition
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {currentStep === 4 && (
            <Step4Review
              formData={formData}
              selectedCustomer={selectedCustomer}
              selectedVehicle={selectedVehicle}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex gap-3 p-4">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-700 font-semibold"
            >
              السابق
            </button>
          )}
          <button
            onClick={currentStep === 4 ? handleCreateContract : handleNext}
            disabled={!validateStep(currentStep) || loading}
            className={cn(
              'flex-1 py-4 rounded-xl font-semibold text-white',
              'bg-teal-500',
              'shadow-lg shadow-teal-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          >
            {loading ? 'جاري الإنشاء...' : currentStep === 4 ? 'إنشاء العقد' : 'التالي'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Step 1: Customer & Vehicle Selection
const Step1CustomerVehicle: React.FC<{
  formData: FormData;
  setFormData: (data: FormData) => void;
  customers: Customer[];
  vehicles: Vehicle[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
}> = ({ formData, setFormData, customers, vehicles, selectedCustomer, setSelectedCustomer, selectedVehicle, setSelectedVehicle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          👤 اختر العميل
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => {
                setSelectedCustomer(customer);
                setFormData({ ...formData, customerId: customer.id });
              }}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-right transition-all',
                formData.customerId === customer.id
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{customer.customer_code}</p>
                </div>
                {formData.customerId === customer.id && (
                  <Check className="w-5 h-5 text-teal-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          🚗 اختر المركبة
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              onClick={() => {
                setSelectedVehicle(vehicle);
                setFormData({ ...formData, vehicleId: vehicle.id });
              }}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-right transition-all',
                formData.vehicleId === vehicle.id
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-slate-500">{vehicle.license_plate}</p>
                  <p className="text-xs text-teal-600 font-medium mt-1">
                    QAR {vehicle.monthly_rate?.toLocaleString()}/شهر
                  </p>
                </div>
                {formData.vehicleId === vehicle.id && (
                  <Check className="w-5 h-5 text-teal-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            📅 تاريخ البدء
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            📅 تاريخ النهاية
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
          />
        </div>
      </div>
    </motion.div>
  );
};

// Step 2: Pricing & Terms
const Step2PricingTerms: React.FC<{
  formData: FormData;
  setFormData: (data: FormData) => void;
  selectedVehicle: Vehicle | null;
}> = ({ formData, setFormData, selectedVehicle }) => {
  const calculateDuration = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = calculateDuration();

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      {/* Contract Type */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          💰 نوع العقد
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'daily', label: 'يومي' },
            { value: 'weekly', label: 'أسبوعي' },
            { value: 'monthly', label: 'شهري' },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setFormData({ ...formData, contractType: type.value as any })}
              className={cn(
                'py-3 rounded-xl border-2 text-sm font-semibold transition-colors',
                formData.contractType === type.value
                  ? 'border-teal-500 bg-teal-50 text-teal-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">المبلغ الشهري</span>
          <div className="text-left">
            <input
              type="number"
              value={formData.monthlyAmount}
              onChange={(e) => setFormData({ ...formData, monthlyAmount: parseFloat(e.target.value) || 0 })}
              className="w-32 text-left text-xl font-bold text-slate-900 bg-transparent border-none focus:outline-none p-0"
              dir="ltr"
            />
            <p className="text-xs text-slate-400">QAR</p>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">المدة:</span>
            <span className="text-sm font-semibold text-slate-900">{days} يوم</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-slate-500">الإجمالي:</span>
            <span className="text-lg font-bold text-teal-600" dir="ltr">
              QAR {(formData.monthlyAmount * Math.ceil(days / 30)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Day */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          📅 يوم الاستحقاق
        </label>
        <div className="grid grid-cols-7 gap-2">
          {[1, 5, 10, 15, 20, 25, 30].map((day) => (
            <button
              key={day}
              onClick={() => setFormData({ ...formData, paymentDay: day })}
              className={cn(
                'py-3 rounded-xl text-sm font-semibold transition-colors',
                formData.paymentDay === day
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
                {day}
              </button>
          ))}
        </div>
      </div>

      {/* Auto Renew */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4">
        <div>
          <p className="font-semibold text-slate-900">تجديد تلقائي</p>
          <p className="text-xs text-slate-500">تجديد العقد تلقائياً عند الانتهاء</p>
        </div>
        <button
          onClick={() => setFormData({ ...formData, autoRenew: !formData.autoRenew })}
          className={cn(
            'w-12 h-7 rounded-full transition-colors relative',
            formData.autoRenew ? 'bg-teal-500' : 'bg-slate-300'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
              formData.autoRenew ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          📝 ملاحظات
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="أي شروط إضافية..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 resize-none"
        />
      </div>
    </motion.div>
  );
};

// Step 3: Vehicle Condition
const Step3VehicleCondition: React.FC<{
  formData: FormData;
  setFormData: (data: FormData) => void;
}> = ({ formData, setFormData }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      {/* Fuel Level */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          ⛽ مستوى الوقود
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={formData.fuelLevel}
            onChange={(e) => setFormData({ ...formData, fuelLevel: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-lg font-bold text-teal-600 w-12 text-center">
            {formData.fuelLevel}%
          </span>
        </div>
      </div>

      {/* Mileage */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          📊 المسافة المقطوعة (km)
        </label>
        <input
          type="number"
          value={formData.mileage}
          onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
          placeholder="0"
          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
        />
      </div>

      {/* Exterior Condition */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          🚗 الحالة الخارجية
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['ممتازة', 'جيدة جداً', 'جيدة', 'هناك تلف'].map((condition) => (
            <button
              key={condition}
              onClick={() => setFormData({ ...formData, exteriorCondition: condition })}
              className={cn(
                'py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                formData.exteriorCondition === condition
                  ? 'border-teal-500 bg-teal-50 text-teal-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {condition}
            </button>
          ))}
        </div>
      </div>

      {/* Interior Condition */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          🪑 الحالة الداخلية
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['نظيفة', 'جيدة', 'تحتاج تنظيف', 'متسخة'].map((condition) => (
            <button
              key={condition}
              onClick={() => setFormData({ ...formData, interiorCondition: condition })}
              className={cn(
                'py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                formData.interiorCondition === condition
                  ? 'border-teal-500 bg-teal-50 text-teal-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {condition}
            </button>
          ))}
        </div>
      </div>

      {/* Existing Damage */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          ⚠️ الأضراف الموجودة
        </label>
        <textarea
          value={formData.existingDamage}
          onChange={(e) => setFormData({ ...formData, existingDamage: e.target.value })}
          placeholder="صف أي أضراف موجودة..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 resize-none"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          📷 إضافة صور
        </label>
        <div className="grid grid-cols-4 gap-2">
          {formData.photos.map((photo, index) => (
            <div key={index} className="aspect-square rounded-xl bg-slate-100 overflow-hidden relative">
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  const newPhotos = [...formData.photos];
                  newPhotos.splice(index, 1);
                  setFormData({ ...formData, photos: newPhotos });
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {formData.photos.length < 8 && (
            <button className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-teal-500 hover:text-teal-500 transition-colors">
              <Camera className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Step 4: Review
const Step4Review: React.FC<{
  formData: FormData;
  selectedCustomer: Customer | null;
  selectedVehicle: Vehicle | null;
}> = ({ formData, selectedCustomer, selectedVehicle }) => {
  const calculateTotal = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (formData.contractType === 'daily') {
      return (selectedVehicle?.daily_rate || 0) * days;
    } else if (formData.contractType === 'weekly') {
      const weeks = Math.ceil(days / 7);
      return (selectedVehicle?.weekly_rate || 0) * weeks;
    } else {
      const months = Math.ceil(days / 30);
      return formData.monthlyAmount * months;
    }
  };

  const total = calculateTotal();
  const days = Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-4"
    >
      {/* Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {/* Customer */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-500 shadow-sm">
            <User className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {selectedCustomer?.first_name} {selectedCustomer?.last_name}
            </p>
            <p className="text-sm text-slate-500">{selectedCustomer?.phone}</p>
          </div>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <CarIcon className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {selectedVehicle?.make} {selectedVehicle?.model}
            </p>
            <p className="text-sm text-slate-500">{selectedVehicle?.license_plate}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
            <Calendar className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm text-slate-500">الفترة: {days} يوم</p>
            <p className="font-semibold text-slate-900">
              {new Date(formData.startDate).toLocaleDateString('ar-SA')} - {new Date(formData.endDate).toLocaleDateString('ar-SA')}
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">نوع العقد:</span>
            <span className="font-semibold text-slate-900">
              {formData.contractType === 'daily' ? 'يومي' : formData.contractType === 'weekly' ? 'أسبوعي' : 'شهري'}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">المبلغ الشهري:</span>
            <span className="font-semibold text-slate-900">{t("qarFormdatamonthlyamounttolocalestring")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">الإجمالي:</span>
            <span className="text-xl font-bold text-teal-600">{t("qarTotaltolocalestring")}</span>
          </div>
        </div>

        {/* Terms */}
        {formData.notes && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">ملاحظات:</p>
            <p className="text-sm text-slate-700">{formData.notes}</p>
          </div>
        )}

        {/* Options */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">يوم الاستحقاق:</span>
            <span className="font-semibold text-slate-900">اليوم {formData.paymentDay} من كل شهر</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">التجديد التلقائي:</span>
            <span className={cn(
              'font-semibold',
              formData.autoRenew ? 'text-teal-600' : 'text-slate-500'
            )}>
              {formData.autoRenew ? 'مفعّل' : 'معطّل'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-teal-800">
          بالضغط على "إنشاء العقد"، سيتم إنشاء العقد وإرسال إشعار للعميل. تأكد من صحة جميع المعلومات.
        </p>
      </div>
    </motion.div>
  );
};

export default MobileContractWizard;
