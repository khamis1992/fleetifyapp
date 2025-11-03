/**
 * Payments Dashboard Component
 * Unified view of all payment statuses with quick actions
 *
 * Features:
 * - Summary cards for key payment metrics
 * - Quick actions for common payment operations
 * - Overdue payments table with inline actions
 * - Auto-refresh every 60 seconds
 * - Loading states with skeleton loaders
 * - Error handling with user-friendly messages
 */

import { useState } from "react";
import { usePaymentsSummary } from "@/hooks/usePaymentsSummary";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Mail,
  FileText,
  MoreHorizontal,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const PaymentsDashboard = () => {
  const { data: summary, isLoading, error, refetch } = usePaymentsSummary();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // Placeholder functions for quick actions
  const openRecordPaymentDialog = () => {
    // فتح صفحة تسجيل الدفعات الجديدة
    window.open('/payment-registration', '_blank');
  };

  const sendPaymentReminders = () => {
    toast.info("ميزة إرسال التذكيرات قيد التطوير");
  };

  const generatePaymentReport = () => {
    toast.info("ميزة تقرير المدفوعات قيد التطوير");
  };

  const recordPayment = (payment: any) => {
    // فتح صفحة تسجيل الدفعات الجديدة
    window.open('/payment-registration', '_blank');
  };

  const sendReminder = (payment: any) => {
    toast.info(`إرسال تذكير للعقد ${payment.contract_number}`);
  };

  const viewContract = (payment: any) => {
    toast.info(`عرض تفاصيل العقد ${payment.contract_number}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>لوحة المدفوعات</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة المدفوعات</h1>
            <p className="text-muted-foreground text-sm">عرض موحد لجميع حالات المدفوعات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-24 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>لوحة المدفوعات</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              خطأ في تحميل بيانات المدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>إعادة المحاولة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>لوحة المدفوعات</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
          <CreditCard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">لوحة المدفوعات</h1>
          <p className="text-muted-foreground text-sm">عرض موحد لجميع حالات المدفوعات</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ الإجمالي المستحق</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_outstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">إجمالي المبالغ المستحقة</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">متأخر</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary?.overdue_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.overdue_count || 0} عقد متأخر
            </p>
          </CardContent>
        </Card>

        {/* Due This Week */}
        <Card className="border-warning bg-warning/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warning">مستحق هذا الأسبوع</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(summary?.due_this_week || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">خلال 7 أيام</p>
          </CardContent>
        </Card>

        {/* Paid This Month */}
        <Card className="border-success bg-success/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-success">مدفوع هذا الشهر</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary?.paid_this_month || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "MMMM yyyy", { locale: ar })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={openRecordPaymentDialog}>
            <Plus className="mr-2 h-4 w-4" />
            تسجيل دفعة
          </Button>
          <Button variant="outline" onClick={sendPaymentReminders}>
            <Mail className="mr-2 h-4 w-4" />
            إرسال تذكيرات
          </Button>
          <Button variant="outline" onClick={generatePaymentReport}>
            <FileText className="mr-2 h-4 w-4" />
            تقرير المدفوعات
          </Button>
        </CardContent>
      </Card>

      {/* Overdue Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>المدفوعات المتأخرة</CardTitle>
          <p className="text-sm text-muted-foreground">
            {summary?.overdue_payments?.length || 0} عقد متأخر
          </p>
        </CardHeader>
        <CardContent>
          {!summary?.overdue_payments || summary.overdue_payments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد مدفوعات متأخرة</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم العقد</TableHead>
                    <TableHead>اسم العميل</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>الأيام المتأخرة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.overdue_payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.contract_number}</TableCell>
                      <TableCell>{payment.customer_name}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{payment.days_overdue} يوم</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => recordPayment(payment)}>
                              <Plus className="mr-2 h-4 w-4" />
                              تسجيل دفعة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendReminder(payment)}>
                              <Mail className="mr-2 h-4 w-4" />
                              إرسال تذكير
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => viewContract(payment)}>
                              <FileText className="mr-2 h-4 w-4" />
                              عرض العقد
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsDashboard;
