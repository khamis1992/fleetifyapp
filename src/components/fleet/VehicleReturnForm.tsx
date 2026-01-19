import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UnifiedOdometerInput } from "./UnifiedOdometerInput";
import { CalendarDays, MapPin, Gauge, Fuel, Car, ClipboardList, AlertTriangle, CheckCircle } from "lucide-react";
import { useCreateVehicleReturn, useUpdateVehicleReturn, useVehicleReturnByPermit, type CreateVehicleReturnData } from "@/hooks/useVehicleReturn";
import { useUpdateOdometerForOperation } from "@/hooks/useUnifiedOdometerManagement";

const returnFormSchema = z.object({
  return_odometer_reading: z.number().min(0).optional(),
  fuel_level_percentage: z.number().min(0).max(100),
  vehicle_condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
  damages_reported: z.string().optional(),
  notes: z.string().optional(),
  return_location: z.string().optional(),
  items_returned: z.array(z.string()),
});

type ReturnFormData = z.infer<typeof returnFormSchema>;

interface VehicleReturnFormProps {
  permitId: string;
  vehicleId: string;
  vehicleName: string;
  onSuccess?: () => void;
}

const standardItems = [
  "Vehicle Key",
  "Registration Documents",
  "Insurance Card", 
  "Fuel Card",
  "GPS Device",
  "Emergency Kit",
  "Spare Tire",
  "Jack & Tools",
  "First Aid Kit",
  "Fire Extinguisher"
];

const getConditionColor = (condition: string) => {
  switch (condition) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'fair':
      return 'text-yellow-600';
    case 'poor':
      return 'text-orange-600';
    case 'damaged':
      return 'text-red-600';
    default:
      return 'text-slate-600';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="secondary"><ClipboardList className="h-3 w-3 mr-1" />Pending</Badge>;
  }
};

export const VehicleReturnForm: React.FC<VehicleReturnFormProps> = ({
  permitId,
  vehicleId,
  vehicleName,
  onSuccess
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [odometerReading, setOdometerReading] = useState<number>(0);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  
  const { data: existingReturn } = useVehicleReturnByPermit(permitId);
  const createReturn = useCreateVehicleReturn();
  const updateReturn = useUpdateVehicleReturn();
  const { updateForDispatchEnd } = useUpdateOdometerForOperation();

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      fuel_level_percentage: 100,
      vehicle_condition: "good",
      items_returned: [],
      return_location: "",
      notes: "",
      damages_reported: "",
    },
  });

  // Pre-fill form if existing return exists
  React.useEffect(() => {
    if (existingReturn) {
      form.reset({
        return_odometer_reading: existingReturn.return_odometer_reading || undefined,
        fuel_level_percentage: existingReturn.fuel_level_percentage,
        vehicle_condition: existingReturn.vehicle_condition,
        damages_reported: existingReturn.damages_reported || "",
        notes: existingReturn.notes || "",
        return_location: existingReturn.return_location || "",
        items_returned: existingReturn.items_returned,
      });
      setSelectedItems(existingReturn.items_returned);
      setOdometerReading(existingReturn.return_odometer_reading || 0);
      setFuelLevel(existingReturn.fuel_level_percentage);
    }
  }, [existingReturn, form]);

  const onSubmit = async (data: ReturnFormData) => {
    try {
      // First update the odometer reading in the unified system if odometer reading is provided
      if (odometerReading && odometerReading > 0) {
        await updateForDispatchEnd({
          vehicle_id: vehicleId,
          permit_id: permitId,
          odometer_reading: odometerReading,
          fuel_level_percentage: fuelLevel,
          notes: 'Vehicle return - dispatch end'
        });
      }

      // Then create/update the return form
      const formData: CreateVehicleReturnData = {
        dispatch_permit_id: permitId,
        vehicle_id: vehicleId,
        return_odometer_reading: odometerReading || undefined,
        fuel_level_percentage: fuelLevel,
        vehicle_condition: data.vehicle_condition,
        damages_reported: data.damages_reported,
        notes: data.notes,
        return_location: data.return_location,
        items_returned: selectedItems,
      };

      if (existingReturn) {
        await updateReturn.mutateAsync({ id: existingReturn.id, data: formData });
      } else {
        await createReturn.mutateAsync(formData);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Failed to submit return form:", error);
    }
  };

  const handleItemToggle = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const isReadOnly = existingReturn?.status === 'approved';

  if (existingReturn && existingReturn.status === 'approved') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Return - {vehicleName}
              </CardTitle>
              <CardDescription>Return form has been completed and approved</CardDescription>
            </div>
            {getStatusBadge(existingReturn.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Return Date</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {new Date(existingReturn.return_date).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Odometer Reading</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                {existingReturn.return_odometer_reading || "Not recorded"} km
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fuel Level</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Fuel className="h-4 w-4" />
                {existingReturn.fuel_level_percentage}%
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Condition</label>
              <div className={`flex items-center gap-2 text-sm font-medium ${getConditionColor(existingReturn.vehicle_condition)}`}>
                <Car className="h-4 w-4" />
                {existingReturn.vehicle_condition.charAt(0).toUpperCase() + existingReturn.vehicle_condition.slice(1)}
              </div>
            </div>
          </div>
          
          {existingReturn.return_location && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Return Location</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {existingReturn.return_location}
              </div>
            </div>
          )}

          {existingReturn.damages_reported && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-600">Damages Reported</label>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{existingReturn.damages_reported}</p>
            </div>
          )}

          {existingReturn.notes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{existingReturn.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Items Returned</label>
            <div className="flex flex-wrap gap-2">
              {existingReturn.items_returned.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Return - {vehicleName}
            </CardTitle>
            <CardDescription>
              {existingReturn ? "Update vehicle return details" : "Complete the vehicle return process"}
            </CardDescription>
          </div>
          {existingReturn && getStatusBadge(existingReturn.status)}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Unified Odometer and Fuel Input */}
            <UnifiedOdometerInput
              vehicleId={vehicleId}
              odometerValue={odometerReading}
              onOdometerChange={setOdometerReading}
              fuelLevel={fuelLevel}
              onFuelLevelChange={setFuelLevel}
              showCurrentReading={true}
              showFuelInput={true}
              disabled={isReadOnly}
              required={false}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicle_condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle Condition
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="return_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Return Location
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Where was the vehicle returned?"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="damages_reported"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    Damages Reported (if any)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe any damages or issues found..."
                      className="min-h-[80px]"
                      {...field}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Additional Notes
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes or observations..."
                      className="min-h-[80px]"
                      {...field}
                      disabled={isReadOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Items Returned
              </FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {standardItems.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={item}
                      checked={selectedItems.includes(item)}
                      onCheckedChange={() => handleItemToggle(item)}
                      disabled={isReadOnly}
                    />
                    <label
                      htmlFor={item}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {!isReadOnly && (
              <Button 
                type="submit" 
                className="w-full"
                disabled={createReturn.isPending || updateReturn.isPending}
              >
                {createReturn.isPending || updateReturn.isPending 
                  ? "Submitting..." 
                  : existingReturn 
                    ? "Update Return Form"
                    : "Submit Return Form"
                }
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};