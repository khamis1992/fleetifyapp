import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Tabs removed - using custom conditional rendering
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
import { useLegalCases, useLegalCaseStats } from '@/hooks/useLegalCases';
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
  DollarSign,
  Clock,
  Users,
  Zap,
  HelpCircle,
  LayoutDashboard,
  Folder,
  Settings,
  Download,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { HelpIcon } from '@/components/help/HelpIcon';
import DelinquentCustomersTab from '@/components/legal/DelinquentCustomersTab';
import SimpleCasesTab from '@/components/legal/SimpleCasesTab';
import LegalCaseCreationWizard from '@/components/legal/LegalCaseCreationWizard';
import AutoCreateCaseTriggersConfig from '@/components/legal/AutoCreateCaseTriggersConfig';
import CaseDashboard from '@/components/legal/CaseDashboard';
import CaseListTable from '@/components/legal/CaseListTable';
import DeadlineAlerts from '@/components/legal/DeadlineAlerts';
import EnhancedLegalNoticeGenerator from '@/components/legal/EnhancedLegalNoticeGenerator';

// Import custom animations
import '@/styles/legal-cases-animations.css';

export const LegalCasesTracking: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'overview';
  const setActiveView = (view: string) => setSearchParams({ view });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCaseWizard, setShowCaseWizard] = useState(false);
  const [showTriggersConfig, setShowTriggersConfig] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const { companyId, isLoading: isLoadingCompany } = useUnifiedCompanyAccess();

  const { data: casesResponse, isLoading, error } = useLegalCases(
    {
      case_status: statusFilter !== 'all' ? statusFilter : undefined,
      case_type: typeFilter !== 'all' ? typeFilter : undefined,
      search: searchTerm || undefined,
      page: currentPage,
      pageSize,
    },
    false // Disabled - using SimpleCasesTab instead
  );

  const { data: stats, isLoading: isLoadingStats } = useLegalCaseStats();

  const cases = casesResponse?.data || [];
  const totalCases = casesResponse?.count || 0;
  const totalPages = Math.ceil(totalCases / pageSize);

  const filteredCases = cases.filter(c => {
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    return true;
  });

  const handleCaseCreated = () => {
    setShowCaseWizard(false);
    toast.success('تم إنشاء القضية بنجاح');
  };

  const handleExport = () => {
    toast.success('جاري تصدير البيانات...');
    // Export logic will be added
  };

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">تتبع القضايا القانونية</h1>
            <p className="text-gray-600 mt-1">إدارة ومتابعة جميع القضايا القانونية للشركة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowTriggersConfig(true)}
            variant="outline"
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">إعداد الإنشاء التلقائي</span>
          </Button>
          <Button
            onClick={() => setShowCaseWizard(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">قضية جديدة</span>
          </Button>
          <HelpIcon
            title="تتبع القضايا القانونية"
            content="هذه الصفحة تتيح لك متابعة جميع القضايا القانونية وإدارتها بكفاءة"
          />
        </div>
      </div>

      {/* Custom Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full grid grid-cols-4 border-b border-gray-200">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 border-b-4 ${
              activeView === 'overview'
                ? 'bg-white text-primary border-primary font-bold'
                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </button>
          <button
            onClick={() => setActiveView('cases')}
            className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 border-b-4 ${
              activeView === 'cases'
                ? 'bg-white text-primary border-primary font-bold'
                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Folder className="w-5 h-5" />
            <span className="hidden sm:inline">القضايا</span>
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 border-b-4 ${
              activeView === 'settings'
                ? 'bg-white text-primary border-primary font-bold'
                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">الإعدادات</span>
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 border-b-4 ${
              activeView === 'reports'
                ? 'bg-white text-primary border-primary font-bold'
                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="hidden sm:inline">التقارير</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">

        {/* Overview View */}
        {activeView === 'overview' && (
          <>
            <CaseDashboard />
            <DeadlineAlerts />
          </>
        )}

        {/* Cases View */}
        {activeView === 'cases' && (
          <SimpleCasesTab />
        )}

        {/* Cases View - OLD (commented out for testing) */}
        {false && activeView === 'cases-old' && (
          <>
          {!companyId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">الرجاء تحديد الشركة أولاً</div>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Search and Quick Actions */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="بحث في القضايا..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      فلاتر
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تصدير
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium mb-2 block">الحالة</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="جميع الحالات" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الحالات</SelectItem>
                          <SelectItem value="pending_review">قيد المراجعة</SelectItem>
                          <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                          <SelectItem value="settled">تمت التسوية</SelectItem>
                          <SelectItem value="closed">مغلقة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">النوع</label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="جميع الأنواع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الأنواع</SelectItem>
                          <SelectItem value="payment_collection">تحصيل دفعات</SelectItem>
                          <SelectItem value="contract_dispute">نزاع عقد</SelectItem>
                          <SelectItem value="property_damage">أضرار ممتلكات</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">الأولوية</label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="جميع الأولويات" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الأولويات</SelectItem>
                          <SelectItem value="low">منخفضة</SelectItem>
                          <SelectItem value="medium">متوسطة</SelectItem>
                          <SelectItem value="high">عالية</SelectItem>
                          <SelectItem value="urgent">عاجلة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cases List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>حدث خطأ في تحميل القضايا</AlertDescription>
            </Alert>
          ) : (
            <>
              <CaseListTable
                cases={filteredCases}
                onCaseSelect={(caseId) => setSelectedCaseId(caseId)}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCases)} من {totalCases}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          </>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <>
          <Card>
            <CardHeader>
              <CardTitle>الإنشاء التلقائي للقضايا</CardTitle>
              <CardDescription>
                إعداد المحفزات التلقائية لإنشاء قضايا قانونية عند حدوث شروط معينة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutoCreateCaseTriggersConfig companyId={companyId || ''} />
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
          </>
        )}

        {/* Reports View */}
        {activeView === 'reports' && (
          <DelinquentCustomersTab />
        )}
      </div>

      {/* Case Creation Wizard Dialog */}
      {showCaseWizard && (
        <LegalCaseCreationWizard
          isOpen={showCaseWizard}
          onClose={() => setShowCaseWizard(false)}
          onCaseCreated={handleCaseCreated}
          companyId={companyId || ''}
        />
      )}

      {/* Triggers Config Dialog */}
      {showTriggersConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>إعداد الإنشاء التلقائي</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTriggersConfig(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AutoCreateCaseTriggersConfig companyId={companyId || ''} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LegalCasesTracking;
