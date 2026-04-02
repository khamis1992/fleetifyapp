import { usePaymentsSummary } from "@/hooks/usePaymentsSummary";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import StatCard from "@/components/ui/StatCard";
import {
  Plus,
  Mail,
  FileText,
  MoreHorizontal,
  AlertCircle,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const PaymentsDashboard = () => {
  const { data: summary, isLoading, error, refetch } = usePaymentsSummary();
  const { formatCurrency } = useCurrencyFormatter();

  const openRecordPaymentDialog = () => {
    window.open('/payment-registration', '_blank');
  };

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

        <div>
          <h1 className="text-2xl font-bold text-slate-900">لوحة المدفوعات</h1>
          <p className="text-sm text-slate-500 mt-1">عرض موحد لجميع حالات المدفوعات</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

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

        <Card className="bg-white rounded-xl border border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              خطأ في تحميل بيانات المدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 mb-4">{error.message}</p>
            <Button onClick={() => refetch()} className="bg-slate-900 hover:bg-slate-800">إعادة المحاولة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      <div>
        <h1 className="text-2xl font-bold text-slate-900">لوحة المدفوعات</h1>
        <p className="text-sm text-slate-500 mt-1">عرض موحد لجميع حالات المدفوعات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="المبلغ الإجمالي المستحق"
          value={formatCurrency(summary?.total_outstanding || 0)}
          subtitle="إجمالي المبالغ المستحقة"
          icon={DollarSign}
          variant="coral"
        />
        <StatCard
          title="متأخر"
          value={formatCurrency(summary?.overdue_amount || 0)}
          subtitle={`${summary?.overdue_count || 0} عقد متأخر`}
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="مستحق هذا الأسبوع"
          value={formatCurrency(summary?.due_this_week || 0)}
          subtitle="خلال 7 أيام"
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title="مدفوع هذا الشهر"
          value={formatCurrency(summary?.paid_this_month || 0)}
          subtitle={format(new Date(), "MMMM yyyy", { locale: ar })}
          icon={CheckCircle}
          variant="emerald"
        />
      </div>

      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={openRecordPaymentDialog}
            className="h-11 bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="ml-2 h-4 w-4" />
            تسجيل دفعة
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled className="h-11">
                  <Mail className="ml-2 h-4 w-4" />
                  إرسال تذكيرات
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ستتوفر قريباً</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled className="h-11">
                  <FileText className="ml-2 h-4 w-4" />
                  تقرير المدفوعات
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ستتوفر قريباً</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">المدفوعات المتأخرة</CardTitle>
          <p className="text-sm text-slate-500">
            {summary?.overdue_payments?.length || 0} عقد متأخر
          </p>
        </CardHeader>
        <CardContent>
          {!summary?.overdue_payments || summary.overdue_payments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد مدفوعات متأخرة</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-right">رقم العقد</TableHead>
                    <TableHead className="text-right">اسم العميل</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                    <TableHead className="text-right">الأيام المتأخرة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.overdue_payments.map((payment) => (
                    <TableRow key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-medium">{payment.contract_number}</TableCell>
                      <TableCell>{payment.customer_name}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-700">{payment.days_overdue} يوم</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={openRecordPaymentDialog}>
                              <Plus className="ml-2 h-4 w-4" />
                              تسجيل دفعة
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <Mail className="ml-2 h-4 w-4" />
                              إرسال تذكير (ستتوفر قريباً)
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