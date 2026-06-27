import { motion } from 'framer-motion';
import { Phone, Briefcase, MessageSquare, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isValidQatarPhone } from './helpers';

const PhoneNumbersTab = ({ customer }: { customer: any }) => {
  const phones = [
    { type: 'رئيسي', number: customer.phone, icon: Phone },
    { type: 'ثانوي', number: customer.secondary_phone || '-', icon: Phone },
    { type: 'عمل', number: customer.work_phone || '-', icon: Briefcase },
    { type: 'واتساب', number: customer.whatsapp || customer.phone || '-', icon: MessageSquare },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-[#173A63] flex items-center justify-center">
          <Phone className="w-5 h-5 text-white" />
        </div>
        <h4 className="text-sm font-black text-[#142033]">أرقام الهاتف</h4>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phones.map((phone, index) => {
          const isValid = phone.number !== '-' && isValidQatarPhone(phone.number);
          const hasNumber = phone.number && phone.number !== '-';

          return (
            <div
              key={index}
              className={cn(
                "p-4 rounded-xl border transition-all hover:shadow-md",
                hasNumber && !isValid
                  ? "bg-amber-50/80 border-amber-200"
                  : "bg-[#F8FAFC] border-[#DDE5EF] hover:border-[#173A63]"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    hasNumber && !isValid ? "bg-amber-100" : "bg-[#EEF5FB]"
                  )}>
                    <phone.icon className={cn(
                      "w-5 h-5",
                      hasNumber && !isValid ? "text-amber-600" : "text-[#173A63]"
                    )} />
                  </div>
                  <span className="text-xs font-bold text-[#536173]">{phone.type}</span>
                </div>
                {hasNumber && (
                  <Badge className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md font-medium",
                    isValid
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {isValid ? 'صحيح' : 'غير قياسي'}
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold text-slate-900 font-mono mb-3" dir="ltr">
                {phone.number}
              </p>
              {phone.number !== '-' && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-[#173A63] hover:text-[#173A63] hover:bg-[#EEF5FB] p-0 h-8"
                    onClick={() => window.open(`tel:${phone.number}`, '_self')}
                  >
                    <PhoneCall className="w-4 h-4 ml-1" />
                    اتصال
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-0 h-8"
                    onClick={() => window.open(`https://wa.me/${phone.number.replace(/[^0-9]/g, '')}`, '_blank')}
                  >
                    <MessageSquare className="w-4 h-4 ml-1" />
                    واتساب
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PhoneNumbersTab;
