/**
 * Customer Split View Component
 * عرض مقسم للعملاء - قائمة على اليمين وتفاصيل على اليسار
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  Car,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CustomerSplitViewProps {
  customers: Customer[];
  isLoading: boolean;
  companyId: string | null;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export const CustomerSplitView: React.FC<CustomerSplitViewProps> = ({
  customers,
  isLoading,
  companyId,
  onEditCustomer,
  onDeleteCustomer,
  canEdit,
  canDelete,
}) => {
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(customer => {
      const name = customer.customer_type === 'individual'
        ? `${customer.first_name || ''} ${customer.last_name || ''} ${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`
        : `${customer.company_name || ''} ${customer.company_name_ar || ''}`;
      
      return name.toLowerCase().includes(term) ||
        customer.phone?.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.customer_code?.toLowerCase().includes(term);
    });
  }, [customers, searchTerm]);

  // Fetch customer details
  const { data: customerDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['customer-details-split', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', selectedCustomer.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer?.id,
  });

  // Fetch contracts for selected customer
  const { data: contracts = [] } = useQuery({
    queryKey: ['customer-contracts-split', selectedCustomer?.id, companyId],
    queryFn: async () => {
      if (!selectedCustomer?.id || !companyId) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          start_date,
          end_date,
          total_amount,
          vehicles:vehicle_id (
            make,
            model,
            plate_number
          )
        `)
        .eq('customer_id', selectedCustomer.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedCustomer?.id && !!companyId,
  });

  // Fetch payments summary
  const { data: paymentsSummary } = useQuery({
    queryKey: ['customer-payments-summary', selectedCustomer?.id, companyId],
    queryFn: async () => {
      if (!selectedCustomer?.id || !companyId) return null;
      
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('customer_id', selectedCustomer.id)
        .eq('company_id', companyId);
      
      if (error) return null;
      
      const total = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const completed = data?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      return { total, completed, pending: total - completed };
    },
    enabled: !!selectedCustomer?.id && !!companyId,
  });

  // Helper functions
  const getCustomerName = (customer: Customer) => {
    if (customer.customer_type === 'individual') {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
             `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() ||
             'غير محدد';
    }
    return customer.company_name || customer.company_name_ar || 'غير محدد';
  };

  const getCustomerInitials = (customer: Customer) => {
    if (customer.customer_type === 'individual') {
      const firstName = customer.first_name || customer.first_name_ar || '';
      const lastName = customer.last_name || customer.last_name_ar || '';
      return (firstName[0] || '') + (lastName[0] || '');
    }
    const companyName = customer.company_name || customer.company_name_ar || '';
    return companyName.substring(0, 2);
  };

  const getStatusBadge = (customer: Customer) => {
    if (customer.is_blacklisted) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">محظور</Badge>;
    }
    if (customer.is_active) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">نشط</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 border-gray-200">غير نشط</Badge>;
  };

  const handleCreateContract = () => {
    if (selectedCustomer) {
      navigate('/contracts', {
        state: {
          selectedCustomerId: selectedCustomer.id,
          autoOpen: true
        }
      });
      toast.success(`جاري إنشاء عقد للعميل: ${getCustomerName(selectedCustomer)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-300px)] gap-4">
        <div className="w-80 space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-300px)] gap-4 bg-[#f0efed] rounded-2xl overflow-hidden">
      {/* Customer List - Right Side */}
      <div className="w-80 bg-white rounded-2xl shadow-sm flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-neutral-100">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="بحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 border-neutral-200 focus:border-coral-500 focus:ring-coral-500 rounded-xl"
            />
          </div>
        </div>

        {/* Customer List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا يوجد عملاء</p>
              </div>
            ) : (
              filteredCustomers.map((customer, index) => (
                <motion.button
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedCustomer(customer)}
                  className={cn(
                    "w-full p-3 rounded-xl text-right transition-all",
                    "hover:bg-neutral-50 group",
                    selectedCustomer?.id === customer.id
                      ? "bg-coral-50 border-2 border-coral-500"
                      : "border-2 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0",
                      customer.customer_type === 'individual' ? "bg-coral-500" : "bg-blue-500"
                    )}>
                      {getCustomerInitials(customer)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-neutral-900 truncate">
                          {getCustomerName(customer)}
                        </p>
                        {getStatusBadge(customer)}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {customer.customer_code || customer.phone || '-'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Customer Count */}
        <div className="p-3 border-t border-neutral-100 text-center">
          <p className="text-sm text-neutral-500">
            {filteredCustomers.length} عميل
          </p>
        </div>
      </div>

      {/* Customer Details - Left Side */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedCustomer ? (
            <motion.div
              key={selectedCustomer.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl",
                        selectedCustomer.customer_type === 'individual' ? "bg-coral-500" : "bg-blue-500"
                      )}>
                        {getCustomerInitials(selectedCustomer)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-900">
                          {getCustomerName(selectedCustomer)}
                        </h2>
                        <p className="text-neutral-500">
                          {selectedCustomer.customer_code || '-'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(selectedCustomer)}
                          <Badge variant="outline" className="border-neutral-200">
                            {selectedCustomer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateContract}
                      className="bg-coral-500 hover:bg-coral-600 text-white rounded-xl shadow-md"
                      style={{ boxShadow: '0 4px 14px rgba(232, 90, 79, 0.3)' }}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء عقد
                    </Button>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-neutral-900">{contracts.length}</p>
                        <p className="text-xs text-neutral-500 mt-1">العقود</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {paymentsSummary?.completed?.toLocaleString('ar-SA') || 0}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">المدفوع</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {paymentsSummary?.pending?.toLocaleString('ar-SA') || 0}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">المتبقي</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-neutral-50 border-0 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-coral-600">
                          {contracts.filter(c => c.status === 'active').length}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">عقود نشطة</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Contact Info */}
                  <Card className="mb-6 border-0 bg-neutral-50 rounded-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-neutral-900">معلومات الاتصال</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-coral-100 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-coral-600" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">رقم الهاتف</p>
                          <p className="font-medium text-neutral-900" dir="ltr">
                            {selectedCustomer.phone || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">البريد الإلكتروني</p>
                          <p className="font-medium text-neutral-900">
                            {selectedCustomer.email || '-'}
                          </p>
                        </div>
                      </div>
                      {selectedCustomer.address && (
                        <div className="flex items-center gap-3 col-span-2">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">العنوان</p>
                            <p className="font-medium text-neutral-900">
                              {selectedCustomer.address}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Contracts */}
                  <Card className="border-0 bg-neutral-50 rounded-xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg text-neutral-900">آخر العقود</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                        className="text-coral-600 hover:text-coral-700 hover:bg-coral-50"
                      >
                        عرض الكل
                        <ChevronLeft className="w-4 h-4 mr-1" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {contracts.length === 0 ? (
                        <div className="text-center py-6 text-neutral-400">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">لا توجد عقود</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contracts.map((contract: any) => (
                            <div
                              key={contract.id}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                  <Car className="w-5 h-5 text-neutral-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">
                                    #{contract.contract_number}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {contract.vehicles?.make} {contract.vehicles?.model}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={cn(
                                  "rounded-full",
                                  contract.status === 'active' && "bg-green-100 text-green-700",
                                  contract.status === 'completed' && "bg-blue-100 text-blue-700",
                                  contract.status === 'cancelled' && "bg-red-100 text-red-700"
                                )}
                              >
                                {contract.status === 'active' ? 'نشط' : 
                                 contract.status === 'completed' ? 'مكتمل' : 'ملغي'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => onEditCustomer(selectedCustomer)}
                      className="border-neutral-200 hover:border-coral-500 hover:text-coral-600 rounded-xl"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      تعديل
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      onClick={() => onDeleteCustomer(selectedCustomer)}
                      className="border-neutral-200 hover:border-red-500 hover:text-red-600 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                  className="bg-coral-500 hover:bg-coral-600 text-white rounded-xl"
                >
                  عرض الصفحة الكاملة
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <User className="w-20 h-20 mx-auto mb-4 text-neutral-200" />
                <h3 className="text-xl font-semibold text-neutral-400 mb-2">اختر عميلاً</h3>
                <p className="text-neutral-400">اختر عميلاً من القائمة لعرض تفاصيله</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerSplitView;

