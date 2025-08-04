import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLegalCases, useLegalCaseStats, type LegalCase } from '@/hooks/useLegalCases';
import { LegalCaseForm } from '@/components/legal/LegalCaseForm';
import { LegalCaseDetailsDialog } from '@/components/legal/LegalCaseDetailsDialog';
import { LegalCaseDashboard } from '@/components/legal/LegalCaseDashboard';
import { LegalAIConsultant } from '@/components/legal/LegalAIConsultant';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Clock,
  Scale,
  Building,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const Legal = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // الحصول على company_id من السياق أو localStorage
  const companyId = localStorage.getItem('company_id') || 'fleetify_default';

  const debouncedSearch = useDebounce(searchTerm, 300);
  const canManageCases = usePermissionCheck('company_admin') || usePermissionCheck('manager') || usePermissionCheck('sales_agent');

  const filters = {
    search: debouncedSearch,
    case_status: statusFilter || undefined,
    case_type: typeFilter || undefined,
    priority: priorityFilter || undefined,
  };

  const { data: cases, isLoading } = useLegalCases(filters);
  const { data: stats } = useLegalCaseStats();

  const handleViewCase = (legalCase: LegalCase) => {
    setSelectedCase(legalCase);
    setIsDetailsOpen(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      case 'suspended': return 'bg-yellow-500';
      case 'on_hold': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'civil': return <Users className="h-4 w-4" />;
      case 'criminal': return <AlertTriangle className="h-4 w-4" />;
      case 'commercial': return <Building className="h-4 w-4" />;
      case 'labor': return <FileText className="h-4 w-4" />;
      case 'administrative': return <Scale className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const CaseSkeleton = () => (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">القضايا القانونية</h1>
          <p className="text-muted-foreground">إدارة القضايا والمراسلات القانونية</p>
        </div>
        {canManageCases && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            قضية جديدة
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="cases">القضايا</TabsTrigger>
          <TabsTrigger value="ai-consultant">المستشار الذكي</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <LegalCaseDashboard stats={stats} />
        </TabsContent>

        <TabsContent value="cases" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                البحث والتصفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث في القضايا..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="حالة القضية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                    <SelectItem value="suspended">معلقة</SelectItem>
                    <SelectItem value="on_hold">في الانتظار</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="نوع القضية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">مدنية</SelectItem>
                    <SelectItem value="criminal">جنائية</SelectItem>
                    <SelectItem value="commercial">تجارية</SelectItem>
                    <SelectItem value="labor">عمالية</SelectItem>
                    <SelectItem value="administrative">إدارية</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">عاجل</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="low">منخفضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={resetFilters}>
                  إعادة تعيين المرشحات
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <CaseSkeleton key={i} />)
            ) : cases?.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد قضايا</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter || typeFilter || priorityFilter
                    ? 'لم يتم العثور على قضايا تطابق معايير البحث'
                    : 'لم يتم إنشاء أي قضايا بعد'}
                </p>
                {canManageCases && !searchTerm && !statusFilter && !typeFilter && !priorityFilter && (
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    أنشئ أول قضية
                  </Button>
                )}
              </div>
            ) : (
              cases?.map((legalCase) => (
                <Card key={legalCase.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewCase(legalCase)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{legalCase.case_title}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span className="font-mono text-sm">{legalCase.case_number}</span>
                          <Badge variant="outline" className={`${getStatusColor(legalCase.case_status)} text-white`}>
                            {legalCase.case_status === 'active' && 'نشطة'}
                            {legalCase.case_status === 'closed' && 'مغلقة'}
                            {legalCase.case_status === 'suspended' && 'معلقة'}
                            {legalCase.case_status === 'on_hold' && 'في الانتظار'}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(legalCase.case_type)}
                        <Badge variant="outline" className={`${getPriorityColor(legalCase.priority)} text-white`}>
                          {legalCase.priority === 'urgent' && 'عاجل'}
                          {legalCase.priority === 'high' && 'عالية'}
                          {legalCase.priority === 'medium' && 'متوسطة'}
                          {legalCase.priority === 'low' && 'منخفضة'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {legalCase.client_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>العميل: {legalCase.client_name}</span>
                        </div>
                      )}
                      {legalCase.court_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-4 w-4" />
                          <span>المحكمة: {legalCase.court_name}</span>
                        </div>
                      )}
                      {legalCase.hearing_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            الجلسة القادمة: {format(new Date(legalCase.hearing_date), 'dd/MM/yyyy', { locale: ar })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>إجمالي التكاليف: {legalCase.total_costs.toLocaleString()} د.ك</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          تاريخ الإنشاء: {format(new Date(legalCase.created_at), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai-consultant">
          <LegalAIConsultant companyId={companyId} />
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>التقارير</CardTitle>
              <CardDescription>تقارير شاملة عن القضايا القانونية</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">سيتم إضافة التقارير في التحديث القادم</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      {isFormOpen && (
        <LegalCaseForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      )}

      {/* Details Dialog */}
      {isDetailsOpen && selectedCase && (
        <LegalCaseDetailsDialog
          legalCase={selectedCase}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </div>
  );
};

export default Legal;