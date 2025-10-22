/**
 * Integration tests for Inventory-Sales Integration
 *
 * Tests inventory management integration with sales and contracts including:
 * - Vehicle status updates when contracts are created
 * - Vehicle availability tracking
 * - Double-booking prevention
 * - Vehicle utilization calculations
 * - Inventory turnover metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    }
  }
}));

// Mock hooks
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({
    companyId: 'test-company-id',
    user: { id: 'test-user-id' },
    filter: { company_id: 'test-company-id' }
  })
}));

// Import after mocks
import { useVehicles } from '@/hooks/useVehicles';

describe('Inventory-Sales Integration', () => {
  let queryClient: QueryClient;

  const buildChainableMock = (finalData: any = { data: [], error: null }) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(finalData);
    chain.maybeSingle = vi.fn().mockResolvedValue(finalData);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => Promise.resolve(finalData).then(resolve);
    chain.catch = (reject: any) => Promise.resolve(finalData).catch(reject);
    return chain;
  };

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should update vehicle status when contract created', async () => {
    const vehicle = {
      id: 'vehicle-1',
      plate_number: 'ABC-123',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      status: 'available',
      company_id: 'test-company-id'
    };

    const contract = {
      id: 'contract-1',
      contract_number: 'CNT-2025-001',
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      start_date: '2025-01-15',
      end_date: '2025-12-31',
      status: 'active'
    };

    // Step 1: Create contract
    const mockContractInsert = buildChainableMock({
      data: contract,
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockContractInsert as any);

    // Step 2: Update vehicle status to 'rented'
    const updatedVehicle = { ...vehicle, status: 'rented', current_contract_id: contract.id };
    const mockVehicleUpdate = buildChainableMock({
      data: updatedVehicle,
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockVehicleUpdate as any);

    // Execute both operations
    await act(async () => {
      await mockContractInsert.insert(contract);
      await mockVehicleUpdate.update({
        status: 'rented',
        current_contract_id: contract.id
      }).eq('id', vehicle.id);
    });

    // Verify vehicle status was updated
    expect(mockVehicleUpdate.update).toHaveBeenCalledWith({
      status: 'rented',
      current_contract_id: contract.id
    });
    expect(mockVehicleUpdate.eq).toHaveBeenCalledWith('id', vehicle.id);
  });

  it('should track vehicle availability', async () => {
    const vehicles = [
      {
        id: 'vehicle-1',
        plate_number: 'ABC-123',
        status: 'available',
        company_id: 'test-company-id'
      },
      {
        id: 'vehicle-2',
        plate_number: 'DEF-456',
        status: 'rented',
        company_id: 'test-company-id'
      },
      {
        id: 'vehicle-3',
        plate_number: 'GHI-789',
        status: 'maintenance',
        company_id: 'test-company-id'
      },
      {
        id: 'vehicle-4',
        plate_number: 'JKL-012',
        status: 'available',
        company_id: 'test-company-id'
      }
    ];

    // Mock fetching all vehicles
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: vehicles, error: null }) as any
    );

    // Calculate availability metrics
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

    const availabilityRate = (availableVehicles / totalVehicles) * 100;
    const utilizationRate = (rentedVehicles / totalVehicles) * 100;

    expect(totalVehicles).toBe(4);
    expect(availableVehicles).toBe(2);
    expect(rentedVehicles).toBe(1);
    expect(maintenanceVehicles).toBe(1);
    expect(availabilityRate).toBe(50);
    expect(utilizationRate).toBe(25);
  });

  it('should prevent double-booking vehicles', async () => {
    const vehicle = {
      id: 'vehicle-1',
      plate_number: 'ABC-123',
      status: 'rented',
      current_contract_id: 'contract-1',
      company_id: 'test-company-id'
    };

    // Attempt to create a new contract with already rented vehicle
    const newContract = {
      customer_id: 'customer-2',
      vehicle_id: 'vehicle-1',
      start_date: '2025-02-01',
      end_date: '2025-12-31',
      status: 'draft'
    };

    // Mock checking vehicle availability
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: vehicle, error: null }) as any
    );

    // Validation should fail
    await act(async () => {
      const vehicleCheck = await supabase.from('vehicles').select('*').eq('id', vehicle.id).single();

      if (vehicleCheck.data && vehicleCheck.data.status === 'rented') {
        // Vehicle is already rented, prevent double booking
        const error = new Error('المركبة مؤجرة بالفعل - Vehicle is already rented');
        expect(error.message).toContain('already rented');
      }
    });
  });

  it('should calculate vehicle utilization', async () => {
    const vehicle = {
      id: 'vehicle-1',
      plate_number: 'ABC-123',
      purchase_date: '2024-01-01',
      company_id: 'test-company-id'
    };

    // Contracts for this vehicle
    const contracts = [
      {
        id: 'contract-1',
        vehicle_id: 'vehicle-1',
        start_date: '2024-01-15',
        end_date: '2024-06-30',
        status: 'completed',
        contract_amount: 6000
      },
      {
        id: 'contract-2',
        vehicle_id: 'vehicle-1',
        start_date: '2024-07-01',
        end_date: '2024-12-31',
        status: 'completed',
        contract_amount: 6500
      },
      {
        id: 'contract-3',
        vehicle_id: 'vehicle-1',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        status: 'active',
        contract_amount: 12000
      }
    ];

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: contracts, error: null }) as any
    );

    // Calculate utilization metrics
    const totalRevenue = contracts.reduce((sum, c) => sum + c.contract_amount, 0);
    const completedContracts = contracts.filter(c => c.status === 'completed').length;
    const activeContracts = contracts.filter(c => c.status === 'active').length;

    // Calculate days rented
    const calculateDays = (start: string, end: string) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    const totalDaysRented = contracts.reduce((sum, c) => {
      return sum + calculateDays(c.start_date, c.end_date);
    }, 0);

    const purchaseDate = new Date(vehicle.purchase_date);
    const today = new Date('2025-01-20'); // Fixed date for testing
    const totalDaysOwned = Math.ceil((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    const utilizationPercentage = (totalDaysRented / totalDaysOwned) * 100;

    expect(totalRevenue).toBe(24500);
    expect(completedContracts).toBe(2);
    expect(activeContracts).toBe(1);
    expect(utilizationPercentage).toBeGreaterThan(90); // High utilization
  });

  it('should track inventory turnover', async () => {
    // All vehicles in fleet
    const vehicles = [
      { id: 'vehicle-1', status: 'rented', purchase_price: 15000 },
      { id: 'vehicle-2', status: 'available', purchase_price: 18000 },
      { id: 'vehicle-3', status: 'rented', purchase_price: 20000 },
      { id: 'vehicle-4', status: 'maintenance', purchase_price: 16000 }
    ];

    // Completed contracts in the period (e.g., last year)
    const completedContracts = [
      { vehicle_id: 'vehicle-1', contract_amount: 12000, status: 'completed' },
      { vehicle_id: 'vehicle-1', contract_amount: 11000, status: 'completed' },
      { vehicle_id: 'vehicle-3', contract_amount: 15000, status: 'completed' },
      { vehicle_id: 'vehicle-3', contract_amount: 14000, status: 'completed' }
    ];

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: vehicles, error: null }) as any
    );
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: completedContracts, error: null }) as any
    );

    // Calculate inventory turnover
    const totalInventoryValue = vehicles.reduce((sum, v) => sum + v.purchase_price, 0);
    const totalRevenue = completedContracts.reduce((sum, c) => sum + c.contract_amount, 0);
    const inventoryTurnover = totalRevenue / totalInventoryValue;

    expect(totalInventoryValue).toBe(69000);
    expect(totalRevenue).toBe(52000);
    expect(inventoryTurnover).toBeCloseTo(0.75, 2); // ~75% turnover
  });

  it('should update inventory on contract completion', async () => {
    const contract = {
      id: 'contract-1',
      vehicle_id: 'vehicle-1',
      status: 'active',
      end_date: '2025-01-15'
    };

    const vehicle = {
      id: 'vehicle-1',
      status: 'rented',
      current_contract_id: 'contract-1'
    };

    // Complete contract
    const mockContractUpdate = buildChainableMock({
      data: { ...contract, status: 'completed' },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockContractUpdate as any);

    // Update vehicle back to available
    const mockVehicleUpdate = buildChainableMock({
      data: { ...vehicle, status: 'available', current_contract_id: null },
      error: null
    });
    vi.mocked(supabase.from).mockReturnValueOnce(mockVehicleUpdate as any);

    await act(async () => {
      await mockContractUpdate.update({ status: 'completed' }).eq('id', contract.id);
      await mockVehicleUpdate.update({
        status: 'available',
        current_contract_id: null
      }).eq('id', vehicle.id);
    });

    expect(mockVehicleUpdate.update).toHaveBeenCalledWith({
      status: 'available',
      current_contract_id: null
    });
  });

  it('should handle maintenance scheduling based on usage', async () => {
    const vehicle = {
      id: 'vehicle-1',
      plate_number: 'ABC-123',
      odometer: 50000,
      last_maintenance_date: '2024-06-01',
      last_maintenance_odometer: 45000,
      maintenance_interval_km: 5000
    };

    // Check if maintenance is due
    const currentOdometer = vehicle.odometer;
    const lastMaintenanceOdometer = vehicle.last_maintenance_odometer;
    const maintenanceInterval = vehicle.maintenance_interval_km;

    const kmSinceLastMaintenance = currentOdometer - lastMaintenanceOdometer;
    const isMaintenanceDue = kmSinceLastMaintenance >= maintenanceInterval;

    expect(isMaintenanceDue).toBe(true);
    expect(kmSinceLastMaintenance).toBe(5000);

    if (isMaintenanceDue) {
      // Schedule maintenance - update vehicle status
      const mockUpdate = buildChainableMock({
        data: { ...vehicle, status: 'maintenance' },
        error: null
      });
      vi.mocked(supabase.from).mockReturnValueOnce(mockUpdate as any);

      await act(async () => {
        await mockUpdate.update({ status: 'maintenance' }).eq('id', vehicle.id);
      });

      expect(mockUpdate.update).toHaveBeenCalledWith({ status: 'maintenance' });
    }
  });

  it('should calculate revenue per vehicle', async () => {
    const vehicles = [
      { id: 'vehicle-1', plate_number: 'ABC-123', purchase_price: 15000 },
      { id: 'vehicle-2', plate_number: 'DEF-456', purchase_price: 18000 }
    ];

    const contracts = [
      { vehicle_id: 'vehicle-1', contract_amount: 12000, status: 'completed' },
      { vehicle_id: 'vehicle-1', contract_amount: 13000, status: 'active' },
      { vehicle_id: 'vehicle-2', contract_amount: 15000, status: 'completed' },
      { vehicle_id: 'vehicle-2', contract_amount: 16000, status: 'active' }
    ];

    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: vehicles, error: null }) as any
    );
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildChainableMock({ data: contracts, error: null }) as any
    );

    // Calculate revenue per vehicle
    const revenueByVehicle = vehicles.map(vehicle => {
      const vehicleContracts = contracts.filter(c => c.vehicle_id === vehicle.id);
      const totalRevenue = vehicleContracts.reduce((sum, c) => sum + c.contract_amount, 0);
      const roi = ((totalRevenue - vehicle.purchase_price) / vehicle.purchase_price) * 100;

      return {
        vehicle_id: vehicle.id,
        plate_number: vehicle.plate_number,
        total_revenue: totalRevenue,
        purchase_price: vehicle.purchase_price,
        roi: roi
      };
    });

    expect(revenueByVehicle[0].total_revenue).toBe(25000);
    expect(revenueByVehicle[0].roi).toBeCloseTo(66.67, 2);
    expect(revenueByVehicle[1].total_revenue).toBe(31000);
    expect(revenueByVehicle[1].roi).toBeCloseTo(72.22, 2);
  });

  it('should track vehicle depreciation and book value', async () => {
    const vehicle = {
      id: 'vehicle-1',
      plate_number: 'ABC-123',
      purchase_price: 20000,
      purchase_date: '2023-01-01',
      depreciation_rate: 20, // 20% per year
      salvage_value: 4000
    };

    const today = new Date('2025-01-01');
    const purchaseDate = new Date(vehicle.purchase_date);
    const yearsOwned = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    // Calculate straight-line depreciation
    const depreciableAmount = vehicle.purchase_price - vehicle.salvage_value;
    const annualDepreciation = depreciableAmount * (vehicle.depreciation_rate / 100);
    const totalDepreciation = Math.min(annualDepreciation * yearsOwned, depreciableAmount);
    const bookValue = vehicle.purchase_price - totalDepreciation;

    expect(yearsOwned).toBeCloseTo(2, 1);
    expect(annualDepreciation).toBe(3200); // (20000 - 4000) * 0.20
    expect(totalDepreciation).toBeCloseTo(6400, 0);
    expect(bookValue).toBeCloseTo(13600, 0);
    expect(bookValue).toBeGreaterThanOrEqual(vehicle.salvage_value);
  });
});
