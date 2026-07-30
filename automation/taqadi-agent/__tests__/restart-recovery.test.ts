import { describe, expect, it } from 'vitest';
import { decideRestartRecovery } from '../restart-recovery';

const staleBefore = Date.parse('2026-07-29T08:00:00.000Z');
const baseJob = {
  status: 'waiting_login' as const,
  attempt_count: 1,
  max_attempts: 3,
  heartbeat_at: '2026-07-29T07:00:00.000Z',
  locked_at: '2026-07-29T06:59:00.000Z',
  updated_at: '2026-07-29T07:00:00.000Z',
};

describe('Taqadi restart recovery policy', () => {
  it('requeues stale work that stopped before submission', () => {
    expect(decideRestartRecovery({
      ...baseJob,
      status: 'validating',
    }, staleBefore)).toBe('requeue');
  });

  it('never retries a stale job that may have started submission', () => {
    expect(decideRestartRecovery({
      ...baseJob,
      status: 'submitting',
    }, staleBefore)).toBe('verify_submission');
  });

  it('refunds and requeues login waiting even at the retry limit', () => {
    expect(decideRestartRecovery({
      ...baseJob,
      attempt_count: 3,
    }, staleBefore)).toBe('requeue_login');
  });

  it('requires review when active filing reached the retry limit', () => {
    expect(decideRestartRecovery({
      ...baseJob,
      status: 'filling_case',
      attempt_count: 3,
    }, staleBefore)).toBe('attempt_limit');
  });

  it('ignores active and terminal jobs', () => {
    expect(decideRestartRecovery({
      ...baseJob,
      heartbeat_at: '2026-07-29T08:01:00.000Z',
    }, staleBefore)).toBeNull();
    expect(decideRestartRecovery({
      ...baseJob,
      status: 'filed',
    }, staleBefore)).toBeNull();
  });
});
