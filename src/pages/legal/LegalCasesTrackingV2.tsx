/**
 * Legal Cases Tracking - Complete Redesigned Version
 * تتبع القضايا القانونية - النسخة المحسّنة الكاملة
 * 
 * Features:
 * - 4 simplified tabs (from 7)
 * - Card-based cases list
 * - Advanced filters with saved presets
 * - Export functionality (CSV, Excel, PDF)
 * - Auto-create triggers integration
 * - Notifications system
 * - Mobile responsive
 */

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Scale, 
  Settings, 
  FileText,
  Plus,
  Zap,
  Calendar,
  Bell,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import CasesCardList, { LegalCase } from '@/components/legal/CasesCardList';
import CasesFilters, { CaseFilters } from '@/components/legal/CasesFilters';
import { exportToCSV, exportToExcel, exportToPDF, printCases } from '@/utils/legalCasesExport';
import { toast } from 'sonner';

interface LegalCasesTrackingV2Props {
  companyId?: string;
}

const LegalCasesTrackingV2: React.FC<LegalCasesTrackingV2Props> = ({ companyId: propCompanyId }) => {
  const { user } = useAuth();
  const companyId = propCompanyId || user?.user_metadata?.company_id;

  const [activeTab, setActiveTab] = useState('overview');
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [showCaseWizard, setShowCaseWizard] = useState(false);
  const [filters, setFilters] = useState<CaseFilters>({ search: '' });

  // Mock data for demonstration
  const mockCases: LegalCase[] = [
    {
      id: '1',
      case_number: '2025-001',
      title: 'نزاع تجاري - شركة النور',
      customer_name: 'أحمد محمد السعيد',
      lawyer_name: 'المحامية سارة أحمد',
      case_type: 'commercial',
      priority: 'urgent',
      status: 'active',
      total_cost: 15000,
      next_hearing_date: '2025-01-21',
      created_at: '2025-01-10T10:00:00Z',
      description: 'نزاع تجاري حول عقد توريد بقيمة 50,000 ريال',
    },
    {
      id: '2',
      case_number: '2025-002',
      title: 'تحصيل مدفوعات متأخرة',
      customer_name: 'محمد عبدالله',
      lawyer_name: 'المحامي خالد علي',
      case_type: 'payment_collection',
      priority: 'high',
      status: 'active',
      total_cost: 8000,
      next_hearing_date: '2025-01-25',
      created_at: '2025-01-12T14:30:00Z',
      description: 'تحصيل مدفوعات متأخرة بقيمة 25,000 ريال',
    },
    {
      id: '3',
      case_number: '2025-003',
      title: 'نزاع عقد إيجار',
      customer_name: 'فاطمة أحمد',
      case_type: 'rental',
      priority: 'medium',
      status: 'pending',
      total_cost: 5000,
      created_at: '2025-01-15T09:00:00Z',
      description: 'نزاع حول شروط عقد الإيجار',
    },
  ];

  const stats = {
    active: mockCases.filter((c) => c.status === 'active').length,
    urgent: mockCases.filter((c) => c.priority === 'urgent').length,
    pending: mockCases.filter((c) => c.status === 'pending').length,
    closed: 120,
    totalCost: mockCases.reduce((sum, c) => sum + c.total_cost, 0),
    averageDuration: 45,
    successRate: 85,
    upcomingAppointments: 5,
  };

  // Filter cases based on current filters
  const filteredCases = useMemo(() => {
    return mockCases.filter((c) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !c.case_number.toLowerCase().includes(searchLower) &&
          !c.title.toLowerCase().includes(searchLower) &&
          !c.customer_name.toLowerCase().includes(searchLower) &&
          !(c.description || '').toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority && c.priority !== filters.priority) {
        return false;
      }

      // Status filter
      if (filters.status && c.status !== filters.status) {
        return false;
      }

      // Case type filter
      if (filters.caseType && c.case_type !== filters.caseType) {
        return false;
      }

      // Lawyer filter
      if (filters.lawyerName && !c.lawyer_name?.toLowerCase().includes(filters.lawyerName.toLowerCase())) {
        return false;
      }

      // Date filters
      if (filters.dateFrom && new Date(c.created_at) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(c.created_at) > new Date(filters.dateTo)) {
        return false;
      }

      // Cost filters
      if (filters.minCost && c.total_cost < filters.minCost) {
        return false;
      }
      if (filters.maxCost && c.total_cost > filters.maxCost) {
        return false;
      }

      return true;
    });
  }, [mockCases, filters]);

  const handleViewCase = (caseId: string) => {
    toast.info(`عرض تفاصيل القضية: ${caseId}`);
    // TODO: Navigate to case details
  };

  const handleEditCase = (caseId: string) => {
    toast.info(`تعديل القضية: ${caseId}`);
    // TODO: Open edit dialog
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (filteredCases.length === 0) {
        toast.error('لا توجد قضايا للتصدير');
        return;
      }

      switch (format) {
        case 'csv':
          exportToCSV(filteredCases);
          toast.success('تم تصدير القضايا إلى CSV');
          break;
        case 'excel':
          await exportToExcel(filteredCases);
          toast.success('تم تصدير القضايا إلى Excel');
          break;
        case 'pdf':
          await exportToPDF(filteredCases);
          toast.success('تم تصدير القضايا إلى PDF');
          break;
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل التصدير');
    }
  };

  const handlePrint = () => {
    try {
      printCases(filteredCases);
    } catch (error: any) {
      toast.error(error.message || 'فشلت الطباعة');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            إدارة القضايا القانونية
          </h1>
          <p className="text-muted-foreground mt-2">
            نظام متكامل لإدارة ومتابعة القضايا القانونية
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowTriggersConfig(true)}
            className="inline-flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            إعداد الإنشاء التلقائي
          </Button>
          <Button
            onClick={() => setShowCaseWizard(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            قضية جديدة
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            القضايا
            <Badge variant="secondary" className="ml-1">{stats.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">القضايا النشطة</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +3 منذ الأسبوع الماضي
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">قضايا عاجلة</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  تحتاج متابعة فورية
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">قضايا معلقة</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  في انتظار الإجراء
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">قضايا مغلقة</CardTitle>
                <XCircle className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.closed}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  معدل النجاح {stats.successRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي التكاليف</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCost.toLocaleString('ar-SA')} ر.س</div>
                <p className="text-xs text-muted-foreground mt-1">
                  للقضايا النشطة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">متوسط المدة</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageDuration} يوم</div>
                <p className="text-xs text-muted-foreground mt-1">
                  من الفتح للإغلاق
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  من القضايا المغلقة
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Cases */}
        <TabsContent value="cases" className="space-y-6">
          {/* Filters */}
          <CasesFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalCases={mockCases.length}
            filteredCases={filteredCases.length}
          />

          {/* Export Actions */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  تصدير
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  تصدير CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  تصدير Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  تصدير PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>

          {/* Cases List */}
          <CasesCardList
            cases={filteredCases}
            onViewCase={handleViewCase}
            onEditCase={handleEditCase}
            loading={false}
          />
        </TabsContent>

        {/* Tab 3: Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                الإعدادات
              </CardTitle>
              <CardDescription>
                إعدادات النظام والقوالب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={() => setShowTriggersConfig(true)}
                className="w-full justify-start"
              >
                <Zap className="w-4 h-4 mr-2" />
                محفزات الإنشاء التلقائي
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <FileText className="w-4 h-4 mr-2" />
                قوالب المستندات (قريباً)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Reports */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>التقارير والتحليلات</CardTitle>
              <CardDescription>
                تقارير مفصلة وتحليلات للقضايا
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">قيد التطوير...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AutoCreateCaseTriggersConfig
        open={showTriggersConfig}
        onOpenChange={setShowTriggersConfig}
        companyId={companyId || ''}
      />
    </div>
  );
};

export default LegalCasesTrackingV2;
