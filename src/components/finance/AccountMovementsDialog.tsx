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
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Filter, Calendar } from "lucide-react";

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            حركات الحساب: {accountCode} - {accountName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                تصفية البيانات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Input
                    id="search"
                    placeholder="البحث في الوصف أو رقم القيد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClearFilters}>
                  مسح الفلاتر
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Movements Table */}
          <Card>
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
                <div className="max-h-[400px] overflow-auto">
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
                              <span className="text-green-600 font-medium">
                                {movement.debit_amount.toFixed(3)} د.ك
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.credit_amount > 0 ? (
                              <span className="text-red-600 font-medium">
                                {movement.credit_amount.toFixed(3)} د.ك
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {movement.running_balance.toFixed(3)} د.ك
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={movement.status === 'posted' ? 'default' : 'secondary'}
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
      </DialogContent>
    </Dialog>
  );
}