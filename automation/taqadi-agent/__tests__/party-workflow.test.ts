import { describe, expect, it, vi } from 'vitest';
import { processTaqadiParties } from '../party-workflow';
import type { FilingPayload } from '../types';

const payload = {} as FilingPayload;

function createPortal(calls: string[]) {
  return {
    savePartiesDraft: vi.fn(async () => {
      calls.push('saveDraft');
    }),
    reconcileCompanySessionParty: vi.fn(async () => {
      calls.push('companySessionParty');
    }),
    validateCompanyParty: vi.fn(async () => {
      calls.push('company');
    }),
    addDefendant: vi.fn(async (
      _payload: FilingPayload,
      options?: { continueAfterSave?: boolean },
    ) => {
      calls.push(`defendant:${String(options?.continueAfterSave)}`);
    }),
    continueAfterParties: vi.fn(async () => {
      calls.push('continue');
    }),
  };
}

describe('processTaqadiParties', () => {
  it('reviews the portal-owned party before the company and defendant', async () => {
    const calls: string[] = [];
    const portal = createPortal(calls);

    await processTaqadiParties(portal, payload, {
      onPhase: (phase) => {
        calls.push(`phase:${phase}`);
      },
    });

    expect(calls).toEqual([
      'phase:save_parties_draft',
      'saveDraft',
      'phase:company_session_party',
      'companySessionParty',
      'phase:company',
      'company',
      'phase:defendant',
      'defendant:false',
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
      'saveDraft',
      'companySessionParty',
      'company',
      'defendant:false',
    ]);
    expect(portal.continueAfterParties).not.toHaveBeenCalled();
  });
});
