import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, addMonths, isBefore, isSameDay, isAfter } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface SettlementPayment {
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'missed';
  paidDate?: string;
}

interface Settlement {
  id: string;
  caseNumber: string;
  clientName: string;
  agreedAmount: number;
  monthlyPayment: number;
  startDate: string;
  months: number;
  payments: SettlementPayment[];
  status: 'active' | 'completed' | 'broken' | 'paused';
}

interface SettlementComplianceProps {
  settlements?: Settlement[];
  onReopenCase?: (settlementId: string) => void;
}

export const SettlementCompliance: React.FC<SettlementComplianceProps> = ({
  settlements = [],
  onReopenCase,
}) => {
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(false);

  const complianceStats = useMemo(() => {
    const stats = {
      active: 0,
      completed: 0,
      broken: 0,
      paused: 0,
      totalDue: 0,
      totalOverdue: 0,
      missedPayments: 0,
      compliantRate: 0,
    };

    settlements.forEach((settlement) => {
      stats[settlement.status as keyof typeof stats]++;

      settlement.payments.forEach((payment) => {
        if (payment.status === 'pending' || payment.status === 'overdue') {
          stats.totalDue += payment.amount;
        }
        if (payment.status === 'overdue') {
          stats.totalOverdue += payment.amount;
        }
        if (payment.status === 'missed') {
          stats.missedPayments += 1;
        }
      });
    });

    const totalPayments = settlements.reduce((sum, s) => sum + s.payments.length, 0);
    const paidPayments = settlements.reduce(
      (sum, s) => sum + s.payments.filter((p) => p.status === 'paid').length,
      0
    );

    stats.compliantRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;

    return stats;
  }, [settlements]);

  const handleReopenCase = async (settlementId: string) => {
    try {
      setLoading(true);
      onReopenCase?.(settlementId);
      toast.success('تم إعادة فتح القضية');
    } catch (error) {
      console.error('Error:', error);
      toast.error('خطأ في إعادة فتح القضية');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'outline',
      overdue: 'destructive',
      missed: 'destructive',
    };
    const labels: Record<string, string> = {
      paid: 'مدفوع',
      pending: 'قيد الانتظار',
      overdue: 'متأخر',
      missed: 'ملغى',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status]}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      completed: 'secondary',
      broken: 'destructive',
      paused: 'outline',
    };
    const labels: Record<string, string> = {
      active: 'نشطة',
      completed: 'مكتملة',
      broken: 'مكسورة',
      paused: 'موقوفة',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status]}</Badge>;
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getProgressColor = (paid: number, total: number): string => {
    const percentage = (paid / total) * 100;
    if (percentage === 100) return 'bg-green-600';
    if (percentage >= 75) return 'bg-blue-600';
    if (percentage >= 50) return 'bg-yellow-600';
    if (percentage >= 25) return 'bg-orange-600';
    return 'bg-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Alerts for Issues */}
      {complianceStats.missedPayments > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            هناك {complianceStats.missedPayments} دفعة ملغاة أو مفقودة تحتاج إلى إجراء فوري
          </AlertDescription>
        </Alert>
      )}

      {complianceStats.totalOverdue > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            هناك {formatCurrency(complianceStats.totalOverdue)} متأخر من الدفعات الحالية
          </AlertDescription>
        </Alert>
      )}

      {settlements.filter((s) => s.status === 'broken').length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {settlements.filter((s) => s.status === 'broken').length} اتفاقيات تسوية مكسورة
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">النشطة</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceStats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">تسويات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{complianceStats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">مكتملة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المكسورة</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{complianceStats.broken}</div>
            <p className="text-xs text-muted-foreground mt-1">مخالفة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الالتزام</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceStats.compliantRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">دفعات متوازنة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المتأخرة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(complianceStats.totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">متأخرة</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlements Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>مراقبة التزام اتفاقيات التسوية</CardTitle>
          <CardDescription>تتبع الدفعات وقياس الالتزام بجداول السداد</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القضية</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ المتفق</TableHead>
                  <TableHead>الدفعة الشهرية</TableHead>
                  <TableHead>التقدم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.length > 0 ? (
                  settlements.map((settlement) => {
                    const paidPayments = settlement.payments.filter((p) => p.status === 'paid').length;
                    const totalPayments = settlement.payments.length;
                    const progressPercent = (paidPayments / totalPayments) * 100;

                    return (
                      <TableRow key={settlement.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{settlement.caseNumber}</TableCell>
                        <TableCell>{settlement.clientName}</TableCell>
                        <TableCell>{formatCurrency(settlement.agreedAmount)}</TableCell>
                        <TableCell>{formatCurrency(settlement.monthlyPayment)}</TableCell>
                        <TableCell>
                          <div className="w-full space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getProgressColor(paidPayments, totalPayments)}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {paidPayments}/{totalPayments}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSettlement(settlement)}
                            className="w-full"
                          >
                            التفاصيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد اتفاقيات تسوية نشطة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Schedule for Selected Settlement */}
      {selectedSettlement && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>جدول الدفع - {selectedSettlement.caseNumber}</CardTitle>
                <CardDescription>{selectedSettlement.clientName}</CardDescription>
              </div>
              {selectedSettlement.status === 'broken' && (
                <Button
                  variant="destructive"
                  onClick={() => handleReopenCase(selectedSettlement.id)}
                  disabled={loading}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  إعادة فتح القضية
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground">المبلغ المتفق</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedSettlement.agreedAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">عدد الأقساط</div>
                  <div className="text-2xl font-bold">{selectedSettlement.months}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">الدفعة الشهرية</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedSettlement.monthlyPayment)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">معدل الالتزام</div>
                  <div className="text-2xl font-bold">
                    {(
                      (selectedSettlement.payments.filter((p) => p.status === 'paid').length /
                        selectedSettlement.payments.length) *
                      100
                    ).toFixed(0)}
                    %
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="mt-6">
                <h4 className="font-semibold mb-4">جدول الدفعات</h4>
                <div className="space-y-3">
                  {selectedSettlement.payments.map((payment, index) => {
                    const daysUntil = getDaysUntilDue(payment.dueDate);
                    const isOverdue = daysUntil < 0;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">الدفعة {index + 1}</span>
                            {getPaymentBadge(payment.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            موعد الاستحقاق: {format(new Date(payment.dueDate), 'dd MMM yyyy', { locale: ar })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatCurrency(payment.amount)}</div>
                          {isOverdue && payment.status !== 'paid' && (
                            <div className="text-sm text-red-600">متأخر {Math.abs(daysUntil)} يوم</div>
                          )}
                          {payment.status === 'paid' && payment.paidDate && (
                            <div className="text-sm text-green-600">
                              {format(new Date(payment.paidDate), 'dd MMM', { locale: ar })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettlementCompliance;
