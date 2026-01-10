import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Building,
  Camera,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  qid_number: string | null;
  driver_license: string | null;
  license_expiry: string | null;
  address: string | null;
  city: string | null;
  company_name: string | null;
  nationality: string | null;
  date_of_birth: string | null;
}

type FormMode = 'create' | 'edit';

export const MobileCustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const { user } = useAuth();

  const mode: FormMode = customerId ? 'edit' : 'create';
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    whatsapp_number: '',
    email: '',
    qid_number: '',
    driver_license: '',
    license_expiry: '',
    address: '',
    city: '',
    company_name: '',
    nationality: '',
    date_of_birth: '',
  });

  useEffect(() => {
    if (mode === 'edit' && customerId) {
      fetchCustomer();
    }
  }, [customerId, mode]);

  const fetchCustomer = async () => {
    if (!customerId) return;

    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          whatsapp_number: data.whatsapp_number || '',
          email: data.email || '',
          qid_number: data.qid_number || '',
          driver_license: data.driver_license || '',
          license_expiry: data.license_expiry?.split('T')[0] || '',
          address: data.address || '',
          city: data.city || '',
          company_name: data.company_name || '',
          nationality: data.nationality || '',
          date_of_birth: data.date_of_birth?.split('T')[0] || '',
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'الاسم الأول مطلوب';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'اسم العائلة مطلوب';
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'رقم الهاتف مطلوب';
    }

    // Email validation
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'البريد الإلكتروني غير صالح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      let companyId: string;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (profileData?.company_id) {
        companyId = profileData.company_id;
      } else {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user?.id)
          .eq('is_active', true)
          .single();

        if (!employeeData?.company_id) {
          throw new Error('No company_id found');
        }
        companyId = employeeData.company_id;
      }

      const customerData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim() || null,
        whatsapp_number: formData.whatsapp_number.trim() || null,
        email: formData.email.trim() || null,
        qid_number: formData.qid_number.trim() || null,
        driver_license: formData.driver_license.trim() || null,
        license_expiry: formData.license_expiry || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        company_name: formData.company_name.trim() || null,
        nationality: formData.nationality.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        company_id: companyId,
      };

      let error;
      let newCustomerId: string | undefined = customerId;

      if (mode === 'edit' && customerId) {
        const result = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customerId);
        error = result.error;
      } else {
        const result = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single();
        error = result.error;
        if (!error && result.data?.id) {
          newCustomerId = result.data.id;
        }
      }

      if (error) throw error;

      // Navigate back to customer details or list
      if (newCustomerId) {
        navigate(`/mobile/customers/${newCustomerId}`);
      } else {
        navigate('/mobile/customers');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-teal-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(mode === 'edit' && customerId ? `/mobile/customers/${customerId}` : '/mobile/customers')}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">
            {mode === 'edit' ? 'تعديل العميل' : 'إضافة عميل جديد'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-500" />
              المعلومات الأساسية
            </h3>

            <FormField
              label="الاسم الأول *"
              value={formData.first_name}
              onChange={(v) => handleChange('first_name', v)}
              error={errors.first_name}
              placeholder="أدخل الاسم الأول"
              required
            />

            <FormField
              label="اسم العائلة *"
              value={formData.last_name}
              onChange={(v) => handleChange('last_name', v)}
              error={errors.last_name}
              placeholder="أدخل اسم العائلة"
              required
            />

            <FormField
              label="الجنسية"
              value={formData.nationality}
              onChange={(v) => handleChange('nationality', v)}
              placeholder="مثال: قطري، سعودي، مصري"
            />

            <DateField
              label="تاريخ الميلاد"
              value={formData.date_of_birth}
              onChange={(v) => handleChange('date_of_birth', v)}
            />
          </div>

          {/* Contact Info Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-500" />
              معلومات الاتصال
            </h3>

            <FormField
              label="رقم الهاتف *"
              value={formData.phone_number}
              onChange={(v) => handleChange('phone_number', v)}
              error={errors.phone_number}
              placeholder="مثال: +974 1234 5678"
              type="tel"
              required
            />

            <FormField
              label="رقم الواتساب"
              value={formData.whatsapp_number}
              onChange={(v) => handleChange('whatsapp_number', v)}
              placeholder="مثال: +974 1234 5678"
              type="tel"
            />

            <FormField
              label="البريد الإلكتروني"
              value={formData.email}
              onChange={(v) => handleChange('email', v)}
              error={errors.email}
              placeholder="example@email.com"
              type="email"
            />

            <FormField
              label="المدينة"
              value={formData.city}
              onChange={(v) => handleChange('city', v)}
              placeholder="مثال: الدوحة"
            />

            <FormField
              label="العنوان"
              value={formData.address}
              onChange={(v) => handleChange('address', v)}
              placeholder="أدخل العنوان الكامل"
              textarea
            />
          </div>

          {/* Documents Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-500" />
              المستندات
            </h3>

            <FormField
              label="رقم الهوية (QID)"
              value={formData.qid_number}
              onChange={(v) => handleChange('qid_number', v)}
              placeholder="أدخل رقم الهوية"
            />

            <FormField
              label="رقم رخصة القيادة"
              value={formData.driver_license}
              onChange={(v) => handleChange('driver_license', v)}
              placeholder="أدخل رقم الرخصة"
            />

            <DateField
              label="تاريخ انتهاء الرخصة"
              value={formData.license_expiry}
              onChange={(v) => handleChange('license_expiry', v)}
            />
          </div>

          {/* Company Info Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-500" />
              معلومات الشركة
            </h3>

            <FormField
              label="اسم الشركة"
              value={formData.company_name}
              onChange={(v) => handleChange('company_name', v)}
              placeholder="أدخل اسم الشركة (إن وجد)"
            />
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          type="submit"
          disabled={saving}
          className={cn(
            'w-full py-4 rounded-2xl font-semibold shadow-lg transition-all',
            'bg-gradient-to-r from-teal-500 to-teal-600 text-white',
            'shadow-teal-500/30',
            saving && 'opacity-70 cursor-not-allowed'
          )}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الحفظ...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              {mode === 'edit' ? 'حفظ التغييرات' : 'إضافة العميل'}
            </span>
          )}
        </motion.button>
      </form>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'date';
  required?: boolean;
  textarea?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  required,
  textarea,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-2xl',
            'bg-white/80 backdrop-blur-xl border border-slate-200/50',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
            'transition-all duration-200 resize-none',
            error && 'border-red-300 focus:ring-red-500/50 focus:border-red-500'
          )}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(
            'w-full px-4 py-3 rounded-2xl',
            'bg-white/80 backdrop-blur-xl border border-slate-200/50',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
            'transition-all duration-200',
            error && 'border-red-300 focus:ring-red-500/50 focus:border-red-500'
          )}
        />
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const DateField: React.FC<DateFieldProps> = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full px-4 py-3 rounded-2xl',
            'bg-white/80 backdrop-blur-xl border border-slate-200/50',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
            'transition-all duration-200'
          )}
        />
      </div>
    </div>
  );
};

export default MobileCustomerForm;
