import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useFleetAnalytics, useProcessVehicleDepreciation } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, TrendingDown, Car, Wrench, DollarSign } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function FleetAnalytics() {
  const { user } = useAuth();
  
  // Get user profile with company ID
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: analytics, isLoading } = useFleetAnalytics(profile?.company_id);
  const processDepreciation = useProcessVehicleDepreciation();

  if (isLoading || !analytics) {
    return <div>Loading analytics...</div>;
  }

  const statusData = [
    { name: 'Available', value: analytics.availableVehicles, color: COLORS[0] },
    { name: 'Rented', value: analytics.rentedVehicles, color: COLORS[1] },
    { name: 'Maintenance', value: analytics.maintenanceVehicles, color: COLORS[2] },
  ];

  const monthlyData = [
    { month: 'Revenue', amount: analytics.vehicles.reduce((sum, v) => sum + (v.monthly_rate || 0), 0) },
    { month: 'Depreciation', amount: analytics.totalDepreciation },
    { month: 'Maintenance', amount: analytics.monthlyMaintenanceCost },
  ];

  const handleProcessDepreciation = () => {
    processDepreciation.mutate(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.availableVehicles} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalBookValue)}</div>
            <p className="text-xs text-muted-foreground">
              Current book value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.utilizationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Vehicles currently rented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthlyMaintenanceCost)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status Distribution</CardTitle>
            <CardDescription>Current status of all vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Monthly financial metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Depreciation Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Depreciation Management</span>
          </CardTitle>
          <CardDescription>
            Process monthly depreciation for all vehicles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total accumulated depreciation: {formatCurrency(analytics.totalDepreciation)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Process depreciation to update vehicle book values
              </p>
            </div>
            <Button 
              onClick={handleProcessDepreciation}
              disabled={processDepreciation.isPending}
            >
              {processDepreciation.isPending ? "Processing..." : "Process Depreciation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Maintenance Activities</CardTitle>
          <CardDescription>Latest maintenance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.maintenance.slice(0, 5).map((maintenance: any) => (
              <div key={maintenance.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{maintenance.vehicles?.plate_number || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{maintenance.maintenance_type}</p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    maintenance.status === 'completed' ? 'default' :
                    maintenance.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {maintenance.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(maintenance.estimated_cost || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}