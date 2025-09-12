import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Plus, 
  Wrench, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Home, 
  DollarSign,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { 
  usePropertyMaintenance, 
  usePropertyMaintenanceStats,
  useMaintenanceProperties,
  useUpdatePropertyMaintenance
} from '@/modules/properties/hooks/usePropertyMaintenance';
import { PropertyMaintenanceForm } from '@/modules/properties/components/PropertyMaintenanceForm';
import { PropertyMaintenanceTable } from '@/modules/properties/components/PropertyMaintenanceTable';
import { PropertyMaintenance } from '@/modules/properties/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';

const PropertyMaintenancePage: React.FC = () => {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<PropertyMaintenance | undefined>();
  
  const { data: maintenanceRecords, isLoading } = usePropertyMaintenance();
  const { data: stats, isLoading: statsLoading } = usePropertyMaintenanceStats();
  const { data: maintenanceProperties } = useMaintenanceProperties();
  const updateMutation = useUpdatePropertyMaintenance();
  const { formatCurrency } = useCurrencyFormatter();

  // تصنيف السجلات حسب الحالة
  const pendingMaintenance = maintenanceRecords?.filter(m => m.status === 'pending') || [];
  const scheduledMaintenance = maintenanceRecords?.filter(m => m.status === 'scheduled') || [];
  const inProgressMaintenance = maintenanceRecords?.filter(m => m.status === 'in_progress') || [];
  const completedMaintenance = maintenanceRecords?.filter(m => m.status === 'completed') || [];
  const cancelledMaintenance = maintenanceRecords?.filter(m => m.status === 'cancelled') || [];

  const handleEditMaintenance = (maintenance: PropertyMaintenance) => {
    setSelectedMaintenance(maintenance);
    setShowMaintenanceForm(true);
  };

  const handleAddNew = () => {
    setSelectedMaintenance(undefined);
    setShowMaintenanceForm(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ 
        id, 
        status: status as any,
        start_date: status === 'in_progress' ? new Date().toISOString() : undefined,
        completion_date: status === 'completed' ? new Date().toISOString() : undefined,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('فشل في تحديث حالة الصيانة');
    }
  };

  const handleFormSuccess = () => {
    setShowMaintenanceForm(false);
    setSelectedMaintenance(undefined);
  };

  if (isLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">صيانة العقارات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة وتتبع أعمال صيانة العقارات والمرافق
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          طلب صيانة جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقارات قيد الصيانة</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.properties_under_maintenance || 0}</div>
            <p className="text-xs text-muted-foreground">
              من إجمالي العقارات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_maintenance || 0}</div>
            <p className="text-xs text-muted-foreground">
              في انتظار الجدولة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.in_progress_maintenance || 0}</div>
            <p className="text-xs text-muted-foreground">
              جاري العمل عليها
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التكلفة الشهرية</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_monthly_cost ? formatCurrency(stats.total_monthly_cost) : '0.000'}
            </div>
            <p className="text-xs text-muted-foreground">
              الشهر الحالي
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="gap-2">
            <Wrench className="h-4 w-4" />
            الكل ({maintenanceRecords?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            المعلقة ({pendingMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="h-4 w-4" />
            المجدولة ({scheduledMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            <Wrench className="h-4 w-4" />
            قيد التنفيذ ({inProgressMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            المكتملة ({completedMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-2">
            <Home className="h-4 w-4" />
            العقارات ({maintenanceProperties?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جميع طلبات الصيانة</CardTitle>
              <CardDescription>
                قائمة شاملة بجميع طلبات الصيانة في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMaintenanceTable
                maintenance={maintenanceRecords || []}
                onEdit={handleEditMaintenance}
                onUpdateStatus={handleUpdateStatus}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                الطلبات المعلقة
              </CardTitle>
              <CardDescription>
                طلبات الصيانة في انتظار الجدولة أو البدء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMaintenanceTable
                maintenance={pendingMaintenance}
                onEdit={handleEditMaintenance}
                onUpdateStatus={handleUpdateStatus}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                الصيانة المجدولة
              </CardTitle>
              <CardDescription>
                أعمال الصيانة المجدولة لتواريخ محددة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMaintenanceTable
                maintenance={scheduledMaintenance}
                onEdit={handleEditMaintenance}
                onUpdateStatus={handleUpdateStatus}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                قيد التنفيذ
              </CardTitle>
              <CardDescription>
                أعمال الصيانة الجاري تنفيذها حالياً
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMaintenanceTable
                maintenance={inProgressMaintenance}
                onEdit={handleEditMaintenance}
                onUpdateStatus={handleUpdateStatus}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                الصيانة المكتملة
              </CardTitle>
              <CardDescription>
                أعمال الصيانة التي تم إنجازها بنجاح
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMaintenanceTable
                maintenance={completedMaintenance}
                onEdit={handleEditMaintenance}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                العقارات قيد الصيانة
              </CardTitle>
              <CardDescription>
                العقارات التي تخضع حالياً لأعمال صيانة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceProperties && maintenanceProperties.length > 0 ? (
                <div className="grid gap-4">
                  {maintenanceProperties.map((property: any) => (
                    <div key={property.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {property.property_name || `عقار ${property.property_code}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">{property.address}</p>
                          <div className="mt-2">
                            {property.property_maintenance?.map((maintenance: any) => (
                              <div key={maintenance.id} className="flex items-center gap-2 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  maintenance.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  maintenance.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {maintenance.maintenance_type}
                                </span>
                                <span>جدولت في: {maintenance.scheduled_date}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          عرض التفاصيل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد عقارات قيد الصيانة حالياً
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Maintenance Form Dialog */}
      <PropertyMaintenanceForm
        open={showMaintenanceForm}
        onOpenChange={setShowMaintenanceForm}
        maintenance={selectedMaintenance}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default PropertyMaintenancePage;