/**
 * سكريبت لمزامنة حالة المركبات مع العقود النشطة
 * يتم تشغيله يدوياً أو عبر cron job
 */

import { supabase } from "@/integrations/supabase/client";

export interface SyncResult {
  vehiclesUpdatedToRented: number;
  vehiclesUpdatedToAvailable: number;
  contractsLinked: number;
  errors: string[];
}

/**
 * ربط العقود بالمركبات بناءً على license_plate
 */
export async function linkContractsToVehicles(companyId: string): Promise<{ linked: number; errors: string[] }> {
  const errors: string[] = [];
  let linked = 0;

  console.log('🔗 [syncVehicleContractStatus] بدء ربط العقود بالمركبات...');

  // جلب جميع العقود النشطة التي تحتوي على license_plate
  // (سواء كانت تحتوي على vehicle_id أو لا، لأن vehicle_id قد يكون خاطئاً)
  const { data: activeContractsWithLicensePlate, error: contractsError } = await supabase
    .from('contracts')
    .select('id, license_plate, vehicle_id, status')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .not('license_plate', 'is', null);

  if (contractsError) {
    errors.push(`خطأ في جلب العقود: ${contractsError.message}`);
    return { linked, errors };
  }

  console.log(`📋 [syncVehicleContractStatus] وجد ${activeContractsWithLicensePlate?.length || 0} عقد نشط مع license_plate`);

  if (!activeContractsWithLicensePlate || activeContractsWithLicensePlate.length === 0) {
    return { linked, errors };
  }

  // جلب المركبات
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (vehiclesError) {
    errors.push(`خطأ في جلب المركبات: ${vehiclesError.message}`);
    return { linked, errors };
  }

  // إنشاء خريطة للمركبات بناءً على plate_number (بدون مسافات) - للمطابقة المرنة
  const vehicleMap = new Map<string, string>();
  vehicles?.forEach(v => {
    const normalizedPlate = v.plate_number?.trim().replace(/\s+/g, '') || '';
    if (normalizedPlate) {
      vehicleMap.set(normalizedPlate, v.id);
    }
  });

  // إنشاء مجموعة من vehicle_ids الصحيحة
  const validVehicleIds = new Set(vehicles?.map(v => v.id) || []);

  // ربط العقود بالمركبات (حتى لو كان vehicle_id موجوداً لكنه غير صحيح)
  for (const contract of activeContractsWithLicensePlate) {
    const normalizedLicensePlate = contract.license_plate?.trim().replace(/\s+/g, '') || '';
    const correctVehicleId = vehicleMap.get(normalizedLicensePlate);

    // التحقق إذا كان vehicle_id الحالي صحيحاً
    const currentVehicleIdIsCorrect = contract.vehicle_id && 
      validVehicleIds.has(contract.vehicle_id) && 
      contract.vehicle_id === correctVehicleId;

    if (correctVehicleId && !currentVehicleIdIsCorrect) {
      // تحديث vehicle_id إذا كان خاطئاً أو غير موجود
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ vehicle_id: correctVehicleId })
        .eq('id', contract.id);

      if (updateError) {
        errors.push(`خطأ في تحديث العقد ${contract.id}: ${updateError.message}`);
      } else {
        console.log(`✅ [syncVehicleContractStatus] ربط العقد ${contract.id} (license_plate: '${contract.license_plate}') بالمركبة ${correctVehicleId} (كان: ${contract.vehicle_id || 'null'})`);
        linked++;
      }
    } else if (!correctVehicleId) {
      console.log(`⚠️ [syncVehicleContractStatus] لم يتم العثور على مركبة للعقد ${contract.id} (license_plate: '${contract.license_plate}')`);
    }
  }

  return { linked, errors };
}

/**
 * تحديث حالة المركبات بناءً على العقود النشطة
 */
export async function syncVehicleStatus(companyId: string): Promise<SyncResult> {
  const result: SyncResult = {
    vehiclesUpdatedToRented: 0,
    vehiclesUpdatedToAvailable: 0,
    contractsLinked: 0,
    errors: [],
  };

  console.log('🔄 [syncVehicleContractStatus] بدء مزامنة حالة المركبات...');

  // أولاً: ربط العقود بالمركبات
  const linkResult = await linkContractsToVehicles(companyId);
  result.contractsLinked = linkResult.linked;
  result.errors.push(...linkResult.errors);

  // جلب جميع المركبات
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, plate_number, status')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (vehiclesError) {
    result.errors.push(`خطأ في جلب المركبات: ${vehiclesError.message}`);
    return result;
  }

  if (!vehicles || vehicles.length === 0) {
    return result;
  }

  const vehicleIds = vehicles.map(v => v.id);
  const plateNumbers = vehicles.map(v => v.plate_number).filter(Boolean);

  // جلب العقود النشطة
  const today = new Date().toISOString().split('T')[0];

  const { data: activeContracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, vehicle_id, license_plate, status, start_date, end_date')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (contractsError) {
    result.errors.push(`خطأ في جلب العقود: ${contractsError.message}`);
    return result;
  }

  console.log(`📋 [syncVehicleContractStatus] وجد ${activeContracts?.length || 0} عقد نشط`);

  // إنشاء خريطة للعقود النشطة
  const vehiclesWithActiveContracts = new Set<string>();

  // إنشاء خريطة للمركبات بناءً على plate_number
  const plateToVehicleId = new Map<string, string>();
  vehicles.forEach(v => {
    const normalizedPlate = v.plate_number?.trim().replace(/\s+/g, '') || '';
    if (normalizedPlate) {
      plateToVehicleId.set(normalizedPlate, v.id);
    }
  });

  activeContracts?.forEach(contract => {
    // أولاً: التحقق من vehicle_id
    if (contract.vehicle_id && vehicleIds.includes(contract.vehicle_id)) {
      vehiclesWithActiveContracts.add(contract.vehicle_id);
      console.log(`✅ [syncVehicleContractStatus] العقد ${contract.id} مربوط بالمركبة ${contract.vehicle_id} عبر vehicle_id`);
    }
    // ثانياً: التحقق من license_plate
    else if (contract.license_plate) {
      const normalizedPlate = contract.license_plate.trim().replace(/\s+/g, '');
      const vehicleId = plateToVehicleId.get(normalizedPlate);
      if (vehicleId) {
        vehiclesWithActiveContracts.add(vehicleId);
        console.log(`✅ [syncVehicleContractStatus] العقد ${contract.id} مربوط بالمركبة ${vehicleId} عبر license_plate (${contract.license_plate})`);
      }
    }
  });

  console.log(`📊 [syncVehicleContractStatus] ${vehiclesWithActiveContracts.size} مركبة لديها عقود نشطة`);

  // تحديث حالة المركبات
  for (const vehicle of vehicles) {
    const hasActiveContract = vehiclesWithActiveContracts.has(vehicle.id);

    if (hasActiveContract && vehicle.status !== 'rented') {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ status: 'rented', updated_at: new Date().toISOString() })
        .eq('id', vehicle.id);

      if (updateError) {
        result.errors.push(`خطأ في تحديث المركبة ${vehicle.id}: ${updateError.message}`);
      } else {
        console.log(`🚗 [syncVehicleContractStatus] تم تحديث المركبة ${vehicle.plate_number} إلى "مؤجرة"`);
        result.vehiclesUpdatedToRented++;
      }
    } else if (!hasActiveContract && vehicle.status === 'rented') {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', vehicle.id);

      if (updateError) {
        result.errors.push(`خطأ في تحديث المركبة ${vehicle.id}: ${updateError.message}`);
      } else {
        console.log(`🚗 [syncVehicleContractStatus] تم تحديث المركبة ${vehicle.plate_number} إلى "متاحة"`);
        result.vehiclesUpdatedToAvailable++;
      }
    }
  }

  console.log('✅ [syncVehicleContractStatus] اكتمال المزامنة:', result);
  return result;
}

/**
 * فحص المركبة وعقودها
 */
export async function checkVehicleContract(companyId: string, plateNumber: string): Promise<{
  vehicle: any;
  contracts: any[];
  shouldBeRented: boolean;
}> {
  console.log(`🔍 [checkVehicleContract] فحص المركبة: ${plateNumber}`);

  // جلب المركبة
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('company_id', companyId)
    .eq('plate_number', plateNumber)
    .single();

  if (vehicleError) {
    console.error(`❌ [checkVehicleContract] خطأ في جلب المركبة: ${vehicleError.message}`);
    return { vehicle: null, contracts: [], shouldBeRented: false };
  }

  console.log(`📋 [checkVehicleContract] المركبة: ${JSON.stringify(vehicle, null, 2)}`);

  // جلب العقود المرتبطة بالمركبة (عبر vehicle_id أو license_plate)
  const normalizedPlate = plateNumber.trim().replace(/\s+/g, '');
  const today = new Date().toISOString().split('T')[0];

  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('*')
    .eq('company_id', companyId)
    .or(`vehicle_id.eq.${vehicle.id},license_plate.eq.${plateNumber},license_plate.eq.${normalizedPlate}`)
    .order('start_date', { ascending: false });

  if (contractsError) {
    console.error(`❌ [checkVehicleContract] خطأ في جلب العقود: ${contractsError.message}`);
    return { vehicle, contracts: [], shouldBeRented: false };
  }

  console.log(`📋 [checkVehicleContract] العقود: ${contracts?.length || 0}`);
  contracts?.forEach(c => {
    console.log(`  - ${c.contract_number}: ${c.status} (${c.start_date} - ${c.end_date})`);
  });

  // فحص إذا كان يجب أن تكون المركبة مؤجرة
  const activeContractsNow = contracts?.filter(c => {
    if (c.status !== 'active') return false;
    const startDate = new Date(c.start_date);
    const endDate = c.end_date ? new Date(c.end_date) : null;
    const todayDate = new Date(today);
    return startDate <= todayDate && (!endDate || endDate >= todayDate);
  }) || [];

  const shouldBeRented = activeContractsNow.length > 0;

  console.log(`📊 [checkVehicleContract] يجب أن تكون المركبة مؤجرة: ${shouldBeRented}`);
  if (shouldBeRented) {
    console.log(`📋 [checkVehicleContract] العقود النشطة حالياً: ${activeContractsNow.map(c => c.contract_number).join(', ')}`);
  }

  return { vehicle, contracts: contracts || [], shouldBeRented };
}

