import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface UseAvailableVehiclesByDateRangeProps {
  companyId?: string
  startDate?: string
  endDate?: string
  enabled?: boolean
}

export const useAvailableVehiclesByDateRange = ({
  companyId,
  startDate,
  endDate,
  enabled = true
}: UseAvailableVehiclesByDateRangeProps) => {
  return useQuery({
    queryKey: ['available-vehicles-by-date-range', companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return []

      let query = supabase
        .from('vehicles')
        .select(`
          id,
          plate_number,
          make,
          model,
          year,
          color,
          status,
          daily_rate,
          weekly_rate,
          monthly_rate,
          minimum_rental_price,
          enforce_minimum_price
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('status', ['available', 'reserved'])
        .order('created_at', { ascending: false })

      const { data: vehicles, error } = await query

      if (error) throw error
      if (!vehicles || !startDate || !endDate) return vehicles || []

      // Filter out vehicles that have conflicting contracts in the date range
      const conflictingVehicles = new Set()

      const { data: conflictingContracts } = await supabase
        .from('contracts')
        .select('vehicle_id')
        .eq('company_id', companyId)
        .in('status', ['active', 'draft'])
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

      if (conflictingContracts) {
        conflictingContracts.forEach(contract => {
          if (contract.vehicle_id) {
            conflictingVehicles.add(contract.vehicle_id)
          }
        })
      }

      // Return only vehicles that are not in conflicting contracts
      return vehicles.filter(vehicle => !conflictingVehicles.has(vehicle.id))
    },
    enabled: enabled && !!companyId
  })
}