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
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-teal-900">المركبات المستأجرة</h4>
            <p className="text-xs text-teal-600/70">{vehicles.length} مركبة</p>
          </div>
        </div>
      </div>

      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-teal-100 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 transition-all cursor-pointer group"
              onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">{vehicle.make} {vehicle.model}</h5>
                  <p className="text-xs text-teal-600">{vehicle.year}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm p-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
                  <span className="text-slate-600 font-medium">رقم اللوحة</span>
                  <span className="font-mono font-bold text-slate-900">{vehicle.plate_number}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg">
                  <span className="text-teal-600 font-medium">رقم العقد</span>
                  <span className="font-mono font-bold text-teal-700">{vehicle.contractNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg">
                  <span className="text-emerald-600 font-medium">الإيجار الشهري</span>
                  <span className="font-bold text-emerald-700">{vehicle.monthlyAmount?.toLocaleString()} ر.ق</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-12 text-center border border-teal-100">
          <Car className="w-12 h-12 text-teal-300 mx-auto mb-3" />
          <p className="text-teal-600 font-medium">لا توجد مركبات مستأجرة حالياً</p>
          <p className="text-teal-500/70 text-sm mt-1">لم يتم تعيين أي مركبة لهذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

export default VehiclesTab;
