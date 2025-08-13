import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Plus, Eye, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useEmployeePayrollHistory } from '@/hooks/usePayroll';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import PayrollDialog from './PayrollDialog';
import { CreatePayrollData } from '@/hooks/usePayroll';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  position?: string;
  department?: string;
  basic_salary: number;
  allowances: number;
  bank_account?: string;
  iban?: string;
}

interface EmployeePayrollDetailsProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePayroll: (data: CreatePayrollData) => void;
  isCreatingPayroll?: boolean;
}

export default function EmployeePayrollDetails({
  employee,
  open,
  onOpenChange,
  onCreatePayroll,
  isCreatingPayroll
}: EmployeePayrollDetailsProps) {
  const [showCreatePayroll, setShowCreatePayroll] = useState(false);
const { data: payrollHistory, isLoading } = useEmployeePayrollHistory(employee.id);
 
   const { formatCurrency } = useCurrencyFormatter();

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'مسودة', variant: 'secondary' as const },
      approved: { label: 'معتمد', variant: 'default' as const },
      paid: { label: 'مدفوع', variant: 'destructive' as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  const calculatePayrollStats = () => {
    if (!payrollHistory || payrollHistory.length === 0) {
      return {
        totalPaid: 0,
        averageSalary: 0,
        lastPayment: null,
        paymentTrend: 0
      };
    }

    const totalPaid = payrollHistory
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.net_amount, 0);

    const averageSalary = totalPaid / Math.max(payrollHistory.filter(p => p.status === 'paid').length, 1);

    const lastPayment = payrollHistory
      .filter(p => p.status === 'paid')
      .sort((a, b) => new Date(b.payroll_date).getTime() - new Date(a.payroll_date).getTime())[0];

    // Calculate trend (comparison between last 2 payments)
    const paidPayrolls = payrollHistory
      .filter(p => p.status === 'paid')
      .sort((a, b) => new Date(b.payroll_date).getTime() - new Date(a.payroll_date).getTime());

    let paymentTrend = 0;
    if (paidPayrolls.length >= 2) {
      const current = paidPayrolls[0].net_amount;
      const previous = paidPayrolls[1].net_amount;
      paymentTrend = ((current - previous) / previous) * 100;
    }

    return {
      totalPaid,
      averageSalary,
      lastPayment,
      paymentTrend
    };
  };

  const stats = calculatePayrollStats();

  const handleCreatePayroll = (data: CreatePayrollData) => {
    onCreatePayroll(data);
    setShowCreatePayroll(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              تفاصيل رواتب {employee.first_name} {employee.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Employee Info Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات الموظف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الموظف</p>
                    <p className="font-medium">{employee.employee_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المنصب</p>
                    <p className="font-medium">{employee.position || 'غير محدد'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                    <p className="font-medium text-green-600">{formatCurrency(employee.basic_salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البدلات</p>
                    <p className="font-medium">{formatCurrency(employee.allowances || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">متوسط الراتب</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.averageSalary)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">آخر دفع</p>
                      <p className="text-lg font-bold text-purple-600">
                        {stats.lastPayment ? 
                          new Date(stats.lastPayment.payroll_date).toLocaleDateString('en-GB') : 
                          'لا يوجد'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {stats.paymentTrend >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">اتجاه التغيير</p>
                      <p className={`text-lg font-bold ${stats.paymentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.paymentTrend.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => setShowCreatePayroll(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة راتب جديد
              </Button>
            </div>

            {/* Payroll History */}
            <Card>
              <CardHeader>
                <CardTitle>سجل الرواتب</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : payrollHistory && payrollHistory.length > 0 ? (
                  <div className="space-y-4">
                    {payrollHistory.map((payroll) => (
                      <div key={payroll.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{payroll.payroll_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payroll.pay_period_start).toLocaleDateString('en-GB')} - {' '}
                                {new Date(payroll.pay_period_end).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">إجمالي</p>
                              <p className="font-semibold">{formatCurrency(payroll.basic_salary + payroll.allowances + payroll.overtime_amount)}</p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">خصومات</p>
                              <p className="font-semibold text-red-600">{formatCurrency(payroll.deductions + payroll.tax_amount)}</p>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">صافي</p>
                              <p className="font-semibold text-green-600">{formatCurrency(payroll.net_amount)}</p>
                            </div>
                            
                            <Badge variant={getStatusBadge(payroll.status).variant}>
                              {getStatusBadge(payroll.status).label}
                            </Badge>
                            
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد رواتب مسجلة لهذا الموظف</p>
                    <Button className="mt-4" onClick={() => setShowCreatePayroll(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة أول راتب
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payroll Dialog */}
      <PayrollDialog
        open={showCreatePayroll}
        onOpenChange={setShowCreatePayroll}
        onSubmit={handleCreatePayroll}
        employees={[employee]}
        selectedEmployeeId={employee.id}
        isLoading={isCreatingPayroll}
      />
    </>
  );
}