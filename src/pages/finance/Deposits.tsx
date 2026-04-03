import { useState } from 'react';
import { Plus, Eye, Edit, Trash2, Download, Search, Filter, Wallet, CheckCircle, Clock, Landmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import StatCard from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeposits } from '@/hooks/useDeposits';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { DepositDialog } from '@/components/finance/DepositDialog';
import { DepositDetailsDialog } from '@/components/finance/DepositDetailsDialog';

const Deposits = () => {
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: deposits, isLoading } = useDeposits();

  const handleAddDeposit = () => {
    setEditingDeposit(null);
    setShowDepositDialog(true);
  };

  const handleEditDeposit = (deposit: any) => {
    setEditingDeposit(deposit);
    setShowDepositDialog(true);
  };

  const handleViewDeposit = (deposit: any) => {
    setSelectedDeposit(deposit);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-700' },
      returned: { label: 'مُسترد', className: 'bg-slate-100 text-slate-700' },
      partial: { label: 'مُسترد جزئياً', className: 'bg-amber-100 text-amber-700' },
      pending: { label: 'معلق', className: 'bg-red-100 text-red-700' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    return <Badge className={config.className}>{config.label}</Badge>;
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
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الودائع</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة ودائع العملاء وضمانات التأجير</p>
        </div>
        <Button onClick={handleAddDeposit} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 ml-2" />
          إضافة وديعة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="إجمالي الودائع"
          value={deposits?.length || 0}
          subtitle="وديعة مسجلة"
          icon={Wallet}
          variant="coral"
        />
        <StatCard
          title="الودائع النشطة"
          value={activeDeposits}
          subtitle="ودائع غير مُستردة"
          icon={CheckCircle}
          variant="emerald"
        />
        <StatCard
          title="إجمالي المبالغ"
          value={formatCurrency(totalDeposits)}
          subtitle="جميع الودائع"
          icon={Clock}
          variant="sky"
        />
      </div>

      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="البحث بالعميل أو رقم الوديعة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 bg-slate-50 border-slate-200"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 ml-2" />
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
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-right">رقم الوديعة</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">نوع الوديعة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">تاريخ الاستلام</TableHead>
                  <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-6">
                      <EmptyState
                        icon={Landmark}
                        title={searchTerm || statusFilter !== 'all' ? "لا توجد نتائج" : "لا توجد ودائع"}
                        description={
                          searchTerm || statusFilter !== 'all'
                            ? "لا توجد ودائع تطابق معايير البحث الحالية"
                            : "لم يتم تسجيل أي ودائع بعد. ابدأ بإضافة وديعة جديدة"
                        }
                        onAction={handleAddDeposit}
                        actionLabel="إضافة وديعة"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeposits.map((deposit) => (
                    <TableRow key={deposit.id} className="border-b border-slate-100 hover:bg-slate-50">
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
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditDeposit(deposit)}>
                              <Edit className="h-4 w-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 ml-2" />
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
          </div>
        </CardContent>
      </Card>

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