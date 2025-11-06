import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  TrendingDown,
  Scale,
  FileWarning,
  Calendar,
  DollarSign,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEnhancedJournalEntries } from "@/hooks/useGeneralLedger";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { differenceInDays, parseISO, format } from "date-fns";
import { ar } from "date-fns/locale";

type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

interface AccountingAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  icon: any;
  count?: number;
  action?: {
    label: string;
    href: string;
  };
  details?: string[];
}

const ALERT_CONFIG = {
  critical: {
    bgColor: 'bg-red-50 border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    badgeVariant: 'destructive' as const
  },
  warning: {
    bgColor: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    badgeVariant: 'secondary' as const
  },
  info: {
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    badgeVariant: 'secondary' as const
  },
  success: {
    bgColor: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    badgeVariant: 'default' as const
  }
};

export function AccountingAlerts() {
  const { formatCurrency } = useCurrencyFormatter();
  const { data: journalEntries, isLoading } = useEnhancedJournalEntries();

  // Analyze data and generate alerts
  const alerts = useMemo((): AccountingAlert[] => {
    if (!journalEntries) return [];

    const alertsList: AccountingAlert[] = [];
    const today = new Date();

    // 1. Check for unbalanced entries
    const unbalancedEntries = journalEntries.filter((entry: any) => {
      const totalDebit = Number(entry.total_debit || 0);
      const totalCredit = Number(entry.total_credit || 0);
      return Math.abs(totalDebit - totalCredit) > 0.01;
    });

    if (unbalancedEntries.length > 0) {
      alertsList.push({
        id: 'unbalanced-entries',
        severity: 'critical',
        title: 'قيود غير متوازنة',
        description: `يوجد ${unbalancedEntries.length} قيد محاسبي غير متوازن (المدين لا يساوي الدائن)`,
        icon: Scale,
        count: unbalancedEntries.length,
        action: {
          label: 'عرض القيود',
          href: '/finance/ledger'
        },
        details: unbalancedEntries.slice(0, 3).map((entry: any) => 
          `قيد #${entry.entry_number}: فرق ${formatCurrency(Math.abs(Number(entry.total_debit) - Number(entry.total_credit)))}`
        )
      });
    }

    // 2. Check for draft entries older than 7 days
    const oldDraftEntries = journalEntries.filter((entry: any) => {
      if (entry.status !== 'draft') return false;
      const entryDate = parseISO(entry.entry_date);
      return differenceInDays(today, entryDate) > 7;
    });

    if (oldDraftEntries.length > 0) {
      alertsList.push({
        id: 'old-draft-entries',
        severity: 'warning',
        title: 'قيود مسودة قديمة',
        description: `يوجد ${oldDraftEntries.length} قيد في حالة مسودة لأكثر من 7 أيام`,
        icon: Clock,
        count: oldDraftEntries.length,
        action: {
          label: 'مراجعة القيود',
          href: '/finance/ledger'
        },
        details: oldDraftEntries.slice(0, 3).map((entry: any) => 
          `قيد #${entry.entry_number}: ${differenceInDays(today, parseISO(entry.entry_date))} يوم`
        )
      });
    }

    // 3. Check for entries under review
    const underReviewEntries = journalEntries.filter((entry: any) => 
      entry.status === 'under_review'
    );

    if (underReviewEntries.length > 0) {
      alertsList.push({
        id: 'under-review-entries',
        severity: 'info',
        title: 'قيود في انتظار المراجعة',
        description: `يوجد ${underReviewEntries.length} قيد في انتظار المراجعة والاعتماد`,
        icon: FileWarning,
        count: underReviewEntries.length,
        action: {
          label: 'مراجعة القيود',
          href: '/finance/ledger'
        }
      });
    }

    // 4. Check for approved but not posted entries
    const approvedNotPostedEntries = journalEntries.filter((entry: any) => 
      entry.status === 'approved'
    );

    if (approvedNotPostedEntries.length > 0) {
      alertsList.push({
        id: 'approved-not-posted',
        severity: 'info',
        title: 'قيود معتمدة في انتظار الترحيل',
        description: `يوجد ${approvedNotPostedEntries.length} قيد معتمد ولكن لم يتم ترحيله بعد`,
        icon: Activity,
        count: approvedNotPostedEntries.length,
        action: {
          label: 'ترحيل القيود',
          href: '/finance/ledger'
        }
      });
    }

    // 5. Check for entries with negative balances (illogical accounts)
    const entriesWithNegativeBalances = journalEntries.filter((entry: any) => {
      // Check if any line has illogical negative balance
      return entry.journal_entry_lines?.some((line: any) => {
        const debit = Number(line.debit_amount || 0);
        const credit = Number(line.credit_amount || 0);
        const balance = debit - credit;
        
        // Check if this is an asset/expense account with negative balance
        const accountCode = line.account_code;
        if (accountCode && accountCode.startsWith('1') || accountCode?.startsWith('5')) {
          return balance < -1000; // Threshold for significant negative
        }
        return false;
      });
    });

    if (entriesWithNegativeBalances.length > 0) {
      alertsList.push({
        id: 'negative-balances',
        severity: 'warning',
        title: 'أرصدة سالبة غير منطقية',
        description: `يوجد ${entriesWithNegativeBalances.length} قيد يحتوي على أرصدة سالبة لحسابات الأصول أو المصروفات`,
        icon: TrendingDown,
        count: entriesWithNegativeBalances.length,
        action: {
          label: 'فحص الأرصدة',
          href: '/finance/chart-of-accounts'
        }
      });
    }

    // 6. Check for entries without cost center (if required)
    const entriesWithoutCostCenter = journalEntries.filter((entry: any) => 
      !entry.cost_center_id && entry.status === 'draft'
    );

    if (entriesWithoutCostCenter.length > 5) { // Only alert if more than 5
      alertsList.push({
        id: 'missing-cost-center',
        severity: 'info',
        title: 'قيود بدون مركز تكلفة',
        description: `يوجد ${entriesWithoutCostCenter.length} قيد بدون تحديد مركز تكلفة`,
        icon: Info,
        count: entriesWithoutCostCenter.length,
        action: {
          label: 'تحديث القيود',
          href: '/finance/ledger'
        }
      });
    }

    // 7. Check for recent posted entries (success message)
    const recentPostedEntries = journalEntries.filter((entry: any) => {
      if (entry.status !== 'posted') return false;
      const postedDate = entry.posted_at ? parseISO(entry.posted_at) : null;
      if (!postedDate) return false;
      return differenceInDays(today, postedDate) === 0;
    });

    if (recentPostedEntries.length > 0) {
      alertsList.push({
        id: 'recent-posted',
        severity: 'success',
        title: 'قيود تم ترحيلها اليوم',
        description: `تم ترحيل ${recentPostedEntries.length} قيد بنجاح اليوم`,
        icon: CheckCircle,
        count: recentPostedEntries.length,
        action: {
          label: 'عرض القيود',
          href: '/finance/ledger'
        }
      });
    }

    // Sort by severity: critical > warning > info > success
    const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
    return alertsList.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
  }, [journalEntries, formatCurrency]);

  // Summary stats
  const stats = useMemo(() => {
    return {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      total: alerts.length
    };
  }, [alerts]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                نظام التنبيهات المحاسبية
              </CardTitle>
              <CardDescription>
                مراقبة تلقائية للأخطاء والمشاكل المحاسبية المحتملة
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {stats.critical > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {stats.critical} حرج
                </Badge>
              )}
              {stats.warning > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {stats.warning} تحذير
                </Badge>
              )}
              {stats.total === 0 && (
                <Badge variant="default" className="text-sm">
                  ✓ لا توجد مشاكل
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  ممتاز! لا توجد مشاكل محاسبية
                </h3>
                <p className="text-green-700">
                  جميع القيود المحاسبية متوازنة وفي حالة جيدة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.severity];
            const Icon = alert.icon;
            
            return (
              <Card key={alert.id} className={`${config.bgColor} border`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-6 w-6 ${config.iconColor}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-semibold ${config.textColor}`}>
                          {alert.title}
                        </h3>
                        {alert.count && (
                          <Badge variant={config.badgeVariant}>
                            {alert.count}
                          </Badge>
                        )}
                      </div>
                      
                      <p className={`${config.textColor} mb-3`}>
                        {alert.description}
                      </p>
                      
                      {/* Details */}
                      {alert.details && alert.details.length > 0 && (
                        <div className={`mb-3 p-3 rounded-md bg-white/50`}>
                          <p className="text-sm font-medium mb-2">أمثلة:</p>
                          <ul className="text-sm space-y-1">
                            {alert.details.map((detail, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Action Button */}
                      {alert.action && (
                        <Link to={alert.action.href}>
                          <Button size="sm" variant="default">
                            {alert.action.label}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">نصائح لتجنب الأخطاء المحاسبية:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>تأكد من أن المدين يساوي الدائن في كل قيد</li>
                <li>راجع القيود المسودة بشكل دوري وقم بترحيلها</li>
                <li>استخدم مراكز التكلفة لتتبع النفقات بشكل أفضل</li>
                <li>راقب الأرصدة السالبة غير المنطقية في حسابات الأصول</li>
                <li>اعتمد نظام workflow واضح لمراجعة القيود</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

