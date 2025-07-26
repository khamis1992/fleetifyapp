import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

export interface Vehicle {
  id: string
  company_id: string
  category_id?: string
  plate_number: string
  make: string
  model: string
  year: number
  color?: string
  color_ar?: string
  vin_number?: string
  registration_number?: string
  insurance_policy?: string
  insurance_expiry?: string
  license_expiry?: string
  status?: 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved'
  odometer_reading?: number
  fuel_level?: number
  location?: string
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  deposit_amount?: number
  notes?: string
  images?: any[]
  features?: any[]
  is_active?: boolean
  created_at: string
  updated_at: string
  // New fleet management fields
  vin?: string
  engine_number?: string
  transmission?: string
  body_type?: string
  fuel_type?: string
  seating_capacity?: number
  current_mileage?: number
  last_service_mileage?: number
  next_service_mileage?: number
  purchase_date?: string
  purchase_cost?: number
  useful_life_years?: number
  residual_value?: number
  depreciation_method?: string
  annual_depreciation_rate?: number
  accumulated_depreciation?: number
  book_value?: number
  fixed_asset_id?: string
  cost_center_id?: string
  last_maintenance_date?: string
}

export interface VehiclePricing {
  id: string
  vehicle_id: string
  daily_rate: number
  weekly_rate: number
  monthly_rate: number
  annual_rate: number
  daily_rate_min?: number
  daily_rate_max?: number
  weekly_rate_min?: number
  weekly_rate_max?: number
  monthly_rate_min?: number
  monthly_rate_max?: number
  annual_rate_min?: number
  annual_rate_max?: number
  extra_km_charge?: number
  included_km_daily?: number
  included_km_weekly?: number
  included_km_monthly?: number
  included_km_annual?: number
  security_deposit?: number
  currency: string
  effective_from: string
  effective_to?: string
  is_active: boolean
}

export interface VehicleInsurance {
  id: string
  vehicle_id: string
  insurance_company: string
  policy_number: string
  coverage_type: string
  coverage_amount?: number
  deductible_amount?: number
  premium_amount: number
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  policy_document_url?: string
  notes?: string
  is_active: boolean
}

export interface VehicleMaintenance {
  id: string
  vehicle_id: string
  company_id: string
  maintenance_number: string
  maintenance_type: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_date?: string
  started_date?: string
  completed_date?: string
  estimated_cost?: number
  actual_cost?: number
  mileage_at_service?: number
  service_provider?: string
  service_provider_contact?: string
  warranty_until?: string
  parts_replaced?: string[]
  cost_center_id?: string
  invoice_id?: string
  journal_entry_id?: string
  created_by?: string
  assigned_to?: string
  notes?: string
  attachments?: any[]
}

export const useVehicles = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["vehicles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .order("plate_number")

      if (error) {
        console.error("Error fetching vehicles:", error)
        throw error
      }

      return data as Vehicle[]
    },
    enabled: !!user
  })
}

export const useAvailableVehicles = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["available-vehicles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .eq("status", "available")
        .order("plate_number")

      if (error) {
        console.error("Error fetching available vehicles:", error)
        throw error
      }

      return data as Vehicle[]
    },
    enabled: !!user
  })
}

export const useCreateVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert([vehicleData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] })
      toast({
        title: "Success",
        description: "Vehicle created successfully",
      })
    },
    onError: (error) => {
      console.error("Error creating vehicle:", error)
      toast({
        title: "Error",
        description: "Failed to create vehicle",
        variant: "destructive",
      })
    }
  })
}

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Vehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] })
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      })
    },
    onError: (error) => {
      console.error("Error updating vehicle:", error)
      toast({
        title: "Error",
        description: "Failed to update vehicle",
        variant: "destructive",
      })
    }
  })
}

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_active: false })
        .eq("id", vehicleId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] })
      toast({
        title: "Success",
        description: "Vehicle deactivated successfully",
      })
    },
    onError: (error) => {
      console.error("Error deactivating vehicle:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate vehicle",
        variant: "destructive",
      })
    }
  })
}

// Vehicle Pricing Hooks
export const useVehiclePricing = (vehicleId: string) => {
  return useQuery({
    queryKey: ["vehicle-pricing", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_pricing")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("is_active", true)
        .order("effective_from", { ascending: false })

      if (error) throw error
      return data as VehiclePricing[]
    },
    enabled: !!vehicleId
  })
}

export const useCreateVehiclePricing = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (pricingData: Omit<VehiclePricing, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_pricing")
        .insert([pricingData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-pricing", data.vehicle_id] })
      toast({
        title: "Success",
        description: "Vehicle pricing created successfully",
      })
    }
  })
}

// Vehicle Insurance Hooks
export const useVehicleInsurance = (vehicleId: string) => {
  return useQuery({
    queryKey: ["vehicle-insurance", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("is_active", true)
        .order("start_date", { ascending: false })

      if (error) throw error
      return data as VehicleInsurance[]
    },
    enabled: !!vehicleId
  })
}

export const useCreateVehicleInsurance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (insuranceData: Omit<VehicleInsurance, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .insert([insuranceData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-insurance", data.vehicle_id] })
      toast({
        title: "Success",
        description: "Vehicle insurance created successfully",
      })
    }
  })
}

// Vehicle Maintenance Hooks
export const useVehicleMaintenance = (vehicleId?: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["vehicle-maintenance", vehicleId],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_maintenance")
        .select(`
          *,
          vehicles!inner(plate_number, make, model)
        `)
        .order("created_at", { ascending: false })

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user
  })
}

export const useCreateVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

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
  
  return useMutation({
    mutationFn: async (maintenanceData: Omit<VehicleMaintenance, 'id' | 'created_at' | 'updated_at' | 'maintenance_number'>) => {
      // Generate maintenance number
      const { data: maintenanceNumber, error: numberError } = await supabase
        .rpc('generate_maintenance_number', { company_id_param: maintenanceData.company_id })

      if (numberError) throw numberError

      // Get maintenance cost center if not provided
      let costCenterId = maintenanceData.cost_center_id;
      if (!costCenterId && profile?.company_id) {
        const { data: defaultCostCenter } = await supabase.rpc('get_maintenance_cost_center', {
          company_id_param: profile.company_id
        });
        costCenterId = defaultCostCenter;
      }

      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .insert([{ 
          ...maintenanceData, 
          maintenance_number: maintenanceNumber,
          cost_center_id: costCenterId 
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      toast({
        title: "نجح",
        description: "تم إنشاء طلب الصيانة بنجاح",
      })
    }
  })
}

export const useUpdateVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<VehicleMaintenance> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      toast({
        title: "Success",
        description: "Maintenance updated successfully",
      })
    }
  })
}

// Add new hooks for enhanced fleet management
export const useProcessVehicleDepreciation = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

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

  return useMutation({
    mutationFn: async (date?: string) => {
      if (!profile?.company_id) {
        throw new Error('Company ID not found');
      }

      const { data, error } = await supabase.rpc('process_vehicle_depreciation', {
        company_id_param: profile.company_id,
        depreciation_date_param: date || new Date().toISOString().split('T')[0]
      })

      if (error) throw error
      return data
    },
    onSuccess: (processedCount) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] })
      queryClient.invalidateQueries({ queryKey: ["depreciation-records"] })
      toast({
        title: "Success",
        description: `Processed depreciation for ${processedCount} vehicles.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process vehicle depreciation: " + error.message,
        variant: "destructive",
      })
    },
  })
}

// Enhanced hook for available vehicles for contracts
export const useAvailableVehiclesForContracts = (companyId?: string) => {
  return useQuery({
    queryKey: ["available-vehicles-contracts", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required")

      const { data, error } = await supabase.rpc('get_available_vehicles_for_contracts', {
        company_id_param: companyId
      })

      if (error) throw error
      return data as Array<{
        id: string
        plate_number: string
        make: string
        model: string
        year: number
        status: string
        daily_rate?: number
        weekly_rate?: number
        monthly_rate?: number
      }>
    },
    enabled: !!companyId,
  })
}

// Hook for fleet analytics and reports
export const useFleetAnalytics = (companyId?: string) => {
  return useQuery({
    queryKey: ["fleet-analytics", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required")

      // Get vehicle statistics with financial data
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select(`
          *,
          vehicle_pricing(daily_rate, weekly_rate, monthly_rate),
          fixed_assets(book_value, accumulated_depreciation, purchase_cost)
        `)
        .eq("company_id", companyId)
        .eq("is_active", true)

      if (vehiclesError) throw vehiclesError

      // Get maintenance statistics
      const { data: maintenance, error: maintenanceError } = await supabase
        .from("vehicle_maintenance")
        .select("*, vehicles(plate_number)")
        .in("vehicle_id", vehicles?.map(v => v.id) || [])

      if (maintenanceError) throw maintenanceError

      // Calculate analytics
      const totalVehicles = vehicles?.length || 0
      const availableVehicles = vehicles?.filter(v => v.status === 'available').length || 0
      const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance').length || 0
      const rentedVehicles = vehicles?.filter(v => v.status === 'rented').length || 0

      const totalBookValue = vehicles?.reduce((sum, v: any) => {
        return sum + (v.fixed_assets?.[0]?.book_value || 0)
      }, 0) || 0

      const totalDepreciation = vehicles?.reduce((sum, v: any) => {
        return sum + (v.fixed_assets?.[0]?.accumulated_depreciation || 0)
      }, 0) || 0

      const monthlyMaintenanceCost = maintenance
        ?.filter(m => {
          const date = new Date(m.scheduled_date)
          const now = new Date()
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        })
        .reduce((sum, m) => sum + (m.estimated_cost || 0), 0) || 0

      return {
        totalVehicles,
        availableVehicles,
        maintenanceVehicles,
        rentedVehicles,
        totalBookValue,
        totalDepreciation,
        monthlyMaintenanceCost,
        utilizationRate: totalVehicles > 0 ? ((rentedVehicles / totalVehicles) * 100) : 0,
        maintenanceRate: totalVehicles > 0 ? ((maintenanceVehicles / totalVehicles) * 100) : 0,
        vehicles: vehicles || [],
        maintenance: maintenance || [],
      }
    },
    enabled: !!companyId,
  })
}