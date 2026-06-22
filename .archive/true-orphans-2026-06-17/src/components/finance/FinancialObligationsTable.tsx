import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Edit, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCustomerObligations, useUpdateObligationStatus } from '@/hooks/useFinancialObligations';
import type { FinancialObligation as HookFinancialObligation } from '@/hooks/useFinancialObligations';
import type { FinancialObligation } from '@/types/financial-obligations';
import {
  OBLIGATION_TYPE_LABELS,
  OBLIGATION_STATUS_LABELS,
  OBLIGATION_STATUS_COLORS,
} from '@/types/financial-obligations';

interface FinancialObligationsTableProps {
  customerId: string;
  showActions?: boolean;
  maxHeight?: string;
}

export const FinancialObligationsTable: React.FC<FinancialObligationsTableProps> = ({
  customerId,
  showActions = true,
  maxHeight = '400px',
}) => {
  const [selectedObligation, setSelectedObligation] = useState<FinancialObligation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    paidAmount: '',
    notes: '',
  });

  const { data: obligations, isLoading } = useCustomerObligations(customerId);
  const updateObligationMutation = useUpdateObligationStatus();

  const handleEditObligation = (obligation: FinancialObligation) => {
    setSelectedObligation(obligation);
    setEditForm({
      status: obligation.status,
      paidAmount: (obligation.paid_amount || 0).toString(),
      notes: obligation.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateObligation = async () => {
    if (!selectedObligation) return;

    try {
      await updateObligationMutation.mutateAsync({
        obligationId: selectedObligation.id,
        status: editForm.status as FinancialObligation['status'],
        paidAmount: parseFloat(editForm.paidAmount) || 0,
        notes: editForm.notes,
      });
      setIsEditDialogOpen(false);
      setSelectedObligation(null);
    } catch (error) {
      console.error('Error updating obligation:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
    }).format(amount);
  };

  const getStatusIcon = (status: FinancialObligation['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (obligation: FinancialObligation) => {
    if (obligation.status === 'overdue' && (obligation.days_overdue || 0) > 30) {
      return 'border-l-4 border-red-500';
    } else if (obligation.status === 'overdue') {
      return 'border-l-4 border-orange-500';
    } else if (new Date(obligation.due_date) <= new Date()) {
      return 'border-l-4 border-yellow-500';
    }
    return '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="mr-2">جاري تحميل الالتزامات المالية...</span>
        </CardContent>
      </Card>
    );
  }

  if (!obligations || obligations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>الالتزامات المالية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            لا توجد التزامات مالية لهذا العميل
          </div>
        </CardContent>
      </Card>
    );
  }

  // حساب الإحصائيات
  const totalAmount = obligations.reduce((sum, o) => sum + o.amount, 0);
  const totalPaid = obligations.reduce((sum, o) => sum + (o.paid_amount || 0), 0);
  const totalRemaining = obligations.reduce((sum, o) => sum + (o.remaining_amount || o.amount), 0);
  const overdueCount = obligations.filter(o => o.status === 'overdue').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>الالتزامات المالية</span>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-blue-600">{formatCurrency(totalAmount)}</div>
              <div className="text-slate-500">إجمالي المبلغ</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{formatCurrency(totalPaid)}</div>
              <div className="text-slate-500">المدفوع</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-orange-600">{formatCurrency(totalRemaining)}</div>
              <div className="text-slate-500">المتبقي</div>
            </div>
            {overdueCount > 0 && (
              <div className="text-center">
                <div className="font-semibold text-red-600">{overdueCount}</div>
                <div className="text-slate-500">متأخر</div>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ maxHeight }} className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النوع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>المدفوع</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>أيام التأخير</TableHead>
                {showActions && <TableHead>الإجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.map((obligation) => (
                <TableRow key={obligation.id} className={getPriorityColor(obligation)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(obligation.status)}
                      <span>{OBLIGATION_TYPE_LABELS[obligation.obligation_type]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(obligation.amount)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(obligation.due_date), 'dd/MM/yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(obligation.paid_amount || 0)}
                  </TableCell>
                  <TableCell className="text-orange-600">
                    {formatCurrency(obligation.remaining_amount || obligation.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={OBLIGATION_STATUS_COLORS[obligation.status]}>
                      {OBLIGATION_STATUS_LABELS[obligation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(obligation.days_overdue || 0) > 0 && (
                      <span className="text-red-600 font-medium">
                        {obligation.days_overdue} يوم
                      </span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>تفاصيل الالتزام المالي</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>النوع</Label>
                                  <div className="mt-1 font-medium">
                                    {OBLIGATION_TYPE_LABELS[obligation.obligation_type]}
                                  </div>
                                </div>
                                <div>
                                  <Label>الحالة</Label>
                                  <div className="mt-1">
                                    <Badge className={OBLIGATION_STATUS_COLORS[obligation.status]}>
                                      {OBLIGATION_STATUS_LABELS[obligation.status]}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <Label>المبلغ الإجمالي</Label>
                                  <div className="mt-1 font-medium">
                                    {formatCurrency(obligation.amount)}
                                  </div>
                                </div>
                                <div>
                                  <Label>المبلغ المدفوع</Label>
                                  <div className="mt-1 font-medium text-green-600">
                                    {formatCurrency(obligation.paid_amount || 0)}
                                  </div>
                                </div>
                                <div>
                                  <Label>المبلغ المتبقي</Label>
                                  <div className="mt-1 font-medium text-orange-600">
                                    {formatCurrency(obligation.remaining_amount || obligation.amount)}
                                  </div>
                                </div>
                                <div>
                                  <Label>تاريخ الاستحقاق</Label>
                                  <div className="mt-1 font-medium">
                                    {format(new Date(obligation.due_date), 'dd/MM/yyyy', { locale: ar })}
                                  </div>
                                </div>
                              </div>
                              {obligation.description && (
                                <div>
                                  <Label>الوصف</Label>
                                  <div className="mt-1">{obligation.description}</div>
                                </div>
                              )}
                              {obligation.notes && (
                                <div>
                                  <Label>ملاحظات</Label>
                                  <div className="mt-1">{obligation.notes}</div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditObligation(obligation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog for editing obligation */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الالتزام المالي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">الحالة</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="partially_paid">مدفوع جزئياً</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
              <Input
                id="paidAmount"
                type="number"
                step="0.001"
                value={editForm.paidAmount}
                onChange={(e) => setEditForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                placeholder="0.000"
              />
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleUpdateObligation}
                disabled={updateObligationMutation.isPending}
              >
                {updateObligationMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
