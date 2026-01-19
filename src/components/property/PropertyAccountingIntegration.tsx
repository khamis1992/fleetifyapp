import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PropertyAccountingIntegrationProps {
  payment?: {
    id: string;
    payment_number: string;
    amount: number;
    payment_date: string;
    status: string;
    journal_entry_id?: string;
    journal_entries?: {
      id: string;
      journal_entry_number: string;
      entry_date: string;
      total_amount: number;
      status: string;
      journal_entry_lines?: Array<{
        id: string;
        account_id: string;
        description: string;
        debit_amount: number;
        credit_amount: number;
        chart_of_accounts: {
          account_code: string;
          account_name: string;
          account_name_ar?: string;
        };
      }>;
    };
  };
  contract?: {
    id: string;
    contract_number: string;
    rental_amount: number;
    start_date: string;
    status: string;
    journal_entry_id?: string;
    journal_entries?: {
      id: string;
      journal_entry_number: string;
      entry_date: string;
      total_amount: number;
      status: string;
    };
  };
  onViewJournalEntry?: (journalEntryId: string) => void;
}

export const PropertyAccountingIntegration: React.FC<PropertyAccountingIntegrationProps> = ({
  payment,
  contract,
  onViewJournalEntry
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  const renderPaymentAccounting = () => {
    if (!payment) return null;

    const hasJournalEntry = payment.journal_entry_id && payment.journal_entries;
    const journalEntry = payment.journal_entries;

    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <DollarSign className="h-5 w-5" />
            محاسبة الدفعة - {payment.payment_number}
          </CardTitle>
          <CardDescription>
            تفاصيل التكامل المحاسبي للدفعة العقارية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">مبلغ الدفعة</p>
              <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاريخ الدفعة</p>
              <p className="font-semibold">
                {format(new Date(payment.payment_date), 'dd MMMM yyyy', { locale: ar })}
              </p>
            </div>
          </div>

          <Separator />

          {hasJournalEntry ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">تم إنشاء القيد المحاسبي</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {journalEntry?.status === 'posted' ? 'مُرحل' : 'مسودة'}
                </Badge>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {journalEntry?.journal_entry_number}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => journalEntry?.id && onViewJournalEntry?.(journalEntry.id)}
                    className="gap-2"
                  >
                    عرض القيد
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                {journalEntry?.journal_entry_lines && journalEntry.journal_entry_lines.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">بنود القيد:</p>
                    {journalEntry.journal_entry_lines.map((line) => (
                      <div key={line.id} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="font-medium">
                            {line.chart_of_accounts.account_code} - {line.chart_of_accounts.account_name_ar || line.chart_of_accounts.account_name}
                          </span>
                          <p className="text-xs text-muted-foreground">{line.description}</p>
                        </div>
                        <div className="flex gap-4 min-w-[200px] justify-end">
                          <span className="text-green-600 font-medium">
                            {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                          </span>
                          <span className="text-red-600 font-medium">
                            {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>لم يتم إنشاء قيد محاسبي لهذه الدفعة بعد</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderContractAccounting = () => {
    if (!contract) return null;

    const hasJournalEntry = contract.journal_entry_id && contract.journal_entries;
    const journalEntry = contract.journal_entries;

    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileText className="h-5 w-5" />
            محاسبة العقد - {contract.contract_number}
          </CardTitle>
          <CardDescription>
            تفاصيل التكامل المحاسبي لعقد الإيجار
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">قيمة الإيجار الشهري</p>
              <p className="font-semibold text-lg">{formatCurrency(contract.rental_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاريخ بداية العقد</p>
              <p className="font-semibold">
                {format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar })}
              </p>
            </div>
          </div>

          <Separator />

          {hasJournalEntry ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">تم إنشاء قيد الاستحقاق</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {journalEntry?.status === 'posted' ? 'مُرحل' : 'مسودة'}
                </Badge>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {journalEntry?.journal_entry_number}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => journalEntry?.id && onViewJournalEntry?.(journalEntry.id)}
                    className="gap-2"
                  >
                    عرض القيد
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>إجمالي المبلغ:</span>
                    <span className="font-medium">{formatCurrency(journalEntry?.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ القيد:</span>
                    <span>{format(new Date(journalEntry?.entry_date || contract.start_date), 'dd MMMM yyyy', { locale: ar })}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>لم يتم إنشاء قيد محاسبي لهذا العقد بعد</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {payment && renderPaymentAccounting()}
      {contract && renderContractAccounting()}
    </div>
  );
};