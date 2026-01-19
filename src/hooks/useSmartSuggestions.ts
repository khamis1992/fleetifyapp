import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AlternativeVehicle {
  id: string;
  make: string;
  model: string;
  plate_number: string;
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  status: string;
}

export interface AlternativeDate {
  start_date: string;
  end_date: string;
  availability: string;
  reason: string;
}

export interface SmartSuggestion {
  type: 'alternative_dates' | 'alternative_vehicle' | 'pricing_optimization' | 'duration_adjustment';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

export const useSmartSuggestions = () => {
  const generateVehicleAlternatives = useCallback(async (
    companyId: string,
    startDate: string,
    endDate: string,
    excludeVehicleId?: string
  ): Promise<SmartSuggestion[]> => {
    try {
      const { data: availableVehicles, error } = await supabase.rpc('get_available_vehicles_for_contracts', {
        company_id_param: companyId
      });

      if (error) throw error;

      const alternatives = availableVehicles
        ?.filter((v: any) => v.id !== excludeVehicleId)
        ?.slice(0, 3) || [];

      if (alternatives.length > 0) {
        return [{
          type: 'alternative_vehicle',
          title: 'مركبات بديلة متاحة',
          description: `وُجدت ${alternatives.length} مركبة بديلة متاحة للفترة المحددة`,
          action: 'عرض البدائل',
          priority: 'medium',
          data: {
            vehicles: alternatives
          }
        }];
      }

      return [];
    } catch (error) {
      console.error('Error generating vehicle alternatives:', error);
      return [];
    }
  }, []);

  const generateDateAlternatives = useCallback(async (
    vehicleId: string,
    requestedStartDate: string,
    duration: number
  ): Promise<SmartSuggestion[]> => {
    try {
      const alternatives: AlternativeDate[] = [];
      const requestedStart = new Date(requestedStartDate);
      
      // Check dates before and after the requested period
      for (let offset of [-7, -3, 3, 7, 14]) {
        const alternativeStart = new Date(requestedStart);
        alternativeStart.setDate(requestedStart.getDate() + offset);
        
        const alternativeEnd = new Date(alternativeStart);
        alternativeEnd.setDate(alternativeStart.getDate() + duration - 1);
        
        const { data: availability } = await supabase.rpc('check_vehicle_availability_realtime', {
          vehicle_id_param: vehicleId,
          start_date_param: alternativeStart.toISOString().slice(0, 10),
          end_date_param: alternativeEnd.toISOString().slice(0, 10)
        });

        if ((availability as any)?.available) {
          alternatives.push({
            start_date: alternativeStart.toISOString().slice(0, 10),
            end_date: alternativeEnd.toISOString().slice(0, 10),
            availability: 'متاح',
            reason: offset < 0 ? 'فترة سابقة' : 'فترة لاحقة'
          });
        }
      }

      if (alternatives.length > 0) {
        return [{
          type: 'alternative_dates',
          title: 'تواريخ بديلة متاحة',
          description: `وُجدت ${alternatives.length} فترة بديلة متاحة لنفس المركبة`,
          action: 'اختر فترة بديلة',
          priority: 'high',
          data: {
            alternatives: alternatives.slice(0, 3)
          }
        }];
      }

      return [];
    } catch (error) {
      console.error('Error generating date alternatives:', error);
      return [];
    }
  }, []);

  const generatePricingOptimizations = useCallback((
    contractAmount: number,
    contractType: string,
    duration: number
  ): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // Suggest longer duration for better rates
    if (contractType === 'daily_rental' && duration >= 7) {
      const potentialSavings = (contractAmount * 0.15); // 15% savings for weekly
      suggestions.push({
        type: 'pricing_optimization',
        title: 'توفير بالتأجير الأسبوعي',
        description: 'يمكن توفير المال بالتحويل إلى تأجير أسبوعي بدلاً من اليومي',
        action: 'طبق التسعير الأسبوعي',
        priority: 'medium',
        data: {
          savings: potentialSavings
        }
      });
    }

    if ((contractType === 'daily_rental' || contractType === 'weekly_rental') && duration >= 30) {
      const potentialSavings = (contractAmount * 0.25); // 25% savings for monthly
      suggestions.push({
        type: 'pricing_optimization',
        title: 'توفير بالتأجير الشهري',
        description: 'يمكن توفير المال بالتحويل إلى تأجير شهري',
        action: 'طبق التسعير الشهري',
        priority: 'high',
        data: {
          savings: potentialSavings
        }
      });
    }

    return suggestions;
  }, []);

  const generateDurationAdjustments = useCallback((
    contractType: string,
    currentDuration: number
  ): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    if (contractType === 'monthly_rental' && currentDuration < 30) {
      suggestions.push({
        type: 'duration_adjustment',
        title: 'تعديل المدة للتأجير الشهري',
        description: 'المدة أقل من شهر، هل تريد تعديلها إلى 30 يوم للحصول على سعر أفضل؟',
        action: 'عدل إلى 30 يوم',
        priority: 'medium',
        data: {
          suggested_duration: 30
        }
      });
    }

    if (contractType === 'weekly_rental' && currentDuration < 7) {
      suggestions.push({
        type: 'duration_adjustment',
        title: 'تعديل المدة للتأجير الأسبوعي',
        description: 'المدة أقل من أسبوع، هل تريد تعديلها إلى 7 أيام؟',
        action: 'عدل إلى 7 أيام',
        priority: 'medium',
        data: {
          suggested_duration: 7
        }
      });
    }

    return suggestions;
  }, []);

  const generateAllSuggestions = useCallback(async (
    companyId: string,
    contractData: {
      vehicle_id?: string;
      customer_id?: string;
      start_date?: string;
      end_date?: string;
      contract_amount?: number;
      contract_type?: string;
      rental_days?: number;
    },
    validationIssues: any[] = []
  ): Promise<SmartSuggestion[]> => {
    const suggestions: SmartSuggestion[] = [];

    // Generate suggestions based on validation issues
    for (const issue of validationIssues) {
      if (issue.type === 'vehicle_unavailable' && contractData.vehicle_id) {
        // Suggest alternative vehicles
        const vehicleAlternatives = await generateVehicleAlternatives(
          companyId,
          contractData.start_date || '',
          contractData.end_date || '',
          contractData.vehicle_id
        );
        suggestions.push(...vehicleAlternatives);

        // Suggest alternative dates
        if (contractData.rental_days) {
          const dateAlternatives = await generateDateAlternatives(
            contractData.vehicle_id,
            contractData.start_date || '',
            contractData.rental_days
          );
          suggestions.push(...dateAlternatives);
        }
      }
    }

    // Generate pricing optimizations
    if (contractData.contract_amount && contractData.contract_type && contractData.rental_days) {
      const pricingOptimizations = generatePricingOptimizations(
        contractData.contract_amount,
        contractData.contract_type,
        contractData.rental_days
      );
      suggestions.push(...pricingOptimizations);
    }

    // Generate duration adjustments
    if (contractData.contract_type && contractData.rental_days) {
      const durationAdjustments = generateDurationAdjustments(
        contractData.contract_type,
        contractData.rental_days
      );
      suggestions.push(...durationAdjustments);
    }

    return suggestions;
  }, [generateVehicleAlternatives, generateDateAlternatives, generatePricingOptimizations, generateDurationAdjustments]);

  return {
    generateVehicleAlternatives,
    generateDateAlternatives,
    generatePricingOptimizations,
    generateDurationAdjustments,
    generateAllSuggestions
  };
};