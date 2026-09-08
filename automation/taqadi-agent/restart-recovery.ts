import type { FilingStatus } from './types';

export interface InterruptedJobSnapshot {
  status: FilingStatus;
  attempt_count: number;
  max_attempts: number;
  heartbeat_at: string | null;
  locked_at: string | null;
  updated_at: string;
  error_code?: string | null;
}

export type RestartRecoveryDecision =
  | 'requeue'
  | 'requeue_login'
  | 'verify_submission'
  | 'attempt_limit'
  | 'manual_stop'
  | null;

const recoverableStatuses = new Set<FilingStatus>([
  'validating',
  'waiting_login',
  'filling_case',
  'validating_parties',
  'uploading_documents',
  'reviewing',
  'submitting',
]);

export function decideRestartRecovery(
  job: InterruptedJobSnapshot,
  staleBeforeMs: number,
): RestartRecoveryDecision {
  if (!recoverableStatuses.has(job.status)) return null;

  const lastActivity = Date.parse(
    job.heartbeat_at || job.locked_at || job.updated_at,
  );
  if (!Number.isFinite(lastActivity) || lastActivity >= staleBeforeMs) {
    return null;
  }

  if (job.status === 'submitting') return 'verify_submission';
  if (job.error_code === 'MANUAL_STOP_REQUESTED') return 'manual_stop';
  if (job.status === 'waiting_login') return 'requeue_login';
  if (job.attempt_count >= job.max_attempts) return 'attempt_limit';
  return 'requeue';
}
