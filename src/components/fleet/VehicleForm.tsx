import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Vehicle, useCreateVehicle, useUpdateVehicle } from "@/hooks/useVehicles"
import { useCostCenters } from "@/hooks/useCostCenters"
import { useAuth } from "@/contexts/AuthContext"

interface VehicleFormProps {
  vehicle?: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleForm({ vehicle, open, onOpenChange }: VehicleFormProps) {
  const { user } = useAuth()
  const { data: costCenters } = useCostCenters()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  
  const form = useForm({
    defaultValues: {
      // Basic Information
      plate_number: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      vin: "",
      engine_number: "",
      transmission: "automatic",
      body_type: "",
      fuel_type: "gasoline",
      seating_capacity: 5,
      
      // Financial Information
      purchase_date: "",
      purchase_cost: "",
      useful_life_years: 10,
      residual_value: "",
      depreciation_method: "straight_line",
      
      // Operational Information
      current_mileage: "",
      daily_rate: "",
      weekly_rate: "",
      monthly_rate: "",
      deposit_amount: "",
      status: "available",
      
      // Additional Information
      notes: "",
      cost_center_id: "",
    }
  })

  useEffect(() => {
    if (vehicle) {
      form.reset({
        plate_number: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || "",
        vin: vehicle.vin || "",
        engine_number: vehicle.engine_number || "",
        transmission: vehicle.transmission || "automatic",
        body_type: vehicle.body_type || "",
        fuel_type: vehicle.fuel_type || "gasoline",
        seating_capacity: vehicle.seating_capacity || 5,
        purchase_date: vehicle.purchase_date || "",
        purchase_cost: vehicle.purchase_cost?.toString() || "",
        useful_life_years: vehicle.useful_life_years || 10,
        residual_value: vehicle.residual_value?.toString() || "",
        depreciation_method: vehicle.depreciation_method || "straight_line",
        current_mileage: vehicle.current_mileage?.toString() || "",
        daily_rate: vehicle.daily_rate?.toString() || "",
        weekly_rate: vehicle.weekly_rate?.toString() || "",
        monthly_rate: vehicle.monthly_rate?.toString() || "",
        deposit_amount: vehicle.deposit_amount?.toString() || "",
        status: vehicle.status || "available",
        notes: vehicle.notes || "",
        cost_center_id: vehicle.cost_center_id || "",
      })
    }
  }, [vehicle, form])

  const onSubmit = async (data: any) => {
    try {
      const vehicleData = {
        ...data,
        company_id: user?.user_metadata?.company_id,
        year: parseInt(data.year),
        seating_capacity: parseInt(data.seating_capacity),
        useful_life_years: parseInt(data.useful_life_years),
        purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : undefined,
        residual_value: data.residual_value ? parseFloat(data.residual_value) : undefined,
        current_mileage: data.current_mileage ? parseFloat(data.current_mileage) : undefined,
        daily_rate: data.daily_rate ? parseFloat(data.daily_rate) : undefined,
        weekly_rate: data.weekly_rate ? parseFloat(data.weekly_rate) : undefined,
        monthly_rate: data.monthly_rate ? parseFloat(data.monthly_rate) : undefined,
        deposit_amount: data.deposit_amount ? parseFloat(data.deposit_amount) : undefined,
        is_active: true,
      }

      if (vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, ...vehicleData })
      } else {
        await createVehicle.mutateAsync(vehicleData)
      }
      
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error("Error saving vehicle:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Edit Vehicle" : "Add New Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {vehicle ? "Update vehicle information" : "Add a new vehicle to your fleet"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="operational">Operational</TabsTrigger>
                <TabsTrigger value="additional">Additional</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Vehicle Information</CardTitle>
                    <CardDescription>Essential details about the vehicle</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plate_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter license plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Toyota" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Camry" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year *</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1990" max={new Date().getFullYear() + 1} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., White" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VIN Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Vehicle Identification Number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engine_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engine Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Engine Number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transmission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transmission</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select transmission" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="automatic">Automatic</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="cvt">CVT</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Sedan, SUV, Hatchback" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gasoline">Gasoline</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                              <SelectItem value="electric">Electric</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seating_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seating Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="2" max="50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Information</CardTitle>
                    <CardDescription>Purchase details and depreciation information</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purchase_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Cost (KWD)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="useful_life_years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Useful Life (Years)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" max="50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residual_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residual Value (KWD)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="depreciation_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Depreciation Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="straight_line">Straight Line</SelectItem>
                              <SelectItem value="declining_balance">Declining Balance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cost_center_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Center</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select cost center" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {costCenters?.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.center_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="operational" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Operational Information</CardTitle>
                    <CardDescription>Mileage, pricing, and operational status</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="current_mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Mileage (km)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.1" placeholder="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="rented">Rented</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="out_of_service">Out of Service</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="daily_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Rate (KWD)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weekly_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekly Rate (KWD)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthly_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rate (KWD)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deposit_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit (KWD)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                    <CardDescription>Notes and other details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Additional notes about the vehicle..."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createVehicle.isPending || updateVehicle.isPending}
              >
                {createVehicle.isPending || updateVehicle.isPending ? "Saving..." : "Save Vehicle"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}