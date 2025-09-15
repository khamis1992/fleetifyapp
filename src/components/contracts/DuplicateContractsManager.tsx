import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  FileText, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  BarChart3,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useDuplicateContracts, useDuplicateContractsSummary, type DuplicateContract, type DuplicateGroup } from '@/hooks/useDuplicateContracts';
import { useBulkDeleteDuplicateContracts } from '@/hooks/useBulkDeleteDuplicateContracts';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const DuplicateContractsManager = () => {
  const { data: duplicateGroups, isLoading, refetch } = useDuplicateContracts();
  const { data: summary } = useDuplicateContractsSummary();
  const { bulkDeleteDuplicates, progress, resetProgress } = useBulkDeleteDuplicateContracts();
  
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [filterAction, setFilterAction] = useState<'all' | 'delete_duplicates' | 'manual_review' | 'keep_all'>('all');
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredGroups = duplicateGroups?.filter(group => 
    filterAction === 'all' || group.recommended_action === filterAction
  ) || [];

  const handleSelectContract = (contractId: string, checked: boolean) => {
    const newSelected = new Set(selectedContracts);
    if (checked) {
      newSelected.add(contractId);
    } else {
      newSelected.delete(contractId);
    }
    setSelectedContracts(newSelected);
  };

  const handleSelectAllSafeContracts = () => {
    const safeContracts = new Set<string>();
    duplicateGroups?.forEach(group => {
      group.contracts.forEach(contract => {
        if (contract.is_safe_to_delete) {
          safeContracts.add(contract.id);
        }
      });
    });
    setSelectedContracts(safeContracts);
    toast.success(`تم تحديد ${safeContracts.size} عقد آمن للحذف`);
  };

  const handleDeleteSelected = async () => {
    if (selectedContracts.size === 0) {
      toast.error('يرجى تحديد عقود للحذف');
      return;
    }

    const contractsToDelete: DuplicateContract[] = [];
    duplicateGroups?.forEach(group => {
      group.contracts.forEach(contract => {
        if (selectedContracts.has(contract.id)) {
          contractsToDelete.push(contract);
        }
      });
    });

    const unsafeContracts = contractsToDelete.filter(c => !c.is_safe_to_delete);
    if (unsafeContracts.length > 0) {
      toast.error(`تم العثور على ${unsafeContracts.length} عقد غير آمن للحذف`);
      return;
    }

    setIsDeleting(true);
    try {
      await bulkDeleteDuplicates.mutateAsync(contractsToDelete);
      setSelectedContracts(new Set());
      refetch();
    } catch (error) {
      console.error('Error deleting contracts:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (action: string) => {
    switch (action) {
      case 'delete_duplicates':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">يمكن حذف المكررات</Badge>;
      case 'manual_review':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">مراجعة يدوية</Badge>;
      case 'keep_all':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">الاحتفاظ بالكل</Badge>;
      default:
        return null;
    }
  };

  const getContractStatusBadge = (contract: DuplicateContract) => {
    if (contract.is_safe_to_delete) {
      return <Badge variant="default" className="bg-green-100 text-green-800">آمن للحذف</Badge>;
    } else if (contract.payments_count > 0) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">له مدفوعات</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">يحتاج مراجعة</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">جاري تحليل العقود المكررة...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة العقود المكررة</h1>
          <p className="text-muted-foreground">تحليل وحذف العقود المكررة بأمان</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          تحديث
        </Button>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مجموعات مكررة</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalDuplicateGroups}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalDuplicateContracts} عقد إجمالي
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عقود لها مدفوعات</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.contractsWithPayments}</div>
              <p className="text-xs text-muted-foreground">يجب الاحتفاظ بها</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عقود بدون مدفوعات</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.contractsWithoutPayments}</div>
              <p className="text-xs text-muted-foreground">مرشحة للحذف</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">آمنة للحذف</CardTitle>
              <Trash2 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.safeToDeleteContracts}</div>
              <p className="text-xs text-muted-foreground">يمكن حذفها الآن</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button 
          onClick={handleSelectAllSafeContracts}
          variant="outline"
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          تحديد جميع العقود الآمنة للحذف
        </Button>
        
        <Button 
          onClick={handleDeleteSelected}
          disabled={selectedContracts.size === 0 || isDeleting}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          حذف المحدد ({selectedContracts.size})
        </Button>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value as any)}
            className="border rounded px-3 py-1"
          >
            <option value="all">جميع المجموعات</option>
            <option value="delete_duplicates">يمكن حذف المكررات</option>
            <option value="manual_review">مراجعة يدوية</option>
            <option value="keep_all">الاحتفاظ بالكل</option>
          </select>
        </div>
      </div>

      {/* Progress Display */}
      {(isDeleting || progress.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              تقدم عملية الحذف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.currentStep}</span>
                <span>{progress.processed}/{progress.total}</span>
              </div>
              <Progress value={(progress.processed / progress.total) * 100} />
            </div>
            
            {progress.currentContract && (
              <div className="text-sm text-muted-foreground">
                العقد الحالي: {progress.currentContract}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-green-600">
                محذوف: {progress.deleted}
              </div>
              <div className="text-red-600">
                فشل: {progress.failed}
              </div>
              <div className="text-blue-600">
                معالج: {progress.processed}
              </div>
            </div>

            {progress.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="max-h-32 overflow-y-auto">
                    {progress.errors.map((error, index) => (
                      <div key={index} className="text-xs">
                        {error.contractNumber}: {error.error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Duplicate Groups List */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عقود مكررة</h3>
              <p className="text-muted-foreground">
                {filterAction === 'all' 
                  ? 'لم يتم العثور على أي عقود مكررة'
                  : 'لا توجد عقود مطابقة للفلتر المحدد'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <Card key={group.contract_number} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      العقد رقم: {group.contract_number}
                    </CardTitle>
                    <CardDescription>
                      {group.total_contracts} عقد مكرر - {group.contracts_with_payments} له مدفوعات، {group.contracts_without_payments} بدون مدفوعات
                    </CardDescription>
                  </div>
                  {getStatusBadge(group.recommended_action)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.contracts.map((contract, index) => (
                    <div 
                      key={contract.id} 
                      className={`p-4 border rounded-lg ${contract.is_safe_to_delete ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedContracts.has(contract.id)}
                            onCheckedChange={(checked) => handleSelectContract(contract.id, checked as boolean)}
                            disabled={!contract.is_safe_to_delete}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">عقد #{index + 1}</span>
                              {getContractStatusBadge(contract)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              العميل: {contract.customer_name} | المبلغ: {contract.contract_amount.toLocaleString()} د.ك
                            </div>
                            <div className="text-xs text-muted-foreground">
                              تاريخ الإنشاء: {new Date(contract.created_at).toLocaleDateString('ar-KW')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <span>مدفوعات: {contract.payments_count}</span>
                            <span>فواتير: {contract.invoices_count}</span>
                            <span>مستندات: {contract.documents_count}</span>
                            <span>موافقات: {contract.approval_steps_count}</span>
                          </div>
                          {contract.total_paid > 0 && (
                            <div className="mt-2 text-green-600 font-medium">
                              مدفوع: {contract.total_paid.toLocaleString()} د.ك
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DuplicateContractsManager;