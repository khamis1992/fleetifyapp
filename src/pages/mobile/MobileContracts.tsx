import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  FileText,
  User,
  Car as CarIcon,
  Calendar,
  CreditCard,
  ChevronLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Contract {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  status: string;
  days_overdue: number | null;
  customer: {
    first_name: string;
    last_name: string;
  };
  vehicle: {
    make: string | null;
    model: string | null;
    license_plate: string | null;
  } | null;
}

type FilterType = 'all' | 'active' | 'expiring' | 'overdue';

export const MobileContracts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [user]);

  useEffect(() => {
    filterContracts();
  }, [contracts, searchQuery, activeFilter]);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const companyId = user?.profile?.company_id || user?.company?.id || '';

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          start_date,
          end_date,
          monthly_amount,
          status,
          days_overdue,
          customer_id,
          vehicles (
            make,
            model,
            license_plate
          ),
          customers (
            first_name,
            last_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: Contract[] = (data || []).map((c: any) => ({
        id: c.id,
        contract_number: c.contract_number,
        start_date: c.start_date,
        end_date: c.end_date,
        monthly_amount: c.monthly_amount,
        status: c.status,
        days_overdue: c.days_overdue,
        customer: c.customers || { first_name: '', last_name: '' },
        vehicle: c.vehicles,
      }));

      setContracts(formattedData);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContracts = () => {
    let filtered = [...contracts];

    // Apply status filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(c => c.status === 'active');
    } else if (activeFilter === 'expiring') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      filtered = filtered.filter(c =>
        c.status === 'active' && new Date(c.end_date) <= sevenDaysFromNow
      );
    } else if (activeFilter === 'overdue') {
      filtered = filtered.filter(c =>
        (c.days_overdue || 0) > 0
      );
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.contract_number.toLowerCase().includes(query) ||
        `${c.customer.first_name} ${c.customer.last_name}`.toLowerCase().includes(query) ||
        c.vehicle?.license_plate?.toLowerCase().includes(query)
      );
    }

    setFilteredContracts(filtered);
  };

  const getStatusBadge = (contract: Contract) => {
    if (contract.days_overdue && contract.days_overdue > 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
          {contract.days_overdue} يوم متأخر
        </span>
      );
    }

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    if (contract.status === 'active' && new Date(contract.end_date) <= sevenDaysFromNow) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-600">
          ينتهق قريباً
        </span>
      );
    }

    if (contract.status === 'active') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
          نشط
        </span>
      );
    }

    if (contract.status === 'expired' || contract.status === 'cancelled') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {contract.status === 'expired' ? 'منتهي' : 'ملغي'}
        </span>
      );
    }

    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="px-4 py-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">العقود</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredContracts.length} عقد
          </p>
        </div>
        <button
          onClick={() => navigate('/mobile/contracts/new')}
          className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في العقود..."
          className={cn(
            'w-full pr-10 pl-10 py-3 rounded-2xl',
            'bg-white/80 backdrop-blur-xl border border-slate-200/50',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
            'transition-all duration-200'
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <FilterChip
          label="الكل"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        <FilterChip
          label="نشط"
          active={activeFilter === 'active'}
          onClick={() => setActiveFilter('active')}
        />
        <FilterChip
          label="ينتهق قريباً"
          active={activeFilter === 'expiring'}
          onClick={() => setActiveFilter('expiring')}
        />
        <FilterChip
          label="متأخر"
          active={activeFilter === 'overdue'}
          onClick={() => setActiveFilter('overdue')}
        />
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          title="لا توجد عقود"
          description={searchQuery ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإنشاء عقد جديد'}
          actionLabel="إنشاء عقد"
          onAction={() => navigate('/mobile/contracts/new')}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredContracts.map((contract) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/mobile/contracts/${contract.id}`)}
                className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                      <FileText className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{contract.contract_number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(contract)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Customer */}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      {contract.customer.first_name} {contract.customer.last_name}
                    </span>
                  </div>

                  {/* Vehicle */}
                  {contract.vehicle && (
                    <div className="flex items-center gap-2 text-sm">
                      <CarIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">
                        {contract.vehicle.make} {contract.vehicle.model} | {contract.vehicle.license_plate}
                      </span>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">
                      {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-2 text-sm pt-2 border-t border-slate-100">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-teal-600">
                      QAR {contract.monthly_amount.toLocaleString()} / شهرياً
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
      active
        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
        : 'bg-white/80 text-slate-600 border border-slate-200/50 hover:bg-slate-100'
    )}
  >
    {label}
  </button>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction }) => (
  <div className="text-center py-12 px-6">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
      <FileText className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-6">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-lg shadow-teal-500/30"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default MobileContracts;
