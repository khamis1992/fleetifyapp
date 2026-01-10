import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Phone,
  Mail,
  User,
  ChevronLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  qid_number: string | null;
  driver_license: string | null;
  company_id: string;
  created_at: string;
}

export const MobileCustomers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      let companyId: string;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData?.company_id) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (employeeError || !employeeData?.company_id) {
          console.error('[MobileCustomers] No company_id found', { employeeError, user_id: user.id });
          return;
        }

        companyId = employeeData.company_id;
      } else {
        companyId = profileData.company_id;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.phone_number?.includes(query) ||
        c.whatsapp_number?.includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.qid_number?.includes(query)
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanedPhone}`, '_blank');
  };

  const getCustomerInitials = (firstName: string, lastName: string) => {
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-teal-500 to-teal-600',
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-cyan-500 to-cyan-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="px-4 py-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">العملاء</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredCustomers.length} عميل
          </p>
        </div>
        <button
          onClick={() => navigate('/mobile/customers/new')}
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
          placeholder="بحث في العملاء..."
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

      {/* Customers List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-teal-600">جاري التحميل...</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          title="لا يوجد عملاء"
          description={searchQuery ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإضافة عميل جديد'}
          actionLabel="إضافة عميل"
          onAction={() => navigate('/mobile/customers/new')}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/mobile/customers/${customer.id}`)}
                className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br shadow-lg flex items-center justify-center text-white font-semibold text-lg',
                    getAvatarColor(customer.first_name)
                  )}>
                    {getCustomerInitials(customer.first_name, customer.last_name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {customer.first_name} {customer.last_name}
                    </h3>

                    {/* Contact Info */}
                    <div className="mt-2 space-y-1">
                      {customer.phone_number && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{customer.phone_number}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.qid_number && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <User className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>رقم الهوية: {customer.qid_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2">
                    {customer.phone_number && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(customer.phone_number!);
                        }}
                        className="p-2 rounded-xl bg-green-100 text-green-600 active:scale-90 transition-transform"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    {customer.whatsapp_number && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsApp(customer.whatsapp_number!);
                        }}
                        className="p-2 rounded-xl bg-green-100 text-green-600 active:scale-90 transition-transform"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    )}
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

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction }) => (
  <div className="text-center py-12 px-6">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
      <User className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
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

export default MobileCustomers;
