import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Phone,
  Mail,
  User,
  Edit,
  Calendar,
  FileText,
  CreditCard,
  Car as CarIcon,
  MapPin,
  Building,
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
  created_at: string;
}

interface ActiveContract {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  status: string;
  make: string | null;
  model: string | null;
  license_plate: string | null;
}

export const MobileCustomerDetails: React.FC = () => {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeContracts, setActiveContracts] = useState<ActiveContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchActiveContracts();
    }
  }, [customerId, user]);

  const fetchCustomerDetails = async () => {
    if (!customerId || !user) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveContracts = async () => {
    if (!customerId || !user) return;

    try {
      let companyId: string;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.company_id) {
        companyId = profileData.company_id;
      } else {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!employeeData?.company_id) return;
        companyId = employeeData.company_id;
      }

      const { data } = await supabase
        .from('contracts')
        .select('id, contract_number, start_date, end_date, monthly_amount, status, make, model, license_plate')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setActiveContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanedPhone}`, '_blank');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getAvatarInitials = (firstName: string, lastName: string) => {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-teal-500 to-teal-600',
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-teal-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="text-center">
          <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">العميل غير موجود</p>
          <button
            onClick={() => navigate('/mobile/customers')}
            className="mt-4 px-6 py-2 bg-teal-500 text-white rounded-xl"
          >
            العودة للعملاء
          </button>
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
            onClick={() => navigate('/mobile/customers')}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">تفاصيل العميل</h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate(`/mobile/customers/${customer.id}/edit`)}
            className="p-2 rounded-xl bg-teal-500 text-white"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={cn(
              'w-16 h-16 rounded-2xl bg-gradient-to-br shadow-lg flex items-center justify-center text-white font-bold text-xl',
              getAvatarColor(customer.first_name)
            )}>
              {getAvatarInitials(customer.first_name, customer.last_name)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">
                {customer.first_name} {customer.last_name}
              </h2>
              {customer.company_name && (
                <p className="text-sm text-slate-500 mt-1">{customer.company_name}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            {customer.phone_number && (
              <button
                onClick={() => handleCall(customer.phone_number!)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-100 text-green-700 font-medium"
              >
                <Phone className="w-4 h-4" />
                اتصال
              </button>
            )}
            {customer.whatsapp_number && (
              <button
                onClick={() => handleWhatsApp(customer.whatsapp_number!)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-100 text-green-700 font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                واتساب
              </button>
            )}
          </div>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 space-y-3"
        >
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal-500" />
            معلومات الاتصال
          </h3>

          {customer.phone_number && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Phone className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">رقم الهاتف</p>
                <p className="text-sm font-medium text-slate-900">{customer.phone_number}</p>
              </div>
            </div>
          )}

          {customer.whatsapp_number && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <div className="flex-1">
                <p className="text-xs text-slate-500">واتساب</p>
                <p className="text-sm font-medium text-slate-900">{customer.whatsapp_number}</p>
              </div>
            </div>
          )}

          {customer.email && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Mail className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">البريد الإلكتروني</p>
                <p className="text-sm font-medium text-slate-900">{customer.email}</p>
              </div>
            </div>
          )}

          {customer.address && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">العنوان</p>
                <p className="text-sm font-medium text-slate-900">{customer.address}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Personal Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 space-y-3"
        >
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-500" />
            المعلومات الشخصية
          </h3>

          {customer.qid_number && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <FileText className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">رقم الهوية</p>
                <p className="text-sm font-medium text-slate-900">{customer.qid_number}</p>
              </div>
            </div>
          )}

          {customer.driver_license && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">رخصة القيادة</p>
                <p className="text-sm font-medium text-slate-900">{customer.driver_license}</p>
              </div>
            </div>
          )}

          {customer.license_expiry && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">انتهاء الرخصة</p>
                <p className="text-sm font-medium text-slate-900">{formatDate(customer.license_expiry)}</p>
              </div>
            </div>
          )}

          {customer.nationality && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <User className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">الجنسية</p>
                <p className="text-sm font-medium text-slate-900">{customer.nationality}</p>
              </div>
            </div>
          )}

          {customer.date_of_birth && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-xs text-slate-500">تاريخ الميلاد</p>
                <p className="text-sm font-medium text-slate-900">{formatDate(customer.date_of_birth)}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Active Contracts */}
        {activeContracts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 space-y-3"
          >
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-500" />
              العقود النشطة ({activeContracts.length})
            </h3>

            <div className="space-y-2">
              {activeContracts.map((contract) => (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/mobile/contracts/${contract.id}`)}
                  className="p-3 rounded-xl bg-slate-50 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="font-medium text-slate-900">{contract.contract_number}</span>
                  </div>
                  {contract.make && contract.model && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CarIcon className="w-3.5 h-3.5" />
                      <span>{contract.make} {contract.model}</span>
                      {contract.license_plate && <span>| {contract.license_plate}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>{formatDate(contract.start_date)}</span>
                    <span>QAR {contract.monthly_amount.toLocaleString()}/شهر</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Edit Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate(`/mobile/customers/${customer.id}/edit`)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-lg shadow-teal-500/30"
        >
          تعديل بيانات العميل
        </motion.button>
      </div>
    </div>
  );
};

export default MobileCustomerDetails;
