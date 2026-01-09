import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Car as CarIcon,
  User,
  Calendar,
  MapPin,
  CreditCard,
  Settings,
  Fuel,
  Wrench,
  FileText,
  Phone,
  Mail,
  AlertCircle,
  Shield,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  plate_number: string | null;
  year: number | null;
  status: string;
  daily_rate: number | null;
  color: string | null;
  vin: string | null;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  seating_capacity: number | null;
  registration_expiry: string | null;
  insurance_expiry: string | null;
  last_service_date: string | null;
  notes: string | null;
  current_contract?: {
    id: string;
    contract_number: string;
    customer: {
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
    };
    start_date: string;
    end_date: string;
  } | null;
}

export const MobileCarDetail: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setError('معرف المركبة غير موجود');
      setLoading(false);
      return;
    }

    fetchVehicleDetails();
  }, [vehicleId, user]);

  const fetchVehicleDetails = async () => {
    if (!user || !vehicleId) return;

    try {
      let companyId: string;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.company_id) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (employeeError || !employeeData?.company_id) {
          setError('لم يتم العثور على بيانات الشركة');
          setLoading(false);
          return;
        }

        companyId = employeeData.company_id;
      } else {
        companyId = profileData.company_id;
      }

      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`
          *,
          contracts (
            id,
            contract_number,
            start_date,
            end_date,
            customers (
              first_name,
              last_name,
              phone,
              email
            )
          )
        `)
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .single();

      if (vehicleError) throw vehicleError;
      if (!vehicleData) {
        setError('المركبة غير موجودة');
        setLoading(false);
        return;
      }

      // Get active contract
      const activeContract = (vehicleData.contracts as any[])?.find(
        (c: any) => c.status === 'active' || (!c.end_date && new Date(c.end_date) >= new Date())
      );

      const formattedVehicle: Vehicle = {
        ...vehicleData,
        current_contract: activeContract ? {
          id: activeContract.id,
          contract_number: activeContract.contract_number,
          customer: activeContract.customers,
          start_date: activeContract.start_date,
          end_date: activeContract.end_date,
        } : null,
      };

      setVehicle(formattedVehicle);
    } catch (err: any) {
      console.error('Error fetching vehicle details:', err);
      setError('حدث خطأ أثناء تحميل بيانات المركبة');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rented':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'متاح';
      case 'rented':
        return 'مستأجر';
      case 'maintenance':
        return 'صيانة';
      default:
        return status;
    }
  };

  const handleCallCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmailCustomer = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600">جاري تحميل بيانات المركبة...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">حدث خطأ</h3>
          <p className="text-slate-500 mb-6">{error || 'لم يتم العثور على المركبة'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 pb-8" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">تفاصيل المركبة</h1>
            <p className="text-sm text-slate-500">{vehicle.plate_number}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Vehicle Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-200/50 overflow-hidden"
        >
          {/* Vehicle Header */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <CarIcon className="w-8 h-8" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{vehicle.plate_number}</h2>
                <p className="text-white/80">
                  {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                </p>
              </div>
              <span className={cn('px-3 py-1 rounded-full text-sm font-semibold border', getStatusColor(vehicle.status))}>
                {getStatusText(vehicle.status)}
              </span>
            </div>

            {vehicle.color && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full border-2 border-white/30" style={{ backgroundColor: vehicle.color }} />
                <span className="text-white/90">اللون: {vehicle.color}</span>
              </div>
            )}
          </div>

          {/* Vehicle Details Grid */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {vehicle.daily_rate && (
                <div className="bg-teal-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <span className="text-xs text-teal-600 font-medium">سعر التأجير</span>
                  </div>
                  <p className="text-xl font-bold text-teal-700">
                    QAR {vehicle.daily_rate.toLocaleString()}
                  </p>
                  <p className="text-xs text-teal-600 mt-1">لليوم الواحد</p>
                </div>
              )}

              {vehicle.mileage && (
                <div className="bg-blue-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">المسافة المقطوعة</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">
                    {vehicle.mileage.toLocaleString()} كم
                  </p>
                </div>
              )}
            </div>

            {/* Additional Details */}
            {(vehicle.fuel_type || vehicle.transmission || vehicle.seating_capacity || vehicle.vin) && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                {vehicle.fuel_type && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Fuel className="w-4 h-4" />
                      <span>نوع الوقود</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{vehicle.fuel_type}</span>
                  </div>
                )}

                {vehicle.transmission && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Settings className="w-4 h-4" />
                      <span>ناقل الحركة</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{vehicle.transmission}</span>
                  </div>
                )}

                {vehicle.seating_capacity && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="w-4 h-4" />
                      <span>عدد الركاب</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{vehicle.seating_capacity} راكب</span>
                  </div>
                )}

                {vehicle.vin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="w-4 h-4" />
                      <span>رقم الهيكل</span>
                    </div>
                    <span className="text-xs font-mono text-slate-900">{vehicle.vin}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Current Contract */}
        {vehicle.current_contract ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200/50 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-xl">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">العقد الحالي</h3>
                <p className="text-sm text-slate-500">{vehicle.current_contract.contract_number}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600">العميل</p>
                  <p className="font-semibold text-slate-900">
                    {vehicle.current_contract.customer.first_name} {vehicle.current_contract.customer.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600">تاريخ الانتهاء</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(vehicle.current_contract.end_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>

              {/* Contact Actions */}
              {(vehicle.current_contract.customer.phone || vehicle.current_contract.customer.email) && (
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  {vehicle.current_contract.customer.phone && (
                    <button
                      onClick={() => handleCallCustomer(vehicle.current_contract.customer.phone!)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </button>
                  )}
                  {vehicle.current_contract.customer.email && (
                    <button
                      onClick={() => handleEmailCustomer(vehicle.current_contract.customer.email!)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      بريد إلكتروني
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200/50 p-6"
          >
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">المركبة متاحة</h3>
              <p className="text-sm text-slate-500">هذه المركبة جاهزة للتأجير</p>
            </div>
          </motion.div>
        )}

        {/* Important Dates */}
        {(vehicle.registration_expiry || vehicle.insurance_expiry || vehicle.last_service_date) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200/50 p-6"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">التواريخ المهمة</h3>
            <div className="space-y-3">
              {vehicle.registration_expiry && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="w-4 h-4" />
                    <span>انتهاء الترخيص</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {new Date(vehicle.registration_expiry).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              )}

              {vehicle.insurance_expiry && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Shield className="w-4 h-4" />
                    <span>انتهاء التأمين</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {new Date(vehicle.insurance_expiry).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              )}

              {vehicle.last_service_date && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Wrench className="w-4 h-4" />
                    <span>آخر صيانة</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {new Date(vehicle.last_service_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {vehicle.notes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-200/50 p-6"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-3">ملاحظات</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{vehicle.notes}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MobileCarDetail;
