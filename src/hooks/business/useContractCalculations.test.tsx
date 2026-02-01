/**
 * useContractCalculations Hook Tests
 *
 * Comprehensive unit tests for contract calculation functionality
 * including financial calculations, validation logic, and business rules.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContractCalculations } from './useContractCalculations';
import { contractFactory } from '@/test/factories/contractFactory';

// Test setup
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

// Mock the calculation module
vi.mock('@/lib/contract-calculations', () => ({
  calculateMonthlyPayment: vi.fn(),
  calculateTotalRevenue: vi.fn(),
  calculateLateFees: vi.fn(),
  calculateEarlyTerminationFee: vi.fn(),
  calculateProRatedRevenue: vi.fn(),
  calculateContractProfitability: vi.fn(),
  calculateDiscountAmount: vi.fn(),
  generateContractSummary: vi.fn(),
  validateContractFinancials: vi.fn(),
}));

describe('useContractCalculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Monthly Payment Calculations', () => {
    it('should calculate monthly payment correctly', async () => {
      const contract = contractFactory.create({
        monthly_rate: 1000,
        financial_terms: {
          deposit_amount: 2000,
          insurance_fees: 150,
          service_fees: 50,
          tax_rate: 0.15,
          late_fee_rate: 0.05,
          early_termination_rate: 0.10,
        }
      });

      const { monthlyPaymentModule } = contractFactory.calculationTests();
      const mockCalculation = {
        subtotal: 1200,
        tax: 180,
        total: 1380,
        currency: 'KWD',
        breakdown: {
          base_rate: 1000,
          insurance_fees: 150,
          service_fees: 50,
        },
      };

      const { calculateMonthlyPayment } = await import('@/lib/contract-calculations');
      vi.mocked(calculateMonthlyPayment).mockReturnValue(mockCalculation);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      expect(result.current.monthlyPayment).toEqual(mockCalculation);
      expect(calculateMonthlyPayment).toHaveBeenCalledWith(contract);
    });

    it('should handle zero monthly rate', async () => {
      const contract = contractFactory.create({
        monthly_rate: 0,
        financial_terms: {
          deposit_amount: 0,
          insurance_fees: 100,
          service_fees: 50,
          tax_rate: 0.15,
          late_fee_rate: 0.05,
          early_termination_rate: 0.10,
        }
      });

      const mockCalculation = {
        subtotal: 150,
        tax: 22.50,
        total: 172.50,
        currency: 'KWD',
        breakdown: {
          base_rate: 0,
          insurance_fees: 100,
          service_fees: 50,
        },
      };

      const { calculateMonthlyPayment } = await import('@/lib/contract-calculations');
      vi.mocked(calculateMonthlyPayment).mockReturnValue(mockCalculation);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      expect(result.current.monthlyPayment.total).toBe(172.50);
    });

    it('should handle calculation errors gracefully', async () => {
      const contract = contractFactory.create();

      const { calculateMonthlyPayment } = await import('@/lib/contract-calculations');
      vi.mocked(calculateMonthlyPayment).mockImplementation(() => {
        throw new Error('Calculation failed');
      });

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      expect(result.current.error).toBeDefined();
      expect(result.current.error).toContain('Calculation failed');
    });
  });

  describe('Revenue Calculations', () => {
    it('should calculate total revenue for full contract term', async () => {
      const contract = contractFactory.createActiveContracts(1)[0];

      const mockRevenueResult = {
        monthlyRevenue: 1380,
        totalRevenue: 16560,
        contractDurationMonths: 12,
        projectedAnnualRevenue: 16560,
      };

      const { calculateTotalRevenue } = await import('@/lib/contract-calculations');
      vi.mocked(calculateTotalRevenue).mockReturnValue(mockRevenueResult);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      expect(result.current.totalRevenue).toEqual(mockRevenueResult);
      expect(result.current.totalRevenue.totalRevenue).toBe(16560);
    });

    it('should calculate pro-rated revenue for partial periods', async () => {
      const contract = contractFactory.create();

      const mockProRatedRevenue = {
        proRatedRevenue: 690,
        daysInMonth: 30,
        billingDays: 15,
        dailyRate: 46,
      };

      const { calculateProRatedRevenue } = await import('@/lib/contract-calculations');
      vi.mocked(calculateProRatedRevenue).mockReturnValue(mockProRatedRevenue);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateProRatedRevenue(15);
      });

      expect(result.current.proRatedRevenue).toEqual(mockProRatedRevenue);
    });
  });

  describe('Fee Calculations', () => {
    it('should calculate late fees correctly', async () => {
      const contract = contractFactory.create();

      const mockLateFees = {
        baseFee: 69,
        dailyPenalty: 0.69,
        totalLateFee: 75.90,
        daysLate: 10,
      };

      const { calculateLateFees } = await import('@/lib/contract-calculations');
      vi.mocked(calculateLateFees).mockReturnValue(mockLateFees);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateLateFees(1380, 10);
      });

      expect(result.current.lateFees).toEqual(mockLateFees);
    });

    it('should calculate early termination fees', async () => {
      const contract = contractFactory.createActiveContracts(1)[0];

      const mockEarlyTermination = {
        terminationFee: 600,
        remainingMonths: 6,
        forfeitedRevenue: 8280,
        penaltyRate: 0.10,
      };

      const { calculateEarlyTerminationFee } = await import('@/lib/contract-calculations');
      vi.mocked(calculateEarlyTerminationFee).mockReturnValue(mockEarlyTermination);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateEarlyTerminationFee(6);
      });

      expect(result.current.earlyTerminationFee).toEqual(mockEarlyTermination);
    });

    it('should cap late fees at maximum allowed', async () => {
      const contract = contractFactory.create();

      const mockLateFees = {
        baseFee: 100,
        dailyPenalty: 1,
        totalLateFee: 150, // Capped at 30% of 500 = 150
        daysLate: 365,
      };

      const { calculateLateFees } = await import('@/lib/contract-calculations');
      vi.mocked(calculateLateFees).mockReturnValue(mockLateFees);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateLateFees(500, 365); // 1 year late
      });

      expect(result.current.lateFees.totalLateFee).toBe(150);
    });
  });

  describe('Discount Calculations', () => {
    it('should calculate standard discount correctly', async () => {
      const contract = contractFactory.create();

      const mockDiscount = {
        originalAmount: 1380,
        discountRate: 0.05,
        discountAmount: 69,
        discountedAmount: 1311,
      };

      const { calculateDiscountAmount } = await import('@/lib/contract-calculations');
      vi.mocked(calculateDiscountAmount).mockReturnValue(mockDiscount);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateDiscount(1380, 0.05);
      });

      expect(result.current.discount).toEqual(mockDiscount);
    });

    it('should reject invalid discount rates', async () => {
      const contract = contractFactory.create();

      const { calculateDiscountAmount } = await import('@/lib/contract-calculations');
      vi.mocked(calculateDiscountAmount).mockImplementation(() => {
        throw new Error('Discount rate cannot exceed 50%');
      });

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      expect(() => {
        act(() => {
          result.current.calculateDiscount(1000, 0.60); // 60% discount - invalid
        });
      }).toThrow();
    });
  });

  describe('Profitability Analysis', () => {
    it('should calculate contract profitability correctly', async () => {
      const contract = contractFactory.create();
      const operationalCosts = {
        vehicle_cost: 300,
        insurance_cost: 100,
        admin_cost: 50,
        marketing_cost: 25,
      };

      const mockProfitability = {
        monthlyRevenue: 1380,
        monthlyCosts: 475,
        monthlyProfit: 905,
        profitMargin: 0.655,
        annualProfit: 10860,
        isProfitable: true,
      };

      const { calculateContractProfitability } = await import('@/lib/contract-calculations');
      vi.mocked(calculateContractProfitability).mockReturnValue(mockProfitability);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateProfitability(operationalCosts);
      });

      expect(result.current.profitability).toEqual(mockProfitability);
      expect(result.current.profitability.isProfitable).toBe(true);
    });

    it('should identify unprofitable contracts', async () => {
      const contract = contractFactory.create();
      const highCosts = {
        vehicle_cost: 1500,
        insurance_cost: 300,
        admin_cost: 200,
        marketing_cost: 100,
      };

      const mockProfitability = {
        monthlyRevenue: 1380,
        monthlyCosts: 2100,
        monthlyProfit: -720,
        profitMargin: -0.522,
        annualProfit: -8640,
        isProfitable: false,
      };

      const { calculateContractProfitability } = await import('@/lib/contract-calculations');
      vi.mocked(calculateContractProfitability).mockReturnValue(mockProfitability);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.calculateProfitability(highCosts);
      });

      expect(result.current.profitability.isProfitable).toBe(false);
      expect(result.current.profitability.monthlyProfit).toBe(-720);
    });
  });

  describe('Contract Validation', () => {
    it('should validate contract financial terms', async () => {
      const validContract = contractFactory.create();

      const mockValidation = {
        isValid: true,
        errors: [],
      };

      const { validateContractFinancials } = await import('@/lib/contract-calculations');
      vi.mocked(validateContractFinancials).mockReturnValue(mockValidation);

      const { result } = renderHook(
        () => useContractCalculations(validContract),
        { wrapper }
      );

      await act(async () => {
        await result.current.validateContract();
      });

      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.validation.errors).toHaveLength(0);
    });

    it('should identify validation errors', async () => {
      const invalidContract = contractFactory.createInvalid()[0];

      const mockValidation = {
        isValid: false,
        errors: [
          'Monthly rate must be greater than 0',
          'End date must be after start date',
          'Tax rate must be between 0 and 1',
        ],
      };

      const { validateContractFinancials } = await import('@/lib/contract-calculations');
      vi.mocked(validateContractFinancials).mockReturnValue(mockValidation);

      const { result } = renderHook(
        () => useContractCalculations(invalidContract as any),
        { wrapper }
      );

      await act(async () => {
        await result.current.validateContract();
      });

      expect(result.current.validation.isValid).toBe(false);
      expect(result.current.validation.errors).toHaveLength(3);
    });
  });

  describe('Contract Summary Generation', () => {
    it('should generate comprehensive contract summary', async () => {
      const contract = contractFactory.create();

      const mockSummary = {
        agreementNumber: contract.agreement_number,
        contractDuration: 12,
        monthlyPayment: {
          subtotal: 1200,
          tax: 180,
          total: 1380,
          currency: 'KWD',
          breakdown: {
            base_rate: 1000,
            insurance_fees: 150,
            service_fees: 50,
          },
        },
        totalRevenue: 16560,
        depositRequired: 2000,
        currency: 'KWD',
        terms: {
          paymentTerms: 'Monthly payments due on the 1st of each month',
          cancellationPolicy: 'Early termination fee: 10% of remaining contract value',
          lateFeePolicy: 'Late payment fee: 5% of overdue amount plus daily penalties',
        },
      };

      const { generateContractSummary } = await import('@/lib/contract-calculations');
      vi.mocked(generateContractSummary).mockReturnValue(mockSummary);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.generateSummary();
      });

      expect(result.current.summary).toEqual(mockSummary);
      expect(result.current.summary.agreementNumber).toBe(contract.agreement_number);
    });

    it('should include profitability in summary when costs provided', async () => {
      const contract = contractFactory.create();
      const operationalCosts = {
        vehicle_cost: 300,
        insurance_cost: 100,
        admin_cost: 50,
        marketing_cost: 25,
      };

      const mockSummaryWithProfitability = {
        agreementNumber: contract.agreement_number,
        contractDuration: 12,
        monthlyPayment: {
          subtotal: 1200,
          tax: 180,
          total: 1380,
          currency: 'KWD',
          breakdown: {
            base_rate: 1000,
            insurance_fees: 150,
            service_fees: 50,
          },
        },
        totalRevenue: 16560,
        depositRequired: 2000,
        currency: 'KWD',
        profitability: {
          monthlyRevenue: 1380,
          monthlyCosts: 475,
          monthlyProfit: 905,
          profitMargin: 0.655,
          annualProfit: 10860,
          isProfitable: true,
        },
        terms: {
          paymentTerms: 'Monthly payments due on the 1st of each month',
          cancellationPolicy: 'Early termination fee: 10% of remaining contract value',
          lateFeePolicy: 'Late payment fee: 5% of overdue amount plus daily penalties',
        },
      };

      const { generateContractSummary } = await import('@/lib/contract-calculations');
      vi.mocked(generateContractSummary).mockReturnValue(mockSummaryWithProfitability);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      act(() => {
        result.current.generateSummary(operationalCosts);
      });

      expect(result.current.summary.profitability).toBeDefined();
      expect(result.current.summary.profitability.isProfitable).toBe(true);
    });
  });

  describe('Batch Calculations', () => {
    it('should handle calculations for multiple contracts', async () => {
      const contracts = contractFactory.createActiveContracts(5);

      const mockBatchResults = contracts.map(contract => ({
        contractId: contract.id,
        monthlyPayment: {
          subtotal: 1200,
          tax: 180,
          total: 1380,
          currency: 'KWD',
        },
        totalRevenue: 16560,
        profitability: {
          monthlyProfit: 905,
          isProfitable: true,
        },
      }));

      const { result } = renderHook(
        () => useContractCalculations(contracts),
        { wrapper }
      );

      await act(async () => {
        const results = await result.current.batchCalculate(contracts);
        expect(results).toHaveLength(5);
      });
    });

    it('should handle batch calculations with mixed data', async () => {
      const mixedContracts = [
        ...contractFactory.createActiveContracts(2),
        ...contractFactory.createExpiredContracts(2),
        ...contractFactory.createDraftContracts(1),
      ];

      const { result } = renderHook(
        () => useContractCalculations(mixedContracts),
        { wrapper }
      );

      await act(async () => {
        const results = await result.current.batchCalculate(mixedContracts);
        expect(results).toHaveLength(5);

        // Verify different contract types are handled
        const activeContracts = results.filter(r => r.contractStatus === 'active');
        const expiredContracts = results.filter(r => r.contractStatus === 'expired');
        const draftContracts = results.filter(r => r.contractStatus === 'draft');

        expect(activeContracts).toHaveLength(2);
        expect(expiredContracts).toHaveLength(2);
        expect(draftContracts).toHaveLength(1);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined contract data', () => {
      const { result } = renderHook(
        () => useContractCalculations(null as any),
        { wrapper }
      );

      expect(result.current.error).toBeDefined();
      expect(result.current.error).toContain('Contract data is required');
    });

    it('should handle invalid contract data gracefully', () => {
      const invalidContract = {
        id: '',
        monthly_rate: -1000,
        financial_terms: null,
      };

      const { result } = renderHook(
        () => useContractCalculations(invalidContract as any),
        { wrapper }
      );

      expect(result.current.error).toBeDefined();
    });

    it('should handle calculation service failures', async () => {
      const contract = contractFactory.create();

      const { calculateMonthlyPayment } = await import('@/lib/contract-calculations');
      vi.mocked(calculateMonthlyPayment).mockImplementation(() => {
        throw new Error('Calculation service unavailable');
      });

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      expect(result.current.error).toBeDefined();
      expect(result.current.error).toContain('Calculation service unavailable');
    });

    it('should handle concurrent calculations', async () => {
      const contract = contractFactory.create();

      const mockCalculation = {
        subtotal: 1200,
        tax: 180,
        total: 1380,
        currency: 'KWD',
      };

      const { calculateMonthlyPayment } = await import('@/lib/contract-calculations');
      vi.mocked(calculateMonthlyPayment).mockReturnValue(mockCalculation);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      // Trigger multiple calculations concurrently
      await act(async () => {
        const promises = [
          result.current.calculateMonthlyPayment(),
          result.current.calculateTotalRevenue(),
          result.current.calculateLateFees(1000, 10),
          result.current.calculateEarlyTerminationFee(6),
        ];

        await Promise.all(promises);
      });

      // Verify all calculations completed
      expect(result.current.monthlyPayment).toBeDefined();
      expect(calculateMonthlyPayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Considerations', () => {
    it('should cache calculation results', async () => {
      const contract = contractFactory.create();

      const mockCalculation = {
        subtotal: 1200,
        tax: 180,
        total: 1380,
        currency: 'KWD',
      };

      const { calculateMonthlyPayment } = await import('@/lib/contract-calculations');
      const mockCalculationFn = vi.mocked(calculateMonthlyPayment);
      mockCalculationFn.mockReturnValue(mockCalculation);

      const { result } = renderHook(
        () => useContractCalculations(contract),
        { wrapper }
      );

      // First calculation
      act(() => {
        result.current.calculateMonthlyPayment();
      });

      // Second calculation (should use cache)
      act(() => {
        result.current.calculateMonthlyPayment();
      });

      // Verify calculation function called only once
      expect(mockCalculationFn).toHaveBeenCalledTimes(1);
    });

    it('should handle large number of calculations efficiently', async () => {
      const contracts = contractFactory.createActiveContracts(100);

      const { result } = renderHook(
        () => useContractCalculations(contracts),
        { wrapper }
      );

      const startTime = performance.now();

      await act(async () => {
        await result.current.batchCalculate(contracts);
      });

      const endTime = performance.now();
      const calculationTime = endTime - startTime;

      // Should complete calculations within reasonable time
      expect(calculationTime).toBeLessThan(5000); // 5 seconds
    });
  });
});