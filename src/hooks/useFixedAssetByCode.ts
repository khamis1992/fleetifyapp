import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

export interface FixedAssetForVehicle {
  id: string
  asset_code: string
  asset_name: string
  asset_name_ar?: string
  purchase_date?: string
  purchase_cost?: number
  salvage_value?: number
  useful_life_years?: number
  depreciation_method?: string
  location?: string
  category: string
  is_active: boolean
}

export const useFixedAssetByCode = (assetCode?: string) => {
  const { user } = useAuth()
  const companyId = user?.profile?.company_id

  return useQuery({
    queryKey: ['fixed-asset-by-code', assetCode, companyId],
    queryFn: async (): Promise<FixedAssetForVehicle | null> => {
      if (!assetCode || !companyId) return null

      const { data, error } = await supabase
        .from('fixed_assets')
        .select(`
          id,
          asset_code,
          asset_name,
          asset_name_ar,
          purchase_date,
          purchase_cost,
          salvage_value,
          useful_life_years,
          depreciation_method,
          location,
          category,
          is_active
        `)
        .eq('asset_code', assetCode)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) throw error
      return data as FixedAssetForVehicle | null
    },
    enabled: !!assetCode && !!companyId,
  })
}