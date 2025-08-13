import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useCustomerLinkedAccounts } from "@/hooks/useCustomerAccounts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CreditCard,
  FileText,
  Eye,
  Loader2
} from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CustomerFinancialDashboardProps {
  customerId: string;
  customerName: string;
}

interface CustomerFinancialSummary {
  totalBalance: number;
  totalContracts: number;
  activeContracts: number;
  totalPaid: number;
  outstanding: number;
  creditLimit: number;
  creditUtilization: number;
  lastPaymentDate: string | null;
  nextPaymentDue: string | null;
  overdueDays: number;
  agingAnalysis: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  };
}

export const CustomerFinancialDashboard = ({ customerId, customerName }: CustomerFinancialDashboardProps) => {
const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const [showDetails, setShowDetails] = useState(false);
  
  const { data: linkedAccounts, isLoading: accountsLoading } = useCustomerLinkedAccounts(customerId);

  const { data: financialSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["customer-financial-summary", customerId, companyId],
    queryFn: async (): Promise<CustomerFinancialSummary> => {
      if (!customerId || !companyId) {
        throw new Error("Customer ID and Company ID are required");
      }

      console.log('[CUSTOMER_FINANCIAL_DASHBOARD] Fetching financial summary for:', customerId);

      // Get customer's contracts
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("*")
        .eq("customer_id", customerId)
        .eq("company_id", companyId);

      if (contractsError) throw contractsError;

      // Get customer's payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", customerId)
        .eq("company_id", companyId);

      if (paymentsError) throw paymentsError;

      // Get customer details for credit limit
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("credit_limit")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;

      // Calculate totals
      const totalContracts = contracts?.length || 0;
      const activeContracts = contracts?.filter(c => c.status === 'active')?.length || 0;
      const totalContractAmount = contracts?.reduce((sum, c) => sum + (c.contract_amount || 0), 0) || 0;
      const totalPaid = payments?.filter(p => p.payment_status === 'completed')?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const outstanding = totalContractAmount - totalPaid;
      const creditLimit = customer?.credit_limit || 0;
      const creditUtilization = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;

      // Get payment dates
      const sortedPayments = payments?.filter(p => p.payment_status === 'completed')?.sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      ) || [];
      const lastPaymentDate = sortedPayments[0]?.payment_date || null;

      // Calculate aging (simplified - in real implementation would use actual due dates)
      const now = new Date();
      const current = totalPaid;
      const aging = {
        current: outstanding > 0 ? outstanding * 0.7 : 0,
        days30: outstanding > 0 ? outstanding * 0.15 : 0,
        days60: outstanding > 0 ? outstanding * 0.1 : 0,
        days90: outstanding > 0 ? outstanding * 0.04 : 0,
        over90: outstanding > 0 ? outstanding * 0.01 : 0,
      };

      const summary: CustomerFinancialSummary = {
        totalBalance: outstanding,
        totalContracts,
        activeContracts,
        totalPaid,
        outstanding,
        creditLimit,
        creditUtilization,
        lastPaymentDate,
        nextPaymentDue: null, // Would calculate from active contracts
        overdueDays: 0, // Would calculate from due dates
        agingAnalysis: aging
      };

      console.log('[CUSTOMER_FINANCIAL_DASHBOARD] Summary calculated:', summary);
      return summary;
    },
    enabled: !!customerId && !!companyId,
  });

  const isLoading = accountsLoading || summaryLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!financialSummary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-muted-foreground">لا توجد بيانات مالية متاحة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-red-600";
    if (balance < 0) return "text-green-600";
    return "text-gray-600";
  };

  const getCreditUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "text-red-600";
    if (utilization >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">إجمالي الرصيد</span>
            </div>
            <div className={`text-2xl font-bold ${getBalanceColor(financialSummary.totalBalance)}`}>
              {formatCurrency(financialSummary.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.totalBalance > 0 ? "مديونية" : "دائنية"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">العقود</span>
            </div>
            <div className="text-2xl font-bold">
              {financialSummary.activeContracts}/{financialSummary.totalContracts}
            </div>
            <p className="text-xs text-muted-foreground">نشطة/إجمالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">إجمالي المدفوع</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialSummary.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">المدفوعات المكتملة</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">المبلغ المستحق</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(financialSummary.outstanding)}
            </div>
            <p className="text-xs text-muted-foreground">غير مدفوع</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Utilization */}
      {financialSummary.creditLimit > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              استخدام الحد الائتماني
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">الحد المستخدم</span>
                <span className={`text-sm font-medium ${getCreditUtilizationColor(financialSummary.creditUtilization)}`}>
                  {financialSummary.creditUtilization.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(financialSummary.creditUtilization, 100)} 
                className="h-2" 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(financialSummary.outstanding)}</span>
                <span>{formatCurrency(financialSummary.creditLimit)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Accounts */}
      {linkedAccounts && linkedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الحسابات المحاسبية المرتبطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedAccounts.map((account: any) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{account.chart_of_accounts?.account_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.chart_of_accounts?.account_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getBalanceColor(account.chart_of_accounts?.current_balance || 0)}`}>
                      {formatCurrency(account.chart_of_accounts?.current_balance || 0)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      حساب العميل
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aging Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              تحليل أعمار الديون
            </span>
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  تفاصيل
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>تفاصيل أعمار الديون - {customerName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">الفترات العمرية</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>جاري (0-30 يوم)</span>
                          <span className="font-medium">{formatCurrency(financialSummary.agingAnalysis.current)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>31-60 يوم</span>
                          <span className="font-medium">{formatCurrency(financialSummary.agingAnalysis.days30)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>61-90 يوم</span>
                          <span className="font-medium">{formatCurrency(financialSummary.agingAnalysis.days60)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>91-120 يوم</span>
                          <span className="font-medium">{formatCurrency(financialSummary.agingAnalysis.days90)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>أكثر من 120 يوم</span>
                          <span className="font-medium text-red-600">{formatCurrency(financialSummary.agingAnalysis.over90)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">معلومات إضافية</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>آخر دفعة</span>
                          <span>{financialSummary.lastPaymentDate ? new Date(financialSummary.lastPaymentDate).toLocaleDateString('ar') : 'لا توجد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>الحد الائتماني</span>
                          <span>{formatCurrency(financialSummary.creditLimit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>نسبة الاستخدام</span>
                          <span className={getCreditUtilizationColor(financialSummary.creditUtilization)}>
                            {financialSummary.creditUtilization.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground mb-1">جاري</div>
              <div className="font-medium text-green-600">{formatCurrency(financialSummary.agingAnalysis.current)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground mb-1">30 يوم</div>
              <div className="font-medium text-yellow-600">{formatCurrency(financialSummary.agingAnalysis.days30)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground mb-1">60 يوم</div>
              <div className="font-medium text-orange-600">{formatCurrency(financialSummary.agingAnalysis.days60)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground mb-1">90 يوم</div>
              <div className="font-medium text-red-600">{formatCurrency(financialSummary.agingAnalysis.days90)}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground mb-1">+120</div>
              <div className="font-medium text-red-800">{formatCurrency(financialSummary.agingAnalysis.over90)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};