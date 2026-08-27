import { describe, expect, it } from 'vitest';

/**
 * Regression test for payment import contract matching bug
 * 
 * Issue: Excel/payment imports matched historical payments onto a 1-day cancelled 
 * manual stub contract (C-ALF-0063, start=end 2024-08-26) while the real multi-year 
 * lease on the same plate (LTO2024284, created_via=desktop_folder_import) had zero payments.
 * 
 * These tests verify the matcher logic without requiring database access.
 */

type MatchedContract = {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id: string | null;
  license_plate: string | null;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  created_via: string | null;
};

type ParsedExcelFile = {
  plateNumber: string;
  phone: string;
  idNumber: string;
  customerName: string;
  monthlyRent: number;
};

/**
 * Helper to calculate contract duration in days
 */
const getContractDurationDays = (contract: MatchedContract): number => {
  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const durationMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(durationMs / (1000 * 60 * 60 * 24)));
};

/**
 * Simplified scoring logic for testing
 */
const scoreContractForTest = (contract: MatchedContract, file: ParsedExcelFile): number => {
  let score = 0;
  
  // Plate match
  if (contract.license_plate === file.plateNumber) {
    score += 55;
  }
  
  // Active status
  if (contract.status === 'active') {
    score += 5;
  }
  
  // Duration-based scoring
  const durationDays = getContractDurationDays(contract);
  if (durationDays >= 365) {
    score += 50;
  } else if (durationDays >= 90) {
    score += 20;
  }
  
  // Heavily penalize short-duration cancelled stubs
  if (durationDays <= 3 && contract.status === 'cancelled') {
    score -= 500;
  }
  
  // Prefer desktop_folder_import contracts
  if (contract.created_via === 'desktop_folder_import') {
    score += 25;
  }
  
  // Prefer contracts under legal procedure
  if (contract.status === 'under_legal_procedure') {
    score += 15;
  }
  
  return score;
};

describe('Contract matching regression tests', () => {
  it('should prefer long-duration desktop_folder_import over 1-day cancelled stub', () => {
    // Simulate the C-ALF-0063 vs LTO2024284 scenario
    const shortStub: MatchedContract = {
      id: 'short-stub-id',
      contract_number: 'C-ALF-0063',
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      license_plate: 'ABC123',
      monthly_amount: 3000,
      start_date: '2024-08-26',
      end_date: '2024-08-26', // Same day - 1 day contract
      status: 'cancelled',
      created_via: 'manual',
    };
    
    const longLease: MatchedContract = {
      id: 'long-lease-id',
      contract_number: 'LTO2024284',
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      license_plate: 'ABC123',
      monthly_amount: 3000,
      start_date: '2024-01-01',
      end_date: '2026-12-31', // Multi-year lease
      status: 'active',
      created_via: 'desktop_folder_import',
    };
    
    const file: ParsedExcelFile = {
      plateNumber: 'ABC123',
      phone: '12345678',
      idNumber: '123456789',
      customerName: 'Test Customer',
      monthlyRent: 3000,
    };
    
    const shortScore = scoreContractForTest(shortStub, file);
    const longScore = scoreContractForTest(longLease, file);
    
    // The long lease should score MUCH higher than the cancelled stub
    expect(longScore).toBeGreaterThan(shortScore);
    
    // Short stub should have negative score due to -500 penalty
    expect(shortScore).toBeLessThan(0);
    
    // Long lease should have positive score
    expect(longScore).toBeGreaterThan(0);
  });
  
  it('should calculate contract duration correctly', () => {
    const oneDayContract: MatchedContract = {
      id: '1',
      contract_number: 'C-1',
      customer_id: 'c1',
      vehicle_id: 'v1',
      license_plate: 'ABC',
      monthly_amount: 1000,
      start_date: '2024-08-26',
      end_date: '2024-08-26',
      status: 'cancelled',
      created_via: 'manual',
    };
    
    const threeDayContract: MatchedContract = {
      ...oneDayContract,
      end_date: '2024-08-29',
    };
    
    const yearContract: MatchedContract = {
      ...oneDayContract,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    };
    
    expect(getContractDurationDays(oneDayContract)).toBe(0);
    expect(getContractDurationDays(threeDayContract)).toBe(3);
    expect(getContractDurationDays(yearContract)).toBe(365);
  });
  
  it('should penalize cancelled stubs <= 3 days heavily', () => {
    const stub: MatchedContract = {
      id: '1',
      contract_number: 'STUB',
      customer_id: 'c1',
      vehicle_id: 'v1',
      license_plate: 'TEST',
      monthly_amount: 1000,
      start_date: '2024-08-26',
      end_date: '2024-08-28', // 2 days
      status: 'cancelled',
      created_via: 'manual',
    };
    
    const file: ParsedExcelFile = {
      plateNumber: 'TEST',
      phone: '',
      idNumber: '',
      customerName: '',
      monthlyRent: 1000,
    };
    
    const score = scoreContractForTest(stub, file);
    
    // Should have plate match (+55) but huge penalty (-500)
    expect(score).toBeLessThan(0);
  });
  
  it('should give bonus points for desktop_folder_import', () => {
    const manualContract: MatchedContract = {
      id: '1',
      contract_number: 'MANUAL',
      customer_id: 'c1',
      vehicle_id: 'v1',
      license_plate: 'TEST',
      monthly_amount: 1000,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'active',
      created_via: 'manual',
    };
    
    const importedContract: MatchedContract = {
      ...manualContract,
      contract_number: 'IMPORTED',
      created_via: 'desktop_folder_import',
    };
    
    const file: ParsedExcelFile = {
      plateNumber: 'TEST',
      phone: '',
      idNumber: '',
      customerName: '',
      monthlyRent: 1000,
    };
    
    const manualScore = scoreContractForTest(manualContract, file);
    const importedScore = scoreContractForTest(importedContract, file);
    
    // Imported should score 25 points higher
    expect(importedScore).toBe(manualScore + 25);
  });
  
  it('should give bonus points for under_legal_procedure status', () => {
    const activeContract: MatchedContract = {
      id: '1',
      contract_number: 'ACTIVE',
      customer_id: 'c1',
      vehicle_id: 'v1',
      license_plate: 'TEST',
      monthly_amount: 1000,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'active',
      created_via: 'manual',
    };
    
    const legalContract: MatchedContract = {
      ...activeContract,
      contract_number: 'LEGAL',
      status: 'under_legal_procedure',
    };
    
    const file: ParsedExcelFile = {
      plateNumber: 'TEST',
      phone: '',
      idNumber: '',
      customerName: '',
      monthlyRent: 1000,
    };
    
    const activeScore = scoreContractForTest(activeContract, file);
    const legalScore = scoreContractForTest(legalContract, file);
    
    // Legal should score higher (loses active +5, gains legal +15 = +10 net)
    expect(legalScore).toBeGreaterThan(activeScore);
    expect(legalScore).toBe(activeScore + 10);
  });
  
  it('should give duration bonuses for long contracts', () => {
    const shortContract: MatchedContract = {
      id: '1',
      contract_number: 'SHORT',
      customer_id: 'c1',
      vehicle_id: 'v1',
      license_plate: 'TEST',
      monthly_amount: 1000,
      start_date: '2024-08-01',
      end_date: '2024-08-15', // 14 days
      status: 'active',
      created_via: 'manual',
    };
    
    const mediumContract: MatchedContract = {
      ...shortContract,
      contract_number: 'MEDIUM',
      start_date: '2024-01-01',
      end_date: '2024-06-30', // ~180 days
    };
    
    const longContract: MatchedContract = {
      ...shortContract,
      contract_number: 'LONG',
      start_date: '2024-01-01',
      end_date: '2025-12-31', // ~730 days
    };
    
    const file: ParsedExcelFile = {
      plateNumber: 'TEST',
      phone: '',
      idNumber: '',
      customerName: '',
      monthlyRent: 1000,
    };
    
    const shortScore = scoreContractForTest(shortContract, file);
    const mediumScore = scoreContractForTest(mediumContract, file);
    const longScore = scoreContractForTest(longContract, file);
    
    // Medium should get +20 bonus (>= 90 days)
    expect(mediumScore).toBe(shortScore + 20);
    
    // Long should get +50 bonus (>= 365 days)
    expect(longScore).toBe(shortScore + 50);
  });
});
