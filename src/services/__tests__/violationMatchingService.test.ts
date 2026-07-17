import { describe, expect, it } from 'vitest';

import {
  matchToContractFromCache,
  matchToVehicleFromCache,
} from '../violationMatchingService';

describe('violation matching safety', () => {
  it('refuses to choose when one normalized plate belongs to multiple vehicles', async () => {
    const cache = new Map<string, Set<string>>([
      ['185513', new Set(['vehicle-1', 'vehicle-2'])],
    ]);

    const result = await matchToVehicleFromCache('185513', cache);

    expect(result.vehicle_id).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('resolves a duplicate plate through the only contract covering the violation date', async () => {
    const vehicleCache = new Map<string, Set<string>>([
      ['185513', new Set(['vehicle-without-contract', 'bestune-t77'])],
    ]);
    const contractsCache = new Map<string, any[]>([[
      'bestune-t77',
      [{
        id: 'contract-lto-7',
        contract_number: 'LTO20247',
        status: 'under_legal_procedure',
        start_date: '2024-01-03',
        end_date: '2027-01-03',
        customer_id: 'customer-1',
      }],
    ]]);

    const result = await matchToVehicleFromCache(
      '185513',
      vehicleCache,
      '2026-06-01',
      contractsCache
    );

    expect(result).toEqual(expect.objectContaining({
      vehicle_id: 'bestune-t77',
      confidence: 'high',
    }));
  });

  it('keeps a duplicate plate unresolved when multiple vehicles have valid contracts', async () => {
    const vehicleCache = new Map<string, Set<string>>([
      ['185513', new Set(['vehicle-1', 'vehicle-2'])],
    ]);
    const contractsCache = new Map<string, any[]>([
      ['vehicle-1', [{
        id: 'contract-1',
        contract_number: 'C-1',
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2027-01-01',
        customer_id: 'customer-1',
      }]],
      ['vehicle-2', [{
        id: 'contract-2',
        contract_number: 'C-2',
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2027-01-01',
        customer_id: 'customer-2',
      }]],
    ]);

    const result = await matchToVehicleFromCache(
      '185513',
      vehicleCache,
      '2026-06-01',
      contractsCache
    );

    expect(result.vehicle_id).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('prefers the only active contract when historical contracts overlap it', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-1',
      [
        {
          id: 'contract-1',
          contract_number: 'C-1',
          status: 'active',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          customer_id: 'customer-1',
        },
        {
          id: 'contract-2',
          contract_number: 'C-2',
          status: 'closed',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          customer_id: 'customer-2',
        },
      ],
    ]]);

    const result = matchToContractFromCache('vehicle-1', '2026-07-12', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: 'contract-1',
      customer_id: 'customer-1',
      confidence: 'high',
    }));
  });

  it('refuses to choose when multiple active contracts overlap', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-1',
      [
        {
          id: 'contract-1',
          contract_number: 'C-1',
          status: 'active',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          customer_id: 'customer-1',
        },
        {
          id: 'contract-2',
          contract_number: 'C-2',
          status: 'active',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          customer_id: 'customer-2',
        },
      ],
    ]]);

    const result = matchToContractFromCache('vehicle-1', '2026-07-12', cache);

    expect(result.contract_id).toBeNull();
    expect(result.confidence).toBe('none');
  });

  it('selects the only non-cancelled contract when start dates are equal', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-2774',
      [
        {
          id: 'cancelled-agreement',
          contract_number: 'AGR-202504-410464',
          status: 'cancelled',
          start_date: '2025-02-01',
          end_date: '2028-01-17',
          customer_id: 'cancelled-customer',
        },
        {
          id: 'c-alf-0019',
          contract_number: 'C-ALF-0019',
          status: 'under_legal_procedure',
          start_date: '2025-02-01',
          end_date: '2026-12-31',
          customer_id: 'responsible-customer',
        },
      ],
    ]]);

    const result = matchToContractFromCache('vehicle-2774', '2026-06-05', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: 'c-alf-0019',
      contract_number: 'C-ALF-0019',
      customer_id: 'responsible-customer',
      confidence: 'medium',
    }));
  });

  it('selects the latest contract started before the violation date', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-1',
      [
        {
          id: 'contract-1',
          contract_number: 'C-1',
          status: 'active',
          start_date: '2025-01-01',
          end_date: '2026-01-01',
          customer_id: 'customer-1',
        },
        {
          id: 'contract-2',
          contract_number: 'C-2',
          status: 'active',
          start_date: '2025-07-10',
          end_date: '2026-01-01',
          customer_id: 'customer-2',
        },
      ],
    ]]);

    const result = matchToContractFromCache('vehicle-1', '2025-08-01', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: 'contract-2',
      contract_number: 'C-2',
      customer_id: 'customer-2',
    }));
  });

  it('selects AGR-202504-409871 for plate 7054 under the latest-start rule', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-7054',
      [
        {
          id: 'lto-155',
          contract_number: 'LTO2024155',
          status: 'under_legal_procedure',
          start_date: '2024-05-16',
          end_date: '2027-05-17',
          customer_id: 'customer-old',
        },
        {
          id: 'historical',
          contract_number: 'HIST-XLS-T77-7054',
          status: 'cancelled',
          start_date: '2025-01-01',
          end_date: '2027-12-01',
          customer_id: 'customer-historical',
        },
        {
          id: 'c-alf-0053',
          contract_number: 'C-ALF-0053',
          status: 'active',
          start_date: '2025-01-16',
          end_date: '2026-12-31',
          customer_id: 'customer-current',
        },
        {
          id: 'agreement',
          contract_number: 'AGR-202504-409871',
          status: 'under_legal_procedure',
          start_date: '2025-02-01',
          end_date: '2028-01-16',
          customer_id: 'customer-current',
        },
      ],
    ]]);

    const result = matchToContractFromCache('vehicle-7054', '2026-07-12', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: 'agreement',
      contract_number: 'AGR-202504-409871',
      customer_id: 'customer-current',
      confidence: 'medium',
    }));
  });

  it('does not link a contract that starts after the violation', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-1',
      [{
        id: 'future-contract',
        contract_number: 'AGR-202504-418432',
        status: 'cancelled',
        start_date: '2025-03-01',
        end_date: '2028-01-30',
        customer_id: 'future-customer',
      }],
    ]]);

    const result = matchToContractFromCache('vehicle-1', '2024-04-03', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: null,
      customer_id: null,
      contract_number: null,
      confidence: 'none',
    }));
  });

  it('allows a recently ended contract within the seven-day grace period', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-1',
      [{
        id: 'recent-contract',
        contract_number: 'C-RECENT',
        status: 'expired',
        start_date: '2025-01-01',
        end_date: '2025-07-30',
        customer_id: 'recent-customer',
      }],
    ]]);

    const result = matchToContractFromCache('vehicle-1', '2025-08-01', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: 'recent-contract',
      customer_id: 'recent-customer',
      confidence: 'medium',
    }));
  });

  it('links a unique vehicle contract covering the violation date', () => {
    const cache = new Map<string, any[]>([[
      'vehicle-1',
      [{
        id: 'contract-1',
        contract_number: 'C-1',
        status: 'active',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        customer_id: 'customer-1',
      }],
    ]]);

    const result = matchToContractFromCache('vehicle-1', '2026-07-12', cache);

    expect(result).toEqual(expect.objectContaining({
      contract_id: 'contract-1',
      customer_id: 'customer-1',
      confidence: 'high',
    }));
  });
});
