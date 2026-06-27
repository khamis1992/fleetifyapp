import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAccountMovements } from "@/hooks/useGeneralLedger";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Filter, Calendar, Search, X, Activity } from "lucide-react";

interface AccountMovementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  accountCode: string;
}

export function AccountMovementsDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  accountCode
}: AccountMovementsDialogProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { formatCurrency } = useCurrencyFormatter();
  const formatQar = (amount: number) => formatCurrency(amount || 0, { currency: "QAR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const { data: movements, isLoading } = useAccountMovements(accountId, {
    dateFrom,
    dateTo,
    searchTerm
  });

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ledger-movements-dialog max-w-6xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader className="ledger-movements-header">
          <DialogTitle className="flex items-center gap-3 text-right">
            <span className="ledger-movements-icon">
              <Activity className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-black">حركات الحساب</span>
              <strong className="block text-xl">{accountCode} - {accountName}</strong>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="ledger-movements-body">
          {/* Filters */}
          <Card className="ledger-movements-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                تصفية البيانات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date-from">من تاريخ</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-to">إلى تاريخ</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">البحث</Label>
                  <div className="ledger-movements-search">
                    <Search className="h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="الوصف أو رقم القيد..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClearFilters} className="ledger-movements-outline">
                  <X className="ml-2 h-4 w-4" />
                  مسح الفلاتر
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Movements Table */}
          <Card className="ledger-movements-card">
            <CardHeader>
              <CardTitle>تفاصيل الحركات</CardTitle>
              <CardDescription>
                جميع الحركات المالية للحساب {accountCode} - {accountName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : movements && movements.length > 0 ? (
                <div className="max-h-[430px] overflow-auto rounded-lg border border-[#E5EAF1]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>رقم القيد</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>مركز التكلفة</TableHead>
                        <TableHead>المبلغ المدين</TableHead>
                        <TableHead>المبلغ الدائن</TableHead>
                        <TableHead>الرصيد الجاري</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {format(new Date(movement.entry_date), "dd/MM/yyyy", { locale: ar })}
                          </TableCell>
                          <TableCell className="font-mono">
                            {movement.entry_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{movement.description}</div>
                              {movement.line_description && (
                                <div className="text-sm text-muted-foreground">
                                  {movement.line_description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {movement.cost_center ? (
                              <Badge variant="secondary">
                                {movement.cost_center.center_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.debit_amount > 0 ? (
                              <span className="font-black text-[#22C7A1]">
                                {formatQar(movement.debit_amount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.credit_amount > 0 ? (
                              <span className="font-black text-[#FB6B7A]">
                                {formatQar(movement.credit_amount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-black">
                            {formatQar(movement.running_balance)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={movement.status === 'posted' ? 'ledger-movements-badge tone-success' : 'ledger-movements-badge tone-focus'}
                            >
                              {movement.status === 'posted' ? 'مرحل' : 
                               movement.status === 'draft' ? 'مسودة' : 'معكوس'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حركات للحساب المحدد
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <style>{`
          .ledger-movements-dialog {
            border: 1px solid ${systemColorPattern.colors.border} !important;
            border-radius: 14px !important;
            background: ${systemColorPattern.colors.surface} !important;
            color: ${systemColorPattern.colors.text};
          }
          .ledger-movements-header {
            border-bottom: 1px solid ${systemColorPattern.colors.border};
            padding-bottom: 14px;
          }
          .ledger-movements-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            color: ${systemColorPattern.colors.success};
            background: color-mix(in srgb, ${systemColorPattern.colors.success} 14%, white);
            border: 1px solid color-mix(in srgb, ${systemColorPattern.colors.success} 24%, white);
          }
          .ledger-movements-header .text-xs {
            color: ${systemColorPattern.colors.success};
          }
          .ledger-movements-header strong {
            color: ${systemColorPattern.colors.text};
            font-weight: 950;
          }
          .ledger-movements-body {
            display: grid;
            gap: 12px;
            padding-top: 14px;
          }
          .ledger-movements-card {
            border-color: ${systemColorPattern.colors.border} !important;
            border-radius: 12px !important;
            box-shadow: none !important;
          }
          .ledger-movements-card h3 {
            color: ${systemColorPattern.colors.text};
            font-weight: 950;
          }
          .ledger-movements-card p,
          .ledger-movements-card label {
            color: ${systemColorPattern.colors.secondaryText};
            font-weight: 800;
          }
          .ledger-movements-dialog input {
            height: 42px;
            border-color: ${systemColorPattern.colors.border} !important;
            border-radius: 10px !important;
            background: ${systemColorPattern.colors.innerSurface} !important;
            color: ${systemColorPattern.colors.text};
          }
          .ledger-movements-search {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid ${systemColorPattern.colors.border};
            border-radius: 10px;
            background: ${systemColorPattern.colors.innerSurface};
            padding: 0 10px;
          }
          .ledger-movements-search svg {
            color: ${systemColorPattern.colors.secondaryText};
          }
          .ledger-movements-search input {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .ledger-movements-outline {
            border-color: ${systemColorPattern.colors.border} !important;
            border-radius: 10px !important;
            background: white !important;
            color: ${systemColorPattern.colors.text} !important;
          }
          .ledger-movements-dialog table thead tr {
            background: ${systemColorPattern.colors.innerSurface} !important;
          }
          .ledger-movements-dialog table th {
            color: ${systemColorPattern.colors.secondaryText} !important;
            font-size: 12px;
            font-weight: 950;
          }
          .ledger-movements-dialog table td {
            color: ${systemColorPattern.colors.text};
            border-color: ${systemColorPattern.colors.border} !important;
          }
          .ledger-movements-dialog table tbody tr:hover {
            background: color-mix(in srgb, ${systemColorPattern.colors.info} 6%, white) !important;
          }
          .ledger-movements-badge {
            --badge-tone: ${systemColorPattern.colors.secondaryText};
            border: 1px solid color-mix(in srgb, var(--badge-tone) 32%, white) !important;
            background: color-mix(in srgb, var(--badge-tone) 10%, white) !important;
            color: var(--badge-tone) !important;
            font-weight: 900;
          }
          .ledger-movements-badge.tone-success {
            --badge-tone: ${systemColorPattern.colors.success};
          }
          .ledger-movements-badge.tone-focus {
            --badge-tone: ${systemColorPattern.colors.focus};
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
