import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Plus, Edit, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Settlement {
  id: string;
  caseNumber: string;
  clientName: string;
  originalAmount: number;
  proposedAmount: number;
  discount: number;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  sentDate?: string;
  responseDate?: string;
  customerResponse?: 'pending' | 'accepted' | 'negotiating' | 'rejected';
  agreedAmount?: number;
  negotiationNotes?: string;
  paymentSchedule?: string;
  agreementSigned?: boolean;
  expiryDate: string;
}

interface SettlementTrackingProps {
  settlements?: Settlement[];
  onAddNote?: (id: string, note: string) => void;
}

export const SettlementTracking: React.FC<SettlementTrackingProps> = ({
  settlements = [],
  onAddNote,
}) => {
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      sent: 'default',
      accepted: 'default',
      rejected: 'destructive',
      in_progress: 'default',
      completed: 'secondary',
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      sent: 'مرسل',
      accepted: 'مقبول',
      rejected: 'مرفوض',
      in_progress: 'جاري التنفيذ',
      completed: 'مكتمل',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status]}</Badge>;
  };

  const getResponseBadge = (response?: string) => {
    if (!response) return <Badge variant="outline">بدون رد</Badge>;
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'outline',
      accepted: 'default',
      negotiating: 'default',
      rejected: 'destructive',
    };
    const labels: Record<string, string> = {
      pending: 'في الانتظار',
      accepted: 'وافق',
      negotiating: 'قيد المفاوضات',
      rejected: 'رفض',
    };
    return <Badge variant={variants[response] || 'outline'}>{labels[response]}</Badge>;
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('يرجى إدخال ملاحظة');
      return;
    }

    setLoading(true);
    try {
      onAddNote?.(selectedSettlement?.id || '', newNote);
      toast.success('تم إضافة الملاحظة بنجاح');
      setNewNote('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('خطأ في إضافة الملاحظة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإجمالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settlements.length}</div>
            <p className="text-xs text-muted-foreground mt-1">عروض تسوية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المقبولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {settlements.filter((s) => s.status === 'accepted').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">تم قبولها</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المرفوضة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {settlements.filter((s) => s.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">رفضت</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد المفاوضات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {settlements.filter((s) => s.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">تحت النقاش</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {settlements.filter((s) => s.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">تمت</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <CardTitle>تتبع عروض التسوية</CardTitle>
          <CardDescription>إدارة ومتابعة جميع عروض التسوية المرسلة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القضية</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ الأصلي</TableHead>
                  <TableHead>المبلغ المقترح</TableHead>
                  <TableHead>الخصم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>رد العميل</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.length > 0 ? (
                  settlements.map((settlement) => (
                    <TableRow key={settlement.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{settlement.caseNumber}</TableCell>
                      <TableCell>{settlement.clientName}</TableCell>
                      <TableCell>{formatCurrency(settlement.originalAmount)}</TableCell>
                      <TableCell>{formatCurrency(settlement.proposedAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{settlement.discount}%</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                      <TableCell>{getResponseBadge(settlement.customerResponse)}</TableCell>
                      <TableCell>
                        {format(new Date(settlement.expiryDate), 'dd MMM yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSettlement(settlement);
                                setShowDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          {selectedSettlement?.id === settlement.id && (
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>تفاصيل العرض - {settlement.caseNumber}</DialogTitle>
                                <DialogDescription>{settlement.clientName}</DialogDescription>
                              </DialogHeader>

                              <div className="space-y-6">
                                {/* Overview */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-muted-foreground">المبلغ الأصلي</Label>
                                    <div className="text-2xl font-bold">
                                      {formatCurrency(settlement.originalAmount)}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-muted-foreground">المبلغ المقترح</Label>
                                    <div className="text-2xl font-bold text-green-600">
                                      {formatCurrency(settlement.proposedAmount)}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-muted-foreground">الخصم</Label>
                                    <div className="text-lg font-bold">{settlement.discount}%</div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-muted-foreground">المبلغ المخفض</Label>
                                    <div className="text-lg font-bold">
                                      {formatCurrency(settlement.originalAmount - settlement.proposedAmount)}
                                    </div>
                                  </div>
                                </div>

                                {/* Status & Response */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">حالة العرض</Label>
                                    <div className="mt-2">{getStatusBadge(settlement.status)}</div>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">رد العميل</Label>
                                    <div className="mt-2">
                                      {getResponseBadge(settlement.customerResponse)}
                                    </div>
                                  </div>
                                </div>

                                {/* Dates */}
                                {settlement.sentDate && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-muted-foreground">تاريخ الإرسال</Label>
                                      <p className="mt-1">
                                        {format(new Date(settlement.sentDate), 'dd MMM yyyy', { locale: ar })}
                                      </p>
                                    </div>
                                    {settlement.responseDate && (
                                      <div>
                                        <Label className="text-muted-foreground">تاريخ الرد</Label>
                                        <p className="mt-1">
                                          {format(new Date(settlement.responseDate), 'dd MMM yyyy', { locale: ar })}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Agreed Amount */}
                                {settlement.agreedAmount && (
                                  <div>
                                    <Label className="text-muted-foreground">المبلغ المتفق عليه</Label>
                                    <p className="mt-1 text-2xl font-bold">
                                      {formatCurrency(settlement.agreedAmount)}
                                    </p>
                                  </div>
                                )}

                                {/* Payment Schedule */}
                                {settlement.paymentSchedule && (
                                  <div>
                                    <Label className="text-muted-foreground">جدول الدفع</Label>
                                    <p className="mt-1">{settlement.paymentSchedule}</p>
                                  </div>
                                )}

                                {/* Agreement Signed */}
                                <div>
                                  <Label className="text-muted-foreground">الاتفاق موقع</Label>
                                  <div className="mt-1">
                                    {settlement.agreementSigned ? (
                                      <Badge className="bg-green-100 text-green-800">تم التوقيع</Badge>
                                    ) : (
                                      <Badge variant="outline">لم يتم التوقيع</Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Negotiation Notes */}
                                <div>
                                  <Label className="text-muted-foreground">ملاحظات المفاوضات</Label>
                                  <Textarea
                                    value={settlement.negotiationNotes || ''}
                                    readOnly
                                    rows={3}
                                    className="mt-2"
                                  />
                                </div>

                                {/* Add Note */}
                                <div className="border-t pt-4">
                                  <Label className="text-base font-semibold flex items-center gap-2 mb-2">
                                    <MessageSquare className="h-4 w-4" />
                                    إضافة ملاحظة
                                  </Label>
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="أضف ملاحظة جديدة..."
                                      value={newNote}
                                      onChange={(e) => setNewNote(e.target.value)}
                                      rows={3}
                                    />
                                    <Button
                                      onClick={handleAddNote}
                                      disabled={loading}
                                      className="w-full"
                                    >
                                      {loading ? 'جاري...' : 'إضافة الملاحظة'}
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowDetails(false);
                                    setSelectedSettlement(null);
                                  }}
                                >
                                  إغلاق
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      لا توجد عروض تسوية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettlementTracking;
