/**
 * Legal Cases Tracking - Final Integrated Version
 * تتبع القضايا القانونية - النسخة النهائية المتكاملة
 * 
 * Integrated with:
 * - Real database (legal_cases table)
 * - Existing useLegalCases hook
 * - All new features (filters, export, notifications)
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
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Printer,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLegalCases, useLegalCaseStats } from '@/hooks/useLegalCases';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import CasesCardList, { LegalCase } from '@/components/legal/CasesCardList';
import CasesFilters, { CaseFilters } from '@/components/legal/CasesFilters';
import CaseDetailsPage from '@/components/legal/CaseDetailsPage';
import NotificationsPanel from '@/components/legal/NotificationsPanel';
import { exportToCSV, exportToExcel, exportToPDF, printCases } from '@/utils/legalCasesExport';
import { toast } from 'sonner';

interface LegalCasesTrackingV2FinalProps {
  companyId?: string;
}

const LegalCasesTrackingV2Final: React.FC<LegalCasesTrackingV2FinalProps> = ({ companyId: propCompanyId }) => {
  const { user } = useAuth();
  const companyId = propCompanyId || user?.user_metadata?.company_id;

  const [activeTab, setActiveTab] = useState('overview');
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [showCaseWizard, setShowCaseWizard] = useState(false);
  const [filters, setFilters] = useState<CaseFilters>({ search: '' });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Load data using existing hooks
  const { data: casesData, isLoading: casesLoading } = useLegalCases();
  const { data: stats, isLoading: statsLoading } = useLegalCaseStats();

  const cases = casesData?.data || [];

  // Map to our card format
  const mappedCases: LegalCase[] = useMemo(() => {
    return cases.map((c) => ({
      id: c.id,
      case_number: c.case_number,
      title: c.case_title || c.case_title_ar || '',
      customer_name: c.client_name || 'غير محدد',
      lawyer_name: undefined, // Not in current schema
      case_type: c.case_type,
      priority: c.priority as any,
      status: c.case_status as any,
      total_cost: c.total_costs || 0,
      next_hearing_date: undefined, // Not in current schema
      created_at: c.created_at,
      description: c.description,
    }));
  }, [cases]);

  // Filter cases
  const filteredCases = useMemo(() => {
    return mappedCases.filter((c) => {
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

      // Other filters
      if (filters.priority && c.priority !== filters.priority) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.caseType && c.case_type !== filters.caseType) return false;
      if (filters.lawyerName && !c.lawyer_name?.toLowerCase().includes(filters.lawyerName.toLowerCase())) return false;
      if (filters.dateFrom && new Date(c.created_at) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(c.created_at) > new Date(filters.dateTo)) return false;
      if (filters.minCost && c.total_cost < filters.minCost) return false;
      if (filters.maxCost && c.total_cost > filters.maxCost) return false;

      return true;
    });
  }, [mappedCases, filters]);

  const selectedCase = selectedCaseId ? mappedCases.find((c) => c.id === selectedCaseId) : null;

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId);
  };

  const handleEditCase = (caseId: string) => {
    toast.info(`تعديل القضية: ${caseId}`);
    // TODO: Open edit dialog
  };

  const handleCloseCase = (caseId: string) => {
    toast.info(`إغلاق القضية: ${caseId}`);
    // TODO: Implement close case
  };

  const handleDeleteCase = (caseId: string) => {
    toast.info(`حذف القضية: ${caseId}`);
    // TODO: Implement delete case
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

  // Show case details if selected
  if (selectedCase) {
    return (
      <CaseDetailsPage
        caseData={selectedCase}
        onBack={() => setSelectedCaseId(null)}
        onEdit={handleEditCase}
        onClose={handleCloseCase}
        onDelete={handleDeleteCase}
      />
    );
  }

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
            <Badge variant="secondary" className="ml-1">{stats?.active || 0}</Badge>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">القضايا النشطة</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.active || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">قضايا عاجلة</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats?.highPriority || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">معلقة</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats?.onHold || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">مغلقة</CardTitle>
                    <XCircle className="h-4 w-4 text-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.closed || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي القيمة</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(stats?.totalValue || 0).toLocaleString('en-US')} ر.س
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي القضايا</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right: Notifications */}
            <div>
              <NotificationsPanel
                companyId={companyId || ''}
                onNotificationClick={(notification) => {
                  if (notification.reference_id) {
                    handleViewCase(notification.reference_id);
                  }
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Cases */}
        <TabsContent value="cases" className="space-y-6">
          {/* Filters */}
          <CasesFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalCases={mappedCases.length}
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
            loading={casesLoading}
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

export default LegalCasesTrackingV2Final;
