import { useState, useCallback } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, FileText, Building, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { usePropertyContracts, useCreatePropertyContract, useUpdatePropertyContract } from "@/modules/properties/hooks";
import { useProperties } from "@/modules/properties/hooks";
import { useTenants } from "@/modules/tenants/hooks";
import { PropertyContractWizard } from "@/modules/properties/components/contracts/PropertyContractWizard";
import { PropertyContractDetails } from "@/modules/properties/components/contracts/PropertyContractDetails";
import { ModuleLayout } from "@/modules/core/components/ModuleLayout";
import { useToast } from "@/hooks/use-toast";
import { PropertyContract } from "@/modules/properties/types";

export default function PropertyContracts() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<PropertyContract | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { toast } = useToast();
  const { data: contracts, isLoading, refetch } = usePropertyContracts();
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();
  const createMutation = useCreatePropertyContract();
  const updateMutation = useUpdatePropertyContract();

  const handleCreateContract = useCallback(async (contractData: any) => {
    try {
      await createMutation.mutateAsync(contractData);
      setShowCreateDialog(false);
      refetch();
      toast({
        title: "تم إنشاء العقد",
        description: "تم إنشاء عقد الإيجار بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء العقد",
        variant: "destructive",
      });
    }
  }, [createMutation, refetch, toast]);

  const handleUpdateContract = useCallback(async (contractData: any) => {
    if (!selectedContract) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedContract.id,
        ...contractData,
      });
      setShowDetailsDialog(false);
      setIsEditing(false);
      refetch();
      toast({
        title: "تم تحديث العقد",
        description: "تم تحديث عقد الإيجار بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث العقد",
        variant: "destructive",
      });
    }
  }, [selectedContract, updateMutation, refetch, toast]);

  const handleViewDetails = useCallback((contract: PropertyContract) => {
    setSelectedContract(contract);
    setIsEditing(false);
    setShowDetailsDialog(true);
  }, []);

  const handleEditContract = useCallback((contract: PropertyContract) => {
    setSelectedContract(contract);
    setIsEditing(true);
    setShowDetailsDialog(false);
    setShowCreateDialog(true);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "نشط", variant: "default" as const },
      pending: { label: "في الانتظار", variant: "secondary" as const },
      expired: { label: "منتهي", variant: "destructive" as const },
      cancelled: { label: "ملغي", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: "secondary" as const };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties?.find(p => p.id === propertyId);
    return property?.property_name || "غير محدد";
  };

  const getTenantName = (tenantId: string) => {
    const tenant = tenants?.find(t => t.id === tenantId);
    return tenant?.full_name || tenant?.full_name_ar || "غير محدد";
  };

  if (isLoading) {
    return (
    <ModuleLayout moduleName="properties">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleName="properties">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">عقود الإيجار</h1>
            <p className="text-muted-foreground">إدارة عقود إيجار العقارات</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            عقد جديد
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي العقود</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">العقود النشطة</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contracts?.filter(c => c.status === 'active').length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">العقود المنتهية</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contracts?.filter(c => c.status === 'expired').length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contracts?.reduce((sum, c) => sum + (c.rental_amount || 0), 0).toLocaleString()} د.ك
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة العقود</CardTitle>
          </CardHeader>
          <CardContent>
            {!contracts || contracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  لا توجد عقود حالياً
                </h3>
                <p className="text-muted-foreground mb-4">
                  ابدأ بإنشاء عقد إيجار جديد
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء عقد جديد
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{contract.contract_number}</h3>
                          {getStatusBadge(contract.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>العقار: {getPropertyName(contract.property_id)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ar })} - 
                              {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ar })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{contract.rental_amount?.toLocaleString()} د.ك شهرياً</span>
                          </div>
                        </div>
                        
                        <div className="mt-1 text-sm text-muted-foreground">
                          المستأجر: {getTenantName(contract.tenant_id)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(contract)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditContract(contract)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Contract Dialog */}
        <PropertyContractWizard
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={isEditing ? handleUpdateContract : handleCreateContract}
          initialData={isEditing ? selectedContract : undefined}
          isEditing={isEditing}
        />

        {/* Contract Details Dialog */}
        <PropertyContractDetails
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          contract={selectedContract}
          onEdit={() => {
            setShowDetailsDialog(false);
            setIsEditing(true);
            setShowCreateDialog(true);
          }}
        />
      </div>
    </ModuleLayout>
  );
}