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

// ============================================================================
// Payment & Invoice Generators for Financial System E2E Tests
// ============================================================================

export type PaymentType = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'cleared' | 'bounced';
export type PaymentMethod = 'received' | 'made';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoicePaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface MockPayment {
  id: string;
  paymentNumber: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentDate: string;
  paymentStatus: PaymentStatus;
  referenceNumber?: string;
  checkNumber?: string;
  notes?: string;
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
  contractId?: string;
  lateFineAmount?: number;
  lateFineStatus?: 'none' | 'paid' | 'waived' | 'pending';
}

export interface MockInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceType: 'sales' | 'purchase' | 'service';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  customerId?: string;
  contractId?: string;
  notes?: string;
}

export interface MockJournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'reversed';
  referenceType?: string;
  referenceId?: string;
  lines: MockJournalEntryLine[];
}

export interface MockJournalEntryLine {
  lineNumber: number;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
}

/**
 * Generate a test payment with realistic data
 */
export function generateTestPayment(overrides: Partial<MockPayment> = {}): MockPayment {
  const paymentTypes: PaymentType[] = ['cash', 'check', 'bank_transfer', 'credit_card', 'online_transfer'];
  const paymentType = faker.helpers.arrayElement(paymentTypes);
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  const basePayment: MockPayment = {
    id: `pay_${Math.random().toString(36).substring(7)}`,
    paymentNumber: `PAY-${year}-${seq}`,
    paymentType,
    paymentMethod: 'received',
    amount: Math.floor(Math.random() * 5000) + 500,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'completed',
    referenceNumber: paymentType !== 'cash' ? `REF-${Math.random().toString(36).substring(7).toUpperCase()}` : undefined,
    checkNumber: paymentType === 'check' ? `CHK-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}` : undefined,
    notes: 'Test payment generated for E2E testing',
  };

  return { ...basePayment, ...overrides };
}

/**
 * Generate a test invoice with realistic data
 */
export function generateTestInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const subtotal = Math.floor(Math.random() * 10000) + 1000;
  const taxRate = 0.05; // 5% VAT in Qatar
  const taxAmount = Math.round(subtotal * taxRate);
  const discountAmount = 0;
  const totalAmount = subtotal + taxAmount - discountAmount;
  
  const baseInvoice: MockInvoice = {
    id: `inv_${Math.random().toString(36).substring(7)}`,
    invoiceNumber: `INV-${year}-${seq}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    invoiceType: 'sales',
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    paidAmount: 0,
    balanceDue: totalAmount,
    currency: 'QAR',
    status: 'sent',
    paymentStatus: 'unpaid',
    notes: 'Test invoice generated for E2E testing',
  };

  return { ...baseInvoice, ...overrides };
}

/**
 * Generate test invoices for multiple months
 */
export function generateMonthlyInvoices(
  contractId: string, 
  customerId: string, 
  monthlyAmount: number, 
  months: number = 3
): MockInvoice[] {
  const invoices: MockInvoice[] = [];
  const startDate = new Date();
  
  for (let i = 0; i < months; i++) {
    const invoiceDate = new Date(startDate);
    invoiceDate.setMonth(invoiceDate.getMonth() - i);
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const taxAmount = Math.round(monthlyAmount * 0.05);
    const totalAmount = monthlyAmount + taxAmount;
    
    // Determine status based on due date
    const isOverdue = dueDate < new Date();
    
    invoices.push(generateTestInvoice({
      invoiceNumber: `INV-${invoiceDate.getFullYear().toString().slice(-2)}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      invoiceDate: invoiceDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      subtotal: monthlyAmount,
      taxAmount,
      totalAmount,
      balanceDue: totalAmount,
      status: isOverdue ? 'overdue' : 'sent',
      customerId,
      contractId,
    }));
  }
  
  return invoices;
}

// ============================================================================
// Payment Scenario Generators
// ============================================================================

/**
 * Generate a cash payment (full amount)
 */
export function generateCashPayment(amount: number, invoiceId?: string): MockPayment {
  return generateTestPayment({
    paymentType: 'cash',
    paymentMethod: 'received',
    amount,
    paymentStatus: 'completed',
    invoiceId,
    notes: 'Cash payment - full amount',
  });
}

/**
 * Generate a check payment
 */
export function generateCheckPayment(amount: number, invoiceId?: string, bounced: boolean = false): MockPayment {
  return generateTestPayment({
    paymentType: 'check',
    paymentMethod: 'received',
    amount,
    paymentStatus: bounced ? 'bounced' : 'cleared',
    checkNumber: `CHK-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
    invoiceId,
    notes: bounced ? 'Check payment - BOUNCED' : 'Check payment - cleared',
  });
}

/**
 * Generate a bank transfer payment
 */
export function generateBankTransferPayment(amount: number, invoiceId?: string): MockPayment {
  return generateTestPayment({
    paymentType: 'bank_transfer',
    paymentMethod: 'received',
    amount,
    paymentStatus: 'completed',
    referenceNumber: `TRF-${Date.now().toString().slice(-8)}`,
    invoiceId,
    notes: 'Bank transfer payment',
  });
}

/**
 * Generate a credit card payment
 */
export function generateCreditCardPayment(amount: number, invoiceId?: string): MockPayment {
  return generateTestPayment({
    paymentType: 'credit_card',
    paymentMethod: 'received',
    amount,
    paymentStatus: 'completed',
    referenceNumber: `CC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    invoiceId,
    notes: 'Credit card payment',
  });
}

/**
 * Generate an online transfer payment
 */
export function generateOnlineTransferPayment(amount: number, invoiceId?: string): MockPayment {
  return generateTestPayment({
    paymentType: 'online_transfer',
    paymentMethod: 'received',
    amount,
    paymentStatus: 'completed',
    referenceNumber: `ONL-${Date.now().toString().slice(-10)}`,
    invoiceId,
    notes: 'Online transfer payment',
  });
}

/**
 * Generate a partial payment
 */
export function generatePartialPayment(
  totalAmount: number, 
  paymentPercentage: number = 0.5, 
  invoiceId?: string
): MockPayment {
  const amount = Math.round(totalAmount * paymentPercentage);
  return generateTestPayment({
    paymentType: 'cash',
    paymentMethod: 'received',
    amount,
    paymentStatus: 'completed',
    invoiceId,
    notes: `Partial payment - ${Math.round(paymentPercentage * 100)}% of total`,
  });
}

/**
 * Generate a late payment with penalty
 */
export function generateLatePayment(
  amount: number, 
  daysLate: number = 30, 
  invoiceId?: string
): MockPayment {
  const lateFinePercentage = 0.05; // 5% late fee
  const lateFineAmount = Math.round(amount * lateFinePercentage);
  
  const paymentDate = new Date();
  paymentDate.setDate(paymentDate.getDate() - daysLate);
  
  return generateTestPayment({
    paymentType: 'bank_transfer',
    paymentMethod: 'received',
    amount: amount + lateFineAmount,
    paymentDate: new Date().toISOString().split('T')[0], // Paid today
    paymentStatus: 'completed',
    invoiceId,
    lateFineAmount,
    lateFineStatus: 'paid',
    notes: `Late payment - ${daysLate} days overdue, includes ${lateFineAmount} QAR penalty`,
  });
}

/**
 * Generate a cancelled payment
 */
export function generateCancelledPayment(amount: number, invoiceId?: string): MockPayment {
  return generateTestPayment({
    paymentType: 'check',
    paymentMethod: 'received',
    amount,
    paymentStatus: 'cancelled',
    invoiceId,
    notes: 'Payment cancelled by customer request',
  });
}

/**
 * Generate a payment for a vendor (outgoing)
 */
export function generateVendorPayment(amount: number, vendorId: string): MockPayment {
  return generateTestPayment({
    paymentType: 'bank_transfer',
    paymentMethod: 'made',
    amount,
    paymentStatus: 'completed',
    vendorId,
    notes: 'Vendor payment - outgoing',
  });
}

// ============================================================================
// Payment Scenario Batches for E2E Testing
// ============================================================================

export interface PaymentTestScenario {
  name: string;
  description: string;
  invoiceAmount: number;
  payments: MockPayment[];
  expectedInvoiceStatus: InvoicePaymentStatus;
  expectedBalance: number;
}

/**
 * Generate all payment test scenarios
 */
export function generatePaymentTestScenarios(invoiceAmount: number = 5000): PaymentTestScenario[] {
  const taxAmount = Math.round(invoiceAmount * 0.05);
  const totalAmount = invoiceAmount + taxAmount;
  
  return [
    {
      name: 'full_cash_payment',
      description: 'Full payment in cash',
      invoiceAmount: totalAmount,
      payments: [generateCashPayment(totalAmount)],
      expectedInvoiceStatus: 'paid',
      expectedBalance: 0,
    },
    {
      name: 'full_check_payment',
      description: 'Full payment by check',
      invoiceAmount: totalAmount,
      payments: [generateCheckPayment(totalAmount)],
      expectedInvoiceStatus: 'paid',
      expectedBalance: 0,
    },
    {
      name: 'full_bank_transfer',
      description: 'Full payment by bank transfer',
      invoiceAmount: totalAmount,
      payments: [generateBankTransferPayment(totalAmount)],
      expectedInvoiceStatus: 'paid',
      expectedBalance: 0,
    },
    {
      name: 'full_credit_card',
      description: 'Full payment by credit card',
      invoiceAmount: totalAmount,
      payments: [generateCreditCardPayment(totalAmount)],
      expectedInvoiceStatus: 'paid',
      expectedBalance: 0,
    },
    {
      name: 'partial_payment_single',
      description: 'Single partial payment (50%)',
      invoiceAmount: totalAmount,
      payments: [generatePartialPayment(totalAmount, 0.5)],
      expectedInvoiceStatus: 'partial',
      expectedBalance: Math.round(totalAmount * 0.5),
    },
    {
      name: 'multiple_partial_payments',
      description: 'Multiple partial payments totaling full amount',
      invoiceAmount: totalAmount,
      payments: [
        generatePartialPayment(totalAmount, 0.4),
        generatePartialPayment(totalAmount, 0.4),
        generatePartialPayment(totalAmount, 0.2),
      ],
      expectedInvoiceStatus: 'paid',
      expectedBalance: 0,
    },
    {
      name: 'late_payment_with_penalty',
      description: 'Late payment including penalty',
      invoiceAmount: totalAmount,
      payments: [generateLatePayment(totalAmount, 45)],
      expectedInvoiceStatus: 'paid',
      expectedBalance: 0,
    },
    {
      name: 'bounced_check',
      description: 'Check payment that bounced',
      invoiceAmount: totalAmount,
      payments: [generateCheckPayment(totalAmount, undefined, true)],
      expectedInvoiceStatus: 'unpaid', // Payment failed, invoice still unpaid
      expectedBalance: totalAmount,
    },
    {
      name: 'cancelled_payment',
      description: 'Payment that was cancelled',
      invoiceAmount: totalAmount,
      payments: [generateCancelledPayment(totalAmount)],
      expectedInvoiceStatus: 'unpaid', // Payment cancelled, invoice still unpaid
      expectedBalance: totalAmount,
    },
    {
      name: 'overpayment',
      description: 'Payment exceeding invoice amount',
      invoiceAmount: totalAmount,
      payments: [generateCashPayment(totalAmount + 500)],
      expectedInvoiceStatus: 'paid',
      expectedBalance: -500, // Credit balance
    },
  ];
}

/**
 * Generate API payload for creating a payment
 */
export function generatePaymentApiPayload(
  payment: MockPayment = generateTestPayment(),
  companyId: string = '24bc0b21-4e2d-4413-9842-31719a3669f4'
) {
  return {
    company_id: companyId,
    payment_number: payment.paymentNumber,
    payment_type: payment.paymentType,
    payment_method: payment.paymentMethod,
    amount: payment.amount,
    payment_date: payment.paymentDate,
    payment_status: payment.paymentStatus,
    reference_number: payment.referenceNumber,
    check_number: payment.checkNumber,
    notes: payment.notes,
    customer_id: payment.customerId,
    vendor_id: payment.vendorId,
    invoice_id: payment.invoiceId,
    contract_id: payment.contractId,
    late_fine_amount: payment.lateFineAmount,
    late_fine_status: payment.lateFineStatus,
    transaction_type: payment.paymentMethod === 'received' ? 'receipt' : 'payment',
  };
}

/**
 * Generate API payload for creating an invoice
 */
export function generateInvoiceApiPayload(
  invoice: MockInvoice = generateTestInvoice(),
  companyId: string = '24bc0b21-4e2d-4413-9842-31719a3669f4'
) {
  return {
    company_id: companyId,
    invoice_number: invoice.invoiceNumber,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate,
    invoice_type: invoice.invoiceType,
    subtotal: invoice.subtotal,
    tax_amount: invoice.taxAmount,
    discount_amount: invoice.discountAmount,
    total_amount: invoice.totalAmount,
    paid_amount: invoice.paidAmount,
    balance_due: invoice.balanceDue,
    currency: invoice.currency,
    status: invoice.status,
    payment_status: invoice.paymentStatus,
    customer_id: invoice.customerId,
    contract_id: invoice.contractId,
    notes: invoice.notes,
  };
}

/**
 * Generate a complete financial test fixture
 */
export function generateFinancialTestFixture() {
  const customer = generateTestCustomer({ type: 'company' });
  const vehicle = generateTestVehicle({ status: 'available' });
  const contract = generateTestContract({ monthlyRate: 5000 });
  const invoices = generateMonthlyInvoices(contract.agreementNumber, customer.id, 5000, 3);
  const scenarios = generatePaymentTestScenarios(5000);
  
  return {
    customer,
    vehicle,
    contract,
    invoices,
    scenarios,
    // Helper methods
    getUnpaidInvoice: () => invoices.find(inv => inv.paymentStatus === 'unpaid'),
    getOverdueInvoice: () => invoices.find(inv => inv.status === 'overdue'),
    getScenario: (name: string) => scenarios.find(s => s.name === name),
  };
}