import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VehicleConditionReport } from "./useVehicleCondition";

export interface DamageComparison {
  id: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  x: number;
  y: number;
  status: 'existing' | 'new' | 'resolved';
  photos?: string[];
}

export interface ConditionComparison {
  contractId: string;
  vehicleId: string;
  initialReport?: VehicleConditionReport;
  returnReport?: VehicleConditionReport;
  damageChanges: {
    newDamages: DamageComparison[];
    existingDamages: DamageComparison[];
    resolvedDamages: DamageComparison[];
  };
  conditionChanges: {
    mileageIncrease: number;
    fuelLevelChange: number;
    overallConditionChange: {
      from: string;
      to: string;
      improved: boolean;
    };
  };
  summary: {
    totalNewDamages: number;
    totalResolvedDamages: number;
    conditionImproved: boolean;
    requiresAttention: boolean;
  };
}

export const useVehicleConditionComparison = (contractId: string) => {
  return useQuery({
    queryKey: ['vehicle-condition-comparison', contractId],
    queryFn: async (): Promise<ConditionComparison | null> => {
      if (!contractId) return null;

      // Get contract vehicle information
      const { data: contract } = await supabase
        .from('contracts')
        .select('vehicle_id')
        .eq('id', contractId)
        .single();

      if (!contract?.vehicle_id) return null;

      // Get initial condition report (contract start)
      const { data: initialReports } = await supabase
        .from('vehicle_condition_reports')
        .select('*')
        .eq('contract_id', contractId)
        .eq('inspection_type', 'contract_inspection')
        .order('created_at', { ascending: true })
        .limit(1);

      // Get return condition report
      const { data: returnData } = await supabase
        .from('contract_vehicle_returns')
        .select('*')
        .eq('contract_id', contractId)
        .single();

      const initialReport = initialReports?.[0] as VehicleConditionReport | undefined;

      // Compare damages if both reports exist
      const damageChanges = compareDamages(
        initialReport?.damage_items || [],
        Array.isArray(returnData?.damages) ? returnData.damages : []
      );

      // Calculate condition changes
      const conditionChanges = calculateConditionChanges(
        initialReport,
        returnData
      );

      // Generate summary
      const summary = generateSummary(damageChanges, conditionChanges);

      return {
        contractId,
        vehicleId: contract.vehicle_id,
        initialReport,
        returnReport: returnData as any,
        damageChanges,
        conditionChanges,
        summary
      };
    },
    enabled: !!contractId,
  });
};

function compareDamages(initialDamages: any[], returnDamages: any[]): ConditionComparison['damageChanges'] {
  const newDamages: DamageComparison[] = [];
  const existingDamages: DamageComparison[] = [];
  const resolvedDamages: DamageComparison[] = [];

  // Convert damages to consistent format
  const normalizePoint = (damage: any): DamageComparison => ({
    id: damage.id || `damage_${Date.now()}_${Math.random()}`,
    severity: damage.severity || 'minor',
    description: damage.description || damage.type || 'غير محدد',
    x: damage.x || 0,
    y: damage.y || 0,
    status: 'existing',
    photos: damage.photos || []
  });

  const initialPoints = initialDamages.map(normalizePoint);
  const returnPoints = returnDamages.map(normalizePoint);

  // Find new damages (in return but not in initial)
  returnPoints.forEach(returnPoint => {
    const exists = initialPoints.some(initialPoint => 
      Math.abs(initialPoint.x - returnPoint.x) < 20 && 
      Math.abs(initialPoint.y - returnPoint.y) < 20
    );
    
    if (!exists) {
      newDamages.push({ ...returnPoint, status: 'new' });
    } else {
      existingDamages.push({ ...returnPoint, status: 'existing' });
    }
  });

  // Find resolved damages (in initial but not in return)
  initialPoints.forEach(initialPoint => {
    const stillExists = returnPoints.some(returnPoint => 
      Math.abs(initialPoint.x - returnPoint.x) < 20 && 
      Math.abs(initialPoint.y - returnPoint.y) < 20
    );
    
    if (!stillExists) {
      resolvedDamages.push({ ...initialPoint, status: 'resolved' });
    }
  });

  return { newDamages, existingDamages, resolvedDamages };
}

function calculateConditionChanges(
  initialReport?: VehicleConditionReport,
  returnData?: any
): ConditionComparison['conditionChanges'] {
  const mileageIncrease = returnData?.odometer_reading && initialReport?.mileage_reading
    ? returnData.odometer_reading - initialReport.mileage_reading
    : 0;

  const fuelLevelChange = returnData?.fuel_level && initialReport?.fuel_level
    ? returnData.fuel_level - initialReport.fuel_level
    : 0;

  const conditionMap = { excellent: 4, good: 3, fair: 2, poor: 1 };
  const initialConditionScore = initialReport?.overall_condition 
    ? conditionMap[initialReport.overall_condition] 
    : 3;
  const returnConditionScore = returnData?.vehicle_condition
    ? conditionMap[returnData.vehicle_condition]
    : 3;

  return {
    mileageIncrease,
    fuelLevelChange,
    overallConditionChange: {
      from: initialReport?.overall_condition || 'good',
      to: returnData?.vehicle_condition || 'good',
      improved: returnConditionScore > initialConditionScore
    }
  };
}

function generateSummary(
  damageChanges: ConditionComparison['damageChanges'],
  conditionChanges: ConditionComparison['conditionChanges']
): ConditionComparison['summary'] {
  const totalNewDamages = damageChanges.newDamages.length;
  const totalResolvedDamages = damageChanges.resolvedDamages.length;
  const conditionImproved = conditionChanges.overallConditionChange.improved;
  
  const requiresAttention = 
    totalNewDamages > 0 || 
    damageChanges.newDamages.some(d => d.severity === 'severe') ||
    conditionChanges.overallConditionChange.from === 'good' && conditionChanges.overallConditionChange.to === 'poor';

  return {
    totalNewDamages,
    totalResolvedDamages,
    conditionImproved,
    requiresAttention
  };
}