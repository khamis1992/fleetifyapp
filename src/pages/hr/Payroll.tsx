import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Search, Plus, FileText, Check, Clock, Users, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { 
  usePayrollRecords, 
  usePayrollReviews, 
  useCreatePayroll, 
  useUpdatePayrollStatus,
  useUpdatePayroll,
  useDeletePayroll,
  CreatePayrollData,
  PayrollRecord 
} from '@/hooks/usePayroll';
import PayrollDialog from '@/components/hr/PayrollDialog';
import PayrollDetailsModal from '@/components/hr/PayrollDetailsModal';
import EditPayrollDialog from '@/components/hr/EditPayrollDialog';
import PayrollActionButtons from '@/components/hr/PayrollActionButtons';
import { PageHelp } from "@/components/help";
import { PayrollPageHelpContent } from "@/components/help/content";

interface PayrollReview {
  id: string;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_amount: number;
  total_deductions: number;
  net_amount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  created_at: string;
}

export default function Payroll() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePayroll, setShowCreatePayroll] = useState(false);
  const [showPayrollDetails, setShowPayrollDetails] = useState(false);
  const [showEditPayroll, setShowEditPayroll] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // Fetch data
  const { data: payrollRecords, isLoading: recordsLoading } = usePayrollRecords();
  const { data: payrollReviews, isLoading: reviewsLoading } = usePayrollReviews();
  const createPayrollMutation = useCreatePayroll();
  const updatePayrollStatusMutation = useUpdatePayrollStatus();
  const updatePayrollMutation = useUpdatePayroll();
const deletePayrollMutation = useDeletePayroll();
 
   const { formatCurrency } = useCurrencyFormatter();

  // Fetch employees for payroll creation
  const { data: employees } = useQuery({
    queryKey: ['employees-for-payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, position, department, basic_salary, allowances, bank_account, iban')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'مسودة', variant: 'secondary' as const },
      pending_approval: { label: 'في انتظار الموافقة', variant: 'outline' as const },
      approved: { label: 'معتمد', variant: 'default' as const },
      paid: { label: 'مدفوع', variant: 'destructive' as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  const handleCreatePayroll = (data: CreatePayrollData) => {
    createPayrollMutation.mutate(data);
    setShowCreatePayroll(false);
  };

  const handleViewPayroll = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowPayrollDetails(true);
  };

  const handleEditPayroll = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowEditPayroll(true);
  };

  const handleUpdatePayroll = (data: CreatePayrollData) => {
    if (selectedPayroll) {
      updatePayrollMutation.mutate({
        id: selectedPayroll.id,
        updates: data
      });
      setShowEditPayroll(false);
    }
  };

  const handleApprovePayroll = (payroll: PayrollRecord) => {
    updatePayrollStatusMutation.mutate({
      id: payroll.id,
      status: 'approved'
    });
  };

  const handlePayPayroll = (payroll: PayrollRecord) => {
    updatePayrollStatusMutation.mutate({
      id: payroll.id,
      status: 'paid'
    });
  };

  const handleDeletePayroll = (payrollId: string) => {
    deletePayrollMutation.mutate(payrollId);
  };

  const filteredReviews = payrollReviews?.filter(review =>
    review.period_start.includes(searchTerm) ||
    review.period_end.includes(searchTerm)
  ) || [];

  const filteredRecords = payrollRecords?.filter(record =>
    record.employee?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employee?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.payroll_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (recordsLoading || reviewsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">إدارة الرواتب</h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">إدارة ومراجعة رواتب الموظفين</p>
          </div>
        </div>
        <Button onClick={() => setShowCreatePayroll(true)} className="w-full sm:w-auto min-h-[44px] bg-teal-500 hover:bg-teal-600 text-white shadow-sm">
          <Plus className="h-4 w-4 ml-2" />
          إضافة راتب جديد
        </Button>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <TabsTrigger value="records">سجلات الرواتب</TabsTrigger>
          <TabsTrigger value="reviews">مراجعات الرواتب</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="البحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        <TabsContent value="records">
          <div className="grid gap-4">
            {filteredRecords.length === 0 ? (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">لا توجد سجلات رواتب</p>
                    <Button className="mt-4 w-full sm:w-auto min-h-[44px] bg-teal-500 hover:bg-teal-600 text-white shadow-sm" onClick={() => setShowCreatePayroll(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة أول راتب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRecords.map((record) => {
                const statusInfo = getStatusBadge(record.status);
                return (
                  <Card key={record.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all duration-300">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                              {record.employee?.first_name} {record.employee?.last_name}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">رقم الراتب: {record.payroll_number}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {new Date(record.pay_period_start).toLocaleDateString('en-GB')} - {' '}
                              {new Date(record.pay_period_end).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full md:w-auto md:flex-1 gap-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                            <div className="text-right sm:text-center flex-1 sm:flex-initial">
                              <p className="text-sm text-slate-600 dark:text-slate-400">صافي الراتب</p>
                              <p className="font-semibold text-green-600 text-lg">
                                {formatCurrency(record.net_amount)}
                              </p>
                            </div>

                            <div className="text-right sm:text-center flex-1 sm:flex-initial">
                              <p className="text-sm text-slate-600 dark:text-slate-400">حالة التكامل</p>
                              <div className="flex items-center gap-1 justify-start sm:justify-center">
                                {record.journal_entry_id ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-600">مدمج</span>
                                  </>
                                ) : record.status === 'paid' ? (
                                  <>
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm text-red-600">خطأ</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm text-yellow-600">معلق</span>
                                  </>
                                )}
                              </div>
                              {record.journal_entry_id && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  قيد رقم: {record.journal_entry_id.substring(0, 8)}...
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant={statusInfo.variant} className={statusInfo.variant === 'default' ? 'bg-teal-500 text-white' : ''}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>

                          <PayrollActionButtons
                            payroll={record}
                            onView={handleViewPayroll}
                            onEdit={handleEditPayroll}
                            onApprove={() => handleApprovePayroll(record)}
                            onPay={() => handlePayPayroll(record)}
                            onDelete={() => handleDeletePayroll(record.id)}
                            isUpdating={updatePayrollStatusMutation.isPending || updatePayrollMutation.isPending}
                            isDeleting={deletePayrollMutation.isPending}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="grid gap-4">
            {filteredReviews.length === 0 ? (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">لا توجد مراجعات رواتب</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredReviews.map((review) => {
                const statusInfo = getStatusBadge(review.status);
                return (
                  <Card key={review.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all duration-300">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                              دورة رواتب من {review.period_start} إلى {review.period_end}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                              {review.total_employees} موظف
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                          <div className="text-right sm:text-center flex-1 sm:flex-initial">
                            <p className="text-sm text-slate-600 dark:text-slate-400">صافي المبلغ</p>
                            <p className="font-semibold text-green-600 text-lg">
                              {formatCurrency(review.net_amount)}
                            </p>
                          </div>

                          <Badge variant={statusInfo.variant} className={statusInfo.variant === 'default' ? 'bg-teal-500 text-white' : ''}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <PayrollDialog
        open={showCreatePayroll}
        onOpenChange={setShowCreatePayroll}
        onSubmit={handleCreatePayroll}
        employees={employees || []}
        isLoading={createPayrollMutation.isPending}
      />

      <PayrollDetailsModal
        open={showPayrollDetails}
        onOpenChange={setShowPayrollDetails}
        payroll={selectedPayroll}
      />

      <EditPayrollDialog
        open={showEditPayroll}
        onOpenChange={setShowEditPayroll}
        onSubmit={handleUpdatePayroll}
        payroll={selectedPayroll}
        employees={employees || []}
        isLoading={updatePayrollMutation.isPending}
      />
    <PageHelp content={<PayrollPageHelpContent />} />

    </div>
  );
}