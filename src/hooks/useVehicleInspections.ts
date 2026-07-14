import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

type ConditionReportRow = Database['public']['Tables']['vehicle_condition_reports']['Row'];

export interface DamageRecord {
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photo_url?: string;
}

export interface VehicleInspection {
  id: string;
  company_id: string;
  contract_id: string | null;
  vehicle_id: string;
  inspection_type: 'check_in' | 'check_out';
  inspected_by: string | null;
  inspection_date: string;
  fuel_level: number | null;
  odometer_reading: number | null;
  cleanliness_rating: number | null;
  exterior_condition: DamageRecord[];
  interior_condition: DamageRecord[];
  photo_urls: string[];
  notes: string | null;
  customer_signature: string | null;
  created_at: string;
  vehicle_type?: string | null;
  visual_inspection_zones?: Record<string, unknown>[];
  accessories?: string[];
  documents?: string[];
  status?: string | null;
  contract?: { id: string; contract_number: string };
  vehicle?: { id: string; plate_number: string; make: string; model: string };
  inspector?: { id: string; full_name: string };
}

interface UseVehicleInspectionsOptions {
  contractId?: string;
  vehicleId?: string;
  inspectionType?: 'check_in' | 'check_out';
  enabled?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function parseDamageRecords(value: unknown): DamageRecord[] {
  return recordArray(value).flatMap(item => {
    const severity = item.severity;
    if (severity !== 'minor' && severity !== 'moderate' && severity !== 'severe') return [];
    return [{
      location: typeof item.location === 'string' ? item.location : 'غير محدد',
      severity,
      description: typeof item.description === 'string' ? item.description : '',
      photo_url: typeof item.photo_url === 'string' ? item.photo_url : undefined,
    }];
  });
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function fetchInspections(
  companyId: string,
  filters: Omit<UseVehicleInspectionsOptions, 'enabled'>
): Promise<VehicleInspection[]> {
  let query = supabase
    .from('vehicle_condition_reports')
    .select('*')
    .eq('company_id', companyId)
    .in('inspection_type', ['check_in', 'check_out'])
    .order('inspection_date', { ascending: false });

  if (filters.contractId) query = query.eq('contract_id', filters.contractId);
  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.inspectionType) query = query.eq('inspection_type', filters.inspectionType);

  const { data, error } = await query;
  if (error) throw error;
  const reports = data || [];
  if (reports.length === 0) return [];

  const vehicleIds = [...new Set(reports.map(report => report.vehicle_id))];
  const contractIds = [...new Set(reports.map(report => report.contract_id).filter((id): id is string => Boolean(id)))];
  const inspectorIds = [...new Set(reports.map(report => report.inspector_id))];

  const [vehiclesResult, contractsResult, profilesResult] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, plate_number, make, model')
      .eq('company_id', companyId)
      .in('id', vehicleIds),
    contractIds.length > 0
      ? supabase
          .from('contracts')
          .select('id, contract_number')
          .eq('company_id', companyId)
          .in('id', contractIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name')
      .eq('company_id', companyId)
      .in('user_id', inspectorIds),
  ]);

  if (vehiclesResult.error) throw vehiclesResult.error;
  if (contractsResult.error) throw contractsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const vehicleById = new Map((vehiclesResult.data || []).map(vehicle => [vehicle.id, vehicle]));
  const contractById = new Map((contractsResult.data || []).map(contract => [contract.id, contract]));
  const profileByUserId = new Map((profilesResult.data || []).map(profile => [profile.user_id, profile]));

  return reports.map(report => transformReport(
    report,
    vehicleById.get(report.vehicle_id),
    report.contract_id ? contractById.get(report.contract_id) : undefined,
    profileByUserId.get(report.inspector_id)
  ));
}

function transformReport(
  report: ConditionReportRow,
  vehicle?: { id: string; plate_number: string; make: string; model: string },
  contract?: { id: string; contract_number: string },
  inspector?: { id: string; user_id: string; first_name: string | null; last_name: string | null }
): VehicleInspection {
  const conditionItems = isRecord(report.condition_items) ? report.condition_items : {};
  const inspectionType = report.inspection_type === 'check_out' ? 'check_out' : 'check_in';
  const inspectorName = inspector
    ? [inspector.first_name, inspector.last_name].filter(Boolean).join(' ') || 'مستخدم'
    : undefined;

  return {
    id: report.id,
    company_id: report.company_id,
    contract_id: report.contract_id,
    vehicle_id: report.vehicle_id,
    inspection_type: inspectionType,
    inspected_by: report.inspector_id,
    inspection_date: report.inspection_date,
    fuel_level: report.fuel_level,
    odometer_reading: report.mileage_reading,
    cleanliness_rating: numberValue(conditionItems.cleanliness_rating),
    exterior_condition: parseDamageRecords(report.damage_points),
    interior_condition: parseDamageRecords(conditionItems.interior_condition),
    photo_urls: stringArray(report.photos),
    notes: report.notes,
    customer_signature: report.customer_signature,
    created_at: report.created_at,
    vehicle_type: typeof conditionItems.vehicle_type === 'string' ? conditionItems.vehicle_type : null,
    visual_inspection_zones: recordArray(conditionItems.visual_inspection_zones),
    accessories: stringArray(conditionItems.accessories),
    documents: stringArray(conditionItems.documents),
    status: report.status,
    contract,
    vehicle,
    inspector: inspector && inspectorName ? { id: inspector.id, full_name: inspectorName } : undefined,
  };
}

export function useVehicleInspections(options: UseVehicleInspectionsOptions = {}) {
  const { contractId, vehicleId, inspectionType, enabled = true } = options;
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['vehicle-inspections', companyId, contractId, vehicleId, inspectionType],
    queryFn: () => {
      if (!companyId) throw new Error('Company context is unavailable');
      return fetchInspections(companyId, { contractId, vehicleId, inspectionType });
    },
    enabled: enabled && Boolean(companyId),
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useInspectionComparison(contractId: string) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['inspection-comparison', companyId, contractId],
    queryFn: async () => {
      if (!companyId || !contractId) throw new Error('Missing inspection comparison context');
      const inspections = await fetchInspections(companyId, { contractId });
      const checkIn = inspections.find(inspection => inspection.inspection_type === 'check_in');
      const checkOut = inspections.find(inspection => inspection.inspection_type === 'check_out');
      if (!checkIn || !checkOut) return null;

      const checkInDamages = [...checkIn.exterior_condition, ...checkIn.interior_condition];
      const checkOutDamages = [...checkOut.exterior_condition, ...checkOut.interior_condition];
      const newDamages = checkOutDamages.filter(outDamage =>
        !checkInDamages.some(inDamage =>
          inDamage.location === outDamage.location && inDamage.description === outDamage.description
        )
      );

      return {
        checkIn,
        checkOut,
        differences: {
          fuel: (checkOut.fuel_level || 0) - (checkIn.fuel_level || 0),
          odometer: (checkOut.odometer_reading || 0) - (checkIn.odometer_reading || 0),
          cleanliness: (checkOut.cleanliness_rating || 0) - (checkIn.cleanliness_rating || 0),
        },
        newDamages,
        hasNewDamages: newDamages.length > 0,
      };
    },
    enabled: Boolean(companyId && contractId),
  });
}
