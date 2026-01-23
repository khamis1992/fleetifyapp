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
  // New: Customer-specific pricing
  customerHistory?: {
    lastPrice: number;
    lastDate: string;
    contractCount: number;
    averagePrice: number;
  };
  // New: Vehicle default price
  vehicleDefaultPrice?: number;
  // New: Similar contracts average
  similarContractsAverage?: number;
}

interface UsePricingSuggestionsParams {
  contractType: string;
  rentalDays: number;
  vehicleId?: string;
  customerId?: string; // NEW: Customer ID for history lookup
  enabled?: boolean;
}

/**
 * Custom hook for smart pricing suggestions based on historical data
 *
 * Features:
 * - Customer history: Last price used with this customer
 * - Similar contracts: Average of last 5 similar contracts
 * - Vehicle default: Default price from vehicle record
 * - Seasonal adjustments (15% peak season)
 * - Duration discounts (10% for 7+ days, 20% for 30+ days)
 *
 * @example
 * const { data: pricing } = usePricingSuggestions({
 *   contractType: 'weekly_rental',
 *   rentalDays: 7,
 *   vehicleId: 'uuid',
 *   customerId: 'uuid'
 * });
 */
export function usePricingSuggestions({
  contractType,
  rentalDays,
  vehicleId,
  customerId,
  enabled = true
}: UsePricingSuggestionsParams) {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['pricing-suggestions', companyId, contractType, rentalDays, vehicleId, customerId],
    queryFn: async (): Promise<PricingSuggestion> => {
      if (!companyId || !contractType || rentalDays <= 0) {
        throw new Error('Missing required parameters');
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // === 1. Fetch Customer History (NEW) ===
      let customerHistory: PricingSuggestion['customerHistory'] = undefined;
      
      if (customerId) {
        const { data: customerContracts, error: customerError } = await supabase
          .from('contracts')
          .select('contract_amount, start_date, end_date')
          .eq('company_id', companyId)
          .eq('customer_id', customerId)
          .not('contract_amount', 'is', null)
          .gt('contract_amount', 0)
          .order('start_date', { ascending: false })
          .limit(10);

        if (!customerError && customerContracts && customerContracts.length > 0) {
          const lastContract = customerContracts[0];
          const totalAmount = customerContracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
          
          customerHistory = {
            lastPrice: lastContract.contract_amount || 0,
            lastDate: lastContract.start_date,
            contractCount: customerContracts.length,
            averagePrice: Math.round(totalAmount / customerContracts.length),
          };
        }
      }

      // === 2. Fetch Vehicle Default Price (NEW) ===
      let vehicleDefaultPrice: number | undefined = undefined;
      
      if (vehicleId && vehicleId !== 'none') {
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select('daily_rate, weekly_rate, monthly_rate')
          .eq('id', vehicleId)
          .single();

        if (!vehicleError && vehicle) {
          // Get rate based on rental duration
          if (rentalDays >= 30 && vehicle.monthly_rate) {
            vehicleDefaultPrice = vehicle.monthly_rate;
          } else if (rentalDays >= 7 && vehicle.weekly_rate) {
            vehicleDefaultPrice = vehicle.weekly_rate * Math.ceil(rentalDays / 7);
          } else if (vehicle.daily_rate) {
            vehicleDefaultPrice = vehicle.daily_rate * rentalDays;
          }
        }
      }

      // === 3. Fetch Similar Contracts ===
      let query = supabase
        .from('contracts')
        .select('contract_amount, start_date, end_date, vehicle_id')
        .eq('company_id', companyId)
        .eq('contract_type', contractType)
        .gte('start_date', sixMonthsAgo.toISOString())
        .not('contract_amount', 'is', null)
        .gt('contract_amount', 0)
        .order('start_date', { ascending: false })
        .limit(10);

      // If vehicle specified, prioritize that vehicle's history
      if (vehicleId && vehicleId !== 'none') {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data: contracts, error } = await query;

      if (error) {
        console.error('Error fetching pricing history:', error);
        throw error;
      }

      // Helper function to calculate rental days from start_date and end_date
      const calculateRentalDays = (startDate: string, endDate: string | null): number => {
        if (!endDate) return 1;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1;
      };

      // Filter contracts with similar duration (±20%)
      const durationRange = rentalDays * 0.2;
      const similarContracts = (contracts || []).filter(
        (contract) => {
          const contractDays = calculateRentalDays(contract.start_date, contract.end_date);
          return contractDays >= rentalDays - durationRange &&
            contractDays <= rentalDays + durationRange;
        }
      ).slice(0, 5);

      // Calculate similar contracts average
      let similarContractsAverage: number | undefined = undefined;
      const sampleSize = similarContracts.length;

      if (sampleSize > 0) {
        const totalPrice = similarContracts.reduce(
          (sum, contract) => sum + (contract.contract_amount || 0),
          0
        );
        similarContractsAverage = Math.round(totalPrice / sampleSize);
      }

      // === 4. Determine Base Price (Priority: Customer History > Similar Contracts > Vehicle Default) ===
      let basePrice = 0;
      let basePriceSource = 'fallback';

      if (customerHistory && customerHistory.lastPrice > 0) {
        // Priority 1: Use customer's last price
        basePrice = customerHistory.lastPrice;
        basePriceSource = 'customer_history';
      } else if (similarContractsAverage && similarContractsAverage > 0) {
        // Priority 2: Use similar contracts average
        basePrice = similarContractsAverage;
        basePriceSource = 'similar_contracts';
      } else if (vehicleDefaultPrice && vehicleDefaultPrice > 0) {
        // Priority 3: Use vehicle default price
        basePrice = vehicleDefaultPrice;
        basePriceSource = 'vehicle_default';
      } else {
        // Fallback: rough estimate based on contract type
        const fallbackRates: Record<string, number> = {
          daily: 150 * rentalDays,
          daily_rental: 150 * rentalDays,
          weekly: 900 * Math.ceil(rentalDays / 7),
          weekly_rental: 900 * Math.ceil(rentalDays / 7),
          monthly: 3000 * Math.ceil(rentalDays / 30),
          monthly_rental: 3000 * Math.ceil(rentalDays / 30),
          long_term_rental: 2500,
          short_term_rental: 500,
        };
        basePrice = fallbackRates[contractType] || 1000;
        basePriceSource = 'fallback';
      }

      // === 5. Apply Seasonal Adjustment ===
      const currentMonth = new Date().getMonth() + 1;
      const isPeakSeason = [12, 1, 6, 7, 8].includes(currentMonth);
      const seasonalAdjustment = isPeakSeason ? basePrice * 0.15 : 0;

      // === 6. Apply Duration Discounts ===
      let durationDiscount = 0;
      if (rentalDays >= 30) {
        durationDiscount = (basePrice + seasonalAdjustment) * 0.2;
      } else if (rentalDays >= 7) {
        durationDiscount = (basePrice + seasonalAdjustment) * 0.1;
      }

      // === 7. Calculate Final Suggested Price ===
      const suggestedPrice = Math.round(basePrice + seasonalAdjustment - durationDiscount);

      // === 8. Determine Confidence Level ===
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (customerHistory && customerHistory.contractCount >= 2) {
        confidence = 'high'; // Customer history is most reliable
      } else if (sampleSize >= 4) {
        confidence = 'high';
      } else if (sampleSize >= 2 || customerHistory) {
        confidence = 'medium';
      }

      // === 9. Create Breakdown ===
      const breakdown: PricingSuggestion['breakdown'] = [];

      if (basePriceSource === 'customer_history' && customerHistory) {
        breakdown.push({
          label: `آخر سعر مع العميل (${new Date(customerHistory.lastDate).toLocaleDateString('en-US')})`,
          value: Math.round(customerHistory.lastPrice),
          type: 'base',
        });
      } else if (basePriceSource === 'similar_contracts') {
        breakdown.push({
          label: `متوسط العقود المشابهة (${sampleSize} عقود)`,
          value: Math.round(basePrice),
          type: 'base',
        });
      } else if (basePriceSource === 'vehicle_default') {
        breakdown.push({
          label: 'السعر الافتراضي للمركبة',
          value: Math.round(basePrice),
          type: 'base',
        });
      } else {
        breakdown.push({
          label: 'السعر التقديري',
          value: Math.round(basePrice),
          type: 'base',
        });
      }

      if (seasonalAdjustment > 0) {
        breakdown.push({
          label: 'تعديل الموسم (موسم ذروة +15%)',
          value: Math.round(seasonalAdjustment),
          type: 'adjustment',
        });
      }

      if (durationDiscount > 0) {
        const discountPercent = rentalDays >= 30 ? '20%' : '10%';
        breakdown.push({
          label: `خصم المدة (${rentalDays} يوم - ${discountPercent})`,
          value: -Math.round(durationDiscount),
          type: 'discount',
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
        customerHistory,
        vehicleDefaultPrice: vehicleDefaultPrice ? Math.round(vehicleDefaultPrice) : undefined,
        similarContractsAverage,
      };
    },
    enabled: enabled && !!companyId && !!contractType && rentalDays > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export default usePricingSuggestions;
