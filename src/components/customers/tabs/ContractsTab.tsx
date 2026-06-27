import { motion } from 'framer-motion';
import { FileText, Car, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import type { NavigateFunction } from 'react-router-dom';

const ContractsTab = ({ contracts, navigate, customerId }: { contracts: any[], navigate: NavigateFunction, customerId: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#173A63] flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#142033]">العقود النشطة</h4>
            <p className="text-xs font-semibold text-[#6A7688]">{contracts.length} عقد</p>
          </div>
        </div>
        <Button
          className="gap-2 bg-[#173A63] text-white hover:bg-[#142033]"
          onClick={() => navigate(`/contracts?customer=${customerId}`)}
        >
          <Plus className="w-4 h-4" />
          عقد جديد
        </Button>
      </div>

      {contracts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {contracts.map((contract, index) => {
            const vehicleName = contract.vehicle
              ? `${contract.vehicle.make} ${contract.vehicle.model}`
              : 'غير محدد';
            const endDate = contract.end_date ? new Date(contract.end_date) : null;
            const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;

            return (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#173A63] hover:shadow-md"
                onClick={() => navigate(`/contracts/${contract.contract_number}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#EEF5FB] text-[#173A63] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">{vehicleName}</h5>
                      <p className="text-xs text-[#173A63] font-mono">#{contract.contract_number}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-xs px-3 py-1 rounded-md font-medium border",
                    contract.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>
                    {contract.status === 'active' ? 'نشط' : 'معلق'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#F8FAFC] rounded-lg text-center">
                    <p className="text-xs text-[#6A7688] mb-1 font-bold">الإيجار الشهري</p>
                    <p className="text-sm font-black text-[#142033]">{contract.monthly_amount?.toLocaleString()} ر.ق</p>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-lg text-center">
                    <p className="text-xs text-slate-600/70 mb-1">ينتهي في</p>
                    <p className="text-sm font-bold text-slate-900">
                      {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yy') : '-'}
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl text-center",
                    daysRemaining <= 30
                      ? "bg-red-50"
                      : daysRemaining <= 60
                      ? "bg-amber-50"
                      : "bg-emerald-50"
                  )}>
                    <p className={cn(
                      "text-xs mb-1",
                      daysRemaining <= 30
                        ? "text-red-600/70"
                        : daysRemaining <= 60
                        ? "text-amber-600/70"
                        : "text-emerald-600/70"
                    )}>المتبقي</p>
                    <p className={cn(
                      "text-sm font-bold",
                      daysRemaining <= 30 ? 'text-red-700' : daysRemaining <= 60 ? 'text-amber-700' : 'text-emerald-700'
                    )}>
                      {daysRemaining} يوم
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#B8C6D8] bg-[#F8FAFC] p-12 text-center">
          <FileText className="w-12 h-12 text-[#9AA6B6] mx-auto mb-3" />
          <p className="font-bold text-[#536173]">لا توجد عقود لهذا العميل</p>
          <p className="text-[#6A7688] text-sm mt-1">ابدأ بإنشاء عقد جديد</p>
        </div>
      )}
    </motion.div>
  );
};

export default ContractsTab;
