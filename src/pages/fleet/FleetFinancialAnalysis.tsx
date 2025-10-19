import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Car, 
  Wrench,
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Info,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { 
  useFleetFinancialOverview, 
  useMaintenanceFinancialData, 
  useFleetFinancialSummary,
  useProcessVehicleDepreciation,
  useUpdateVehicleCosts,
  useValidateDepreciationData
} from "@/hooks/useFleetFinancialAnalytics";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

const FleetFinancialAnalysis = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const { data: financialOverview, isLoading: overviewLoading } = useFleetFinancialOverview();
  const { data: maintenanceData, isLoading: maintenanceLoading } = useMaintenanceFinancialData();
  const { data: summary, isLoading: summaryLoading } = useFleetFinancialSummary();
  const { data: validationData, isLoading: isValidationLoading } = useValidateDepreciationData();
  
  const processDepreciation = useProcessVehicleDepreciation();
  const updateVehicleCosts = useUpdateVehicleCosts();
  const { formatCurrency } = useCurrencyFormatter();

  const handleProcessDepreciation = async () => {
    try {
      const result = await processDepreciation.mutateAsync(new Date().toISOString().split('T')[0]);
      toast.success(`تم معالجة الاستهلاك لـ ${result.length} مركبة`, {
        description: "تم تحديث قيم الاستهلاك بنجاح"
      });
    } catch (error: unknown) {
      console.error("خطأ في معالجة الاستهلاك:", error);
      toast.error("فشل في معالجة الاستهلاك", {
        description: error.message || "حدث خطأ غير متوقع"
      });
    }
  };

  const handleDiagnostics = () => {
    setShowDiagnostics(!showDiagnostics);
  };

  const handleUpdateCosts = async (vehicleId: string) => {
    try {
      await updateVehicleCosts.mutateAsync(vehicleId);
      toast.success("تم تحديث تكاليف المركبة بنجاح");
    } catch (error) {
      toast.error("فشل في تحديث تكاليف المركبة");
    }
  };

  if (overviewLoading || summaryLoading) {
    return <div className="flex items-center justify-center h-64">جارٍ تحميل البيانات المالية...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التحليل المالي للأسطول</h1>
          <p className="text-gray-600 dark:text-gray-400">نظرة شاملة على الأوضاع المالية لعمليات أسطولك</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDiagnostics}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            فحص البيانات
          </Button>
          <Button
            onClick={handleProcessDepreciation}
            disabled={processDepreciation.isPending || !validationData?.hasActiveVehicles}
            variant="outline"
          >
            {processDepreciation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 mr-2" />
            )}
            {processDepreciation.isPending ? "جاري المعالجة..." : "معالجة الاستهلاك"}
          </Button>
        </div>
      </div>

      {/* Diagnostics Section */}
      {showDiagnostics && validationData && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <h4 className="font-semibold">نتائج فحص البيانات:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  {validationData.hasActiveVehicles ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">المركبات النشطة: {validationData.vehicleCount}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {validationData.vehiclesWithoutDepreciationRate === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm">بدون معدل استهلاك: {validationData.vehiclesWithoutDepreciationRate}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {validationData.vehiclesWithoutPurchaseCost === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm">بدون سعر شراء: {validationData.vehiclesWithoutPurchaseCost}</span>
                </div>

                <div className="flex items-center gap-2">
                  {validationData.hasActiveVehicles && 
                   validationData.vehiclesWithoutDepreciationRate === 0 && 
                   validationData.vehiclesWithoutPurchaseCost === 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">جاهز للمعالجة</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">يحتاج مراجعة</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {processDepreciation.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <h4 className="font-semibold">فشل في معالجة الاستهلاك:</h4>
              <p>{processDepreciation.error.message}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي قيمة الأسطول</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalBookValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              القيمة الدفترية الحالية بعد الاستهلاك
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تكاليف التشغيل</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalOperatingCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              متوسط لكل مركبة: {formatCurrency(summary?.averageOperatingCost || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تكاليف الصيانة</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalMaintenanceCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              إجمالي مصروفات الصيانة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاستهلاك</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalAccumulatedDepreciation || 0)}</div>
            <p className="text-xs text-muted-foreground">
              إجمالي الاستهلاك المتراكم
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">نظرة عامة على الأسطول</TabsTrigger>
          <TabsTrigger value="maintenance">المالية الخاصة بالصيانة</TabsTrigger>
          <TabsTrigger value="profitability">تحليل الربحية</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>النظرة المالية العامة للمركبات</CardTitle>
              <CardDescription>
                المؤشرات المالية لكل مركبة في أسطولك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialOverview?.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedVehicle(
                      selectedVehicle === vehicle.vehicle_id ? null : vehicle.vehicle_id
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <Car className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">{vehicle.vehicle_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          القيمة الدفترية: {formatCurrency(vehicle.book_value)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(vehicle.total_operating_cost)}
                        </div>
                        <div className="text-sm text-muted-foreground">تكلفة التشغيل</div>
                      </div>
                      <Badge variant={vehicle.vehicle_status === 'available' ? 'default' : 'secondary'}>
                        {vehicle.vehicle_status === 'available' ? 'متاحة' : 
                         vehicle.vehicle_status === 'rented' ? 'مؤجرة' :
                         vehicle.vehicle_status === 'maintenance' ? 'قيد الصيانة' :
                         vehicle.vehicle_status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateCosts(vehicle.vehicle_id);
                        }}
                      >
                        تحديث التكاليف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>التكامل المالي للصيانة</CardTitle>
              <CardDescription>
                سجلات الصيانة وحالة التكامل المحاسبي
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceLoading ? (
                <div>جارٍ تحميل بيانات الصيانة...</div>
              ) : (
                <div className="space-y-3">
                  {maintenanceData?.map((maintenance) => (
                    <div
                      key={maintenance.maintenance_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Wrench className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">{maintenance.maintenance_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {maintenance.vehicle_number} - {maintenance.maintenance_type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(maintenance.actual_cost)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(maintenance.completed_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {maintenance.journal_entry_id ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <Badge variant={maintenance.journal_entry_id ? 'default' : 'destructive'}>
                          {maintenance.journal_entry_id ? 'مدمج' : 'في الانتظار'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <Card>
            <CardHeader>
              <CardTitle>تحليل ربحية المركبات</CardTitle>
              <CardDescription>
                مؤشرات العائد على الاستثمار والربحية لكل مركبة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialOverview?.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Car className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold">{vehicle.vehicle_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          سعر الشراء: {formatCurrency(vehicle.purchase_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="font-medium">{formatCurrency(vehicle.net_profit)}</div>
                        <div className="text-sm text-muted-foreground">صافي الربح</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${vehicle.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {vehicle.roi_percentage.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">العائد على الاستثمار</div>
                      </div>
                      <div className="flex items-center">
                        {vehicle.roi_percentage >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FleetFinancialAnalysis;