import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useLegalCases, useLegalCaseStats, useLegalCase } from '@/hooks/useLegalCases';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
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
  TrendingDown,
  DollarSign,
  Clock,
  FileClock,
  Users,
  Zap,
  HelpCircle,
  LayoutDashboard,
  Folder,
  FileSearch,
  CalendarClock,
  Mail,
  Handshake,
  UserX,
  ChevronRight,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { HelpIcon } from '@/components/help/HelpIcon';
import DelinquentCustomersTab from '@/components/legal/DelinquentCustomersTab';
import LegalCaseCreationWizard from '@/components/legal/LegalCaseCreationWizard';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import CaseStatusManager from '@/components/legal/CaseStatusManager';
import CaseTimeline, { type TimelineEntry } from '@/components/legal/CaseTimeline';
import TimelineEntryDialog from '@/components/legal/TimelineEntryDialog';
import EnhancedLegalNoticeGenerator from '@/components/legal/EnhancedLegalNoticeGenerator';
import CaseDashboard from '@/components/legal/CaseDashboard';
import CaseListTable from '@/components/legal/CaseListTable';
import DeadlineAlerts from '@/components/legal/DeadlineAlerts';
import SettlementProposal from '@/components/legal/SettlementProposal';
import SettlementTracking from '@/components/legal/SettlementTracking';
import SettlementCompliance from '@/components/legal/SettlementCompliance';

// Import custom animations
import '@/styles/legal-cases-animations.css';

export const LegalCasesTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cases');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCaseWizard, setShowCaseWizard] = useState(false);
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);
  const [caseTimeline, setCaseTimeline] = useState<TimelineEntry[]>([
    {
      id: '1',
      type: 'auto',
      category: 'case_created',
      title: 'Case Created',
      description: 'Legal case was created and added to the system',
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      performedBy: 'System',
    },
  ]);

  const { data: cases, isLoading, error } = useLegalCases({
    case_status: statusFilter !== 'all' ? statusFilter : undefined,
    case_type: typeFilter !== 'all' ? typeFilter : undefined,
    search: searchTerm || undefined,
  });

  const { data: stats } = useLegalCaseStats();
  const { data: selectedCaseData } = useLegalCase(selectedCaseId || '');
  const { companyId } = useUnifiedCompanyAccess();

  const getCaseStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      active: { label: 'نشطة', class: 'status-active' },
      closed: { label: 'مغلقة', class: 'status-closed' },
      suspended: { label: 'معلقة', class: 'status-suspended' },
      on_hold: { label: 'قيد الانتظار', class: 'status-onhold' },
    };
    const config = statusMap[status] || { label: status, class: 'status-closed' };
    return (
      <span className={`badge-enhanced ${config.class} inline-flex items-center gap-1.5`}>
        <span className="status-badge-dot bg-current"></span>
        {config.label}
      </span>
    );
  };

  const getCaseTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      civil: { label: 'مدني', color: 'bg-blue-100 text-blue-800' },
      criminal: { label: 'جنائي', color: 'bg-red-100 text-red-800' },
      commercial: { label: 'تجاري', color: 'bg-purple-100 text-purple-800' },
      labor: { label: 'عمالي', color: 'bg-green-100 text-green-800' },
      administrative: { label: 'إداري', color: 'bg-gray-100 text-gray-800' },
      traffic: { label: 'مروري', color: 'bg-yellow-100 text-yellow-800' },
      rental: { label: 'إيجار', color: 'bg-indigo-100 text-indigo-800' },
    };
    const config = typeMap[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return <span className={`badge-enhanced ${config.color}`}>{config.label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; class: string; hasIcon?: boolean }> = {
      urgent: { label: 'عاجل', class: 'priority-urgent urgent-pulse', hasIcon: true },
      high: { label: 'عالي', class: 'priority-high' },
      medium: { label: 'متوسط', class: 'priority-medium' },
      low: { label: 'منخفض', class: 'priority-low' },
    };
    const config = priorityMap[priority] || { label: priority, class: 'priority-low' };
    return (
      <span className={`badge-enhanced ${config.class} inline-flex items-center gap-1`}>
        {config.hasIcon && <AlertTriangle className="w-3 h-3" />}
        {config.label}
      </span>
    );
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'avatar-gradient-blue',
      'avatar-gradient-purple', 
      'avatar-gradient-green',
      'avatar-gradient-yellow',
      'avatar-gradient-orange',
      'avatar-gradient-indigo'
    ];
    return colors[index % colors.length];
  };

  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return name.substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ أثناء تحميل القضايا. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-page-load">
      {/* Enhanced Header */}
      <div className="legal-header-gradient rounded-2xl shadow-lg mb-8 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="stat-card-icon-enhanced bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <Scale className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">تتبع القضايا القانونية</h1>
                  <button className="p-1.5 rounded-full hover:bg-blue-100 transition-colors">
                    <HelpCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-gray-600 text-lg">إدارة ومتابعة جميع القضايا القانونية للشركة</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTriggersConfig(true)}
                className="inline-flex items-center gap-2 hover:border-blue-400 transition-all hover:shadow-md"
              >
                <Zap className="w-4 h-4" />
                Auto-Create Setup
              </Button>
              <Button 
                onClick={() => setShowCaseWizard(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
              >
                <Plus className="w-4 h-4" />
                قضية جديدة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card-enhanced p-6 animate-stat-card" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">+12%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">إجمالي القضايا</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">{stats.total || 142}</p>
              <span className="text-sm text-gray-500">قضية</span>
            </div>
            <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {stats.active || 85} نشطة
            </p>
          </div>

          <div className="stat-card-enhanced p-6 urgent-glow animate-stat-card" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full urgent-pulse">عاجل</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">عالية الأولوية</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">{stats.highPriority || 18}</p>
              <span className="text-sm text-gray-500">قضية</span>
            </div>
            <p className="text-sm text-red-600 font-medium mt-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              تحتاج متابعة فورية
            </p>
          </div>

          <div className="stat-card-enhanced p-6 animate-stat-card" style={{ animationDelay: '300ms' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+8%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">إجمالي التكاليف</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalValue || 450000)}</p>
            </div>
            <p className="text-sm text-orange-600 font-medium mt-2 flex items-center gap-1">
              <FileClock className="w-4 h-4" />
              {stats.pendingBilling || 12} فاتورة معلقة
            </p>
          </div>

          <div className="stat-card-enhanced p-6 animate-stat-card" style={{ animationDelay: '400ms' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">متأخر</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1 uppercase tracking-wide">مدفوعات متأخرة</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-gray-900">{stats.overduePayments || 32}</p>
              <span className="text-sm text-gray-500">حالة</span>
            </div>
            <p className="text-sm text-orange-600 font-medium mt-2 flex items-center gap-1">
              <Users className="w-4 h-4" />
              تحتاج متابعة
            </p>
          </div>
        </div>
      )}

      {/* Tabs System */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <TabsList className="w-full grid grid-cols-7 h-auto p-0 bg-transparent tab-list-scroll">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">قائمة القضايا</span>
            </TabsTrigger>
            <TabsTrigger value="case-details" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <FileSearch className="w-4 h-4" />
              <span className="hidden sm:inline">التفاصيل</span>
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <CalendarClock className="w-4 h-4" />
              <span className="hidden sm:inline">المواعيد</span>
            </TabsTrigger>
            <TabsTrigger value="notice-generator" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">الإنذارات</span>
            </TabsTrigger>
            <TabsTrigger value="settlement" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <Handshake className="w-4 h-4" />
              <span className="hidden sm:inline">التسويات</span>
            </TabsTrigger>
            <TabsTrigger value="delinquent" className="flex items-center gap-2 px-6 py-4 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap rounded-none">
              <UserX className="w-4 h-4" />
              <span className="hidden sm:inline">متأخرين</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="animate-tab-content">
          <CaseDashboard />
        </TabsContent>

        {/* Cases List Tab */}
        <TabsContent value="cases" className="space-y-6 animate-tab-content">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="بحث في القضايا..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="الحالة" />
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
                <SelectTrigger className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="civil">مدني</SelectItem>
                  <SelectItem value="criminal">جنائي</SelectItem>
                  <SelectItem value="commercial">تجاري</SelectItem>
                  <SelectItem value="labor">عمالي</SelectItem>
                  <SelectItem value="traffic">مروري</SelectItem>
                  <SelectItem value="rental">إيجار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cases Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">رقم القضية</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">العنوان</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">النوع</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">الحالة</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">الأولوية</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">العميل</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">التكاليف</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600 uppercase tracking-wider">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200">
                  {cases && cases.length > 0 ? (
                    cases.map((legalCase, index) => (
                      <TableRow
                        key={legalCase.id}
                        className="table-row-hover-enhanced cursor-pointer"
                        onClick={() => {
                          setSelectedCaseId(legalCase.id);
                          setActiveTab('case-details');
                        }}
                      >
                        <TableCell className="whitespace-nowrap">
                          <span className="font-mono font-semibold text-blue-700">{legalCase.case_number}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{legalCase.case_title_ar || legalCase.case_title}</div>
                          {legalCase.case_description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{legalCase.case_description}</div>
                          )}
                        </TableCell>
                        <TableCell>{getCaseTypeBadge(legalCase.case_type)}</TableCell>
                        <TableCell>{getCaseStatusBadge(legalCase.case_status)}</TableCell>
                        <TableCell>{getPriorityBadge(legalCase.priority)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white font-semibold text-sm`}>
                              {legalCase.client_name ? getInitials(legalCase.client_name) : 'NN'}
                            </div>
                            <span className="text-gray-900 font-medium">{legalCase.client_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-semibold text-gray-900">{formatCurrency(legalCase.total_costs)}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(legalCase.created_at), 'dd MMM yyyy', { locale: ar })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        لا توجد قضايا مسجلة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {cases && cases.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    عرض <span className="font-semibold">1-{cases.length}</span> من <span className="font-semibold">{stats?.total || cases.length}</span> قضية
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="default" size="sm">1</Button>
                    <Button variant="outline" size="sm">2</Button>
                    <Button variant="outline" size="sm">3</Button>
                    <Button variant="outline" size="sm">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Case Details Tab */}
        <TabsContent value="case-details" className="space-y-6 animate-tab-content">
          {selectedCaseId ? (
            <>
              <Card className="legal-header-gradient shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">تفاصيل القضية</CardTitle>
                      <CardDescription className="text-base mt-1">
                        إدارة حالة القضية وعرض سجل الأحداث
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCaseId(null)}
                    >
                      رجوع
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <CaseStatusManager
                    caseId={selectedCaseId}
                    currentStatus={selectedCaseData?.case_status || 'pending_review'}
                    caseName={selectedCaseData?.case_number || `Case #${selectedCaseId?.slice(0, 8)}`}
                    onStatusChange={async (status, notes) => {
                      const newEntry: TimelineEntry = {
                        id: Date.now().toString(),
                        type: 'auto',
                        category: 'status_changed',
                        title: `Status Changed to ${status}`,
                        description: `Case status was updated`,
                        date: new Date().toISOString().split('T')[0],
                        timestamp: new Date().toISOString(),
                        performedBy: 'Current User',
                        notes,
                      };
                      setCaseTimeline([newEntry, ...caseTimeline]);
                    }}
                  />
                </div>

                <div className="lg:col-span-2">
                  <CaseTimeline
                    caseId={selectedCaseId}
                    entries={caseTimeline}
                    onAddEntry={() => setShowTimelineDialog(true)}
                  />
                </div>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                    <FileSearch className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">يرجى اختيار قضية من القائمة</h3>
                  <p className="text-gray-600 mb-6">اختر قضية من قائمة القضايا لعرض التفاصيل الكاملة</p>
                  <Button onClick={() => setActiveTab('cases')}>
                    العودة للقضايا
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notice Generator Tab */}
        <TabsContent value="notice-generator" className="space-y-6 animate-tab-content">
          <EnhancedLegalNoticeGenerator
            companyId={companyId || ''}
            onDocumentGenerated={(document) => {
              toast.success('تم إنشاء المستند بنجاح');
              console.log('Document generated:', document);
            }}
          />
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="animate-tab-content">
          <DeadlineAlerts />
        </TabsContent>

        {/* Settlement Tab */}
        <TabsContent value="settlement" className="space-y-6 animate-tab-content">
          <Card className="legal-header-gradient shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">إدارة التسويات</CardTitle>
              <CardDescription className="text-base mt-1">
                إنشاء وتتبع ومراقبة اتفاقيات التسوية مع العملاء
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              {selectedCaseId && selectedCaseData ? (
                <SettlementProposal
                  caseId={selectedCaseId}
                  caseNumber={selectedCaseData.case_number || ''}
                  clientName={selectedCaseData.client_name || ''}
                  totalClaim={selectedCaseData.total_costs || 0}
                  onProposalCreated={(proposal) => {
                    toast.success('تم إنشاء العرض بنجاح');
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      يرجى اختيار قضية من القائمة
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="lg:col-span-2">
              <Tabs defaultValue="tracking" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tracking">التتبع</TabsTrigger>
                  <TabsTrigger value="compliance">الالتزام</TabsTrigger>
                </TabsList>

                <TabsContent value="tracking">
                  <SettlementTracking />
                </TabsContent>

                <TabsContent value="compliance">
                  <SettlementCompliance />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </TabsContent>

        {/* Delinquent Customers Tab */}
        <TabsContent value="delinquent" className="animate-tab-content">
          <DelinquentCustomersTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LegalCaseCreationWizard
        open={showCaseWizard}
        onOpenChange={setShowCaseWizard}
        onSuccess={() => {
          setActiveTab('cases');
        }}
      />

      <AutoCreateCaseTriggersConfig
        open={showTriggersConfig}
        onOpenChange={setShowTriggersConfig}
        onSave={(config) => {
          console.log('Auto-create config saved:', config);
        }}
      />

      <TimelineEntryDialog
        open={showTimelineDialog}
        onOpenChange={setShowTimelineDialog}
        caseId={selectedCaseId || ''}
        onSubmit={async (formData) => {
          const newEntry: TimelineEntry = {
            id: Date.now().toString(),
            type: 'manual',
            category: formData.category,
            title: formData.title,
            description: formData.description,
            date: formData.date,
            timestamp: `${formData.date}T${formData.time}`,
            performedBy: 'Current User',
            notes: formData.notes,
          };
          setCaseTimeline([newEntry, ...caseTimeline]);
        }}
      />
    </div>
  );
};

export default LegalCasesTracking;
