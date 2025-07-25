import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Search,
  Download,
  Eye,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayrollFinancialAnalysis, usePayrollSummary } from '@/hooks/usePayrollFinancialAnalysis';
import { exportToHTML } from '@/hooks/useFinancialReportsExport';
import { Link } from 'react-router-dom';

export const PayrollReportsPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const { data: payrollData, isLoading: payrollLoading } = usePayrollFinancialAnalysis({
    status: statusFilter || undefined,
    period_start: periodStart || undefined,
    period_end: periodEnd || undefined,
  });

  const { data: summary, isLoading: summaryLoading } = usePayrollSummary({
    period_start: periodStart || undefined,
    period_end: periodEnd || undefined,
  });

  const getIntegrationStatusBadge = (status: string) => {
    const statusMap = {
      integrated: { 
        label: 'مدمج', 
        variant: 'default' as const, 
        icon: CheckCircle,
        color: 'text-green-600'
      },
      pending: { 
        label: 'معلق', 
        variant: 'secondary' as const, 
        icon: Clock,
        color: 'text-yellow-600'
      },
      error: { 
        label: 'خطأ', 
        variant: 'destructive' as const, 
        icon: AlertCircle,
        color: 'text-red-600'
      },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const getPayrollStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'مسودة', variant: 'outline' as const },
      pending_approval: { label: 'في انتظار الموافقة', variant: 'secondary' as const },
      approved: { label: 'معتمد', variant: 'default' as const },
      paid: { label: 'مدفوع', variant: 'default' as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  const filteredPayrollData = payrollData?.filter(payroll =>
    payroll.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payroll.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payroll.payroll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payroll.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleExportReport = () => {
    if (!payrollData || payrollData.length === 0) return;

    const tableContent = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">رقم الراتب</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">الموظف</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">القسم</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">تاريخ الراتب</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">الراتب الأساسي</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">البدلات</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">الخصومات</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">صافي الراتب</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">حالة التكامل</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">رقم القيد</th>
          </tr>
        </thead>
        <tbody>
          ${filteredPayrollData.map(payroll => `
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${payroll.payroll_number}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${payroll.first_name} ${payroll.last_name}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${payroll.department || 'غير محدد'}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${new Date(payroll.payroll_date).toLocaleDateString('ar-SA')}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${formatCurrency(payroll.basic_salary)}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${formatCurrency(payroll.allowances)}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${formatCurrency(payroll.deductions)}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; font-weight: bold;">${formatCurrency(payroll.net_amount)}</td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">
                <span style="color: ${payroll.integration_status === 'integrated' ? 'green' : payroll.integration_status === 'error' ? 'red' : 'orange'};">
                  ${getIntegrationStatusBadge(payroll.integration_status).label}
                </span>
              </td>
              <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">${payroll.journal_entry_number || 'غير متوفر'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background-color: #f0f9ff; font-weight: bold;">
            <td colspan="7" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">الإجمالي</td>
            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">${formatCurrency(filteredPayrollData.reduce((sum, p) => sum + p.net_amount, 0))}</td>
            <td colspan="2" style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">${filteredPayrollData.length} راتب</td>
          </tr>
        </tfoot>
      </table>
    `;

    exportToHTML(tableContent, "تقرير الرواتب المالي", "اسم الشركة");
  };

  if (payrollLoading || summaryLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              إجمالي الرواتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalPayrolls || 0}</div>
            <p className="text-xs text-muted-foreground">راتب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              إجمالي المبلغ الصافي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalNetAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">دينار كويتي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              معدل التكامل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.integrationRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.integratedCount || 0} من {summary?.totalPayrolls || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              متوسط الراتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.averageNetAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">دينار كويتي</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                تقرير الرواتب المالي
              </CardTitle>
              <CardDescription>
                تفاصيل جميع الرواتب وحالة التكامل مع النظام المحاسبي
              </CardDescription>
            </div>
            <Button onClick={handleExportReport} size="sm">
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث بالاسم أو رقم الراتب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="حالة الراتب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="pending_approval">في انتظار الموافقة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="من تاريخ"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full md:w-40"
            />

            <Input
              type="date"
              placeholder="إلى تاريخ"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full md:w-40"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الراتب</TableHead>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">تاريخ الراتب</TableHead>
                  <TableHead className="text-right">صافي الراتب</TableHead>
                  <TableHead className="text-right">حالة الراتب</TableHead>
                  <TableHead className="text-right">حالة التكامل</TableHead>
                  <TableHead className="text-right">القيد المحاسبي</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrollData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">لا توجد رواتب تطابق المعايير المحددة</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayrollData.map((payroll) => {
                    const integrationStatus = getIntegrationStatusBadge(payroll.integration_status);
                    const payrollStatus = getPayrollStatusBadge(payroll.status);
                    const StatusIcon = integrationStatus.icon;

                    return (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{payroll.payroll_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {payroll.first_name} {payroll.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              رقم الموظف: {payroll.employee_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{payroll.department || 'غير محدد'}</TableCell>
                        <TableCell>
                          {new Date(payroll.payroll_date).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(payroll.net_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payrollStatus.variant}>
                            {payrollStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${integrationStatus.color}`} />
                            <Badge variant={integrationStatus.variant}>
                              {integrationStatus.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payroll.journal_entry_number ? (
                            <Link 
                              to={`/finance/ledger`}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {payroll.journal_entry_number}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">غير متوفر</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};