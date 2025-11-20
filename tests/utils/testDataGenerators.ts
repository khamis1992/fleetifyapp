/**
 * Test Data Generators
 *
 * Utility functions for generating realistic test data for contracts,
 * customers, vehicles, and other fleet management entities.
 */

import { faker } from '@faker-js/faker/locale/ar';

// Set faker seed for consistent test data
faker.seed(12345);

export interface MockContract {
  agreementNumber: string;
  type: 'rental' | 'lease' | 'subscription';
  startDate: string;
  endDate: string;
  monthlyRate: number;
  depositAmount: number;
  insuranceFees: number;
  serviceFees: number;
  taxRate: number;
  notes: string;
}

export interface MockCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: 'individual' | 'company';
  civilId?: string;
  commercialRegistration?: string;
}

export interface MockVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
  type: string;
  status: string;
  dailyRate: number;
  monthlyRate: number;
}

export function generateTestContract(overrides: Partial<MockContract> = {}): MockContract {
  const baseContract = {
    agreementNumber: `AGR-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${new Date().getFullYear()}`,
    type: faker.helpers.arrayElement(['rental', 'lease', 'subscription']) as MockContract['type'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthlyRate: Math.floor(Math.random() * 2000) + 500,
    depositAmount: Math.floor(Math.random() * 5000) + 1000,
    insuranceFees: Math.floor(Math.random() * 300) + 50,
    serviceFees: Math.floor(Math.random() * 100) + 25,
    taxRate: 0.15,
    notes: 'Test contract generated for testing purposes',
  };

  return { ...baseContract, ...overrides };
}

export function generateTestCustomer(overrides: Partial<MockCustomer> = {}): MockCustomer {
  const isCompany = Math.random() > 0.5;

  const baseCustomer = {
    id: `cust_${Math.random().toString(36).substring(7)}`,
    name: isCompany ? faker.company.name() : `${faker.person.firstName()} ${faker.person.lastName()}`,
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: `${faker.location.street()}, ${faker.location.city()}, ${faker.location.country()}`,
    type: isCompany ? 'company' : 'individual' as MockCustomer['type'],
  };

  if (isCompany) {
    baseCustomer.commercialRegistration = `CR${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`;
  } else {
    baseCustomer.civilId = Math.floor(Math.random() * 10000000000).toString().padStart(11, '0');
  }

  return { ...baseCustomer, ...overrides };
}

export function generateTestVehicle(overrides: Partial<MockVehicle> = {}): MockVehicle {
  const makes = ['Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Ford', 'Chevrolet', 'BMW', 'Mercedes'];
  const models = {
    Toyota: ['Camry', 'Corolla', 'Prius', 'RAV4', 'Highlander'],
    Honda: ['Accord', 'Civic', 'CR-V', 'Pilot', 'Odyssey'],
    Nissan: ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano'],
    Hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade'],
    Kia: ['Forte', 'Optima', 'Sorento', 'Telluride', 'Sportage'],
    Ford: ['Focus', 'Fusion', 'Escape', 'Explorer', 'F-150'],
    Chevrolet: ['Malibu', 'Impala', 'Equinox', 'Traverse', 'Silverado'],
    BMW: ['3 Series', '5 Series', 'X3', 'X5', '7 Series'],
    Mercedes: ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class'],
  };

  const make = faker.helpers.arrayElement(makes);
  const makeModels = models[make as keyof typeof models];
  const model = faker.helpers.arrayElement(makeModels);

  const baseVehicle = {
    id: `veh_${Math.random().toString(36).substring(7)}`,
    make,
    model,
    year: new Date().getFullYear() - Math.floor(Math.random() * 5),
    vin: `1HGCM82633A${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
    plateNumber: `KWT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    type: faker.helpers.arrayElement(['sedan', 'suv', 'pickup', 'van', 'truck']),
    status: faker.helpers.arrayElement(['available', 'rented', 'maintenance', 'out_of_service']),
    dailyRate: Math.floor(Math.random() * 100) + 50,
    monthlyRate: Math.floor(Math.random() * 2000) + 500,
  };

  return { ...baseVehicle, ...overrides };
}

export function generateMockContracts(count: number, overrides: Partial<MockContract> = {}): MockContract[] {
  return Array.from({ length: count }, (_, index) =>
    generateTestContract({
      ...overrides,
      agreementNumber: `AGR-${String(index + 1).padStart(3, '0')}-${new Date().getFullYear()}`
    })
  );
}

export function generateMockCustomers(count: number, overrides: Partial<MockCustomer> = {}): MockCustomer[] {
  return Array.from({ length: count }, () => generateTestCustomer(overrides));
}

export function generateMockVehicles(count: number, overrides: Partial<MockVehicle> = {}): MockVehicle[] {
  return Array.from({ length: count }, () => generateTestVehicle(overrides));
}

// Specific test data generators for different scenarios
export function generateExpiringContract(): MockContract {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  return generateTestContract({
    endDate: futureDate.toISOString().split('T')[0],
    type: 'rental',
  });
}

export function generateHighValueContract(): MockContract {
  return generateTestContract({
    monthlyRate: Math.floor(Math.random() * 5000) + 2000, // 2000-7000
    depositAmount: Math.floor(Math.random() * 10000) + 5000, // 5000-15000
    type: 'lease',
  });
}

export function generateShortTermContract(): MockContract {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return generateTestContract({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    monthlyRate: Math.floor(Math.random() * 1000) + 300, // Lower rate for short term
    type: 'rental',
  });
}

export function generateLongTermContract(): MockContract {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 365 * 3 * 24 * 60 * 60 * 1000); // 3 years

  return generateTestContract({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    type: 'lease',
  });
}

// Error case generators
export function generateInvalidContract(): Partial<MockContract> {
  return {
    agreementNumber: '', // Empty
    startDate: 'invalid-date',
    endDate: '2020-01-01', // Before start
    monthlyRate: -1000, // Negative
    taxRate: 2, // Invalid (> 1)
  };
}

export function generateInvalidCustomer(): Partial<MockCustomer> {
  return {
    name: '', // Empty
    email: 'invalid-email', // Invalid format
    phone: '', // Empty
    type: 'invalid-type' as any,
  };
}

export function generateInvalidVehicle(): Partial<MockVehicle> {
  return {
    make: '', // Empty
    model: '', // Empty
    year: 1900, // Too old
    vin: 'INVALID-VIN', // Invalid format
    dailyRate: -100, // Negative
  };
}

// Batch generators for different test scenarios
export function generateTestContractsBatch(): {
  active: MockContract[];
  expired: MockContract[];
  draft: MockContract[];
  highValue: MockContract[];
  expiring: MockContract[];
} {
  return {
    active: generateMockContracts(5, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }),
    expired: generateMockContracts(3, {
      startDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }),
    draft: generateMockContracts(2, {
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }),
    highValue: Array.from({ length: 2 }, () => generateHighValueContract()),
    expiring: Array.from({ length: 3 }, () => generateExpiringContract()),
  };
}

export function generateTestCustomersBatch(): {
  individuals: MockCustomer[];
  companies: MockCustomer[];
  new: MockCustomer[];
  existing: MockCustomer[];
} {
  return {
    individuals: generateMockCustomers(5, { type: 'individual' }),
    companies: generateMockCustomers(3, { type: 'company' }),
    new: generateMockCustomers(2),
    existing: generateMockCustomers(4),
  };
}

export function generateTestVehiclesBatch(): {
  available: MockVehicle[];
  rented: MockVehicle[];
  maintenance: MockVehicle[];
  luxury: MockVehicle[];
  commercial: MockVehicle[];
} {
  return {
    available: generateMockVehicles(6, { status: 'available' }),
    rented: generateMockVehicles(3, { status: 'rented' }),
    maintenance: generateMockVehicles(2, { status: 'maintenance' }),
    luxury: generateMockVehicles(2, {
      make: 'Mercedes-Benz',
      model: faker.helpers.arrayElement(['S-Class', 'E-Class', 'G-Class']),
      dailyRate: 300,
      monthlyRate: 8000,
    }),
    commercial: generateMockVehicles(3, {
      type: 'truck',
      make: 'Isuzu',
      dailyRate: 150,
      monthlyRate: 4000,
    }),
  };
}

// API payload generators
export function generateContractApiPayload(contract: MockContract = generateTestContract(), customerId: string = 'test-customer-id', vehicleId: string = 'test-vehicle-id') {
  return {
    agreement_number: contract.agreementNumber,
    customer_id: customerId,
    vehicle_id: vehicleId,
    contract_type: contract.type,
    start_date: contract.startDate,
    end_date: contract.endDate,
    monthly_rate: contract.monthlyRate,
    financial_terms: {
      deposit_amount: contract.depositAmount,
      insurance_fees: contract.insuranceFees,
      service_fees: contract.serviceFees,
      tax_rate: contract.taxRate,
      late_fee_rate: 0.05,
      early_termination_rate: 0.10,
    },
    notes: contract.notes,
  };
}

export function generateCustomerApiPayload(customer: MockCustomer = generateTestCustomer()) {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    type: customer.type,
    civil_id: customer.civilId,
    commercial_registration: customer.commercialRegistration,
  };
}

export function generateVehicleApiPayload(vehicle: MockVehicle = generateTestVehicle()) {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin,
    plate_number: vehicle.plateNumber,
    type: vehicle.type,
    daily_rate: vehicle.dailyRate,
    monthly_rate: vehicle.monthlyRate,
  };
}

// Test fixture generator for consistent test data
export function generateTestFixture() {
  const contracts = generateTestContractsBatch();
  const customers = generateTestCustomersBatch();
  const vehicles = generateTestVehiclesBatch();

  return {
    contracts,
    customers,
    vehicles,
    // Helper methods to get specific test data
    getActiveContract: () => contracts.active[0],
    getExpiredContract: () => contracts.expired[0],
    getDraftContract: () => contracts.draft[0],
    getHighValueContract: () => contracts.highValue[0],
    getExpiringContract: () => contracts.expiring[0],
    getIndividualCustomer: () => customers.individuals[0],
    getCompanyCustomer: () => customers.companies[0],
    getAvailableVehicle: () => vehicles.available[0],
    getRentedVehicle: () => vehicles.rented[0],
    getLuxuryVehicle: () => vehicles.luxury[0],
    getCommercialVehicle: () => vehicles.commercial[0],
  };
}