import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useUnlinkedPayments } from '@/hooks/usePaymentLinking';
import { PaymentLinkingDialog } from './PaymentLinkingDialog';
import { BulkPaymentLinkingDialog } from './BulkPaymentLinkingDialog';
import { 
  Link, 
  Search, 
  Filter, 
  Users, 
  Receipt, 
  AlertCircle,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: 'KWD',
    minimumFractionDigits: 3
  }).format(amount);
};

export const PaymentLinkingManagement: React.FC = () => {
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: unlinkedPayments, isLoading } = useUnlinkedPayments();

  const filteredPayments = unlinkedPayments?.filter(payment => 
    payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.amount?.toString().includes(searchTerm)
  ) || [];

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const handleLinkPayment = (payment: any) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayments([...selectedPayments, paymentId]);
    } else {
      setSelectedPayments(selectedPayments.filter(id => id !== paymentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayments(paginatedPayments.map(p => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة ربط المدفوعات</h1>
          <p className="text-muted-foreground">
            ربط المدفوعات بالعملاء وإنشاء الفواتير
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المدفوعات غير المربوطة</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              دفعة تحتاج ربط بالعملاء
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              مبلغ المدفوعات غير المربوطة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المحدد للربط</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              دفعة محددة للربط الجماعي
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                المدفوعات غير المربوطة
              </CardTitle>
              <CardDescription>
                اختر المدفوعات لربطها بالعملاء
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setBulkDialogOpen(true)}
                disabled={selectedPayments.length === 0}
                variant="outline"
              >
                <Users className="mr-2 h-4 w-4" />
                ربط جماعي ({selectedPayments.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الدفعة أو الوصف أو المبلغ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedPayments.length === paginatedPayments.length && paginatedPayments.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>رقم الدفعة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={(e) => handleSelectPayment(payment.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.payment_number}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_method || 'غير محدد'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.notes || 'لا يوجد وصف'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {payment.payment_status === 'completed' ? 'مكتمل' : payment.payment_status || 'غير محدد'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLinkPayment(payment)}
                      >
                        <Link className="mr-2 h-4 w-4" />
                        ربط
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, filteredPayments.length)} من {filteredPayments.length} دفعة
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <div className="text-sm">
                  صفحة {currentPage} من {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PaymentLinkingDialog
        payment={selectedPayment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <BulkPaymentLinkingDialog
        paymentIds={selectedPayments}
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onComplete={() => {
          setSelectedPayments([]);
          setBulkDialogOpen(false);
        }}
      />
    </div>
  );
};