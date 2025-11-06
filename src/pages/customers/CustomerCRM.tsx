/**
 * صفحة متابعة العملاء - CRM Follow-up Page
 * نظام شامل لإدارة المتابعات والاتصالات مع العملاء
 * 
 * @component CustomerCRM
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Users,
  PhoneCall,
  Eye,
  PlusCircle,
  MoreHorizontal,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Bell,
  TrendingUp,
  CheckCircle,
  CheckSquare,
  Search,
  Menu,
  Smartphone,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Customer {
  id: string;
  customer_code: string;
  first_name_ar: string;
  last_name_ar: string;
  phone: string;
  email?: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
}

interface FollowUp {
  id: string;
  customer_id: string;
  note_type: 'phone' | 'message' | 'meeting' | 'general';
  content: string;
  created_at: string;
  created_by: string;
  is_important: boolean;
}

interface DashboardStats {
  activeCustomers: number;
  todayCalls: number;
  pendingFollowUps: number;
  completedThisMonth: number;
}

export default function CustomerCRM() {
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('7days');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Form state
  const [followUpForm, setFollowUpForm] = useState({
    type: 'phone' as 'phone' | 'message' | 'meeting' | 'general',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    notes: '',
    actionRequired: '',
    scheduleNext: false,
    nextDate: '',
    nextTime: '',
  });

  // Fetch customers with active contracts only
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['crm-customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Get customers who have active contracts
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          customer_code,
          first_name_ar,
          last_name_ar,
          phone,
          email,
          company_id,
          is_active,
          created_at,
          contracts!inner (
            id,
            status
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('contracts.status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!companyId,
  });

  // Fetch contracts for filtering
  const { data: contracts = [] } = useQuery({
    queryKey: ['crm-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id, status, start_date, end_date, monthly_amount')
        .eq('company_id', companyId);

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!companyId,
  });

  // Fetch follow-ups
  const { data: followUps = [] } = useQuery({
    queryKey: ['customer-follow-ups', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FollowUp[];
    },
    enabled: !!companyId,
  });

  // Calculate dashboard stats
  const stats: DashboardStats = useMemo(() => {
    const activeCustomers = customers.filter(c => c.is_active).length;
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const todayCalls = followUps.filter(f => 
      f.note_type === 'phone' && 
      new Date(f.created_at) >= todayStart
    ).length;

    const pendingFollowUps = followUps.filter(f => f.is_important).length;
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const completedThisMonth = followUps.filter(f => 
      !f.is_important && 
      new Date(f.created_at) >= firstDayOfMonth
    ).length;

    return {
      activeCustomers,
      todayCalls,
      pendingFollowUps,
      completedThisMonth,
    };
  }, [customers, followUps]);

  // Filter and paginate customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        `${c.first_name_ar} ${c.last_name_ar}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.customer_code?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const customerContracts = contracts.filter(ct => 
        filtered.some(c => c.id === ct.customer_id)
      );

      if (statusFilter === 'active') {
        const activeCustomerIds = customerContracts
          .filter(ct => ct.status === 'active')
          .map(ct => ct.customer_id);
        filtered = filtered.filter(c => activeCustomerIds.includes(c.id));
      } else if (statusFilter === 'expiring') {
        const expiringCustomerIds = customerContracts
          .filter(ct => {
            const daysToExpiry = differenceInDays(new Date(ct.end_date), new Date());
            return daysToExpiry > 0 && daysToExpiry <= 30;
          })
          .map(ct => ct.customer_id);
        filtered = filtered.filter(c => expiringCustomerIds.includes(c.id));
      } else if (statusFilter === 'expired') {
        const expiredCustomerIds = customerContracts
          .filter(ct => new Date(ct.end_date) < new Date())
          .map(ct => ct.customer_id);
        filtered = filtered.filter(c => expiredCustomerIds.includes(c.id));
      }
    }

    return filtered;
  }, [customers, searchTerm, statusFilter, contracts]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper functions
  const getCustomerInitials = (customer: Customer) => {
    const first = customer.first_name_ar?.[0] || '';
    const last = customer.last_name_ar?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const getCustomerContract = (customerId: string) => {
    return contracts.find(c => c.customer_id === customerId && c.status === 'active');
  };

  const getCustomerFollowUps = (customerId: string) => {
    return followUps.filter(f => f.customer_id === customerId);
  };

  const getLastContactDays = (customerId: string) => {
    const customerFollowUps = getCustomerFollowUps(customerId);
    if (customerFollowUps.length === 0) return null;

    const lastContact = new Date(customerFollowUps[0].created_at);
    return differenceInDays(new Date(), lastContact);
  };

  const getContractStatus = (contract: Contract | undefined) => {
    if (!contract) return { label: 'لا يوجد عقد', color: 'gray', dotColor: 'bg-gray-400' };

    if (contract.status === 'active') {
      const daysToExpiry = differenceInDays(new Date(contract.end_date), new Date());
      if (daysToExpiry <= 30 && daysToExpiry > 0) {
        return { label: 'قريب الانتهاء', color: 'yellow', dotColor: 'bg-yellow-400' };
      }
      return { label: 'عقد نشط', color: 'green', dotColor: 'bg-green-400' };
    }

    return { label: 'منتهي', color: 'red', dotColor: 'bg-red-400' };
  };

  // Auto-create call note when clicking "Call Now"
  const handleCallNow = async (customer: Customer) => {
    if (!companyId) return;

    try {
      // Create automatic note
      const { data: newNote, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customer.id,
          company_id: companyId,
          note_type: 'phone',
          title: 'مكالمة هاتفية',
          content: `تم إجراء مكالمة هاتفية مع العميل في ${format(new Date(), 'dd/MM/yyyy')} الساعة ${format(new Date(), 'HH:mm')}\n\n[يرجى إضافة تفاصيل المكالمة والاتفاقات...]`,
          is_important: true, // Mark as important so user remembers to edit it
        })
        .select()
        .single();

      if (error) throw error;

      // Initiate the phone call
      window.location.href = `tel:${customer.phone}`;

      // Show toast with edit option
      toast({
        title: '✅ تم تسجيل المكالمة',
        description: 'تم إنشاء ملاحظة تلقائية. يرجى إضافة تفاصيل المكالمة.',
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingNoteId(newNote.id);
              setEditingNoteContent(newNote.content);
              setExpandedCustomer(customer.id);
            }}
          >
            تعديل الآن
          </Button>
        ),
      });
    } catch (error) {
      console.error('Error creating call note:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل المكالمة',
        variant: 'destructive',
      });
    }
  };

  // Update existing note
  const handleUpdateNote = async (noteId: string, newContent: string) => {
    if (!newContent.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال محتوى الملاحظة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_notes')
        .update({
          content: newContent,
          is_important: false, // Remove importance flag after editing
        })
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: '✅ تم التحديث',
        description: 'تم تحديث الملاحظة بنجاح',
      });

      setEditingNoteId(null);
      setEditingNoteContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الملاحظة',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFollowUp = async () => {
    if (!selectedCustomer || !companyId) return;

    if (!followUpForm.notes.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال الملاحظات',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: selectedCustomer.id,
        company_id: companyId,
        note_type: followUpForm.type,
        title: `متابعة ${followUpForm.type === 'phone' ? 'مكالمة' : followUpForm.type === 'message' ? 'رسالة' : followUpForm.type === 'meeting' ? 'اجتماع' : 'ملاحظة'}`,
        content: followUpForm.notes,
        is_important: followUpForm.actionRequired !== '',
      });

      if (error) throw error;

      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ المتابعة بنجاح',
      });

      setIsAddNoteOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ المتابعة',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFollowUpForm({
      type: 'phone',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      notes: '',
      actionRequired: '',
      scheduleNext: false,
      nextDate: '',
      nextTime: '',
    });
  };

  const getFollowUpIcon = (type: string) => {
    switch (type) {
      case 'phone': return Phone;
      case 'message': return MessageSquare;
      case 'meeting': return Users;
      default: return FileText;
    }
  };

  const getFollowUpColor = (type: string) => {
    switch (type) {
      case 'phone': return 'bg-green-100 text-green-600';
      case 'message': return 'bg-blue-100 text-blue-600';
      case 'meeting': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loadingCustomers) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">إدارة العملاء والمتابعات</h1>
          <p className="text-sm text-gray-500 mt-1">نظام إدارة علاقات العملاء (CRM)</p>
        </div>
      </div>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stat Card 1 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">العملاء النشطين</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeCustomers}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% من الشهر الماضي
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">مكالمات اليوم</p>
                <p className="text-3xl font-bold text-gray-900">{stats.todayCalls}</p>
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {Math.max(0, 15 - stats.todayCalls)} متبقية
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <PhoneCall className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">متابعات معلقة</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingFollowUps}</p>
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {Math.floor(stats.pendingFollowUps / 3)} عاجلة
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-7 h-7 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">مكتملة هذا الشهر</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completedThisMonth}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  معدل إنجاز 94%
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckSquare className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filters & Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="بحث عن عميل بالاسم أو رقم الجوال..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10"
                />
              </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex gap-3 w-full lg:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">عقود نشطة</SelectItem>
                  <SelectItem value="expiring">قريبة من الانتهاء</SelectItem>
                  <SelectItem value="expired">منتهية</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">آخر 7 أيام</SelectItem>
                  <SelectItem value="30days">آخر 30 يوم</SelectItem>
                  <SelectItem value="3months">آخر 3 أشهر</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setSelectedCustomer(paginatedCustomers[0]);
                  setIsAddNoteOpen(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlusCircle className="w-5 h-5 ml-2" />
                متابعة جديدة
              </Button>
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="space-y-4">
          {paginatedCustomers.map((customer, index) => {
            const contract = getCustomerContract(customer.id);
            const contractStatus = getContractStatus(contract);
            const customerFollowUps = getCustomerFollowUps(customer.id);
            const lastContactDays = getLastContactDays(customer.id);
            const isExpanded = expandedCustomer === customer.id;
            const daysToExpiry = contract ? differenceInDays(new Date(contract.end_date), new Date()) : null;
            const needsUrgentFollowUp = lastContactDays && lastContactDays > 7 && daysToExpiry && daysToExpiry <= 10;

            return (
              <div
                key={customer.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-green-300 transition-all"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <Avatar className="w-14 h-14">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-lg">
                          {getCustomerInitials(customer)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {customer.first_name_ar} {customer.last_name_ar}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              contractStatus.color === 'green'
                                ? 'bg-green-100 text-green-700'
                                : contractStatus.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-700'
                                : contractStatus.color === 'red'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${contractStatus.dotColor} inline-block ml-1.5`}></span>
                            {contractStatus.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4" />
                            <span className="font-mono" dir="ltr">{customer.phone}</span>
                          </span>
                          {contract && (
                            <>
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                {contract.contract_number}
                              </span>
                              <span className={`flex items-center gap-1.5 ${daysToExpiry && daysToExpiry <= 30 ? 'text-orange-600' : ''}`}>
                                <Calendar className="w-4 h-4" />
                                ينتهي في {format(new Date(contract.end_date), 'd MMMM yyyy', { locale: ar })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Last Contact */}
                    <div className="text-left shrink-0">
                      <p className="text-xs text-gray-500 mb-1">آخر اتصال</p>
                      <p className={`text-sm font-semibold ${lastContactDays && lastContactDays > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                        {lastContactDays !== null ? `منذ ${lastContactDays} ${lastContactDays === 1 ? 'يوم' : 'أيام'}` : 'لا يوجد'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mb-4">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleCallNow(customer)}
                    >
                      <Phone className="w-4 h-4 ml-2" />
                      اتصال الآن
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      {isExpanded ? 'إخفاء السجل' : 'عرض السجل'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsAddNoteOpen(true);
                      }}
                    >
                      <PlusCircle className="w-4 h-4 ml-2" />
                      إضافة ملاحظة
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Recent Activity Summary */}
                  {customerFollowUps.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        آخر المتابعات
                      </h4>
                      <div className="space-y-2">
                        {customerFollowUps.slice(0, 2).map((followUp) => {
                          const Icon = getFollowUpIcon(followUp.note_type);
                          return (
                            <div key={followUp.id} className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getFollowUpColor(followUp.note_type)}`}>
                                <Icon className="w-3 h-3" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-700">
                                  <span className="font-semibold">
                                    {format(new Date(followUp.created_at), 'yyyy-MM-dd')}:
                                  </span>{' '}
                                  {followUp.content?.slice(0, 100)}
                                  {followUp.content && followUp.content.length > 100 ? '...' : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Warning Alert for urgent follow-ups */}
                  {needsUrgentFollowUp && (
                    <div className="bg-red-50 border-r-4 border-red-500 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-red-900 mb-1">يحتاج متابعة عاجلة</p>
                          <p className="text-sm text-red-700">
                            لم يتم الاتصال منذ {lastContactDays} يوم - العقد ينتهي خلال {daysToExpiry} أيام
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsAddNoteOpen(true);
                          }}
                        >
                          اتصال الآن
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Pending Follow-up Alert */}
                  {!needsUrgentFollowUp && customerFollowUps.some(f => f.is_important) && (
                    <div className="bg-orange-50 border-r-4 border-orange-500 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                          <Bell className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-orange-900 mb-1">متابعة معلقة</p>
                          <p className="text-sm text-orange-700">
                            {customerFollowUps.find(f => f.is_important)?.content?.slice(0, 80)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          تأكيد
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expandable Details - Timeline */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-gray-200 pt-4 animate-in slide-in-from-top">
                      <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-600" />
                        سجل المتابعات الكامل
                      </h4>
                      {customerFollowUps.length > 0 ? (
                        <div className="space-y-4 relative">
                          {/* Timeline Line */}
                          <div className="absolute top-0 bottom-0 right-[15px] w-0.5 bg-gray-200"></div>

                          {customerFollowUps.map((followUp) => {
                            const Icon = getFollowUpIcon(followUp.note_type);
                            const typeColor = followUp.note_type === 'phone' ? 'green' : followUp.note_type === 'message' ? 'blue' : followUp.note_type === 'meeting' ? 'purple' : 'gray';
                            const isEditing = editingNoteId === followUp.id;

                            return (
                              <div key={followUp.id} className="flex gap-4 relative hover:translate-x-2 transition-transform">
                                <div className={`w-8 h-8 rounded-full bg-${typeColor}-600 flex items-center justify-center text-white shrink-0 relative z-10 shadow-sm`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold text-gray-900">
                                        {followUp.note_type === 'phone' ? 'مكالمة هاتفية' : 
                                         followUp.note_type === 'message' ? 'رسالة SMS' : 
                                         followUp.note_type === 'meeting' ? 'اجتماع' : 'ملاحظة'}
                                      </span>
                                      {followUp.is_important && (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                                          يحتاج تعديل
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {format(new Date(followUp.created_at), 'yyyy-MM-dd | HH:mm')}
                                      </span>
                                      {!isEditing ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingNoteId(followUp.id);
                                            setEditingNoteContent(followUp.content);
                                          }}
                                          className="h-7 px-2"
                                        >
                                          <FileText className="w-3 h-3 ml-1" />
                                          تعديل
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingNoteId(null);
                                            setEditingNoteContent('');
                                          }}
                                          className="h-7 px-2"
                                        >
                                          <X className="w-3 h-3 ml-1" />
                                          إلغاء
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                    <p className="text-sm text-gray-800 mb-2"><strong>💬 الملاحظات:</strong></p>
                                    {!isEditing ? (
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{followUp.content}</p>
                                    ) : (
                                      <div className="space-y-2">
                                        <Textarea
                                          rows={5}
                                          value={editingNoteContent}
                                          onChange={(e) => setEditingNoteContent(e.target.value)}
                                          className="text-sm resize-none"
                                          placeholder="أضف تفاصيل المكالمة..."
                                        />
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingNoteId(null);
                                              setEditingNoteContent('');
                                            }}
                                          >
                                            إلغاء
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleUpdateNote(followUp.id, editingNoteContent)}
                                          >
                                            <CheckCircle className="w-3 h-3 ml-1" />
                                            حفظ التعديلات
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-center py-8">سجل المتابعات فارغ. قم بإضافة أول متابعة.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </main>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PlusCircle className="w-6 h-6 text-green-600" />
              إضافة متابعة جديدة
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer && `للعميل: ${selectedCustomer.first_name_ar} ${selectedCustomer.last_name_ar}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Communication Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">نوع المتابعة</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'phone', icon: Phone, label: 'مكالمة' },
                  { value: 'message', icon: MessageSquare, label: 'رسالة' },
                  { value: 'meeting', icon: Users, label: 'اجتماع' },
                  { value: 'general', icon: FileText, label: 'ملاحظة' },
                ].map(({ value, icon: Icon, label }) => (
                  <label
                    key={value}
                    className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      followUpForm.type === value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="commType"
                      value={value}
                      checked={followUpForm.type === value}
                      onChange={(e) => setFollowUpForm(f => ({ ...f, type: e.target.value as any }))}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">التاريخ</label>
                <Input
                  type="date"
                  value={followUpForm.date}
                  onChange={(e) => setFollowUpForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الوقت</label>
                <Input
                  type="time"
                  value={followUpForm.time}
                  onChange={(e) => setFollowUpForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الملاحظات والتفاصيل</label>
              <Textarea
                rows={6}
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="اكتب تفاصيل المتابعة هنا...&#10;&#10;مثال:&#10;- تم مناقشة تجديد العقد&#10;- العميل مهتم بترقية الباقة&#10;- طلب عرض سعر خاص"
                className="resize-none"
              />
            </div>

            {/* Action Required */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">الإجراء المطلوب (اختياري)</label>
              <Select
                value={followUpForm.actionRequired}
                onValueChange={(value) => setFollowUpForm(f => ({ ...f, actionRequired: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">لا يوجد</SelectItem>
                  <SelectItem value="quote">إعداد عرض سعر</SelectItem>
                  <SelectItem value="contract">تجهيز عقد جديد</SelectItem>
                  <SelectItem value="payment">متابعة الدفعة</SelectItem>
                  <SelectItem value="maintenance">جدولة صيانة</SelectItem>
                  <SelectItem value="renewal">تجديد العقد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Follow-up */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followUpForm.scheduleNext}
                  onChange={(e) => setFollowUpForm(f => ({ ...f, scheduleNext: e.target.checked }))}
                  className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-semibold text-gray-900">جدولة متابعة قادمة</span>
              </label>
              {followUpForm.scheduleNext && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">تاريخ المتابعة</label>
                    <Input
                      type="date"
                      value={followUpForm.nextDate}
                      onChange={(e) => setFollowUpForm(f => ({ ...f, nextDate: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">وقت المتابعة</label>
                    <Input
                      type="time"
                      value={followUpForm.nextTime}
                      onChange={(e) => setFollowUpForm(f => ({ ...f, nextTime: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveFollowUp}
              className="bg-green-600 hover:bg-green-700"
            >
              حفظ المتابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
