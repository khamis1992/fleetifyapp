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
      className="grid grid-cols-1 gap-4 xl:grid-cols-2"
    >
      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#173A63] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-sm font-black text-[#142033]">معلومات العميل</h4>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {infoItems.map((item, index) => (
            <div key={index} className="rounded-lg bg-[#F8FAFC] p-3">
              <p className="text-[11px] font-bold text-[#6A7688]">{item.label}</p>
              <p className="mt-1 text-sm font-black text-[#142033]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#173A63] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-sm font-black text-[#142033]">معلومات العنوان</h4>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {addressItems.map((item, index) => (
            <div key={index} className="rounded-lg bg-[#F8FAFC] p-3">
              <p className="text-[11px] font-bold text-[#6A7688]">{item.label}</p>
              <p className="mt-1 text-sm font-black text-[#142033]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PersonalInfoTab;
