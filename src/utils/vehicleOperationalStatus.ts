export type VehicleOccupancyContract = {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  vehicle_returned?: boolean | null;
};

export const localDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isContractInCurrentPeriod = (
  contract: VehicleOccupancyContract,
  today = localDateKey(),
): boolean => Boolean(
  contract.start_date
  && contract.end_date
  && contract.start_date <= today
  && contract.end_date >= today
);

export const isContractOccupyingVehicle = (
  contract: VehicleOccupancyContract,
  today = localDateKey(),
): boolean => {
  if (!isContractInCurrentPeriod(contract, today)) return false;
  if (contract.vehicle_returned === true) return false;

  const status = String(contract.status || '').trim().toLowerCase();
  if (status === 'active' || status === 'suspended') return true;

  return status === 'under_legal_procedure';
};
