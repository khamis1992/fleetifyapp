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
  
  // Enhanced financial fields
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_premium_amount?: number
  insurance_start_date?: string
  insurance_end_date?: string
  registration_fees?: number
  registration_date?: string
  registration_expiry?: string
  purchase_invoice_number?: string
  vendor_id?: string
  warranty_start_date?: string
  warranty_end_date?: string
  warranty_provider?: string
  depreciation_rate?: number
  total_maintenance_cost?: number
  total_insurance_cost?: number
  total_operating_cost?: number
  vehicle_group_id?: string
  fuel_capacity?: number
  engine_size?: string
  transmission_type?: string
  cargo_capacity?: number
  vehicle_weight?: number
  safety_features?: string[]
  additional_features?: string[]
  journal_entry_id?: string
}

export interface VehicleGroup {
  id: string
  company_id: string
  group_name: string
  group_name_ar?: string
  description?: string
  default_cost_center_id?: string
  default_depreciation_rate?: number
  default_useful_life_years?: number
  group_color?: string
  is_active: boolean
  created_at: string
  updated_at: string
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
    queryKey: ["vehicles", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .order("plate_number")

      if (error) {
        console.error("Error fetching vehicles:", error)
        throw error
      }

      return data as Vehicle[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useAvailableVehicles = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["available-vehicles", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .eq("status", "available")
        .order("plate_number")

      if (error) {
        console.error("Error fetching available vehicles:", error)
        throw error
      }

      return data as Vehicle[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
      console.log("🚗 [USE_CREATE_VEHICLE] Starting vehicle creation");
      console.log("📋 [USE_CREATE_VEHICLE] Input data:", vehicleData);
      
      // Additional validation
      if (!vehicleData.company_id) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing company_id");
        throw new Error("معرف الشركة مطلوب");
      }
      
      if (!vehicleData.plate_number) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing plate_number");
        throw new Error("رقم اللوحة مطلوب");
      }
      
      if (!vehicleData.make) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing make");
        throw new Error("الشركة المصنعة مطلوبة");
      }
      
      if (!vehicleData.model) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing model");
        throw new Error("الطراز مطلوب");
      }
      
      // Check if user has permission to create vehicles for this company
      const userCompanyId = user?.profile?.company_id || user?.company?.id;
      if (vehicleData.company_id !== userCompanyId) {
        console.error("❌ [USE_CREATE_VEHICLE] User company mismatch:", {
          userCompanyId,
          vehicleCompanyId: vehicleData.company_id
        });
        throw new Error("ليس لديك صلاحية لإنشاء مركبة لهذه الشركة");
      }
      
      console.log("📤 [USE_CREATE_VEHICLE] Inserting vehicle into database");
      
      const { data, error } = await supabase
        .from("vehicles")
        .insert([vehicleData])
        .select()
        .single()

      if (error) {
        console.error("❌ [USE_CREATE_VEHICLE] Database error:", error);
        console.error("❌ [USE_CREATE_VEHICLE] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Provide more specific error messages based on error codes
        if (error.code === '23505') {
          throw new Error("رقم اللوحة موجود مسبقاً في النظام");
        } else if (error.code === '23503') {
          throw new Error("خطأ في البيانات المرجعية - تأكد من صحة معرف الشركة");
        } else if (error.code === '23502') {
          throw new Error("هناك حقول مطلوبة لم يتم تزويدها");
        } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          throw new Error("ليس لديك صلاحية لإنشاء مركبة");
        } else if (error.message.includes('trigger') || error.message.includes('function')) {
          console.warn("⚠️ [USE_CREATE_VEHICLE] Trigger warning, but vehicle may have been created");
          throw new Error("تم إنشاء المركبة ولكن حدث خطأ في المعالجة الإضافية");
        } else {
          throw new Error(`خطأ في قاعدة البيانات: ${error.message}`);
        }
      }
      
      console.log("✅ [USE_CREATE_VEHICLE] Vehicle created successfully:", data);
      return data
    },
    onSuccess: (data) => {
      console.log("🎉 [USE_CREATE_VEHICLE] Success callback triggered for vehicle:", data.plate_number);
      console.log("🔄 [USE_CREATE_VEHICLE] Invalidating vehicle queries...");
      
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] })
      queryClient.invalidateQueries({ queryKey: ["fleet-status"] })
      
      // Force a refetch to ensure data is updated immediately
      queryClient.refetchQueries({ queryKey: ["vehicles"] })
      
      console.log("✅ [USE_CREATE_VEHICLE] Success flow completed");
    },
    onError: (error) => {
      console.error("❌ [USE_CREATE_VEHICLE] Error callback triggered");
      console.error("❌ [USE_CREATE_VEHICLE] Error object:", error);
      console.error("❌ [USE_CREATE_VEHICLE] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      let errorMessage = "فشل في إنشاء المركبة - خطأ غير معروف";
      
      if (error instanceof Error) {
        console.error("❌ [USE_CREATE_VEHICLE] Error message:", error.message);
        errorMessage = error.message;
      }
      
      // Don't show toast here if it's already handled in the form
      console.log("⚠️ [USE_CREATE_VEHICLE] Error handled, message:", errorMessage);
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
    queryKey: ["vehicle-maintenance", vehicleId, user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      let query = supabase
        .from("vehicle_maintenance")
        .select(`
          *,
          vehicles!inner(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)
        .order("created_at", { ascending: false })

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id
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

      console.log("Starting fleet analytics fetch for company:", companyId)

      try {
        // First, get basic vehicle data
        const { data: vehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true)

        if (vehiclesError) {
          console.error("Error fetching vehicles:", vehiclesError)
          throw vehiclesError
        }

        console.log("Fetched vehicles:", vehicles?.length || 0)

        // Get vehicle pricing data separately
        let vehiclePricing: any[] = []
        if (vehicles && vehicles.length > 0) {
          const { data: pricingData, error: pricingError } = await supabase
            .from("vehicle_pricing")
            .select("vehicle_id, daily_rate, weekly_rate, monthly_rate")
            .in("vehicle_id", vehicles.map(v => v.id))
            .eq("is_active", true)

          if (pricingError) {
            console.warn("Error fetching vehicle pricing:", pricingError)
          } else {
            vehiclePricing = pricingData || []
          }
        }

        console.log("Fetched vehicle pricing:", vehiclePricing.length)

        // Get fixed assets data separately
        let fixedAssets: any[] = []
        if (vehicles && vehicles.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from("fixed_assets")
            .select("id, book_value, accumulated_depreciation, purchase_cost")
            .eq("company_id", companyId)
            .eq("is_active", true)

          if (assetsError) {
            console.warn("Error fetching fixed assets:", assetsError)
          } else {
            fixedAssets = assetsData || []
          }
        }

        console.log("Fetched fixed assets:", fixedAssets.length)

        // Get maintenance statistics
        let maintenance: any[] = []
        if (vehicles && vehicles.length > 0) {
          const { data: maintenanceData, error: maintenanceError } = await supabase
            .from("vehicle_maintenance")
            .select("*, vehicles(plate_number)")
            .in("vehicle_id", vehicles.map(v => v.id))

          if (maintenanceError) {
            console.warn("Error fetching maintenance data:", maintenanceError)
          } else {
            maintenance = maintenanceData || []
          }
        }

        console.log("Fetched maintenance records:", maintenance.length)

        // Calculate analytics
        const totalVehicles = vehicles?.length || 0
        const availableVehicles = vehicles?.filter(v => v.status === 'available').length || 0
        const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance').length || 0
        const rentedVehicles = vehicles?.filter(v => v.status === 'rented').length || 0

        // Calculate total book value from fixed assets
        const totalBookValue = fixedAssets.reduce((sum, asset) => {
          return sum + (asset.book_value || 0)
        }, 0)

        // Calculate total depreciation from fixed assets
        const totalDepreciation = fixedAssets.reduce((sum, asset) => {
          return sum + (asset.accumulated_depreciation || 0)
        }, 0)

        // Calculate monthly maintenance cost
        const monthlyMaintenanceCost = maintenance
          ?.filter(m => {
            const date = new Date(m.scheduled_date)
            const now = new Date()
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
          })
          .reduce((sum, m) => sum + (m.estimated_cost || 0), 0) || 0

        // Combine vehicles with their pricing data
        const vehiclesWithPricing = vehicles?.map(vehicle => {
          const pricing = vehiclePricing.find(p => p.vehicle_id === vehicle.id)
          return {
            ...vehicle,
            daily_rate: pricing?.daily_rate || 0,
            weekly_rate: pricing?.weekly_rate || 0,
            monthly_rate: pricing?.monthly_rate || 0,
          }
        }) || []

        const result = {
          totalVehicles,
          availableVehicles,
          maintenanceVehicles,
          rentedVehicles,
          totalBookValue,
          totalDepreciation,
          monthlyMaintenanceCost,
          utilizationRate: totalVehicles > 0 ? ((rentedVehicles / totalVehicles) * 100) : 0,
          maintenanceRate: totalVehicles > 0 ? ((maintenanceVehicles / totalVehicles) * 100) : 0,
          vehicles: vehiclesWithPricing,
          maintenance: maintenance,
        }

        console.log("Fleet analytics result:", result)
        return result

      } catch (error) {
        console.error("Error in fleet analytics:", error)
        throw error
      }
    },
    enabled: !!companyId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Vehicle Groups Hooks
export const useVehicleGroups = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["vehicle-groups", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      const { data, error } = await supabase
        .from("vehicle_groups")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .order("group_name")

      if (error) {
        console.error("Error fetching vehicle groups:", error)
        throw error
      }

      return data as VehicleGroup[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateVehicleGroup = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async (groupData: Omit<VehicleGroup, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_groups")
        .insert([{
          ...groupData,
          company_id: user?.profile?.company_id
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-groups"] })
      toast({
        title: "نجح",
        description: "تم إنشاء مجموعة المركبات بنجاح",
      })
    },
    onError: (error) => {
      console.error("Error creating vehicle group:", error)
      toast({
        title: "خطأ",
        description: "فشل في إنشاء مجموعة المركبات",
        variant: "destructive",
      })
    }
  })
}

// Enhanced vendors hook for vehicle purchases
export const useVendors = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["vendors", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .order("vendor_name")

      if (error) {
        console.error("Error fetching vendors:", error)
        throw error
      }

      return data || []
    },
    enabled: !!user?.profile?.company_id
  })
}