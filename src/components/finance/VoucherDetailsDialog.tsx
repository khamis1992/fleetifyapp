import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, FileText, User, Building2, DollarSign, Hash } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface VoucherDetailsDialogProps {
  entry: any;
  isOpen: boolean;
  onClose: () => void;
}

export const VoucherDetailsDialog: React.FC<VoucherDetailsDialogProps> = ({
  entry,
  isOpen,
  onClose
}) => {
  if (!entry) return null;

  const totalDebits = entry.journal_entry_lines?.reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0) || 0;
  const totalCredits = entry.journal_entry_lines?.reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0) || 0;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'reversed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted':
        return 'مرحل';
      case 'draft':
        return 'مسودة';
      case 'reversed':
        return 'معكوس';
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تفاصيل السند المحاسبي - {entry.entry_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات السند</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">رقم القيد</p>
                    <p className="font-mono font-semibold">{entry.entry_number}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ القيد</p>
                    <p className="font-semibold">{new Date(entry.entry_date).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(entry.status)} className="w-fit">
                    {getStatusLabel(entry.status)}
                  </Badge>
                  {!isBalanced && (
                    <Badge variant="destructive">غير متوازن</Badge>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <p className="text-sm text-muted-foreground mb-2">البيان</p>
                <p className="text-base">{entry.description}</p>
              </div>

              {entry.reference_type && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">نوع المرجع</p>
                      <p className="font-semibold">{entry.reference_type}</p>
                    </div>
                    {entry.reference_id && (
                      <div>
                        <p className="text-sm text-muted-foreground">رقم المرجع</p>
                        <p className="font-mono">{entry.reference_id}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Journal Entry Lines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                بنود القيد المحاسبي
              </CardTitle>
              <CardDescription>
                تفاصيل الحسابات المدينة والدائنة في هذا القيد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الحساب</TableHead>
                    <TableHead className="text-right">مركز التكلفة</TableHead>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-right">الأصل</TableHead>
                    <TableHead className="text-center">مدين</TableHead>
                    <TableHead className="text-center">دائن</TableHead>
                    <TableHead className="text-right">التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.journal_entry_lines?.map((line: any, index: number) => (
                    <TableRow key={line.id || index}>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-mono text-sm">{line.account?.account_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {line.account?.account_name || line.account?.account_name_ar}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {line.cost_center ? (
                          <div>
                            <p className="font-mono text-sm">{line.cost_center.center_code}</p>
                            <p className="text-sm text-muted-foreground">
                              {line.cost_center.center_name || line.cost_center.center_name_ar}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.employee_id ? (
                          <div>
                            <p className="text-sm">موظف #{line.employee_id.slice(-8)}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.asset_id ? (
                          <div>
                            <p className="text-sm">أصل #{line.asset_id.slice(-8)}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.line_description || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">إجمالي المدين</p>
                  <p className="text-lg font-bold font-mono text-green-600">
                    {formatCurrency(totalDebits)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">إجمالي الدائن</p>
                  <p className="text-lg font-bold font-mono text-blue-600">
                    {formatCurrency(totalCredits)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">الفرق</p>
                  <p className={`text-lg font-bold font-mono ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(totalDebits - totalCredits))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Information */}
          {(entry.created_by_profile || entry.posted_by_profile) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات المراجعة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {entry.created_by_profile && (
                    <div>
                      <p className="text-sm text-muted-foreground">أنشأ بواسطة</p>
                      <p className="font-semibold">
                        {entry.created_by_profile.first_name} {entry.created_by_profile.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  )}
                  
                  {entry.posted_by_profile && entry.posted_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">رحل بواسطة</p>
                      <p className="font-semibold">
                        {entry.posted_by_profile.first_name} {entry.posted_by_profile.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.posted_at).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};