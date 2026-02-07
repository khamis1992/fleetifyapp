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
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-teal-900">العقود النشطة</h4>
            <p className="text-xs text-teal-600/70">{contracts.length} عقد</p>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2 shadow-teal-500/20"
          onClick={() => navigate(`/contracts?customer=${customerId}`)}
        >
          <Plus className="w-4 h-4" />
          عقد جديد
        </Button>
      </div>

      {contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-teal-100 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 transition-all cursor-pointer group"
                onClick={() => navigate(`/contracts/${contract.contract_number}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">{vehicleName}</h5>
                      <p className="text-xs text-teal-600 font-mono">#{contract.contract_number}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-xs px-3 py-1 rounded-md font-medium border",
                    contract.status === 'active'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>
                    {contract.status === 'active' ? 'نشط' : 'معلق'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl text-center">
                    <p className="text-xs text-teal-600/70 mb-1">الإيجار الشهري</p>
                    <p className="text-sm font-bold text-teal-700">{contract.monthly_amount?.toLocaleString()} ر.ق</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl text-center">
                    <p className="text-xs text-slate-600/70 mb-1">ينتهي في</p>
                    <p className="text-sm font-bold text-slate-900">
                      {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yy') : '-'}
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl text-center",
                    daysRemaining <= 30
                      ? "bg-gradient-to-br from-red-50 to-rose-50"
                      : daysRemaining <= 60
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50"
                      : "bg-gradient-to-br from-emerald-50 to-green-50"
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
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-12 text-center border border-teal-100">
          <FileText className="w-12 h-12 text-teal-300 mx-auto mb-3" />
          <p className="text-teal-600 font-medium">لا توجد عقود لهذا العميل</p>
          <p className="text-teal-500/70 text-sm mt-1">ابدأ بإنشاء عقد جديد</p>
        </div>
      )}
    </motion.div>
  );
};

export default ContractsTab;
