import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    functions: { invoke: mocks.invoke }
  }
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError
  }
}));

import { NotificationService } from '../NotificationService';

const payment = {
  payment_number: 'PAY-1',
  amount: 1250,
  payment_date: '2026-07-13',
  payment_method: 'cash',
  notes: null,
  customers: {
    first_name: 'Test',
    last_name: 'Customer',
    first_name_ar: null,
    last_name_ar: null,
    company_name: null,
    company_name_ar: null,
    phone: '55555555'
  },
  contracts: {
    contract_number: 'CTR-1',
    monthly_amount: 1250,
    vehicles: { plate_number: '123456' }
  },
  invoices: { invoice_number: 'INV-1', total_amount: 1250 }
};

const buildFromMock = (
  channels: Array<{
    company_id: string;
    channel_type: string;
    is_enabled: boolean;
    config: null;
  }> = []
) => {
  const inserts: Array<{ table: string; payload: unknown }> = [];

  mocks.from.mockImplementation((table: string) => {
    if (table === 'notification_channels') {
      return {
        select: () => ({
          eq: async () => ({ data: channels, error: null })
        })
      };
    }

    if (table === 'payments') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: payment, error: null })
            })
          })
        })
      };
    }

    if (table === 'staff_notifications' || table === 'system_logs') {
      return {
        insert: async (payload: unknown) => {
          inserts.push({ table, payload });
          return { error: null };
        }
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return inserts;
};

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('uses an internal staff notification when no external channel is configured', async () => {
    const inserts = buildFromMock();
    const service = new NotificationService();

    const result = await service.sendPaymentReceipt('payment-1', 'company-1');

    expect(result).toEqual({
      success: true,
      sentToChannels: ['in_app'],
      errors: []
    });
    expect(inserts.map(({ table }) => table)).toEqual(['staff_notifications', 'system_logs']);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('fails closed instead of sending arbitrary WhatsApp content from the browser', async () => {
    const inserts = buildFromMock([{
      company_id: 'company-1',
      channel_type: 'whatsapp',
      is_enabled: true,
      config: null
    }]);
    const service = new NotificationService();

    const result = await service.sendPaymentReceipt('payment-1', 'company-1');

    expect(result.success).toBe(false);
    expect(result.sentToChannels).toEqual([]);
    expect(result.errors).toEqual([expect.objectContaining({
      channel: 'whatsapp',
    })]);
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(inserts.map(({ table }) => table)).toEqual(['system_logs']);
  });
});
