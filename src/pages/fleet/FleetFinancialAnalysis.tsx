import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Car, 
  Wrench,
  Calculator,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { 
  useFleetFinancialOverview, 
  useMaintenanceFinancialData, 
  useFleetFinancialSummary,
  useProcessVehicleDepreciation,
  useUpdateVehicleCosts
} from "@/hooks/useFleetFinancialAnalytics";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const FleetFinancialAnalysis = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const { data: financialOverview, isLoading: overviewLoading } = useFleetFinancialOverview();
  const { data: maintenanceData, isLoading: maintenanceLoading } = useMaintenanceFinancialData();
  const { data: summary, isLoading: summaryLoading } = useFleetFinancialSummary();
  
  const processDepreciation = useProcessVehicleDepreciation();
  const updateVehicleCosts = useUpdateVehicleCosts();

  const handleProcessDepreciation = async () => {
    try {
      const result = await processDepreciation.mutateAsync(new Date().toISOString().split('T')[0]);
      toast.success(`Processed depreciation for ${result.length} vehicles`);
    } catch (error) {
      toast.error("Failed to process depreciation");
    }
  };

  const handleUpdateCosts = async (vehicleId: string) => {
    try {
      await updateVehicleCosts.mutateAsync(vehicleId);
      toast.success("Vehicle costs updated successfully");
    } catch (error) {
      toast.error("Failed to update vehicle costs");
    }
  };

  if (overviewLoading || summaryLoading) {
    return <div className="flex items-center justify-center h-64">Loading financial data...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fleet Financial Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive financial overview of your fleet operations</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleProcessDepreciation}
            disabled={processDepreciation.isPending}
            variant="outline"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Process Depreciation
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet Value</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalBookValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Current book value after depreciation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operating Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalOperatingCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Average per vehicle: {formatCurrency(summary?.averageOperatingCost || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalMaintenanceCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total maintenance expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depreciation</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalAccumulatedDepreciation || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total accumulated depreciation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Fleet Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Financial</TabsTrigger>
          <TabsTrigger value="profitability">Profitability Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Financial Overview</CardTitle>
              <CardDescription>
                Financial metrics for each vehicle in your fleet
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
                          Book Value: {formatCurrency(vehicle.book_value)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(vehicle.total_operating_cost)}
                        </div>
                        <div className="text-sm text-muted-foreground">Operating Cost</div>
                      </div>
                      <Badge variant={vehicle.vehicle_status === 'available' ? 'default' : 'secondary'}>
                        {vehicle.vehicle_status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateCosts(vehicle.vehicle_id);
                        }}
                      >
                        Update Costs
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
              <CardTitle>Maintenance Financial Integration</CardTitle>
              <CardDescription>
                Maintenance records and their accounting integration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceLoading ? (
                <div>Loading maintenance data...</div>
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
                          {maintenance.journal_entry_id ? 'Integrated' : 'Pending'}
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
              <CardTitle>Vehicle Profitability Analysis</CardTitle>
              <CardDescription>
                ROI and profitability metrics for each vehicle
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
                          Purchase Price: {formatCurrency(vehicle.purchase_price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="font-medium">{formatCurrency(vehicle.net_profit)}</div>
                        <div className="text-sm text-muted-foreground">Net Profit</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${vehicle.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {vehicle.roi_percentage.toFixed(2)}%
                        </div>
                        <div className="text-sm text-muted-foreground">ROI</div>
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