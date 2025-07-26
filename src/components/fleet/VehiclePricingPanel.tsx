import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useVehiclePricing, useCreateVehiclePricing } from "@/hooks/useVehicles";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";

interface VehiclePricingPanelProps {
  vehicleId: string;
}

interface PricingFormData {
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  annual_rate: number;
  effective_from: string;
  effective_to?: string;
}

export function VehiclePricingPanel({ vehicleId }: VehiclePricingPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: pricing, isLoading } = useVehiclePricing(vehicleId);
  const createPricing = useCreateVehiclePricing();

  const form = useForm<PricingFormData>({
    defaultValues: {
      daily_rate: 0,
      weekly_rate: 0,
      monthly_rate: 0,
      annual_rate: 0,
      effective_from: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data: PricingFormData) => {
    await createPricing.mutateAsync({
      vehicle_id: vehicleId,
      currency: "KWD",
      is_active: true,
      ...data,
    });
    setShowForm(false);
    form.reset();
  };

  if (isLoading) {
    return <div>Loading pricing...</div>;
  }

  const activePricing = pricing?.find(p => p.is_active);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Vehicle Pricing</CardTitle>
            <CardDescription>Manage rental rates and pricing history</CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Pricing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Pricing</DialogTitle>
                <DialogDescription>
                  Set new rental rates for this vehicle
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="daily_rate">Daily Rate (KWD)</Label>
                    <Input
                      id="daily_rate"
                      type="number"
                      step="0.001"
                      {...form.register("daily_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weekly_rate">Weekly Rate (KWD)</Label>
                    <Input
                      id="weekly_rate"
                      type="number"
                      step="0.001"
                      {...form.register("weekly_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_rate">Monthly Rate (KWD)</Label>
                    <Input
                      id="monthly_rate"
                      type="number"
                      step="0.001"
                      {...form.register("monthly_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_rate">Annual Rate (KWD)</Label>
                    <Input
                      id="annual_rate"
                      type="number"
                      step="0.001"
                      {...form.register("annual_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="effective_from">Effective From</Label>
                    <Input
                      id="effective_from"
                      type="date"
                      {...form.register("effective_from")}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="effective_to">Effective To (Optional)</Label>
                  <Input
                    id="effective_to"
                    type="date"
                    {...form.register("effective_to")}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPricing.isPending}>
                    {createPricing.isPending ? "Saving..." : "Save Pricing"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {activePricing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Current Pricing</h4>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Daily</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.daily_rate)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Weekly</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.weekly_rate)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.monthly_rate)}</p>
              </div>
            </div>
            {activePricing.annual_rate && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Annual</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.annual_rate)}</p>
              </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Effective from {new Date(activePricing.effective_from).toLocaleDateString()}
              {activePricing.effective_to && (
                <span> to {new Date(activePricing.effective_to).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No pricing set for this vehicle</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pricing
            </Button>
          </div>
        )}

        {/* Pricing History */}
        {pricing && pricing.length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">Pricing History</h4>
            <div className="space-y-2">
              {pricing
                .filter(p => !p.is_active)
                .slice(0, 3)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>
                      Daily: {formatCurrency(p.daily_rate)} | 
                      Weekly: {formatCurrency(p.weekly_rate)} | 
                      Monthly: {formatCurrency(p.monthly_rate)}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(p.effective_from).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}