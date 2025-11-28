/**
 * صفحة إدارة علاقات العملاء - CRM Modern
 * تصميم حديث مستوحى من أفضل أنظمة إدارة المهام
 * 
 * @component CustomerCRMNew
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/components/ui/use-toast';
import { differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
  X,
  GripVertical,
  ArrowRight,
  Upload,
  Download,
  Filter,
  UserPlus,
  Target,
  Headphones,
  ClipboardCheck,
  Settings2,
  Sparkles,
  Zap,
  Mail,
  Star,
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
import { CallDialog } from '@/components/customers/CallDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types
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

interface FollowUp {
  id: string;
  customer_id: string;
  note_type: 'phone' | 'message' | 'meeting' | 'general';
  content: string;
  created_at: string;
  created_by: string;
  is_important: boolean;
  title?: string;
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

// Kanban stages configuration
const KANBAN_STAGES = [
  { id: 'new', label: 'جديد', color: 'bg-blue-500', icon: UserPlus },
  { id: 'contacted', label: 'تم التواصل', color: 'bg-purple-500', icon: PhoneCall },
  { id: 'in_progress', label: 'قيد المعالجة', color: 'bg-amber-500', icon: Clock },
  { id: 'resolved', label: 'تم الحل', color: 'bg-green-500', icon: CheckCircle },
];

// Task tags
const TASK_TAGS = [
  { id: 'request', label: 'طلب معالجة', color: 'bg-slate-800 text-white' },
  { id: 'problem', label: 'حل مشكلة', color: 'bg-slate-100 text-slate-700' },
  { id: 'communication', label: 'تواصل عميل', color: 'bg-slate-100 text-slate-700' },
  { id: 'verification', label: 'اختبار وتحقق', color: 'bg-slate-100 text-slate-700' },
  { id: 'notification', label: 'إشعار عميل', color: 'bg-slate-100 text-slate-700' },
  { id: 'satisfaction', label: 'رضا العميل', color: 'bg-slate-100 text-slate-700' },
];

// Team members (mock data - would come from profiles table)
const TEAM_MEMBERS = [
  { id: '1', name: 'أحمد محمد', avatar: '', initials: 'أم', color: 'bg-blue-500' },
  { id: '2', name: 'سارة علي', avatar: '', initials: 'سع', color: 'bg-pink-500' },
  { id: '3', name: 'محمد خالد', avatar: '', initials: 'مخ', color: 'bg-green-500' },
  { id: '4', name: 'فاطمة أحمد', avatar: '', initials: 'فأ', color: 'bg-purple-500' },
  { id: '5', name: 'عمر حسن', avatar: '', initials: 'عح', color: 'bg-amber-500' },
];

// Task Card Component
const TaskCard = ({ 
  customer, 
  followUp,
  contract,
  onCall,
  onWhatsApp,
  onViewDetails,
  onAddNote,
}: {
  customer: Customer;
  followUp?: FollowUp;
  contract?: Contract;
  onCall: () => void;
  onWhatsApp: () => void;
  onViewDetails: () => void;
  onAddNote: () => void;
}) => {
  const customerName = customer.first_name_ar && customer.last_name_ar
    ? `${customer.first_name_ar} ${customer.last_name_ar}`
    : customer.first_name_ar || customer.last_name_ar || customer.customer_code;

  const getInitials = () => {
    const first = customer.first_name_ar?.[0] || '';
    const last = customer.last_name_ar?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'ع';
  };

  const daysToExpiry = contract ? differenceInDays(new Date(contract.end_date), new Date()) : null;
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{customerName}</h4>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCall}>
              <Phone className="w-4 h-4 ml-2" />
              اتصال
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onWhatsApp}>
              <MessageSquare className="w-4 h-4 ml-2" />
              واتساب
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="w-4 h-4 ml-2" />
              عرض التفاصيل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddNote}>
              <PlusCircle className="w-4 h-4 ml-2" />
              إضافة ملاحظة
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task/Follow-up Content */}
      {followUp && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {followUp.content}
        </p>
      )}

      {/* Contract Info */}
      {contract && (
        <div className={cn(
          "flex items-center gap-2 text-xs mb-3 p-2 rounded-lg",
          isExpiringSoon ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600"
        )}>
          <Calendar className="w-3.5 h-3.5" />
          <span>ينتهي: {format(new Date(contract.end_date), 'd MMM yyyy', { locale: ar })}</span>
          {isExpiringSoon && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
              قريب
            </Badge>
          )}
        </div>
      )}

      {/* Footer with date and actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{followUp ? format(new Date(followUp.created_at), 'dd/MM', { locale: ar }) : 'جديد'}</span>
        </div>
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); onCall(); }}
                >
                  <Phone className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>اتصال</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 text-[#25D366] hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>واتساب</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
};

// Kanban Column Component
const KanbanColumn = ({ 
  stage, 
  customers, 
  followUps,
  contracts,
  onCall,
  onWhatsApp,
  onViewDetails,
  onAddNote,
}: {
  stage: typeof KANBAN_STAGES[0];
  customers: Customer[];
  followUps: FollowUp[];
  contracts: Contract[];
  onCall: (customer: Customer) => void;
  onWhatsApp: (customer: Customer) => void;
  onViewDetails: (customer: Customer) => void;
  onAddNote: (customer: Customer) => void;
}) => {
  const Icon = stage.icon;

  return (
    <div className="flex-1 min-w-[300px] max-w-[350px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", stage.color)} />
          <h3 className="font-semibold text-gray-900">{stage.label}</h3>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs px-2">
            {customers.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <PlusCircle className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* Cards */}
      <div className="space-y-3 min-h-[200px] bg-gray-50/50 rounded-2xl p-3">
        <AnimatePresence>
          {customers.map((customer) => {
            const customerFollowUps = followUps.filter(f => f.customer_id === customer.id);
            const lastFollowUp = customerFollowUps[0];
            const contract = contracts.find(c => c.customer_id === customer.id && c.status === 'active');

            return (
              <TaskCard
                key={customer.id}
                customer={customer}
                followUp={lastFollowUp}
                contract={contract}
                onCall={() => onCall(customer)}
                onWhatsApp={() => onWhatsApp(customer)}
                onViewDetails={() => onViewDetails(customer)}
                onAddNote={() => onAddNote(customer)}
              />
            );
          })}
        </AnimatePresence>

        {customers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد بطاقات</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Stats Circle Component
const StatsCircle = ({ 
  value, 
  label, 
  color,
  size = 'lg'
}: { 
  value: number; 
  label: string; 
  color: string;
  size?: 'sm' | 'lg';
}) => {
  const sizeClasses = size === 'lg' 
    ? 'w-24 h-24 text-2xl' 
    : 'w-16 h-16 text-lg';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn(
        "rounded-full flex items-center justify-center font-bold text-white",
        sizeClasses,
        color
      )}>
        {value}
      </div>
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </div>
  );
};

// Main Component
export default function CustomerCRMNew() {
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'list'>('board');

  // Form state
  const [followUpForm, setFollowUpForm] = useState({
    type: 'phone' as 'phone' | 'message' | 'meeting' | 'general',
    notes: '',
  });

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['crm-customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
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
          contracts!inner (id, status)
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

  // Fetch contracts
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

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter(c =>
      `${c.first_name_ar} ${c.last_name_ar}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.customer_code?.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  // Categorize customers by stage
  const categorizedCustomers = useMemo(() => {
    const result: Record<string, Customer[]> = {
      new: [],
      contacted: [],
      in_progress: [],
      resolved: [],
    };

    filteredCustomers.forEach(customer => {
      const customerFollowUps = followUps.filter(f => f.customer_id === customer.id);
      
      if (customerFollowUps.length === 0) {
        result.new.push(customer);
      } else if (customerFollowUps.some(f => f.is_important)) {
        result.in_progress.push(customer);
      } else if (customerFollowUps.some(f => f.note_type === 'phone')) {
        result.contacted.push(customer);
      } else {
        result.resolved.push(customer);
      }
    });

    return result;
  }, [filteredCustomers, followUps]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const todayCalls = followUps.filter(f => 
      f.note_type === 'phone' && 
      new Date(f.created_at) >= todayStart
    ).length;

    const pending = followUps.filter(f => f.is_important).length;
    const completed = followUps.filter(f => !f.is_important).length;

    return {
      total: customers.length,
      new: categorizedCustomers.new.length,
      contacted: categorizedCustomers.contacted.length,
      inProgress: categorizedCustomers.in_progress.length,
      resolved: categorizedCustomers.resolved.length,
      todayCalls,
      pending,
      completed,
    };
  }, [customers, followUps, categorizedCustomers]);

  // Handlers
  const handleCall = useCallback((customer: Customer) => {
    setCallingCustomer(customer);
    setCallDialogOpen(true);
  }, []);

  const handleWhatsApp = useCallback((customer: Customer) => {
    if (!customer.phone) {
      toast({ title: 'خطأ', description: 'لا يوجد رقم هاتف', variant: 'destructive' });
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  }, [toast]);

  const handleAddNote = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsAddNoteOpen(true);
  }, []);

  const handleSaveFollowUp = async () => {
    if (!selectedCustomer || !companyId) return;
    if (!followUpForm.notes.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال الملاحظات', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: selectedCustomer.id,
        company_id: companyId,
        note_type: followUpForm.type,
        title: `متابعة ${followUpForm.type === 'phone' ? 'مكالمة' : followUpForm.type === 'message' ? 'رسالة' : followUpForm.type === 'meeting' ? 'اجتماع' : 'ملاحظة'}`,
        content: followUpForm.notes,
        is_important: false,
      });

      if (error) throw error;

      toast({ title: '✅ تم الحفظ', description: 'تم حفظ المتابعة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
      setIsAddNoteOpen(false);
      setFollowUpForm({ type: 'phone', notes: '' });
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  const handleSaveCall = async (notes: string, status: 'answered' | 'no_answer' | 'busy') => {
    if (!companyId || !callingCustomer) return;

    try {
      const statusTexts = {
        answered: '✅ تم الرد - ',
        no_answer: '❌ لم يرد - ',
        busy: '📵 مشغول - '
      };

      const { error } = await supabase.from('customer_notes').insert({
        customer_id: callingCustomer.id,
        company_id: companyId,
        note_type: 'phone',
        title: status === 'answered' ? 'مكالمة هاتفية' : 'محاولة اتصال',
        content: `${statusTexts[status]}${notes || 'لا توجد ملاحظات'}`,
        is_important: status !== 'answered',
      });

      if (error) throw error;

      toast({
        title: status === 'answered' ? '✅ تم حفظ المكالمة' : '⚠️ تم تسجيل المحاولة',
      });
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
    } catch (error) {
      console.error('Error saving call:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-[400px] bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title & Team */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">إدارة العملاء</h1>
                <p className="text-sm text-gray-500">New Case Management</p>
              </div>
              
              {/* Team Avatars */}
              <div className="flex items-center -space-x-2">
                {TEAM_MEMBERS.map((member, index) => (
                  <TooltipProvider key={member.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className={cn(
                          "w-9 h-9 border-2 border-white cursor-pointer hover:scale-110 transition-transform",
                          `ring-2 ring-offset-1 ring-${member.color.replace('bg-', '')}/30`
                        )}>
                          <AvatarFallback className={cn(member.color, "text-white text-xs font-bold")}>
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{member.name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                <Button variant="outline" size="sm" className="w-9 h-9 rounded-full border-dashed">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="بحث عن عميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-gray-50 border-0 focus-visible:ring-1"
                />
              </div>
              
              <Button variant="outline" size="icon" className="shrink-0">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                <Upload className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                <Calendar className="w-4 h-4" />
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="w-4 h-4 ml-2" />
                إضافة عميل
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Kanban Board */}
          <div className="col-span-12 xl:col-span-9">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              {/* Task Tags */}
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {TASK_TAGS.map(tag => (
                  <Badge 
                    key={tag.id} 
                    className={cn("cursor-pointer hover:opacity-80 transition-opacity", tag.color)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>

              {/* Kanban Columns */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_STAGES.map(stage => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    customers={categorizedCustomers[stage.id] || []}
                    followUps={followUps}
                    contracts={contracts}
                    onCall={handleCall}
                    onWhatsApp={handleWhatsApp}
                    onViewDetails={(customer) => console.log('View details', customer)}
                    onAddNote={handleAddNote}
                  />
                ))}
              </div>
            </div>

            {/* Knowledge/Activity Table */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-gray-900">آخر النشاطات</h3>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">العميل</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">الحالة</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">التاريخ</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">النوع</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">المسؤول</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.slice(0, 5).map((followUp) => {
                      const customer = customers.find(c => c.id === followUp.customer_id);
                      if (!customer) return null;
                      
                      return (
                        <tr key={followUp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-400" />
                              <span className="font-medium text-gray-900 text-sm">
                                {customer.first_name_ar} {customer.last_name_ar}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={followUp.is_important ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                              {followUp.is_important ? 'قيد المتابعة' : 'مكتمل'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {format(new Date(followUp.created_at), 'yyyy-MM-dd HH:mm')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {followUp.note_type === 'phone' ? 'مكالمة' : 
                             followUp.note_type === 'message' ? 'رسالة' : 
                             followUp.note_type === 'meeting' ? 'اجتماع' : 'ملاحظة'}
                          </td>
                          <td className="py-3 px-4">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-blue-500 text-white text-xs">
                                أم
                              </AvatarFallback>
                            </Avatar>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar - Stats */}
          <div className="col-span-12 xl:col-span-3 space-y-6">
            {/* Ticket Journey */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900">رحلة المتابعة</h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Calendar className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-8">
                <StatsCircle 
                  value={stats.completed} 
                  label="مكتمل" 
                  color="bg-green-500"
                />
                <StatsCircle 
                  value={stats.pending} 
                  label="قيد المتابعة" 
                  color="bg-amber-500"
                />
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
                  <p className="text-xs text-blue-600/70">جديد</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.contacted}</p>
                  <p className="text-xs text-purple-600/70">تم التواصل</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                  <p className="text-xs text-amber-600/70">قيد المعالجة</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                  <p className="text-xs text-green-600/70">تم الحل</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">إجراءات سريعة</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="w-4 h-4 ml-2 text-green-600" />
                  بدء مكالمات اليوم
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 ml-2 text-blue-600" />
                  إرسال تذكيرات جماعية
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 ml-2 text-purple-600" />
                  تقرير المتابعات
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings2 className="w-4 h-4 ml-2 text-gray-600" />
                  إعدادات التذكير
                </Button>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white">
              <h3 className="font-bold mb-4">ملخص اليوم</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">المكالمات</span>
                  <span className="font-bold">{stats.todayCalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">إجمالي العملاء</span>
                  <span className="font-bold">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-100">المتابعات المعلقة</span>
                  <span className="font-bold">{stats.pending}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              إضافة متابعة جديدة
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer && `للعميل: ${selectedCustomer.first_name_ar} ${selectedCustomer.last_name_ar}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع المتابعة</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'phone', icon: Phone, label: 'مكالمة' },
                  { value: 'message', icon: MessageSquare, label: 'رسالة' },
                  { value: 'meeting', icon: Users, label: 'اجتماع' },
                  { value: 'general', icon: FileText, label: 'ملاحظة' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setFollowUpForm(f => ({ ...f, type: value as any }))}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                      followUpForm.type === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    )}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الملاحظات</label>
              <Textarea
                rows={4}
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="اكتب تفاصيل المتابعة..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveFollowUp} className="bg-blue-600 hover:bg-blue-700">
              حفظ المتابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      {callingCustomer && (
        <CallDialog
          open={callDialogOpen}
          onOpenChange={setCallDialogOpen}
          customerName={`${callingCustomer.first_name_ar || ''} ${callingCustomer.last_name_ar || ''}`}
          customerPhone={callingCustomer.phone || ''}
          onSaveCall={handleSaveCall}
        />
      )}
    </div>
  );
}

