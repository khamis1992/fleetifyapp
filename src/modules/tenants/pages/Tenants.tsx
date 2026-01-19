import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Clock, Building2 } from "lucide-react";
import { TenantTable } from "../components/TenantTable";
import { TenantForm } from "../components/TenantForm";
import { TenantSampleDataOptions } from "@/components/tenants/TenantSampleDataOptions";
import { useTenants, useTenantsStats, useCreateTenant, useUpdateTenant, useDeleteTenant } from "@/hooks/useTenants";
import type { Tenant, TenantFilters, CreateTenantRequest } from "@/types/tenant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Tenants() {
  const [filters, setFilters] = useState<TenantFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [sampleData, setSampleData] = useState<Partial<CreateTenantRequest> | null>(null);

  const { data: tenants = [], isLoading } = useTenants(filters);
  const { data: stats } = useTenantsStats();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const handleAddTenant = () => {
    setSelectedTenant(null);
    setSampleData(null);
    setShowForm(true);
  };

  const handleSelectSampleData = (data: CreateTenantRequest) => {
    setSampleData(data);
    setSelectedTenant(null);
    setShowForm(true);
  };

  const handleClearForm = () => {
    setSampleData(null);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowForm(true);
  };

  const handleViewTenant = (tenant: Tenant) => {
    // TODO: Implement tenant details view
    console.log("View tenant:", tenant);
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setShowDeleteDialog(true);
  };

  const handleFormSubmit = (data: any) => {
    if (selectedTenant) {
      updateTenant.mutate(
        { id: selectedTenant.id, updates: data },
        {
          onSuccess: () => {
            setShowForm(false);
            setSelectedTenant(null);
          },
        }
      );
    } else {
      createTenant.mutate(data, {
        onSuccess: () => {
          setShowForm(false);
        },
      });
    }
  };

  const confirmDelete = () => {
    if (tenantToDelete) {
      deleteTenant.mutate(tenantToDelete.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setTenantToDelete(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستأجرين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المستأجرين النشطين</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">غير النشطين</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactive + stats.suspended}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">هذا الشهر</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.thisMonth}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sample Data Options */}
      <TenantSampleDataOptions
        onSelectSample={handleSelectSampleData}
        onClearForm={handleClearForm}
      />

      {/* Main Table */}
      <TenantTable
        tenants={tenants}
        isLoading={isLoading}
        onAddTenant={handleAddTenant}
        onEditTenant={handleEditTenant}
        onViewTenant={handleViewTenant}
        onDeleteTenant={handleDeleteTenant}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? "تعديل بيانات المستأجر" : "إضافة مستأجر جديد"}
            </DialogTitle>
          </DialogHeader>
          <TenantForm
            tenant={selectedTenant || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setSampleData(null);
            }}
            isLoading={createTenant.isPending || updateTenant.isPending}
            initialData={sampleData || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستأجر "{tenantToDelete?.full_name}"؟
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}