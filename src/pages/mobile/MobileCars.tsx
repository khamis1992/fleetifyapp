import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car as CarIcon, User, Calendar, MapPin, CreditCard, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  license_plate: string | null;
  year: number | null;
  status: string;
  daily_rate: number | null;
  current_contract?: {
    id: string;
    contract_number: string;
    customer: {
      first_name: string;
      last_name: string;
    };
    end_date: string;
  } | null;
}

const MobileCars: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'rented' | 'available' | 'maintenance'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, activeFilter]);

  const fetchVehicles = async () => {
    if (!user) return;

    try {
      const companyId = user?.profile?.company_id || user?.company?.id || '';

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          make,
          model,
          license_plate,
          year,
          status,
          daily_rate
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch active contracts for rented vehicles
      const vehicleIds = data?.map(v => v.id) || [];
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          vehicle_id,
          end_date,
          customers (
            first_name,
            last_name
          )
        `)
        .eq('status', 'active')
        .in('vehicle_id', vehicleIds);

      const contractsByVehicle = contracts?.reduce((acc, c: any) => {
        acc[c.vehicle_id] = c;
        return acc;
      }, {} as Record<string, any>) || {};

      const formattedData: Vehicle[] = (data || []).map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        license_plate: v.license_plate,
        year: v.year,
        status: v.status,
        daily_rate: v.daily_rate,
        current_contract: contractsByVehicle[v.id] ? {
          id: contractsByVehicle[v.id].id,
          contract_number: contractsByVehicle[v.id].contract_number,
          customer: contractsByVehicle[v.id].customers,
          end_date: contractsByVehicle[v.id].end_date,
        } : null,
      }));

      setVehicles(formattedData);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];

    if (activeFilter === 'rented') {
      filtered = filtered.filter(v => v.status === 'rented');
    } else if (activeFilter === 'available') {
      filtered = filtered.filter(v => v.status === 'available');
    } else if (activeFilter === 'maintenance') {
      filtered = filtered.filter(v => v.status === 'maintenance');
    }

    setFilteredVehicles(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-600';
      case 'rented':
        return 'bg-red-100 text-red-600';
      case 'maintenance':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-600';
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

  const getStats = () => {
    return {
      total: vehicles.length,
      rented: vehicles.filter(v => v.status === 'rented').length,
      available: vehicles.filter(v => v.status === 'available').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    };
  };

  const stats = getStats();

  return (
    <div className="px-4 py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">حالة الأسطول</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة المركبات</p>
        </div>
        <button className="p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200/50">
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard value={stats.total} label="الكل" color="from-gray-500 to-gray-600" />
        <StatCard value={stats.rented} label="مستأجر" color="from-red-500 to-red-600" />
        <StatCard value={stats.available} label="متاح" color="from-green-500 to-green-600" />
        <StatCard value={stats.maintenance} label="صيانة" color="from-amber-500 to-amber-600" />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterChip
          label="الكل"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
          count={stats.total}
        />
        <FilterChip
          label="مستأجر"
          active={activeFilter === 'rented'}
          onClick={() => setActiveFilter('rented')}
          count={stats.rented}
        />
        <FilterChip
          label="متاح"
          active={activeFilter === 'available'}
          onClick={() => setActiveFilter('available')}
          count={stats.available}
        />
        <FilterChip
          label="صيانة"
          active={activeFilter === 'maintenance'}
          onClick={() => setActiveFilter('maintenance')}
          count={stats.maintenance}
        />
      </div>

      {/* Vehicle List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-12">
          <CarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مركبات</h3>
          <p className="text-sm text-gray-500">لم يتم العثور على مركبات في هذا الفلتر</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVehicles.map((vehicle) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/mobile/cars/${vehicle.id}`)}
              className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                    <CarIcon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-500">{vehicle.license_plate}</p>
                  </div>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(vehicle.status))}>
                  {getStatusText(vehicle.status)}
                </span>
              </div>

              {vehicle.current_contract ? (
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      {vehicle.current_contract.customer.first_name} {vehicle.current_contract.customer.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      الاستحقاق: {new Date(vehicle.current_contract.end_date).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm pt-3 border-t border-gray-100">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-teal-600">
                    QAR {vehicle.daily_rate?.toLocaleString()} / يوم
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  value: number;
  label: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color }) => (
  <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-3 text-center">
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
      active
        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
        : 'bg-white/80 text-gray-600 border border-gray-200/50 hover:bg-gray-100'
    )}
  >
    {label}
    {count !== undefined && (
      <span className={cn('text-xs', active ? 'text-white/80' : 'text-gray-400')}>
        {count}
      </span>
    )}
  </button>
);

export default MobileCars;
