import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLegalCases, useLegalCaseStats, LegalCase } from '@/hooks/useLegalCases';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Scale, 
  Search, 
  Plus, 
  FileText, 
  AlertCircle,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  Zap,
  LayoutDashboard,
  Folder,
  Settings,
  Download,
  Filter,
  CalendarDays,
  Car,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Printer,
  Gavel,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format, addDays, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import LegalCaseCreationWizard from '@/components/legal/LegalCaseCreationWizard';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import EnhancedLegalNoticeGenerator from '@/components/legal/EnhancedLegalNoticeGenerator';
import DelinquentCustomersTab from '@/components/legal/DelinquentCustomersTab';

// --- Constants ---
const CHART_COLORS = {
  red: '#E55B5B',
  blue: '#60A5FA',
  yellow: '#FCD34D',
  green: '#4ADE80',
  orange: '#F97316',
  purple: '#A78BFA',
};

// --- Status Badge Component ---
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let style = "bg-gray-100 text-gray-600";
  const s = status || '';
  if (s.includes("حكم") || s.includes("تنفيذ") || s === "closed" || s === "won") {
    style = "bg-green-100 text-green-700";
  } else if (s.includes("جاري") || s.includes("جلسة") || s.includes("شرطة") || s === "active") {
    style = "bg-blue-100 text-blue-700";
  } else if (s.includes("خبير") || s.includes("تحقيق") || s === "on_hold" || s === "suspended") {
    style = "bg-yellow-100 text-yellow-700";
  } else if (s === "urgent" || s === "high") {
    style = "bg-red-100 text-red-700";
  }
  
  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      active: 'نشطة',
      closed: 'مغلقة',
      suspended: 'معلقة',
      on_hold: 'قيد الانتظار',
      won: 'تم الكسب',
      lost: 'تم الخسارة',
      settled: 'تم التسوية',
    };
    return labels[s] || s;
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style}`}>
      {getStatusLabel(s)}
    </span>
  );
};

// --- Tab Button Component ---
interface TabButtonProps {
  id: string;
  label: string;
  icon: React.ElementType;
  activeTab: string;
  onClick: (id: string) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={cn(
      "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2",
      activeTab === id
        ? 'border-[#E55B5B] text-[#E55B5B] bg-red-50/50'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    )}
  >
    <Icon size={18} />
    <span className="hidden sm:inline">{label}</span>
  </button>
);

// --- KPI Card Component ---
interface KPICardProps {
  title: string;
  value: string | number;
  subValue: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  color: string;
  textColor: string;
  progressColor: string;
  barValue: number;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subValue,
  change,
  isPositive = true,
  icon: Icon,
  color,
  textColor,
  progressColor,
  barValue,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg ${color} bg-opacity-10`}>
        <Icon size={22} className={textColor} />
      </div>
      {change && (
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        )}>
          {change}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-gray-500 text-xs font-medium mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-bold text-gray-800">{value}</h2>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{subValue}</p>
    </div>
    <div className="w-full bg-gray-50 rounded-full h-1 mt-4 overflow-hidden">
      <div
        className={`h-full rounded-full ${progressColor}`}
        style={{ width: `${barValue}%` }}
      />
    </div>
  </motion.div>
);

// --- Main Component ---
export const LegalCasesTracking: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('view') || 'dashboard';
  const setActiveTab = (tab: string) => setSearchParams({ view: tab });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCaseWizard, setShowCaseWizard] = useState(false);
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  
  // Case details and editing states
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<LegalCase | null>(null);

  const { companyId, isLoading: isLoadingCompany } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  
  // Delete case mutation
  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase
        .from('legal_cases')
        .delete()
        .eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] });
      toast.success('تم حذف القضية بنجاح');
      setShowDeleteDialog(false);
      setCaseToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`فشل في حذف القضية: ${error.message}`);
    },
  });

  // Handlers for case actions
  const handleViewDetails = useCallback((legalCase: LegalCase) => {
    setSelectedCase(legalCase);
    setShowCaseDetails(true);
  }, []);

  const handleEditCase = useCallback((legalCase: LegalCase) => {
    // TODO: Implement full edit functionality
    toast.info(`تعديل القضية ${legalCase.case_number}`, {
      description: 'سيتم تفعيل هذه الميزة قريباً'
    });
  }, []);

  const handleDeleteCase = useCallback((legalCase: LegalCase) => {
    setCaseToDelete(legalCase);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (caseToDelete) {
      deleteCaseMutation.mutate(caseToDelete.id);
    }
  }, [caseToDelete, deleteCaseMutation]);

  const { data: casesResponse, isLoading, error } = useLegalCases(
    {
      case_status: statusFilter !== 'all' ? statusFilter : undefined,
      case_type: typeFilter !== 'all' ? typeFilter : undefined,
      search: searchTerm || undefined,
      page: currentPage,
      pageSize,
    }
  );

  const { data: stats, isLoading: isLoadingStats } = useLegalCaseStats();

  const cases = casesResponse?.data || [];
  const totalCases = casesResponse?.count || 0;
  const totalPages = Math.ceil(totalCases / pageSize);

  // Calculate KPI data
  const kpiData = useMemo(() => {
    const activeCases = stats?.active || 0;
    const totalValue = stats?.totalValue || 0;
    const highPriority = stats?.highPriority || 0;
    const closedCases = stats?.closed || 0;
    
    return [
      {
        title: "إجمالي المطالبات",
        value: formatCurrency(totalValue),
        subValue: "تعويضات وحوادث وإيجارات",
        change: "+12%",
        isPositive: true,
        icon: DollarSign,
        color: "bg-[#FCD34D]",
        textColor: "text-[#D97706]",
        progressColor: "bg-[#FCD34D]",
        barValue: 45,
      },
      {
        title: "القضايا النشطة",
        value: activeCases.toString(),
        subValue: `من أصل ${stats?.total || 0} قضية`,
        change: "+5%",
        isPositive: false,
        icon: Gavel,
        color: "bg-[#60A5FA]",
        textColor: "text-[#2563EB]",
        progressColor: "bg-[#60A5FA]",
        barValue: stats?.total ? (activeCases / stats.total) * 100 : 0,
      },
      {
        title: "قضايا عالية الأولوية",
        value: highPriority.toString(),
        subValue: "تحتاج متابعة فورية",
        change: "-2%",
        isPositive: true,
        icon: AlertTriangle,
        color: "bg-[#F87171]",
        textColor: "text-[#DC2626]",
        progressColor: "bg-[#F87171]",
        barValue: stats?.total ? (highPriority / stats.total) * 100 : 60,
      },
      {
        title: "القضايا المغلقة",
        value: closedCases.toString(),
        subValue: "تم حلها بنجاح",
        change: "مهم",
        isPositive: true,
        icon: CheckCircle2,
        color: "bg-[#4ADE80]",
        textColor: "text-[#16A34A]",
        progressColor: "bg-[#4ADE80]",
        barValue: stats?.total ? (closedCases / stats.total) * 100 : 80,
      },
    ];
  }, [stats]);

  // Financial data for chart - Real data from cases
  const financialData = useMemo(() => {
    if (!cases || cases.length === 0) {
      return [];
    }

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlyData: Record<number, { claimed: number; recovered: number }> = {};
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (now.getMonth() - i + 12) % 12;
      monthlyData[monthIndex] = { claimed: 0, recovered: 0 };
    }

    // Aggregate data by month
    cases.forEach(legalCase => {
      const createdDate = new Date(legalCase.created_at);
      const monthIndex = createdDate.getMonth();
      
      // Only include if within the last 6 months
      const monthsAgo = (now.getMonth() - monthIndex + 12) % 12;
      if (monthsAgo < 6 || (now.getMonth() < monthIndex && now.getMonth() + 12 - monthIndex < 6)) {
        if (!monthlyData[monthIndex]) {
          monthlyData[monthIndex] = { claimed: 0, recovered: 0 };
        }
        
        // Add case_value to claimed
        const caseValue = parseFloat(String(legalCase.case_value || 0));
        monthlyData[monthIndex].claimed += caseValue;
        
        // If case is closed/settled/won, add to recovered
        const closedStatuses = ['closed', 'won', 'settled'];
        if (closedStatuses.includes(legalCase.case_status || '')) {
          monthlyData[monthIndex].recovered += caseValue;
        }
      }
    });

    // Convert to array format for chart
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (now.getMonth() - i + 12) % 12;
      result.push({
        name: monthNames[monthIndex],
        claimed: monthlyData[monthIndex]?.claimed || 0,
        recovered: monthlyData[monthIndex]?.recovered || 0,
      });
    }
    
    return result;
  }, [cases]);

  // Case types data for pie chart
  const caseTypesData = useMemo(() => {
    if (!stats) return [];
    const byType = stats.byType || {};
    return [
      { name: 'قضايا مدنية', value: byType.civil || 0, color: CHART_COLORS.red },
      { name: 'قضايا تجارية', value: byType.commercial || 0, color: CHART_COLORS.blue },
      { name: 'قضايا جنائية', value: byType.criminal || 0, color: CHART_COLORS.yellow },
      { name: 'قضايا عمالية', value: byType.labor || 0, color: CHART_COLORS.green },
      { name: 'قضايا إدارية', value: byType.administrative || 0, color: CHART_COLORS.purple },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Generate upcoming hearings from cases
  const upcomingHearings = useMemo(() => {
    if (!cases || cases.length === 0) return [];
    const today = new Date();
    
    return cases
      .filter(c => c.case_status === 'active')
      .slice(0, 5)
      .map((c, index) => {
        const hearingDate = addDays(new Date(c.created_at), 45 + (index * 7));
        return {
          date: format(hearingDate, 'yyyy-MM-dd'),
          time: `0${9 + index}:00 ص`,
          caseId: c.case_number,
          title: c.case_title_ar || c.case_title || 'جلسة محكمة',
          location: 'المحكمة المدنية',
          daysUntil: differenceInDays(hearingDate, today),
        };
      })
      .filter(h => h.daysUntil >= 0 && h.daysUntil <= 30);
  }, [cases]);

  const handleCaseCreated = () => {
    setShowCaseWizard(false);
    toast.success('تم إنشاء القضية بنجاح');
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      civil: 'مدنية',
      criminal: 'جنائية',
      commercial: 'تجارية',
      labor: 'عمالية',
      administrative: 'إدارية',
      rental_dispute: 'نزاع إيجار',
      accident: 'حادث',
      theft: 'سرقة',
      traffic_violation: 'مخالفة مرورية',
      payment_default: 'تخلف عن سداد',
    };
    return labels[type] || type;
  };

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <LoadingSpinner />
      </div>
    );
  }

  // --- Dashboard View ---
  const DashboardView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiData.map((stat, index) => (
          <KPICard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-gray-800">التحليل المالي للقضايا (التعويضات vs المطالبات)</h3>
            <Badge variant="outline" className="text-xs">
              آخر 6 أشهر
            </Badge>
          </div>
          <div className="h-72">
            {financialData.length > 0 && financialData.some(d => d.claimed > 0 || d.recovered > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="claimed" name="إجمالي المطالبات" fill="#FCA5A5" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="recovered" name="تم تحصيله" fill="#4ADE80" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <DollarSign size={48} className="mb-3 opacity-50" />
                <p className="text-sm font-medium">لا توجد بيانات مالية بعد</p>
                <p className="text-xs mt-1">قم بإضافة قيم المطالبات في القضايا</p>
              </div>
            )}
          </div>
        </div>

        {/* Case Types Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-6">أنواع القضايا</h3>
          {caseTypesData.length > 0 ? (
            <>
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={caseTypesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {caseTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'قضية']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-3xl font-bold text-gray-800">{stats?.total || 0}</span>
                  <span className="text-xs text-gray-400">قضية</span>
                </div>
              </div>
              <div className="space-y-3 mt-2">
                {caseTypesData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400">
              لا توجد بيانات متاحة
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-500" />
              مركبات في قضايا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{cases.length || 0}</div>
            <p className="text-xs text-gray-400">مركبة مرتبطة بقضايا قانونية</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              عملاء متأثرين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {new Set(cases.map(c => c.client_id).filter(Boolean)).size}
            </div>
            <p className="text-xs text-gray-400">عميل لديه قضايا</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              الجلسات القادمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{upcomingHearings.length}</div>
            <p className="text-xs text-gray-400">جلسة خلال الشهر</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // --- Cases List View ---
  const CasesListView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              type="text"
              placeholder="بحث برقم اللوحة، اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E55B5B]/20 focus:border-[#E55B5B]"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-100"
          >
            <Filter size={16} />
            <span>تصفية</span>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50"
          >
            <Download size={16} />
            <span>تصدير</span>
          </Button>
          <Button
            onClick={() => setShowCaseWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E55B5B] text-white rounded-lg text-sm hover:bg-[#d64545] shadow-sm"
          >
            <Plus size={16} />
            <span>تسجيل قضية جديدة</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-100 overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                  <SelectItem value="suspended">معلقة</SelectItem>
                  <SelectItem value="on_hold">قيد الانتظار</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="civil">مدنية</SelectItem>
                  <SelectItem value="criminal">جنائية</SelectItem>
                  <SelectItem value="commercial">تجارية</SelectItem>
                  <SelectItem value="labor">عمالية</SelectItem>
                  <SelectItem value="administrative">إدارية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
              <TableHead className="px-6 py-4 font-medium w-10">
                <input type="checkbox" className="rounded border-gray-300 text-[#E55B5B] focus:ring-[#E55B5B]" />
              </TableHead>
              <TableHead className="px-6 py-4 font-medium">رقم الملف</TableHead>
              <TableHead className="px-6 py-4 font-medium">العميل</TableHead>
              <TableHead className="px-6 py-4 font-medium">نوع القضية</TableHead>
              <TableHead className="px-6 py-4 font-medium">المطالبة</TableHead>
              <TableHead className="px-6 py-4 font-medium">الحالة</TableHead>
              <TableHead className="px-6 py-4 font-medium">تاريخ الإنشاء</TableHead>
              <TableHead className="px-6 py-4 font-medium"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : cases.length > 0 ? (
              cases.map((item) => (
                <TableRow key={item.id} className="hover:bg-[#FFF5F5] transition-colors group">
                  <TableCell className="px-6 py-4">
                    <input type="checkbox" className="rounded border-gray-300 text-[#E55B5B] focus:ring-[#E55B5B]" />
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-gray-800">{item.case_number}</TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-medium text-gray-800">{item.client_name || 'غير محدد'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.case_title_ar || item.case_title}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-gray-700 bg-gray-50 px-2 py-1 rounded text-xs border border-gray-100">
                      {getTypeLabel(item.case_type)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-800">
                    {formatCurrency(item.total_costs)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <StatusBadge status={item.case_status} />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-500">
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-[#E55B5B] p-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={() => handleViewDetails(item as LegalCase)}
                        >
                          <Eye size={14} />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onClick={() => handleEditCase(item as LegalCase)}
                        >
                          <Edit size={14} />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 text-red-600 cursor-pointer"
                          onClick={() => handleDeleteCase(item as LegalCase)}
                        >
                          <Trash2 size={14} />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-4">
                    <Folder className="w-12 h-12 text-gray-300" />
                    <p>لا توجد قضايا حالياً</p>
                    <Button onClick={() => setShowCaseWizard(true)} variant="outline" className="gap-2">
                      <Plus size={16} />
                      إنشاء قضية جديدة
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>عرض {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCases)} من أصل {totalCases} قضية</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </Button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? 'bg-[#E55B5B] text-white border-[#E55B5B]' : ''}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // --- Calendar View ---
  const CalendarView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800">جدول الجلسات</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Printer size={18} />
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              اليوم
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {upcomingHearings.length > 0 ? (
            upcomingHearings.map((event, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#E55B5B]/30 hover:shadow-sm transition-all bg-white"
              >
                <div className="flex flex-col items-center justify-center bg-red-50 text-[#E55B5B] rounded-lg w-16 h-16 shrink-0">
                  <span className="text-xs font-medium">
                    {event.date.split('-')[1]} / {event.date.split('-')[0]}
                  </span>
                  <span className="text-xl font-bold">{event.date.split('-')[2]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800">{event.title}</h4>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-[#E55B5B] font-medium">{event.caseId}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">{event.location}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="self-center">
                  التفاصيل
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد جلسات قادمة</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Next Hearing Card */}
        {upcomingHearings.length > 0 && (
          <div className="bg-[#E55B5B] text-white rounded-xl p-6 shadow-lg shadow-red-200">
            <h3 className="font-bold text-lg mb-1">الجلسة القادمة</h3>
            <p className="text-red-100 text-sm mb-4">
              باقي {upcomingHearings[0]?.daysUntil || 0} يوم
            </p>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm mb-4 border border-white/20">
              <div className="text-2xl font-bold mb-1">
                {upcomingHearings[0]?.date.split('-')[2]}
              </div>
              <div className="text-sm opacity-90">
                {format(new Date(upcomingHearings[0]?.date || new Date()), 'MMMM، yyyy', { locale: ar })}
              </div>
              <div className="mt-2 text-sm font-medium">{upcomingHearings[0]?.title}</div>
            </div>
            <Button
              variant="secondary"
              className="w-full py-2.5 bg-white text-[#E55B5B] rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
            >
              عرض تفاصيل القضية
            </Button>
          </div>
        )}

        {/* Tasks Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">تذكيرات المهام</h3>
          <div className="space-y-3">
            {['تجديد تأمين مركبة (قضية 001)', 'سداد رسوم فحص فني', 'مراجعة تقرير الشرطة'].map((task, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center cursor-pointer",
                    i === 0 ? 'bg-[#E55B5B] border-[#E55B5B] text-white' : 'border-gray-300'
                  )}
                >
                  {i === 0 && <CheckCircle2 size={12} />}
                </div>
                <span className={cn("text-sm", i === 0 ? 'text-gray-400 line-through' : 'text-gray-600')}>
                  {task}
                </span>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full mt-4 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
          >
            + إضافة مهمة جديدة
          </Button>
        </div>
      </div>
    </div>
  );

  // --- Settings View ---
  const SettingsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle>الإنشاء التلقائي للقضايا</CardTitle>
          <CardDescription>
            إعداد المحفزات التلقائية لإنشاء قضايا قانونية عند حدوث شروط معينة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutoCreateCaseTriggersConfig
            open={true}
            onOpenChange={() => {}}
            companyId={companyId || ''}
            embedded={true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مولد الإنذارات القانونية</CardTitle>
          <CardDescription>
            إنشاء إنذارات قانونية احترافية تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedLegalNoticeGenerator
            companyId={companyId || ''}
            onDocumentGenerated={(document) => {
              toast.success('تم إنشاء المستند بنجاح');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );

  // --- Finance View ---
  const FinanceView = () => (
    <DelinquentCustomersTab />
  );

  // --- Main Render ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'cases':
        return <CasesListView />;
      case 'calendar':
        return <CalendarView />;
      case 'finance':
        return <FinanceView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] font-sans text-right pb-10" dir="rtl">
      {/* Sub-System Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#E55B5B] p-2.5 rounded-lg shadow-sm shadow-red-200">
              <Gavel className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">الشؤون القانونية</h1>
              <p className="text-xs text-gray-500">إدارة نزاعات وحوادث تأجير السيارات</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowTriggersConfig(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">الإنشاء التلقائي</span>
            </Button>
            <Button
              onClick={() => setShowCaseWizard(true)}
              size="sm"
              className="gap-2 bg-[#E55B5B] hover:bg-[#d64545]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">قضية جديدة</span>
            </Button>
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-gray-700">
                {user?.full_name || user?.email?.split('@')[0] || 'المستخدم'}
              </span>
              <span className="text-xs text-gray-400">مدير النظام</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <TabButton id="dashboard" label="نظرة عامة" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="cases" label="سجل القضايا" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="calendar" label="الجلسات والمواعيد" icon={CalendarDays} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="finance" label="العملاء المتأخرون" icon={TrendingUp} activeTab={activeTab} onClick={setActiveTab} />
          <TabButton id="settings" label="الإعدادات" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Case Creation Wizard Dialog */}
      <LegalCaseCreationWizard
        open={showCaseWizard}
        onOpenChange={setShowCaseWizard}
        onSuccess={handleCaseCreated}
      />


      {/* Triggers Config Dialog */}
      <AutoCreateCaseTriggersConfig
        open={showTriggersConfig}
        onOpenChange={setShowTriggersConfig}
        companyId={companyId || ''}
      />

      {/* Case Details Dialog */}
      <Dialog open={showCaseDetails} onOpenChange={setShowCaseDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#E55B5B]" />
              تفاصيل القضية: {selectedCase?.case_number}
            </DialogTitle>
            <DialogDescription>
              {selectedCase?.case_title_ar || selectedCase?.case_title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-6">
              {/* Case Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">رقم القضية</p>
                  <p className="font-medium">{selectedCase.case_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">نوع القضية</p>
                  <p className="font-medium">{getTypeLabel(selectedCase.case_type)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">الحالة</p>
                  <StatusBadge status={selectedCase.case_status} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">قيمة المطالبة</p>
                  <p className="font-medium text-lg text-[#E55B5B]">{formatCurrency(selectedCase.total_costs)}</p>
                </div>
              </div>

              {/* Client Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  معلومات العميل
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">اسم العميل</p>
                    <p className="font-medium">{selectedCase.client_name || 'غير محدد'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">الوصف</h4>
                  <p className="text-gray-600 text-sm">{selectedCase.description}</p>
                </div>
              )}

              {/* Dates */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  التواريخ
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
                    <p className="font-medium">
                      {format(new Date(selectedCase.created_at), 'dd MMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCaseDetails(false)}
            >
              إغلاق
            </Button>
            <Button
              onClick={() => {
                if (selectedCase) {
                  setShowCaseDetails(false);
                  handleEditCase(selectedCase);
                }
              }}
              className="bg-[#E55B5B] hover:bg-[#d64545]"
            >
              <Edit className="w-4 h-4 ml-2" />
              تعديل القضية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد حذف القضية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف القضية <strong>{caseToDelete?.case_number}</strong>؟
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCaseMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCaseMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LegalCasesTracking;
