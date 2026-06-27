import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Car } from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';

const VehiclesTab = ({ contracts, navigate }: { contracts: any[], navigate: NavigateFunction }) => {
  const vehicles = useMemo(() => {
    return contracts
      .filter(c => c.vehicle && c.status === 'active')
      .map(c => ({
        ...c.vehicle,
        contractNumber: c.contract_number,
        contractId: c.id,
        monthlyAmount: c.monthly_amount,
      }));
  }, [contracts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#173A63] flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#142033]">المركبات المستأجرة</h4>
            <p className="text-xs font-semibold text-[#6A7688]">{vehicles.length} مركبة</p>
          </div>
        </div>
      </div>

      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#173A63] hover:shadow-md"
              onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#EEF5FB] text-[#173A63] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">{vehicle.make} {vehicle.model}</h5>
                  <p className="text-xs text-[#6A7688]">{vehicle.year}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm p-2 bg-[#F8FAFC] rounded-lg">
                  <span className="text-slate-600 font-medium">رقم اللوحة</span>
                  <span className="font-mono font-bold text-slate-900">{vehicle.plate_number}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-[#F8FAFC] rounded-lg">
                  <span className="text-[#6A7688] font-medium">رقم العقد</span>
                  <span className="font-mono font-bold text-[#173A63]">{vehicle.contractNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-600 font-medium">الإيجار الشهري</span>
                  <span className="font-bold text-emerald-700">{vehicle.monthlyAmount?.toLocaleString()} ر.ق</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#B8C6D8] bg-[#F8FAFC] p-12 text-center">
          <Car className="w-12 h-12 text-[#9AA6B6] mx-auto mb-3" />
          <p className="font-bold text-[#536173]">لا توجد مركبات مستأجرة حالياً</p>
          <p className="text-[#6A7688] text-sm mt-1">لم يتم تعيين أي مركبة لهذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

export default VehiclesTab;
