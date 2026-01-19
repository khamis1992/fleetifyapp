/**
 * Hook لمزامنة حالة المركبات مع العقود النشطة
 */

import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncResult {
  vehiclesUpdatedToRented: number;
  vehiclesUpdatedToAvailable: number;
  contractsLinked: number;
  errors: string[];
}

export function useSyncVehicleStatus() {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncVehicleStatus = async (companyId: string): Promise<SyncResult> => {
    const result: SyncResult = {
      vehiclesUpdatedToRented: 0,
      vehiclesUpdatedToAvailable: 0,
      contractsLinked: 0,
      errors: []
    };

    console.log('🔄 [syncVehicleStatus] بدء المزامنة...');

    try {
      // جلب جميع المركبات النشطة
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

      // إنشاء خريطة للمركبات بناءً على plate_number المُطبّع (بدون مسافات)
      const normalizedPlateToVehicle = new Map<string, { id: string; plate_number: string; status: string }>();
      vehicles.forEach(v => {
        if (v.plate_number) {
          const normalized = v.plate_number.trim().replace(/\s+/g, '');
          normalizedPlateToVehicle.set(normalized, v);
        }
      });

      // جلب جميع العقود النشطة
      const { data: activeContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, vehicle_id, license_plate, status, start_date, end_date')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (contractsError) {
        result.errors.push(`خطأ في جلب العقود: ${contractsError.message}`);
        return result;
      }

      console.log(`📋 [syncVehicleStatus] وجد ${vehicles.length} مركبة و ${activeContracts?.length || 0} عقد نشط`);

      // تحديد المركبات التي لديها عقود نشطة (باستخدام مطابقة مرنة لرقم اللوحة)
      const vehiclesWithActiveContracts = new Set<string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const contract of activeContracts || []) {
        // تحقق من أن العقد نشط حالياً (ضمن فترة التاريخ)
        const startDate = new Date(contract.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = contract.end_date ? new Date(contract.end_date) : null;
        if (endDate) {
          endDate.setHours(0, 0, 0, 0);
        }

        const isActiveNow = startDate <= today && (endDate === null || endDate >= today);

        if (isActiveNow) {
          // البحث عن المركبة باستخدام license_plate أولاً (مطابقة مرنة)
          let vehicleId = contract.vehicle_id;
          
          // إنشاء مجموعة من IDs المركبات النشطة للتحقق السريع
          const validVehicleIds = new Set(vehicles?.map(v => v.id) || []);
          
          // البحث عن المركبة المطابقة باستخدام license_plate
          if (contract.license_plate) {
            const normalizedPlate = contract.license_plate.trim().replace(/\s+/g, '');
            const matchedVehicle = normalizedPlateToVehicle.get(normalizedPlate);
            
            if (matchedVehicle) {
              // استخدام المركبة المطابقة إذا:
              // 1. لا يوجد vehicle_id في العقد
              // 2. أو vehicle_id لا يشير إلى مركبة صالحة
              // 3. أو vehicle_id لا يطابق المركبة المتوقعة من license_plate
              const needsUpdate = !vehicleId || !validVehicleIds.has(vehicleId) || vehicleId !== matchedVehicle.id;
              
              if (needsUpdate) {
                const oldVehicleId = vehicleId;
                vehicleId = matchedVehicle.id;
                
                console.log(`🔗 [syncVehicleStatus] ربط العقد ${contract.id} (license_plate: '${contract.license_plate}') بالمركبة ${matchedVehicle.plate_number} (${vehicleId}) [كان: ${oldVehicleId || 'null'}]`);
                
                // تحديث vehicle_id في العقد
                const { error: updateContractError } = await supabase
                  .from('contracts')
                  .update({ vehicle_id: vehicleId })
                  .eq('id', contract.id);

                if (!updateContractError) {
                  result.contractsLinked++;
                } else {
                  console.error(`❌ [syncVehicleStatus] خطأ في تحديث العقد ${contract.id}:`, updateContractError);
                }
              }
            } else {
              console.warn(`⚠️ [syncVehicleStatus] لم يتم العثور على مركبة للعقد ${contract.id} (license_plate: '${contract.license_plate}', normalized: '${normalizedPlate}')`);
            }
          }

          if (vehicleId) {
            vehiclesWithActiveContracts.add(vehicleId);
          }
        }
      }

      console.log(`🚗 [syncVehicleStatus] ${vehiclesWithActiveContracts.size} مركبة لديها عقود نشطة`);

      // تحديث حالة المركبات
      for (const vehicle of vehicles) {
        const hasActiveContract = vehiclesWithActiveContracts.has(vehicle.id);
        const currentStatus = vehicle.status;

        if (hasActiveContract && currentStatus !== 'rented') {
          // المركبة لديها عقد نشط ولكن حالتها ليست "مؤجرة"
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ status: 'rented', updated_at: new Date().toISOString() })
            .eq('id', vehicle.id);

          if (!updateError) {
            console.log(`✅ [syncVehicleStatus] تحديث المركبة ${vehicle.plate_number} من ${currentStatus} إلى rented`);
            result.vehiclesUpdatedToRented++;
          } else {
            result.errors.push(`خطأ في تحديث المركبة ${vehicle.plate_number}: ${updateError.message}`);
          }
        } else if (!hasActiveContract && currentStatus === 'rented') {
          // المركبة ليس لديها عقد نشط ولكن حالتها "مؤجرة"
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ status: 'available', updated_at: new Date().toISOString() })
            .eq('id', vehicle.id);

          if (!updateError) {
            console.log(`✅ [syncVehicleStatus] تحديث المركبة ${vehicle.plate_number} من ${currentStatus} إلى available`);
            result.vehiclesUpdatedToAvailable++;
          } else {
            result.errors.push(`خطأ في تحديث المركبة ${vehicle.plate_number}: ${updateError.message}`);
          }
        }
      }

      console.log(`📊 [syncVehicleStatus] النتائج: ${result.vehiclesUpdatedToRented} تم تحديثها إلى مؤجرة، ${result.vehiclesUpdatedToAvailable} تم تحديثها إلى متاحة، ${result.contractsLinked} عقد تم ربطه`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      result.errors.push(errorMessage);
      console.error('❌ [syncVehicleStatus] خطأ:', error);
    }

    return result;
  };

  const handleSync = async (companyId: string) => {
    setIsSyncing(true);
    try {
      const result = await syncVehicleStatus(companyId);
      
      if (result.errors.length > 0) {
        console.warn('⚠️ أخطاء أثناء المزامنة:', result.errors);
      }
      
      const totalUpdated = result.vehiclesUpdatedToRented + result.vehiclesUpdatedToAvailable;
      
      if (totalUpdated > 0 || result.contractsLinked > 0) {
        toast.success(`تم تحديث ${totalUpdated} مركبة وربط ${result.contractsLinked} عقد`);
      } else {
        toast.info('جميع المركبات محدثة بالفعل');
      }
      
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, handleSync };
}

