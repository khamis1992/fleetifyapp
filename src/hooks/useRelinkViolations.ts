// ============================================================================
// Hook لإعادة ربط المخالفات بالعملاء تلقائياً
// يستخدم خوارزمية 4 مستويات للمطابقة مع العقود
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RelinkResult {
  totalUnlinked: number;
  processed: number;
  linked: number;
  failed: number;
  noContractFound: number;
  details: RelinkDetail[];
}

interface RelinkDetail {
  violationId: string;
  penaltyNumber: string;
  vehiclePlate: string;
  status: 'linked' | 'no_contract' | 'no_vehicle' | 'error';
  customerName?: string;
  contractNumber?: string;
  confidence?: 'high' | 'medium' | 'low';
  reason: string;
}

interface ContractWithCustomer {
  id: string;
  contract_number: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  customer_id: string;
  vehicle_id: string;
  customers: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    last_name_ar: string | null;
    company_name: string | null;
  } | null;
}

export function useRelinkViolations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RelinkResult | null>(null);
  const queryClient = useQueryClient();

  const relinkViolations = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      // الحصول على معرف الشركة
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('المستخدم غير مسجل الدخول');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على بيانات المستخدم');

      const companyId = profile.company_id;

      // جلب جميع المخالفات غير المربوطة بعملاء
      const { data: unlinkedViolations, error: violationsError } = await supabase
        .from('penalties')
        .select('id, penalty_number, penalty_date, vehicle_id, vehicle_plate, customer_id')
        .eq('company_id', companyId)
        .is('customer_id', null);

      if (violationsError) throw violationsError;

      if (!unlinkedViolations || unlinkedViolations.length === 0) {
        toast.info('لا توجد مخالفات غير مربوطة بعملاء');
        setIsProcessing(false);
        return { totalUnlinked: 0, processed: 0, linked: 0, failed: 0, noContractFound: 0, details: [] };
      }

      // جلب جميع العقود مع العملاء
      const { data: allContracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          start_date,
          end_date,
          customer_id,
          vehicle_id,
          customers (
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name
          )
        `)
        .eq('company_id', companyId)
        .order('end_date', { ascending: false });

      if (contractsError) throw contractsError;

      // إنشاء خريطة للعقود حسب vehicle_id
      const contractsByVehicle = new Map<string, ContractWithCustomer[]>();
      (allContracts || []).forEach((contract: any) => {
        if (contract.vehicle_id) {
          const existing = contractsByVehicle.get(contract.vehicle_id) || [];
          existing.push(contract);
          contractsByVehicle.set(contract.vehicle_id, existing);
        }
      });

      // جلب جميع المركبات لمطابقة اللوحات
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .eq('company_id', companyId);

      const plateToVehicleId = new Map<string, string>();
      (vehicles || []).forEach(v => {
        if (v.plate_number) {
          // إضافة اللوحة الأصلية
          plateToVehicleId.set(v.plate_number, v.id);
          // إضافة اللوحة بدون مسافات
          plateToVehicleId.set(v.plate_number.replace(/\s+/g, ''), v.id);
          // إضافة اللوحة بأحرف كبيرة
          plateToVehicleId.set(v.plate_number.toUpperCase(), v.id);
        }
      });

      const details: RelinkDetail[] = [];
      let linked = 0;
      let noContractFound = 0;
      let failed = 0;

      // معالجة كل مخالفة
      for (let i = 0; i < unlinkedViolations.length; i++) {
        const violation = unlinkedViolations[i];
        setProgress(Math.round(((i + 1) / unlinkedViolations.length) * 100));

        try {
          // تحديد vehicle_id
          let vehicleId = violation.vehicle_id;
          if (!vehicleId && violation.vehicle_plate) {
            vehicleId = plateToVehicleId.get(violation.vehicle_plate) ||
                        plateToVehicleId.get(violation.vehicle_plate.replace(/\s+/g, '')) ||
                        plateToVehicleId.get(violation.vehicle_plate.toUpperCase()) ||
                        null;
          }

          if (!vehicleId) {
            details.push({
              violationId: violation.id,
              penaltyNumber: violation.penalty_number || 'بدون رقم',
              vehiclePlate: violation.vehicle_plate || 'غير محدد',
              status: 'no_vehicle',
              reason: 'لم يتم العثور على المركبة في النظام'
            });
            noContractFound++;
            continue;
          }

          // البحث عن عقد مناسب
          const contracts = contractsByVehicle.get(vehicleId);
          if (!contracts || contracts.length === 0) {
            details.push({
              violationId: violation.id,
              penaltyNumber: violation.penalty_number || 'بدون رقم',
              vehiclePlate: violation.vehicle_plate || 'غير محدد',
              status: 'no_contract',
              reason: 'لا يوجد عقود لهذه المركبة'
            });
            noContractFound++;
            continue;
          }

          // خوارزمية 4 مستويات للمطابقة
          const matchResult = findBestContract(contracts, violation.penalty_date);

          if (!matchResult) {
            details.push({
              violationId: violation.id,
              penaltyNumber: violation.penalty_number || 'بدون رقم',
              vehiclePlate: violation.vehicle_plate || 'غير محدد',
              status: 'no_contract',
              reason: 'لم يتم العثور على عقد مناسب'
            });
            noContractFound++;
            continue;
          }

          // تحديث المخالفة
          const { error: updateError } = await supabase
            .from('penalties')
            .update({
              customer_id: matchResult.contract.customer_id,
              contract_id: matchResult.contract.id,
              vehicle_id: vehicleId
            })
            .eq('id', violation.id);

          if (updateError) throw updateError;

          const customerName = getCustomerName(matchResult.contract.customers);
          
          details.push({
            violationId: violation.id,
            penaltyNumber: violation.penalty_number || 'بدون رقم',
            vehiclePlate: violation.vehicle_plate || 'غير محدد',
            status: 'linked',
            customerName,
            contractNumber: matchResult.contract.contract_number,
            confidence: matchResult.confidence,
            reason: matchResult.reason
          });
          linked++;

        } catch (err: any) {
          details.push({
            violationId: violation.id,
            penaltyNumber: violation.penalty_number || 'بدون رقم',
            vehiclePlate: violation.vehicle_plate || 'غير محدد',
            status: 'error',
            reason: err.message || 'خطأ غير معروف'
          });
          failed++;
        }
      }

      const finalResult: RelinkResult = {
        totalUnlinked: unlinkedViolations.length,
        processed: unlinkedViolations.length,
        linked,
        failed,
        noContractFound,
        details
      };

      setResult(finalResult);

      // تحديث الكاش
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-count'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations-all-for-report'] });

      if (linked > 0) {
        toast.success(`تم ربط ${linked} مخالفة بنجاح من أصل ${unlinkedViolations.length}`);
      } else {
        toast.info('لم يتم ربط أي مخالفات جديدة');
      }

      return finalResult;

    } catch (error: any) {
      console.error('Error relinking violations:', error);
      toast.error(`خطأ: ${error.message}`);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  return {
    relinkViolations,
    isProcessing,
    progress,
    result,
    resetResult: () => setResult(null)
  };
}

// دالة مساعدة للبحث عن أفضل عقد
function findBestContract(
  contracts: ContractWithCustomer[],
  violationDate: string | null
): { contract: ContractWithCustomer; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  
  if (!violationDate) {
    // إذا لم يكن هناك تاريخ، نستخدم أحدث عقد
    if (contracts.length > 0) {
      return {
        contract: contracts[0],
        confidence: 'low',
        reason: 'أحدث عقد (لا يوجد تاريخ للمخالفة)'
      };
    }
    return null;
  }

  const vDate = new Date(violationDate);

  // المستوى 1: عقد نشط مع تاريخ ضمن الفترة
  const activeInRange = contracts.find(c => {
    if (c.status !== 'active') return false;
    return isDateInRange(vDate, c.start_date, c.end_date);
  });

  if (activeInRange) {
    return {
      contract: activeInRange,
      confidence: 'high',
      reason: `عقد نشط (${activeInRange.contract_number})`
    };
  }

  // المستوى 2: أي عقد مع تاريخ ضمن الفترة
  const inRange = contracts.find(c => isDateInRange(vDate, c.start_date, c.end_date));
  
  if (inRange) {
    return {
      contract: inRange,
      confidence: 'medium',
      reason: `عقد ${inRange.status === 'active' ? 'نشط' : inRange.status} (${inRange.contract_number})`
    };
  }

  // المستوى 3: أقرب عقد انتهى قبل المخالفة (خلال 30 يوم)
  const contractsBefore = contracts
    .filter(c => {
      const endDate = c.end_date ? new Date(c.end_date) : null;
      return endDate && endDate < vDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.end_date!);
      const dateB = new Date(b.end_date!);
      return dateB.getTime() - dateA.getTime();
    });

  if (contractsBefore.length > 0) {
    const nearest = contractsBefore[0];
    const daysDiff = daysBetween(vDate, new Date(nearest.end_date!));
    
    if (daysDiff <= 30) {
      return {
        contract: nearest,
        confidence: daysDiff <= 7 ? 'medium' : 'low',
        reason: `عقد انتهى قبل ${daysDiff} يوم`
      };
    }
  }

  // المستوى 4: أحدث عقد متوفر
  if (contracts.length > 0) {
    return {
      contract: contracts[0],
      confidence: 'low',
      reason: 'أحدث عقد متوفر'
    };
  }

  return null;
}

function isDateInRange(date: Date, startStr: string | null, endStr: string | null): boolean {
  if (!startStr || !endStr) return false;
  const start = new Date(startStr);
  const end = new Date(endStr);
  return date >= start && date <= end;
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)));
}

function getCustomerName(customer: ContractWithCustomer['customers']): string {
  if (!customer) return 'غير محدد';
  return customer.company_name ||
    `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() ||
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    'غير محدد';
}
