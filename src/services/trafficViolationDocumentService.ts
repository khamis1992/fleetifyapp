import { supabase } from '@/integrations/supabase/client';
import type { MatchedViolation } from '@/types/violations';

export interface TrafficViolationDocumentAssignment {
  contractId: string;
  file: File;
  sourceFileKey: string;
  plateNumbers: string[];
  violationCount: number;
}

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const fileKey = (file: File, index: number) =>
  `${index}:${file.name}:${file.size}:${file.lastModified}`;

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const fileFingerprintCache = new WeakMap<File, Promise<string>>();

const getFileFingerprint = (file: File): Promise<string> => {
  const cached = fileFingerprintCache.get(file);
  if (cached) return cached;

  const fingerprint = file.arrayBuffer().then(async buffer => {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
      return [...new Uint8Array(digest)]
        .slice(0, 12)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    }
    return stableHash(`${file.name}:${file.size}:${file.lastModified}`);
  });
  fileFingerprintCache.set(file, fingerprint);
  return fingerprint;
};

const safeFileSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'moi-report.pdf';

export function buildTrafficViolationDocumentAssignments(
  files: File[],
  violations: MatchedViolation[]
): TrafficViolationDocumentAssignment[] {
  const pdfFiles = files
    .map((file, index) => ({ file, key: fileKey(file, index) }))
    .filter(({ file }) => isPdfFile(file));

  if (pdfFiles.length === 0) return [];

  const filesByKey = new Map(pdfFiles.map(item => [item.key, item]));
  const filesByName = new Map<string, typeof pdfFiles>();
  for (const item of pdfFiles) {
    const matches = filesByName.get(item.file.name) || [];
    matches.push(item);
    filesByName.set(item.file.name, matches);
  }

  const assignments = new Map<string, TrafficViolationDocumentAssignment>();

  for (const violation of violations) {
    if (!violation.contract_id) continue;

    let source = violation.source_file_key ? filesByKey.get(violation.source_file_key) : undefined;
    if (!source && violation.source_file_name) {
      const sameName = filesByName.get(violation.source_file_name) || [];
      if (sameName.length === 1) source = sameName[0];
    }
    if (!source && pdfFiles.length === 1) source = pdfFiles[0];
    if (!source) continue;

    const assignmentKey = `${violation.contract_id}:${source.key}`;
    const existing = assignments.get(assignmentKey);
    if (existing) {
      existing.violationCount += 1;
      if (violation.plate_number && !existing.plateNumbers.includes(violation.plate_number)) {
        existing.plateNumbers.push(violation.plate_number);
      }
      continue;
    }

    assignments.set(assignmentKey, {
      contractId: violation.contract_id,
      file: source.file,
      sourceFileKey: source.key,
      plateNumbers: violation.plate_number ? [violation.plate_number] : [],
      violationCount: 1,
    });
  }

  return [...assignments.values()];
}

export async function attachTrafficViolationSourceDocuments(params: {
  companyId: string;
  files: File[];
  violations: MatchedViolation[];
  fileNumber?: string;
}): Promise<{ attached: number; existing: number }> {
  const assignments = buildTrafficViolationDocumentAssignments(params.files, params.violations);
  if (assignments.length === 0) return { attached: 0, existing: 0 };

  const { data: authData } = await supabase.auth.getUser();
  let attached = 0;
  let existing = 0;

  for (const assignment of assignments) {
    const extension = assignment.file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const baseName = assignment.file.name.replace(/\.[^.]+$/, '');
    const fingerprint = await getFileFingerprint(assignment.file);
    const storedName = `${safeFileSegment(baseName)}-${fingerprint}.${safeFileSegment(extension)}`;
    const storagePath = `${assignment.contractId}/traffic-violations/${storedName}`;

    const { data: existingDocument, error: existingError } = await supabase
      .from('contract_documents')
      .select('id')
      .eq('company_id', params.companyId)
      .eq('contract_id', assignment.contractId)
      .eq('document_type', 'violations_proof')
      .eq('file_path', storagePath)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingDocument) {
      existing += 1;
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from('contract-documents')
      .upload(storagePath, assignment.file, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const plateLabel = assignment.plateNumbers.length > 0
      ? assignment.plateNumbers.join('، ')
      : 'غير محددة';
    const { error: documentError } = await supabase
      .from('contract_documents')
      .insert({
        company_id: params.companyId,
        contract_id: assignment.contractId,
        document_type: 'violations_proof',
        document_name: `كشف مخالفات وزارة الداخلية - لوحة ${plateLabel}`,
        file_path: storagePath,
        file_size: assignment.file.size,
        mime_type: 'application/pdf',
        original_filename: assignment.file.name,
        uploaded_by: authData.user?.id || null,
        is_required: true,
        notes: `تقرير وزارة الداخلية المرتبط بـ ${assignment.violationCount} مخالفة محفوظة على العقد${params.fileNumber ? ` - رقم الملف ${params.fileNumber}` : ''}`,
      });

    if (documentError) throw documentError;
    attached += 1;
  }

  return { attached, existing };
}

export interface TrafficFileImportResult {
  fileName: string;
  plateNumber: string;
  status: 'attached' | 'existing' | 'error';
  attached: number;
  existing: number;
  contractNumbers: string[];
  vehicleId?: string | null;
  attachmentTarget?: 'contract' | 'vehicle' | 'contract_and_vehicle';
  message: string;
}

export const TRAFFIC_VIOLATION_VEHICLE_DOCUMENT_TYPE = 'traffic_violations_report';

export const normalizeTrafficFilePlate = (value: string | null | undefined): string => {
  const normalized = String(value || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const withoutLeadingZeros = normalized.replace(/^0+(?=\d)/, '');
  return withoutLeadingZeros || normalized;
};

export const plateFromTrafficFileName = (fileName: string): string =>
  fileName.replace(/\.pdf$/i, '').trim();

export function findTrafficFileVehicleMatches(
  plateNumber: string,
  vehicles: Array<{ id: string; plate_number: string | null }>
): Array<{ id: string; plate_number: string | null }> {
  const plateKey = normalizeTrafficFilePlate(plateNumber);
  if (!plateKey) return [];
  return vehicles.filter(vehicle => normalizeTrafficFilePlate(vehicle.plate_number) === plateKey);
}

export function findTrafficFileContractMatches(
  plateNumber: string,
  vehicles: Array<{ id: string; plate_number: string | null }>,
  penalties: Array<{ vehicle_id: string | null; vehicle_plate: string | null; contract_id: string | null }>
): Array<{ contractId: string; violationCount: number }> {
  const plateKey = normalizeTrafficFilePlate(plateNumber);
  const vehiclePlateById = new Map(
    vehicles.map(vehicle => [vehicle.id, normalizeTrafficFilePlate(vehicle.plate_number)])
  );
  const counts = new Map<string, number>();

  for (const penalty of penalties) {
    if (!penalty.contract_id) continue;
    const penaltyPlate = normalizeTrafficFilePlate(penalty.vehicle_plate);
    const vehiclePlate = penalty.vehicle_id ? vehiclePlateById.get(penalty.vehicle_id) || '' : '';
    if (penaltyPlate !== plateKey && vehiclePlate !== plateKey) continue;
    counts.set(penalty.contract_id, (counts.get(penalty.contract_id) || 0) + 1);
  }

  return [...counts.entries()].map(([contractId, violationCount]) => ({ contractId, violationCount }));
}

async function attachTrafficFileToContract(params: {
  companyId: string;
  contractId: string;
  contractNumber: string;
  file: File;
  plateNumber: string;
  violationCount: number;
  uploadedBy: string | null;
}): Promise<'attached' | 'existing'> {
  const fingerprint = await getFileFingerprint(params.file);
  const baseName = params.file.name.replace(/\.[^.]+$/, '');
  const storagePath = `${params.contractId}/traffic-violations/${safeFileSegment(baseName)}-${fingerprint}.pdf`;

  const { data: existingDocument, error: existingError } = await supabase
    .from('contract_documents')
    .select('id')
    .eq('company_id', params.companyId)
    .eq('contract_id', params.contractId)
    .eq('document_type', 'violations_proof')
    .eq('file_path', storagePath)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingDocument) return 'existing';

  const { error: uploadError } = await supabase.storage
    .from('contract-documents')
    .upload(storagePath, params.file, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw uploadError;

  const { error: documentError } = await supabase
    .from('contract_documents')
    .insert({
      company_id: params.companyId,
      contract_id: params.contractId,
      document_type: 'violations_proof',
      document_name: `كشف مخالفات وزارة الداخلية - لوحة ${params.plateNumber}`,
      file_path: storagePath,
      file_size: params.file.size,
      mime_type: 'application/pdf',
      original_filename: params.file.name,
      uploaded_by: params.uploadedBy,
      is_required: true,
      notes: `ملف المرور للوحة ${params.plateNumber} - مرتبط بـ ${params.violationCount} مخالفة على العقد ${params.contractNumber}`,
    });
  if (documentError) throw documentError;

  return 'attached';
}

async function attachTrafficFileToVehicle(params: {
  companyId: string;
  vehicleId: string;
  file: File;
  plateNumber: string;
}): Promise<'attached' | 'existing'> {
  const fingerprint = await getFileFingerprint(params.file);
  const baseName = params.file.name.replace(/\.[^.]+$/, '');
  const storagePath = `${params.companyId}/vehicle-documents/${params.vehicleId}/traffic-violations/${safeFileSegment(baseName)}-${fingerprint}.pdf`;

  const { data: existingDocument, error: existingError } = await supabase
    .from('vehicle_documents')
    .select('id')
    .eq('vehicle_id', params.vehicleId)
    .eq('document_type', TRAFFIC_VIOLATION_VEHICLE_DOCUMENT_TYPE)
    .eq('document_url', storagePath)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingDocument) return 'existing';

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, params.file, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw uploadError;

  const { error: documentError } = await supabase
    .from('vehicle_documents')
    .insert({
      vehicle_id: params.vehicleId,
      document_type: TRAFFIC_VIOLATION_VEHICLE_DOCUMENT_TYPE,
      document_name: `ملف مرور - لوحة ${params.plateNumber}`,
      document_url: storagePath,
      is_active: true,
    });

  if (documentError) {
    await supabase.storage.from('documents').remove([storagePath]);
    throw documentError;
  }

  return 'attached';
}

export async function importTrafficFilesByPlate(params: {
  companyId: string;
  files: File[];
  onProgress?: (completed: number, total: number) => void;
}): Promise<TrafficFileImportResult[]> {
  const pdfFiles = params.files.filter(isPdfFile);
  if (pdfFiles.length === 0) return [];

  const [vehiclesResult, penaltiesResult, contractsResult, authResult] = await Promise.all([
    supabase.from('vehicles').select('id, plate_number').eq('company_id', params.companyId).limit(10000),
    supabase.from('penalties').select('vehicle_id, vehicle_plate, contract_id').eq('company_id', params.companyId).not('contract_id', 'is', null).limit(10000),
    supabase.from('contracts').select('id, contract_number').eq('company_id', params.companyId).limit(10000),
    supabase.auth.getUser(),
  ]);

  if (vehiclesResult.error) throw vehiclesResult.error;
  if (penaltiesResult.error) throw penaltiesResult.error;
  if (contractsResult.error) throw contractsResult.error;

  const contractNumberById = new Map(
    (contractsResult.data || []).map(contract => [contract.id, contract.contract_number])
  );
  const results: TrafficFileImportResult[] = [];

  for (let fileIndex = 0; fileIndex < pdfFiles.length; fileIndex++) {
    const file = pdfFiles[fileIndex];
    const plateNumber = plateFromTrafficFileName(file.name);
    const plateKey = normalizeTrafficFilePlate(plateNumber);

    try {
      if (!plateKey) throw new Error('اسم الملف لا يحتوي على رقم مركبة صالح');

      const contractMatches = findTrafficFileContractMatches(
        plateNumber,
        vehiclesResult.data || [],
        penaltiesResult.data || []
      );
      const contractIds = contractMatches.map(match => match.contractId);
      const vehicleMatches = findTrafficFileVehicleMatches(plateNumber, vehiclesResult.data || []);
      if (vehicleMatches.length === 0) {
        throw new Error('لم يتم العثور على مركبة تحمل رقم اللوحة الموجود في اسم الملف');
      }
      if (vehicleMatches.length > 1) {
        throw new Error('رقم اللوحة مرتبط بأكثر من مركبة ويحتاج إلى مراجعة');
      }

      const vehicle = vehicleMatches[0];
      const vehicleOutcome = await attachTrafficFileToVehicle({
        companyId: params.companyId,
        vehicleId: vehicle.id,
        file,
        plateNumber,
      });

      if (contractIds.length === 0) {
        results.push({
          fileName: file.name,
          plateNumber,
          status: vehicleOutcome,
          attached: vehicleOutcome === 'attached' ? 1 : 0,
          existing: vehicleOutcome === 'existing' ? 1 : 0,
          contractNumbers: [],
          vehicleId: vehicle.id,
          attachmentTarget: 'vehicle',
          message: vehicleOutcome === 'attached'
            ? 'تم إرفاق الملف بالمركبة لعدم وجود عقد مطابق'
            : 'الملف موجود مسبقًا في ملفات المركبة',
        });
        params.onProgress?.(fileIndex + 1, pdfFiles.length);
        continue;
      }

      let attached = vehicleOutcome === 'attached' ? 1 : 0;
      let existing = vehicleOutcome === 'existing' ? 1 : 0;
      let contractsAttached = 0;
      const contractNumbers: string[] = [];
      for (const contractId of contractIds) {
        const contractNumber = contractNumberById.get(contractId) || contractId;
        const violationCount = contractMatches.find(match => match.contractId === contractId)?.violationCount || 0;
        const outcome = await attachTrafficFileToContract({
          companyId: params.companyId,
          contractId,
          contractNumber,
          file,
          plateNumber,
          violationCount,
          uploadedBy: authResult.data.user?.id || null,
        });
        if (outcome === 'attached') {
          attached += 1;
          contractsAttached += 1;
        }
        else existing += 1;
        contractNumbers.push(contractNumber);
      }

      results.push({
        fileName: file.name,
        plateNumber,
        status: attached > 0 ? 'attached' : 'existing',
        attached,
        existing,
        contractNumbers,
        vehicleId: vehicle.id,
        attachmentTarget: 'contract_and_vehicle',
        message: attached > 0
          ? `تم ربط الملف بالمركبة و${contractIds.length} عقد${contractsAttached > 0 ? `، منها ${contractsAttached} عقد جديد` : ''}`
          : 'الملف موجود مسبقًا في المركبة وجميع العقود المطابقة',
      });
    } catch (error) {
      results.push({
        fileName: file.name,
        plateNumber,
        status: 'error',
        attached: 0,
        existing: 0,
        contractNumbers: [],
        message: error instanceof Error ? error.message : String(error),
      });
    }

    params.onProgress?.(fileIndex + 1, pdfFiles.length);
  }

  return results;
}
