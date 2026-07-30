import { describe, expect, it, vi } from 'vitest';
import { processTaqadiParties } from '../party-workflow';
import type { FilingPayload } from '../types';

const payload = {} as FilingPayload;

function createPortal(calls: string[]) {
  return {
    validateCompanyParty: vi.fn(async () => {
      calls.push('company');
    }),
    addDefendant: vi.fn(async (
      _payload: FilingPayload,
      options?: { continueAfterSave?: boolean },
    ) => {
      calls.push(`defendant:${String(options?.continueAfterSave)}`);
    }),
    validateRepresentativeFirst: vi.fn(async () => {
      calls.push('representative');
    }),
    continueAfterParties: vi.fn(async () => {
      calls.push('continue');
    }),
  };
}

describe('processTaqadiParties', () => {
  it('adds the company and defendant before editing the representative', async () => {
    const calls: string[] = [];
    const portal = createPortal(calls);

    await processTaqadiParties(portal, payload, {
      onPhase: (phase) => {
        calls.push(`phase:${phase}`);
      },
    });

    expect(calls).toEqual([
      'phase:company_and_defendant',
      'company',
      'defendant:false',
      'phase:representative_last',
      'representative',
      'continue',
    ]);
  });

  it('stops after validating the reordered parties in diagnostic mode', async () => {
    const calls: string[] = [];
    const portal = createPortal(calls);

    await expect(
      processTaqadiParties(portal, payload, { stopAfterParties: true }),
    ).rejects.toMatchObject({
      code: 'PARTIES_DIAGNOSTIC_COMPLETE',
    });
    expect(calls).toEqual([
      'company',
      'defendant:false',
      'representative',
    ]);
    expect(portal.continueAfterParties).not.toHaveBeenCalled();
  });
});
