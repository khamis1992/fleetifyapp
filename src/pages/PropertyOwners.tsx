import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { PropertyOwnerForm } from '@/modules/properties/components';
import { PropertyOwnerSampleDataOptions } from '@/components/tenants/PropertyOwnerSampleDataOptions';
import { usePropertyOwners, useDeletePropertyOwner, useCreatePropertyOwner } from '@/modules/properties/hooks';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function PropertyOwners() {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<any>(null);
  const [sampleData, setSampleData] = useState<any>(null);
  
  const { data: owners = [], isLoading } = usePropertyOwners(search);
  const createOwnerMutation = useCreatePropertyOwner();
  const deleteOwnerMutation = useDeletePropertyOwner();

  const handleSelectSampleData = (data: any) => {
    setSampleData(data);
    setSelectedOwner(null);
    setShowAddForm(true);
  };

  const handleClearForm = () => {
    setSampleData(null);
  };

  return (
    <ModuleLayout moduleName="properties">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة ملاك العقارات</h1>
            <p className="text-muted-foreground mt-2">
              إدارة معلومات الملاك وعقاراتهم
            </p>
          </div>
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مالك جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedOwner ? 'تحديث بيانات المالك' : 'إضافة مالك جديد'}
                </DialogTitle>
              </DialogHeader>
              <PropertyOwnerForm 
                owner={selectedOwner}
                onSubmit={async (data) => {
                  try {
                    if (selectedOwner) {
                      // تحديث المالك - سيتم إضافة هذه الوظيفة لاحقاً
                      toast.success('سيتم إضافة وظيفة التحديث قريباً');
                    } else {
                      await createOwnerMutation.mutateAsync(data);
                    }
                    setShowAddForm(false);
                    setSelectedOwner(null);
                    setSampleData(null);
                  } catch (error) {
                    console.error('Error saving owner:', error);
                  }
                }}
                onCancel={() => {
                  setShowAddForm(false);
                  setSelectedOwner(null);
                  setSampleData(null);
                }}
                isLoading={createOwnerMutation.isPending}
                initialData={sampleData || undefined}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Sample Data Options */}
        <PropertyOwnerSampleDataOptions
          onSelectSample={handleSelectSampleData}
          onClearForm={handleClearForm}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              قائمة الملاك
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث بالاسم أو الهاتف أو كود المالك..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>كود المالك</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الاسم بالعربية</TableHead>
                    <TableHead>رقم الهاتف</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>عدد العقارات</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد ملاك مضافين حتى الآن
                      </TableCell>
                    </TableRow>
                  ) : (
                    owners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">
                          {owner.owner_code}
                        </TableCell>
                        <TableCell>{owner.full_name}</TableCell>
                        <TableCell>{owner.full_name_ar || '-'}</TableCell>
                        <TableCell>{owner.phone || '-'}</TableCell>
                        <TableCell>{owner.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={owner.is_active ? 'default' : 'secondary'}>
                            {owner.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {owner.properties_count || 0} عقار
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setShowAddForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setOwnerToDelete(owner);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* مربع حوار تأكيد الحذف */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف المالك</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف المالك "{ownerToDelete?.full_name}"؟ 
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (ownerToDelete) {
                    try {
                      await deleteOwnerMutation.mutateAsync(ownerToDelete.id);
                      setShowDeleteDialog(false);
                      setOwnerToDelete(null);
                    } catch (error) {
                      console.error('Error deleting owner:', error);
                    }
                  }
                }}
                disabled={deleteOwnerMutation.isPending}
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleLayout>
  );
}