import React, { useState } from 'react';
import { Plus, Eye, Edit, Trash2, Download, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeposits } from '@/hooks/useDeposits';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { DepositDialog } from '@/components/finance/DepositDialog';
import { DepositDetailsDialog } from '@/components/finance/DepositDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { HelpIcon } from '@/components/help/HelpIcon';

const Deposits = () => {
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: deposits, isLoading } = useDeposits();
  const { toast } = useToast();

  const handleAddDeposit = () => {
    setEditingDeposit(null);
    setShowDepositDialog(true);
  };

  const handleEditDeposit = (deposit) => {
    setEditingDeposit(deposit);
    setShowDepositDialog(true);
  };

  const handleViewDeposit = (deposit) => {
    setSelectedDeposit(deposit);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'نشط', variant: 'default' },
      returned: { label: 'مُسترد', variant: 'secondary' },
      partial: { label: 'مُسترد جزئياً', variant: 'outline' },
      pending: { label: 'معلق', variant: 'destructive' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredDeposits = deposits?.filter(deposit => {
    const matchesSearch = deposit.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deposit.deposit_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const totalDeposits = deposits?.reduce((sum, deposit) => sum + (deposit.amount || 0), 0) || 0;
  const activeDeposits = deposits?.filter(d => d.status === 'active').length || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">إدارة الودائع</h1>
            <HelpIcon topic="debitCredit" />
          </div>
          <p className="text-muted-foreground">
            إدارة ودائع العملاء وضمانات التأجير
          </p>
        </div>
        <Button onClick={handleAddDeposit} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة وديعة جديدة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الودائع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDeposits)}
            </div>
            <p className="text-xs text-muted-foreground">
              جميع الودائع المسجلة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الودائع النشطة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeDeposits}
            </div>
            <p className="text-xs text-muted-foreground">
              ودائع غير مُستردة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              متوسط الوديعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(deposits?.length ? totalDeposits / deposits.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              للعقد الواحد
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالعميل أو رقم الوديعة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    تصفية الحالة
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    جميع الحالات
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                    نشط
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('returned')}>
                    مُسترد
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('partial')}>
                    مُسترد جزئياً
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                    معلق
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الوديعة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>نوع الوديعة</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>تاريخ الاستلام</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'لا توجد ودائع تطابق معايير البحث'
                        : 'لا توجد ودائع مسجلة بعد'
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">
                      {deposit.deposit_number}
                    </TableCell>
                    <TableCell>{deposit.customer_name}</TableCell>
                    <TableCell>{deposit.deposit_type_name}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(deposit.amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(deposit.received_date).toLocaleDateString('ar-KW')}
                    </TableCell>
                    <TableCell>
                      {deposit.due_date 
                        ? new Date(deposit.due_date).toLocaleDateString('ar-KW')
                        : 'غير محدد'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(deposit.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            الإجراءات
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDeposit(deposit)}>
                            <Eye className="h-4 w-4 mr-2" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditDeposit(deposit)}>
                            <Edit className="h-4 w-4 mr-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DepositDialog
        open={showDepositDialog}
        onOpenChange={setShowDepositDialog}
        deposit={editingDeposit}
      />

      <DepositDetailsDialog
        open={!!selectedDeposit}
        onOpenChange={() => setSelectedDeposit(null)}
        deposit={selectedDeposit}
      />
    </div>
  );
};

export default Deposits;