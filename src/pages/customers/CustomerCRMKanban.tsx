/**
 * صفحة إدارة علاقات العملاء - CRM Kanban (تجريبي)
 * نظام متابعة العملاء مع السحب والإفلات
 * 
 * @component CustomerCRMKanban
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/components/ui/use-toast';
import { differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  Users,
  PhoneCall,
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
  UserPlus,
  Filter,
  Eye,
  PlusCircle,
  MoreHorizontal,
  Smartphone,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Banknote,
  PhoneOff,
  PhoneMissed,
  CheckSquare,
  XCircle,
  RefreshCw,
  GripVertical,
  ArrowRight,
  Inbox,
  UserCheck,
  Settings,
  ThumbsUp,
  Archive,
  Sparkles,
  Target,
  ArrowLeft,
  List,
  FlaskConical,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  crm_stage?: string;
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

interface Invoice {
  id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  due_date: string;
}

// CRM Stages Definition
const CRM_STAGES = [
  { 
    id: 'new', 
    title: 'جديد', 
    icon: Inbox, 
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    description: 'عملاء جدد لم يتم التواصل معهم'
  },
  { 
    id: 'contacted', 
    title: 'تم التواصل', 
    icon: Phone, 
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'تم الاتصال وانتظار الرد'
  },
  { 
    id: 'in_progress', 
    title: 'قيد المتابعة', 
    icon: Settings, 
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'جاري العمل على طلباتهم'
  },
  { 
    id: 'resolved', 
    title: 'تم الحل', 
    icon: CheckCircle, 
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    description: 'تم حل جميع المشاكل'
  },
];

// Draggable Customer Card Component
interface CustomerCardProps {
  customer: Customer;
  contract?: Contract;
  lastContact: number | null;
  followUpCount: number;
  paymentStatus: any;
  onCall: () => void;
  onWhatsApp: () => void;
  onAddNote: () => void;
  isDragging?: boolean;
}

const CustomerCard = ({
  customer,
  contract,
  lastContact,
  followUpCount,
  paymentStatus,
  onCall,
  onWhatsApp,
  onAddNote,
  isDragging,
}: CustomerCardProps) => {
  const customerName = customer.first_name_ar && customer.last_name_ar
    ? `${customer.first_name_ar} ${customer.last_name_ar}`
    : customer.first_name_ar || customer.last_name_ar || customer.customer_code;

  const getInitials = () => {
    const first = customer.first_name_ar?.[0] || '';
    const last = customer.last_name_ar?.[0] || '';
    return `${first}${last}` || 'ع';
  };

  const daysToExpiry = contract ? differenceInDays(new Date(contract.end_date), new Date()) : null;
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
  const needsUrgentCall = lastContact !== null && lastContact > 7;
  const neverContacted = lastContact === null;

  const getContactStatus = () => {
    if (neverContacted) return { text: 'لم يتم الاتصال', color: 'text-purple-600 bg-purple-50', icon: PhoneMissed };
    if (needsUrgentCall) return { text: `منذ ${lastContact} يوم`, color: 'text-red-600 bg-red-50', icon: AlertTriangle };
    if (lastContact && lastContact > 3) return { text: `منذ ${lastContact} أيام`, color: 'text-orange-600 bg-orange-50', icon: Clock };
    return { text: lastContact === 0 ? 'اليوم' : `منذ ${lastContact} يوم`, color: 'text-green-600 bg-green-50', icon: CheckCircle };
  };

  const contactStatus = getContactStatus();
  const ContactIcon = contactStatus.icon;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border-2 p-4 transition-all",
        isDragging 
          ? "shadow-2xl border-blue-400 scale-105 rotate-2 opacity-90" 
          : "border-gray-100 hover:border-blue-200 hover:shadow-lg cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Header with drag handle */}
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300" />
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate">{customerName}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1" dir="ltr">
            <Smartphone className="w-3 h-3" />
            {customer.phone}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {neverContacted && (
          <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">جديد</Badge>
        )}
        {needsUrgentCall && (
          <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">⚠️ عاجل</Badge>
        )}
        {isExpiringSoon && (
          <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">⏰ قريب</Badge>
        )}
        {paymentStatus.label.includes('متأخر') && (
          <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">💰 متأخر</Badge>
        )}
      </div>

      {/* Contract Info */}
      {contract && (
        <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              <FileText className="w-3 h-3 inline ml-1" />
              {contract.contract_number}
            </span>
            {daysToExpiry !== null && (
              <span className={cn(
                "font-medium",
                daysToExpiry <= 7 ? "text-red-600" : 
                daysToExpiry <= 30 ? "text-amber-600" : "text-green-600"
              )}>
                {daysToExpiry > 0 ? `${daysToExpiry} يوم` : 'منتهي'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className={cn("px-2 py-1 rounded-md flex items-center gap-1 text-xs", contactStatus.color)}>
          <ContactIcon className="w-3 h-3" />
          {contactStatus.text}
        </div>
        <div className="text-xs text-gray-500">
          {followUpCount} متابعة
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 mt-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-xs"
                onClick={(e) => { e.stopPropagation(); onCall(); }}
              >
                <Phone className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>اتصال</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 h-8 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 text-xs"
                onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
              >
                <MessageSquare className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>واتساب</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={(e) => { e.stopPropagation(); onAddNote(); }}
              >
                <PlusCircle className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>إضافة ملاحظة</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// Sortable Customer Card Wrapper
const SortableCustomerCard = ({
  customer,
  ...props
}: CustomerCardProps & { customer: Customer }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: customer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CustomerCard customer={customer} {...props} isDragging={isDragging} />
    </div>
  );
};

// Droppable Column Component
interface KanbanColumnProps {
  stage: typeof CRM_STAGES[0];
  customers: Customer[];
  contracts: Contract[];
  followUps: FollowUp[];
  invoices: Invoice[];
  getLastContactDays: (id: string) => number | null;
  getPaymentStatus: (id: string) => any;
  getCustomerContract: (id: string) => Contract | undefined;
  getCustomerFollowUps: (id: string) => FollowUp[];
  onCall: (customer: Customer) => void;
  onWhatsApp: (customer: Customer) => void;
  onAddNote: (customer: Customer) => void;
}

const KanbanColumn = ({
  stage,
  customers,
  getLastContactDays,
  getPaymentStatus,
  getCustomerContract,
  getCustomerFollowUps,
  onCall,
  onWhatsApp,
  onAddNote,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const Icon = stage.icon;

  return (
    <div className="flex flex-col min-w-[320px] max-w-[320px]">
      {/* Column Header */}
      <div className={cn(
        "rounded-t-2xl p-4 border-2 border-b-0",
        stage.lightColor,
        stage.borderColor
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stage.color)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={cn("font-bold", stage.textColor)}>{stage.title}</h3>
              <p className="text-xs text-gray-500">{customers.length} عميل</p>
            </div>
          </div>
          <Badge className={cn("text-xs", stage.lightColor, stage.textColor)}>
            {customers.length}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-2xl border-2 border-t-0 p-3 min-h-[500px] transition-all",
          stage.borderColor,
          isOver ? "bg-blue-50 border-blue-300" : "bg-gray-50/50"
        )}
      >
        <ScrollArea className="h-[calc(100vh-350px)]">
          <SortableContext items={customers.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 pb-4">
              <AnimatePresence>
                {customers.map((customer) => (
                  <motion.div
                    key={customer.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SortableCustomerCard
                      customer={customer}
                      contract={getCustomerContract(customer.id)}
                      lastContact={getLastContactDays(customer.id)}
                      followUpCount={getCustomerFollowUps(customer.id).length}
                      paymentStatus={getPaymentStatus(customer.id)}
                      onCall={() => onCall(customer)}
                      onWhatsApp={() => onWhatsApp(customer)}
                      onAddNote={() => onAddNote(customer)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {customers.length === 0 && (
                <div className={cn(
                  "text-center py-10 rounded-xl border-2 border-dashed",
                  stage.borderColor
                )}>
                  <Icon className={cn("w-10 h-10 mx-auto mb-2 opacity-30", stage.textColor)} />
                  <p className="text-sm text-gray-400">اسحب العملاء هنا</p>
                  <p className="text-xs text-gray-300 mt-1">{stage.description}</p>
                </div>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor,
}: { 
  title: string; 
  value: number | string; 
  icon: any; 
  color: string; 
  bgColor: string;
}) => (
  <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all">
    <div className="flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bgColor)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{title}</p>
      </div>
    </div>
  </div>
);

// Main Component
export default function CustomerCRMKanban() {
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [customerStages, setCustomerStages] = useState<Record<string, string>>({});

  // Form state
  const [followUpForm, setFollowUpForm] = useState({
    type: 'phone' as 'phone' | 'message' | 'meeting' | 'general',
    notes: '',
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch customers
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, customer_code, first_name_ar, last_name_ar, phone, email,
          company_id, is_active, created_at,
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

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['crm-invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('id, customer_id, total_amount, paid_amount, payment_status, due_date')
        .eq('company_id', companyId);
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!companyId,
  });

  // Initialize customer stages
  useEffect(() => {
    if (customers.length > 0 && Object.keys(customerStages).length === 0) {
      const initialStages: Record<string, string> = {};
      customers.forEach(customer => {
        const customerFollowUps = followUps.filter(f => f.customer_id === customer.id);
        const lastContact = customerFollowUps.length > 0 
          ? differenceInDays(new Date(), new Date(customerFollowUps[0].created_at))
          : null;
        
        // Auto-assign stage based on customer status
        if (lastContact === null) {
          initialStages[customer.id] = 'new';
        } else if (lastContact <= 3) {
          // Recently contacted - check if resolved
          const hasRecentImportant = customerFollowUps.some(f => f.is_important);
          if (hasRecentImportant) {
            initialStages[customer.id] = 'in_progress';
          } else {
            initialStages[customer.id] = 'resolved';
          }
        } else if (lastContact <= 7) {
          initialStages[customer.id] = 'contacted';
        } else {
          initialStages[customer.id] = 'in_progress';
        }
      });
      setCustomerStages(initialStages);
    }
  }, [customers, followUps]);

  // Helper functions
  const getCustomerFollowUps = useCallback((customerId: string) => {
    return followUps.filter(f => f.customer_id === customerId);
  }, [followUps]);

  const getLastContactDays = useCallback((customerId: string) => {
    const customerFollowUps = getCustomerFollowUps(customerId);
    if (customerFollowUps.length === 0) return null;
    const lastContact = new Date(customerFollowUps[0].created_at);
    return differenceInDays(new Date(), lastContact);
  }, [getCustomerFollowUps]);

  const getPaymentStatus = useCallback((customerId: string) => {
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId);
    
    if (customerInvoices.length === 0) {
      return { label: 'لا توجد فواتير', bgColor: 'bg-gray-100', textColor: 'text-gray-700', icon: '📝' };
    }

    const totalAmount = customerInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalRemaining = totalAmount - totalPaid;

    const overdueInvoices = customerInvoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < new Date();
    });

    if (totalRemaining === 0) {
      return { label: 'مسدد', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: '✅' };
    }

    if (overdueInvoices.length > 0) {
      return { 
        label: `متأخر (${overdueInvoices.length})`, 
        bgColor: 'bg-red-100', 
        textColor: 'text-red-700', 
        icon: '⚠️',
      };
    }

    return { label: 'مستحق', bgColor: 'bg-orange-100', textColor: 'text-orange-700', icon: '💰' };
  }, [invoices]);

  const getCustomerContract = useCallback((customerId: string) => {
    return contracts.find(c => c.customer_id === customerId && c.status === 'active');
  }, [contracts]);

  // Get customers by stage
  const getCustomersByStage = useCallback((stageId: string) => {
    return customers.filter(c => {
      const stage = customerStages[c.id] || 'new';
      return stage === stageId;
    }).filter(c => {
      if (!searchTerm) return true;
      const fullName = `${c.first_name_ar} ${c.last_name_ar}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) ||
             c.phone?.includes(searchTerm) ||
             c.customer_code?.includes(searchTerm);
    });
  }, [customers, customerStages, searchTerm]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayCalls = followUps.filter(f => 
      f.note_type === 'phone' && 
      new Date(f.created_at) >= todayStart
    ).length;

    const neverContacted = customers.filter(c => {
      const customerFollowUps = followUps.filter(f => f.customer_id === c.id);
      return customerFollowUps.length === 0;
    }).length;

    const overduePayments = customers.filter(c => {
      const status = getPaymentStatus(c.id);
      return status.label.includes('متأخر');
    }).length;

    return {
      total: customers.length,
      todayCalls,
      neverContacted,
      overduePayments,
    };
  }, [customers, followUps, getPaymentStatus]);

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const customerId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a stage column
    const targetStage = CRM_STAGES.find(s => s.id === overId);
    if (targetStage) {
      setCustomerStages(prev => ({
        ...prev,
        [customerId]: targetStage.id,
      }));
      
      const customer = customers.find(c => c.id === customerId);
      toast({
        title: '✅ تم نقل العميل',
        description: `${customer?.first_name_ar || 'العميل'} ← ${targetStage.title}`,
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const customerId = active.id as string;
    const overId = over.id as string;

    // Check if dragged over a different stage
    const targetStage = CRM_STAGES.find(s => s.id === overId);
    if (targetStage) {
      const currentStage = customerStages[customerId];
      if (currentStage !== targetStage.id) {
        setCustomerStages(prev => ({
          ...prev,
          [customerId]: targetStage.id,
        }));
      }
    }
  };

  // Action Handlers
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
        content: `${statusTexts[status]}${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n${notes || 'لا توجد ملاحظات'}`,
        is_important: status !== 'answered',
      });

      if (error) throw error;

      // Move customer to 'contacted' stage after call
      if (status === 'answered') {
        setCustomerStages(prev => ({
          ...prev,
          [callingCustomer.id]: 'contacted',
        }));
      }

      toast({
        title: status === 'answered' ? '✅ تم حفظ المكالمة' : '⚠️ تم تسجيل المحاولة',
      });
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
    } catch (error) {
      console.error('Error saving call:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  // Get active customer for drag overlay
  const activeCustomer = activeId ? customers.find(c => c.id === activeId) : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 rounded-2xl" />
          <div className="flex gap-4 overflow-hidden">
            {[1,2,3,4].map(i => (
              <div key={i} className="min-w-[320px] h-[600px] bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20">
        {/* Test Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 text-center text-sm">
          <FlaskConical className="w-4 h-4 inline ml-2" />
          <span className="font-medium">وضع الاختبار</span> - هذا التصميم تجريبي مع خاصية السحب والإفلات
          <Link to="/customers/crm" className="mr-4 underline hover:no-underline">
            العودة للتصميم الأصلي
          </Link>
        </div>
        
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link to="/customers/crm">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  متابعة العملاء - Kanban
                  <Badge className="bg-purple-100 text-purple-700 text-xs">تجريبي</Badge>
                </h1>
                <p className="text-sm text-gray-500">اسحب العملاء بين المراحل لتتبع حالتهم</p>
              </div>
            </div>

            {/* Stats Mini */}
            <div className="hidden lg:flex items-center gap-3">
              <StatCard title="إجمالي" value={stats.total} icon={Users} color="text-blue-600" bgColor="bg-blue-100" />
              <StatCard title="مكالمات اليوم" value={stats.todayCalls} icon={PhoneCall} color="text-green-600" bgColor="bg-green-100" />
              <StatCard title="متأخر بالدفع" value={stats.overduePayments} icon={AlertTriangle} color="text-red-600" bgColor="bg-red-100" />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="بحث... (اضغط /)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-white border-gray-200"
                />
              </div>
              
              <Link to="/customers/crm">
                <Button 
                  variant="outline" 
                  className="gap-2 bg-white"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">القائمة</span>
                </Button>
              </Link>

              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
                className="bg-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-[1800px] mx-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-4 overflow-x-auto pb-6">
            {CRM_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                customers={getCustomersByStage(stage.id)}
                contracts={contracts}
                followUps={followUps}
                invoices={invoices}
                getLastContactDays={getLastContactDays}
                getPaymentStatus={getPaymentStatus}
                getCustomerContract={getCustomerContract}
                getCustomerFollowUps={getCustomerFollowUps}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onAddNote={handleAddNote}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCustomer && (
              <div className="w-[300px]">
                <CustomerCard
                  customer={activeCustomer}
                  contract={getCustomerContract(activeCustomer.id)}
                  lastContact={getLastContactDays(activeCustomer.id)}
                  followUpCount={getCustomerFollowUps(activeCustomer.id).length}
                  paymentStatus={getPaymentStatus(activeCustomer.id)}
                  onCall={() => {}}
                  onWhatsApp={() => {}}
                  onAddNote={() => {}}
                  isDragging={true}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
          customerName={
            callingCustomer.first_name_ar && callingCustomer.last_name_ar
              ? `${callingCustomer.first_name_ar} ${callingCustomer.last_name_ar}`
              : callingCustomer.first_name_ar || callingCustomer.last_name_ar || callingCustomer.customer_code || 'عميل'
          }
          customerPhone={callingCustomer.phone || ''}
          onSaveCall={handleSaveCall}
        />
      )}
    </div>
  );
}
