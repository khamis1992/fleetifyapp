import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Edit,
  Settings2,
  RotateCcw,
  Save,
  BarChart,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTrafficViolations, TrafficViolation } from '@/hooks/useTrafficViolations';
import { TrafficViolationSidePanel } from '@/components/fleet/TrafficViolationSidePanel';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PageHelp } from "@/components/help";
import { TrafficViolationsPageHelpContent } from "@/components/help/content";
import '@/styles/traffic-violations-theme.css';

// Lazy load heavy components for better performance
const TrafficViolationForm = lazy(() =>
  import('@/components/fleet/TrafficViolationForm').then(m => ({ default: m.TrafficViolationForm }))
);
const TrafficViolationPaymentsDialog = lazy(() =>
  import('@/components/fleet/TrafficViolationPaymentsDialog').then(m => ({ default: m.TrafficViolationPaymentsDialog }))
);
const TrafficViolationPDFImport = lazy(() =>
  import('@/components/fleet/TrafficViolationPDFImport').then(m => ({ default: m.TrafficViolationPDFImport }))
);

export default function TrafficViolationsRedesigned() {
  // State Management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<TrafficViolation | null>(null);
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [selectAll, setSelectAll] = useState(false);

  // Data Fetching
  const { data: violations = [], isLoading } = useTrafficViolations({ limit: 10000, offset: 0 });
  const { formatCurrency } = useCurrencyFormatter();

  // Memoized statistics
  const stats = useMemo(() => {
    const total = violations.length;
    const pending = violations.filter(v => v.status === 'pending').length;
    const confirmed = violations.filter(v => v.status === 'confirmed').length;
    const cancelled = violations.filter(v => v.status === 'cancelled').length;
    const totalAmount = violations.reduce((sum, v) => sum + (v.amount || 0), 0);
    const paidAmount = violations.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0);
    const unpaidAmount = violations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + (v.amount || 0), 0);
    const partiallyPaidAmount = violations.filter(v => v.payment_status === 'partially_paid').reduce((sum, v) => sum + (v.amount || 0), 0);

    return {
      total,
      pending,
      confirmed,
      cancelled,
      totalAmount,
      paidAmount,
      unpaidAmount,
      partiallyPaidAmount,
      averageAmount: total > 0 ? totalAmount / total : 0,
      paidPercentage: total > 0 ? (violations.filter(v => v.payment_status === 'paid').length / total) * 100 : 0,
      unpaidPercentage: total > 0 ? (violations.filter(v => v.payment_status === 'unpaid').length / total) * 100 : 0,
      pendingPercentage: total > 0 ? (pending / total) * 100 : 0
    };
  }, [violations]);

  // Advanced filtering
  const filteredViolations = useMemo(() => {
    return violations.filter(violation => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        violation.penalty_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filters
      const matchesStatus = statusFilter === 'all' || violation.status === statusFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || violation.payment_status === paymentStatusFilter;
      const matchesViolationType = violationTypeFilter === 'all' || violation.violation_type === violationTypeFilter;

      // Date filter
      const matchesDateFrom = !dateFrom || new Date(violation.penalty_date) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(violation.penalty_date) <= new Date(dateTo);

      // Amount filter
      const matchesAmountFrom = !amountFrom || (violation.amount || 0) >= parseFloat(amountFrom);
      const matchesAmountTo = !amountTo || (violation.amount || 0) <= parseFloat(amountTo);

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesViolationType &&
        matchesDateFrom && matchesDateTo && matchesAmountFrom && matchesAmountTo;
    });
  }, [violations, searchTerm, statusFilter, paymentStatusFilter, violationTypeFilter, dateFrom, dateTo, amountFrom, amountTo]);

  // Pagination
  const totalPages = Math.ceil(filteredViolations.length / pageSize);
  const paginatedViolations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredViolations.slice(startIndex, endIndex);
  }, [filteredViolations, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentStatusFilter, violationTypeFilter, dateFrom, dateTo, amountFrom, amountTo]);

  // Counter animation effect
  useEffect(() => {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
      const target = parseInt(counter.textContent?.replace(/[^0-9]/g, '') || '0');
      if (target) {
        animateCounter(counter as HTMLElement, target);
      }
    });
  }, [stats]);

  // Helper functions
  const animateCounter = (element: HTMLElement, target: number, duration = 800) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target.toLocaleString('en-US');
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current).toLocaleString('en-US');
      }
    }, 16);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="status-pending"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>;
      case 'confirmed':
        return <Badge className="status-confirmed"><CheckCircle className="w-3 h-3 ml-1" />مؤكدة</Badge>;
      case 'cancelled':
        return <Badge className="status-cancelled"><XCircle className="w-3 h-3 ml-1" />ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="payment-paid">✅ مدفوع</Badge>;
      case 'unpaid':
        return <Badge className="payment-unpaid">❌ غير مدفوع</Badge>;
      case 'partially_paid':
        return <Badge className="payment-partial">🟠 جزئي</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setViolationTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setAmountFrom('');
    setAmountTo('');
  };

  const handleOpenSidePanel = (violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsSidePanelOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    // Here you would implement the logic to select/deselect all checkboxes
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Side Panel */}
      <TrafficViolationSidePanel
        violation={selectedViolation}
        open={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        onAddPayment={(violation) => {
          setSelectedViolation(violation);
          setIsSidePanelOpen(false);
          setIsPaymentsDialogOpen(true);
        }}
      />

      {/* Payments Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <TrafficViolationPaymentsDialog
          violation={selectedViolation}
          open={isPaymentsDialogOpen}
          onOpenChange={setIsPaymentsDialogOpen}
        />
      </Suspense>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-primary" />
            المخالفات المرورية
          </h1>
          <p className="text-muted-foreground mt-1">إدارة ومتابعة المخالفات المرورية للأسطول</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="btn-hover">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="btn-hover">
                <Plus className="w-4 h-4 ml-2" />
                إضافة مخالفة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة مخالفة مرورية جديدة</DialogTitle>
              </DialogHeader>
              <Suspense fallback={<LoadingSpinner size="sm" />}>
                <TrafficViolationForm onSuccess={() => setIsFormOpen(false)} />
              </Suspense>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Violations */}
        <Card className="stat-card animate-slide-up" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المخالفات</CardTitle>
            <FileText className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold counter">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-yellow-600">{stats.pending} في الانتظار</span> ·
              <span className="text-green-600 mr-1">{stats.confirmed} مؤكدة</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card className="stat-card animate-slide-up" style={{ animationDelay: '80ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المبلغ</CardTitle>
            <DollarSign className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold counter">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              متوسط {formatCurrency(stats.averageAmount)} للمخالفة
            </p>
          </CardContent>
        </Card>

        {/* Paid Amount */}
        <Card className="stat-card animate-slide-up" style={{ animationDelay: '160ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المبلغ المدفوع</CardTitle>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 counter">{formatCurrency(stats.paidAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(stats.paidPercentage)}% نسبة
            </p>
          </CardContent>
        </Card>

        {/* Unpaid Amount */}
        <Card className="stat-card animate-slide-up" style={{ animationDelay: '240ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المبلغ المستحق</CardTitle>
            <XCircle className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 counter">{formatCurrency(stats.unpaidAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(stats.unpaidPercentage)}% نسبة
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="stat-card animate-slide-up" style={{ animationDelay: '320ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">معلقة</CardTitle>
            <Clock className="w-5 h-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 counter">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1 animate-pulse-slow">
              {Math.round(stats.pendingPercentage)}% من الإجمالي
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <Tabs defaultValue="list" className="w-full">
          <div className="border-b">
            <TabsList className="w-full h-auto flex justify-start gap-1 p-2 bg-transparent">
              <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <List className="w-4 h-4" />
                قائمة المخالفات
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Upload className="w-4 h-4" />
                استيراد PDF
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <BarChart className="w-4 h-4" />
                التقارير
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <CreditCard className="w-4 h-4" />
                المدفوعات
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content: List */}
          <TabsContent value="list" className="space-y-6 mt-0">
            {/* Search and Filters */}
            <div className="p-6 border-b animate-slide-up" style={{ animationDelay: '300ms' }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                البحث والتصفية المتقدمة
              </h3>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="البحث: رقم المخالفة، العميل، رقم اللوحة، رقم العقد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">من تاريخ</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">حالة المخالفة</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="confirmed">مؤكدة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">حالة الدفع</label>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع حالات الدفع</SelectItem>
                      <SelectItem value="paid">مدفوعة</SelectItem>
                      <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                      <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">نوع المخالفة</label>
                  <Select value={violationTypeFilter} onValueChange={setViolationTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="speeding">تجاوز السرعة</SelectItem>
                      <SelectItem value="seatbelt">عدم ربط الحزام</SelectItem>
                      <SelectItem value="mobile">استخدام الجوال</SelectItem>
                      <SelectItem value="parking">مخالفة وقوف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">المبلغ من (ر.س)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amountFrom}
                    onChange={(e) => setAmountFrom(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">المبلغ إلى (ر.س)</label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={amountTo}
                    onChange={(e) => setAmountTo(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={resetFilters} variant="outline" className="btn-hover flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  إعادة تعيين
                </Button>
                <Button variant="outline" className="btn-hover flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  حفظ الفلتر
                </Button>
                <Button variant="outline" className="btn-hover flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  تحميل فلتر
                </Button>
              </div>
            </div>

            {/* Table Section */}
            <div className="p-6">
              {/* Table Header Actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">قائمة المخالفات ({filteredViolations.length})</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">عرض:</label>
                    <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="btn-hover flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  تخصيص الأعمدة
                </Button>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <input
                  type="checkbox"
                  id="selectAll"
                  className="w-4 h-4 rounded border-border"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
                  اختيار الكل
                </label>
                <div className="border-r border-border h-5 mr-2"></div>
                <span className="text-sm text-muted-foreground">إجراءات جماعية:</span>
                <Button variant="outline" size="sm" className="btn-hover">تأكيد</Button>
                <Button variant="outline" size="sm" className="btn-hover">إلغاء</Button>
                <Button variant="outline" size="sm" className="btn-hover">تصدير</Button>
                <Button variant="outline" size="sm" className="btn-hover">طباعة</Button>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-right">
                          <input type="checkbox" className="w-4 h-4 rounded" />
                        </TableHead>
                        <TableHead className="text-right">رقم المخالفة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">نوع المخالفة</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">رقم اللوحة</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الدفع</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedViolations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            لا توجد مخالفات مطابقة للبحث
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedViolations.map((violation, index) => (
                          <TableRow
                            key={violation.id}
                            className="table-row animate-slide-right"
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <TableCell>
                              <input type="checkbox" className="w-4 h-4 rounded" />
                            </TableCell>
                            <TableCell className="font-mono font-semibold">{violation.penalty_number}</TableCell>
                            <TableCell>
                              {violation.penalty_date && format(new Date(violation.penalty_date), 'dd/MM/yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell>{violation.violation_type || violation.reason || '-'}</TableCell>
                            <TableCell className="font-bold text-primary">{formatCurrency(violation.amount || 0)}</TableCell>
                            <TableCell className="font-mono">
                              {violation.vehicles?.plate_number || violation.vehicle_plate || '-'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                // محاولة الحصول على اسم العميل من customers مباشرة
                                if (violation.customers) {
                                  const fullName = `${violation.customers.first_name || ''} ${violation.customers.last_name || ''}`.trim();
                                  return fullName || violation.customers.company_name || '-';
                                }
                                // محاولة الحصول على اسم العميل من خلال العقد
                                if (violation.contracts?.customers) {
                                  const fullName = `${violation.contracts.customers.first_name || ''} ${violation.contracts.customers.last_name || ''}`.trim();
                                  return fullName || violation.contracts.customers.company_name || '-';
                                }
                                return '-';
                              })()}
                            </TableCell>
                            <TableCell>{getStatusBadge(violation.status)}</TableCell>
                            <TableCell>{getPaymentStatusBadge(violation.payment_status || 'unpaid')}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="btn-hover p-2"
                                  onClick={() => handleOpenSidePanel(violation)}
                                  title="عرض التفاصيل"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="btn-hover p-2"
                                  onClick={() => {
                                    setSelectedViolation(violation);
                                    setIsPaymentsDialogOpen(true);
                                  }}
                                  title="إضافة دفعة"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                                {violation.status === 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="btn-hover p-2"
                                    title="تعديل"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {filteredViolations.length > pageSize && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    عرض {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredViolations.length)} من {filteredViolations.length} مخالفة
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="btn-hover"
                    >
                      الأولى
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="btn-hover"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="btn-hover"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-2 py-2 text-sm">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="btn-hover"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="btn-hover"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="btn-hover"
                    >
                      الأخيرة
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Content: Import */}
          <TabsContent value="import" className="p-6">
            <div className="text-center max-w-md mx-auto space-y-4">
              <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Upload className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold">استيراد مخالفات من PDF</h3>
              <p className="text-muted-foreground">قم بتحميل ملف PDF يحتوي على المخالفات المرورية</p>
              <Suspense fallback={<LoadingSpinner size="lg" />}>
                <TrafficViolationPDFImport />
              </Suspense>
            </div>
          </TabsContent>

          {/* Tab Content: Reports */}
          <TabsContent value="reports" className="p-6">
            <h3 className="text-xl font-bold mb-4">التقارير والإحصائيات</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="stat-card">
                <CardHeader>
                  <CardTitle>تقرير المخالفات الشهري</CardTitle>
                  <CardDescription>عرض جميع المخالفات خلال الشهر الحالي</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full btn-hover">عرض التقرير</Button>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardHeader>
                  <CardTitle>تقرير المدفوعات</CardTitle>
                  <CardDescription>ملخص المدفوعات والمبالغ المستحقة</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full btn-hover">عرض التقرير</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Content: Payments */}
          <TabsContent value="payments" className="p-6">
            <h3 className="text-xl font-bold mb-4">إدارة المدفوعات</h3>
            <p className="text-muted-foreground">عرض وإدارة جميع مدفوعات المخالفات المرورية</p>
          </TabsContent>
        </Tabs>
      </Card>
    <PageHelp 
      title="مساعدة - المخالفات المرورية"
      description="تعلم كيفية إدارة المخالفات المرورية بشكل فعال"
    >
      <TrafficViolationsPageHelpContent />
    </PageHelp>

    </div>
  );
}

