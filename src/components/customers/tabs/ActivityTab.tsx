import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  Wallet,
  AlertTriangle,
  Phone,
  MessageSquare,
  FileText,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useCustomerCRMActivity } from '@/hooks/useCustomerCRMActivity';

const ActivityTab = ({ customerId, companyId, contracts, payments, violations }: { 
  customerId: string; 
  companyId: string;
  contracts: any[];
  payments: any[];
  violations: any[];
}) => {
  const { activities: crmActivities } = useCustomerCRMActivity(customerId);
  
  const allActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'contract' | 'payment' | 'violation' | 'crm';
      description: string;
      date: Date;
      icon: string;
      color: string;
      details?: any;
    }> = [];

    contracts?.forEach(contract => {
      activities.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        description: `عقد جديد: ${contract.contract_number || 'بدون رقم'} - ${contract.vehicle?.plate_number || ''}`,
        date: new Date(contract.created_at),
        icon: 'car',
        color: 'blue',
        details: contract
      });
    });

    payments?.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        description: `دفعة: ${payment.amount?.toLocaleString()} ر.ق`,
        date: new Date(payment.payment_date || payment.created_at),
        icon: 'wallet',
        color: 'green',
        details: payment
      });
    });

    violations?.forEach(violation => {
      activities.push({
        id: `violation-${violation.id}`,
        type: 'violation',
        description: `مخالفة: ${violation.violation_type || 'مرورية'} - ${violation.fine_amount?.toLocaleString()} ر.ق`,
        date: new Date(violation.violation_date || violation.created_at),
        icon: 'alert',
        color: 'red',
        details: violation
      });
    });

    crmActivities?.forEach(activity => {
      activities.push({
        id: `crm-${activity.id}`,
        type: 'crm',
        description: activity.content,
        date: new Date(activity.created_at),
        icon: activity.note_type === 'phone' ? 'phone' : activity.note_type === 'whatsapp' ? 'message' : 'note',
        color: activity.note_type === 'phone' ? 'green' : activity.note_type === 'whatsapp' ? 'emerald' : 'gray',
        details: activity
      });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [contracts, payments, violations, crmActivities]);

  const getIcon = (type: string, iconType: string) => {
    switch (iconType) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'wallet': return <Wallet className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600 border-blue-300';
      case 'green': return 'bg-green-100 text-green-600 border-green-300';
      case 'red': return 'bg-red-100 text-red-600 border-red-300';
      case 'emerald': return 'bg-emerald-100 text-emerald-600 border-emerald-300';
      default: return 'bg-neutral-100 text-neutral-600 border-neutral-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'عقد';
      case 'payment': return 'دفعة';
      case 'violation': return 'مخالفة';
      case 'crm': return 'تواصل';
      default: return 'نشاط';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="mb-4 rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-4">
        <div>
          <h4 className="text-sm font-black text-[#142033]">سجل النشاط الكامل</h4>
          <p className="text-xs font-semibold text-[#6A7688]">{allActivities.length} نشاط مسجل</p>
        </div>
      </div>

      {allActivities.length > 0 ? (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-[#DDE5EF]" />
          <div className="space-y-3">
            {allActivities.slice(0, 50).map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative pr-14"
              >
                <div className={cn(
                  "absolute right-3 w-6 h-6 rounded-full flex items-center justify-center border-2",
                  getColorClasses(activity.color)
                )}>
                  {getIcon(activity.type, activity.icon)}
                </div>
                <div className="rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-all hover:border-[#173A63] hover:shadow-md">
                  <div className="flex items-start justify-between mb-1">
                    <Badge variant="outline" className={cn("text-xs", getColorClasses(activity.color))}>
                      {getTypeLabel(activity.type)}
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      {format(activity.date, 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 line-clamp-2">{activity.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#B8C6D8] bg-[#F8FAFC] p-12 text-center">
          <Activity className="w-12 h-12 text-[#9AA6B6] mx-auto mb-3" />
          <p className="font-bold text-[#536173]">لا توجد أنشطة مسجلة حتى الآن</p>
          <p className="text-[#6A7688] text-sm mt-1">سيظهر سجل النشاط هنا عند إجراء أي عمليات</p>
        </div>
      )}
    </motion.div>
  );
};

export default ActivityTab;
