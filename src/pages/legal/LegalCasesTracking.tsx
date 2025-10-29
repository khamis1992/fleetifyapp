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
  DollarSign,
  Users,
  Zap
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
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'نشطة', variant: 'default' },
      closed: { label: 'مغلقة', variant: 'secondary' },
      suspended: { label: 'معلقة', variant: 'destructive' },
      on_hold: { label: 'قيد الانتظار', variant: 'outline' },
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCaseTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      civil: 'مدني',
      criminal: 'جنائي',
      commercial: 'تجاري',
      labor: 'عمالي',
      administrative: 'إداري',
      traffic: 'مروري',
      rental: 'إيجار',
    };
    return <Badge variant="outline">{typeMap[type] || type}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      urgent: { label: 'عاجل', variant: 'destructive' },
      high: { label: 'عالي', variant: 'destructive' },
      medium: { label: 'متوسط', variant: 'default' },
      low: { label: 'منخفض', variant: 'secondary' },
    };
    const config = priorityMap[priority] || { label: priority, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
    <div className="container mx-auto py-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="cases">قائمة القضايا</TabsTrigger>
          <TabsTrigger value="case-details">التفاصيل</TabsTrigger>
          <TabsTrigger value="deadlines">المواعيد</TabsTrigger>
          <TabsTrigger value="notice-generator">الإنذارات</TabsTrigger>
          <TabsTrigger value="settlement">التسويات</TabsTrigger>
          <TabsTrigger value="delinquent">متأخرين</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <CaseDashboard />
        </TabsContent>

        <TabsContent value="cases" className="space-y-6">
          <CaseListTable onCaseSelect={(id) => {
            setSelectedCaseId(id);
            setActiveTab('case-details');
          }} />
        </TabsContent>

        <TabsContent value="cases-old" className="space-y-6">
      {/* Page Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Scale className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">تتبع القضايا القانونية</CardTitle>
                  <HelpIcon topic="accountTypes" />
                </div>
                <CardDescription className="text-base mt-1">
                  إدارة ومتابعة جميع القضايا القانونية للشركة
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTriggersConfig(true)}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Auto-Create Setup
              </Button>
              <Button onClick={() => setShowCaseWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                قضية جديدة
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي القضايا</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} نشطة
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قضايا عالية الأولوية</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highPriority}</div>
              <p className="text-xs text-muted-foreground">
                تحتاج متابعة فورية
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي التكاليف</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingBilling} فاتورة معلقة
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مدفوعات متأخرة</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overduePayments}</div>
              <p className="text-xs text-muted-foreground">
                تحتاج متابعة
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في القضايا..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
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
              <SelectTrigger className="w-full md:w-[200px]">
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
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القضية</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>التكاليف</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases && cases.length > 0 ? (
                  cases.map((legalCase) => (
                    <TableRow
                      key={legalCase.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedCaseId(legalCase.id);
                        setActiveTab('case-details');
                      }}
                    >
                      <TableCell className="font-medium">{legalCase.case_number}</TableCell>
                      <TableCell>{legalCase.case_title_ar || legalCase.case_title}</TableCell>
                      <TableCell>{getCaseTypeBadge(legalCase.case_type)}</TableCell>
                      <TableCell>{getCaseStatusBadge(legalCase.case_status)}</TableCell>
                      <TableCell>{getPriorityBadge(legalCase.priority)}</TableCell>
                      <TableCell>{legalCase.client_name || '-'}</TableCell>
                      <TableCell>{formatCurrency(legalCase.total_costs)}</TableCell>
                      <TableCell>
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="case-details" className="space-y-6">
          {selectedCaseId ? (
            <>
              <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
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
                      // Add status change to timeline
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
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">يرجى اختيار قضية من القائمة</p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('cases')}
                  >
                    العودة للقضايا
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notice-generator" className="space-y-6">
          <EnhancedLegalNoticeGenerator
            companyId={companyId || ''}
            onDocumentGenerated={(document) => {
              toast.success('تم إنشاء المستند بنجاح');
              console.log('Document generated:', document);
            }}
          />
        </TabsContent>

        <TabsContent value="deadlines">
          <DeadlineAlerts />
        </TabsContent>

        <TabsContent value="settlement" className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">إدارة التسويات</CardTitle>
                  <CardDescription className="text-base mt-1">
                    إنشاء وتتبع ومراقبة اتفاقيات التسوية مع العملاء
                  </CardDescription>
                </div>
              </div>
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

        <TabsContent value="delinquent">
          <DelinquentCustomersTab />
        </TabsContent>
      </Tabs>

      {/* Legal Case Creation Wizard */}
      <LegalCaseCreationWizard
        open={showCaseWizard}
        onOpenChange={setShowCaseWizard}
        onSuccess={() => {
          // Refresh cases after creation
          setActiveTab('cases');
        }}
      />

      {/* Auto-Create Triggers Configuration */}
      <AutoCreateCaseTriggersConfig
        open={showTriggersConfig}
        onOpenChange={setShowTriggersConfig}
        onSave={(config) => {
          // Save configuration to database
          console.log('Auto-create config saved:', config);
        }}
      />

      {/* Timeline Entry Dialog */}
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

