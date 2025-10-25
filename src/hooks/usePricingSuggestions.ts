import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

interface PricingSuggestion {
  suggestedPrice: number;
  basePrice: number;
  seasonalAdjustment: number;
  durationDiscount: number;
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;
  breakdown: {
    label: string;
    value: number;
    type: 'base' | 'adjustment' | 'discount';
  }[];
}

interface UsePricingSuggestionsParams {
  contractType: string;
  rentalDays: number;
  vehicleId?: string;
  enabled?: boolean;
}

/**
 * Custom hook for smart pricing suggestions based on historical data
 *
 * Features:
 * - Analyzes last 5 similar contracts
 * - Applies seasonal adjustments (15% peak season)
 * - Applies duration discounts (10% for 7+ days, 20% for 30+ days)
 * - Returns confidence level based on sample size
 *
 * @example
 * const { data: pricing } = usePricingSuggestions({
 *   contractType: 'weekly_rental',
 *   rentalDays: 7,
 *   vehicleId: 'uuid'
 * });
 */
export function usePricingSuggestions({
  contractType,
  rentalDays,
  vehicleId,
  enabled = true
}: UsePricingSuggestionsParams) {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['pricing-suggestions', companyId, contractType, rentalDays, vehicleId],
    queryFn: async (): Promise<PricingSuggestion> => {
      if (!companyId || !contractType || rentalDays <= 0) {
        throw new Error('Missing required parameters');
      }

      // 1. Fetch similar contracts from the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      let query = supabase
        .from('contracts')
        .select('contract_amount, rental_days, start_date, vehicle_id')
        .eq('company_id', companyId)
        .eq('contract_type', contractType)
        .gte('start_date', sixMonthsAgo.toISOString())
        .not('contract_amount', 'is', null)
        .gt('contract_amount', 0)
        .order('start_date', { ascending: false })
        .limit(10); // Get more for better filtering

      // If vehicle specified, prioritize that vehicle's history
      if (vehicleId && vehicleId !== 'none') {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data: contracts, error } = await query;

      if (error) {
        console.error('Error fetching pricing history:', error);
        throw error;
      }

      // 2. Filter contracts with similar duration (±20%)
      const durationRange = rentalDays * 0.2;
      const similarContracts = (contracts || []).filter(
        (contract) =>
          contract.rental_days >= rentalDays - durationRange &&
          contract.rental_days <= rentalDays + durationRange
      ).slice(0, 5); // Take top 5

      // 3. Calculate base price (average of similar contracts)
      let basePrice = 0;
      const sampleSize = similarContracts.length;

      if (sampleSize > 0) {
        const totalPrice = similarContracts.reduce(
          (sum, contract) => sum + (contract.contract_amount || 0),
          0
        );
        basePrice = totalPrice / sampleSize;
      } else {
        // Fallback: Calculate based on average daily rate from all contracts
        const { data: allContracts } = await supabase
          .from('contracts')
          .select('contract_amount, rental_days')
          .eq('company_id', companyId)
          .eq('contract_type', contractType)
          .gte('start_date', sixMonthsAgo.toISOString())
          .not('contract_amount', 'is', null)
          .gt('contract_amount', 0)
          .limit(20);

        if (allContracts && allContracts.length > 0) {
          const avgDailyRate =
            allContracts.reduce(
              (sum, c) => sum + (c.contract_amount || 0) / (c.rental_days || 1),
              0
            ) / allContracts.length;
          basePrice = avgDailyRate * rentalDays;
        } else {
          // Ultimate fallback: rough estimate based on contract type
          const fallbackRates: Record<string, number> = {
            daily_rental: 150,
            weekly_rental: 900,
            monthly_rental: 3000,
            long_term_rental: 2500,
            short_term_rental: 500,
          };
          basePrice = fallbackRates[contractType] || 1000;
        }
      }

      // 4. Apply seasonal adjustment (15% increase for peak season)
      // Peak season: Summer (June, July, August) and Winter holidays (December, January)
      const currentMonth = new Date().getMonth() + 1;
      const isPeakSeason = [12, 1, 6, 7, 8].includes(currentMonth);
      const seasonalAdjustment = isPeakSeason ? basePrice * 0.15 : 0;

      // 5. Apply duration discounts
      let durationDiscount = 0;
      if (rentalDays >= 30) {
        durationDiscount = (basePrice + seasonalAdjustment) * 0.2; // 20% discount for 30+ days
      } else if (rentalDays >= 7) {
        durationDiscount = (basePrice + seasonalAdjustment) * 0.1; // 10% discount for 7+ days
      }

      // 6. Calculate final suggested price
      const suggestedPrice = Math.round(
        basePrice + seasonalAdjustment - durationDiscount
      );

      // 7. Determine confidence level
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (sampleSize >= 4) {
        confidence = 'high';
      } else if (sampleSize >= 2) {
        confidence = 'medium';
      }

      // 8. Create breakdown for transparency
      const breakdown = [
        {
          label: 'السعر الأساسي (متوسط عقود مشابهة)',
          value: Math.round(basePrice),
          type: 'base' as const,
        },
      ];

      if (seasonalAdjustment > 0) {
        breakdown.push({
          label: isPeakSeason ? 'تعديل الموسم (موسم ذروة +15%)' : 'تعديل الموسم',
          value: Math.round(seasonalAdjustment),
          type: 'adjustment' as const,
        });
      }

      if (durationDiscount > 0) {
        const discountPercent = rentalDays >= 30 ? '20%' : '10%';
        breakdown.push({
          label: `خصم المدة (${rentalDays} يوم - ${discountPercent})`,
          value: -Math.round(durationDiscount),
          type: 'discount' as const,
        });
      }

      return {
        suggestedPrice,
        basePrice: Math.round(basePrice),
        seasonalAdjustment: Math.round(seasonalAdjustment),
        durationDiscount: Math.round(durationDiscount),
        confidence,
        sampleSize,
        breakdown,
      };
    },
    enabled: enabled && !!companyId && !!contractType && rentalDays > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
