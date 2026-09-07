import { contractExtensionAmount } from '@/utils/contractExtension';

export interface EditVehicle {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  status?: string | null;
}

interface EditCustomer {
  first_name?: string | null;
  last_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  company_name_ar?: string | null;
}

export interface EditableContract {
  id: string;
  company_id: string;
  updated_at: string;
  contract_number?: string;
  customer_id: string;
  vehicle_id?: string | null;
  contract_type: string;
  status?: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  contract_amount: number;
  description?: string | null;
  notes?: string | null;
  customer?: EditCustomer | null;
  customers?: EditCustomer | null;
  vehicle?: EditVehicle | null;
  vehicles?: EditVehicle | null;
  license_plate?: string | null;
}

export interface EditDraft { vehicleId: string; endDate: string; notes: string }
export const initialEditDraft = (contract: EditableContract): EditDraft => ({
  vehicleId: contract.vehicle_id || '',
  endDate: contract.end_date?.slice(0, 10) || '',
  notes: contract.description ?? contract.notes ?? '',
});

export function editChanges(contract: EditableContract, draft: EditDraft) {
  const original = initialEditDraft(contract);
  return {
    vehicle: draft.vehicleId !== original.vehicleId,
    endDate: draft.endDate !== original.endDate,
    notes: draft.notes !== original.notes,
  };
}

export function isValidEditDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function editPreviewAmount(contract: EditableContract, draft: EditDraft): number {
  return isValidEditDate(draft.endDate) && isValidEditDate(contract.end_date?.slice(0, 10))
    ? contractExtensionAmount(contract, draft.endDate)
    : Number(contract.contract_amount || 0);
}

export function currentEditVehicle(contract: EditableContract): EditVehicle | null {
  if (!contract.vehicle_id) return null;
  return contract.vehicle || contract.vehicles || {
    id: contract.vehicle_id, plate_number: contract.license_plate || '',
    make: null, model: null, year: null,
  };
}

export function editCustomerName(contract: EditableContract, english = false) {
  const customer = contract.customer || contract.customers;
  if (!customer) return '';
  const arabic = [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ');
  const latin = [customer.first_name, customer.last_name].filter(Boolean).join(' ');
  return (english ? customer.company_name || latin : customer.company_name_ar || arabic)
    || customer.company_name || customer.company_name_ar || customer.full_name || latin || arabic;
}
