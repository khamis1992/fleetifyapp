import { motion } from 'framer-motion';
import { User, Building2, Users, Briefcase, MapPin } from 'lucide-react';
import { formatCustomerName } from '@/utils/formatCustomerName';

const PersonalInfoTab = ({ customer }: { customer: any }) => {
  const infoItems = [
    { label: 'صاحب العمل', value: customer.employer || '-', icon: Building2 },
    { label: 'المجموعة', value: customer.group_name || 'عميل عادي', icon: Users },
    { label: 'الاسم الكامل', value: formatCustomerName(customer), icon: User },
    { label: 'المنصب', value: customer.job_title || '-', icon: Briefcase },
    { label: 'الاسم الأول', value: customer.first_name || customer.first_name_ar || '-', icon: User },
    { label: 'الاسم الأوسط', value: customer.middle_name || '-', icon: User },
    { label: 'اسم العائلة', value: customer.last_name || customer.last_name_ar || '-', icon: User },
  ];

  const addressItems = [
    { label: 'الرقم الفيدرالي', value: customer.national_id || '-' },
    { label: 'الجنسية', value: customer.nationality || '-' },
    { label: 'العنوان 1', value: customer.address || '-' },
    { label: 'العنوان 2', value: customer.address_2 || '-' },
    { label: 'المدينة', value: customer.city || '-' },
    { label: 'المنطقة', value: customer.state || '-' },
    { label: 'البلد', value: customer.country || 'قطر' },
    { label: 'الرمز البريدي', value: customer.postal_code || '-' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-sm font-bold text-teal-900">معلومات العميل</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {infoItems.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <p className="text-xs font-medium text-teal-600/70">{item.label}</p>
              <p className="text-sm font-semibold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-sm font-bold text-teal-900">معلومات العنوان</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {addressItems.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <p className="text-xs font-medium text-teal-600/70">{item.label}</p>
              <p className="text-sm font-semibold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PersonalInfoTab;
