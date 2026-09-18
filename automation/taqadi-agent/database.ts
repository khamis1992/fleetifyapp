import { createClient } from '@supabase/supabase-js';
import { hasKnownTaqadiNationality, DEFENDANT_NATIONALITY_REQUIRED_MESSAGE } from '../../src/utils/taqadiNationality';
import { agentConfig } from './config';
import type { SavedReceipt } from './receipt-outbox';
import { workerErrorDetails } from './error-details';
import { HumanInterventionError, ManualStopRequestedError } from './types';
import {
  decideRestartRecovery,
  type InterruptedJobSnapshot,
} from './restart-recovery';
import type {
  FilingJob,
  FilingResult,
  FilingStatus,
  ProgressUpdate,
} from './types';

interface InterruptedJobRow extends InterruptedJobSnapshot {
  id: string;
  company_id: string;
  updated_at: string;
}

export class TaqadiQueue {
  private readonly progressByJob = new Map<string, number>();
  private observationBuffer: Record<string, unknown>[] = [];
  private observationFlush: Promise<void> | null = null;
  private readonly client = createClient(
    agentConfig.supabaseUrl,
    agentConfig.supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  async heartbeat(
    status: 'idle' | 'busy' | 'waiting_login' | 'error' | 'offline',
    currentJobId: string | null = null,
    metadata: Record<string, unknown> = {},
  ) {
    const { error } = await this.client.rpc('heartbeat_taqadi_worker_v1', {
      p_worker_id: agentConfig.workerId,
      p_version: agentConfig.version,
      p_status: status,
      p_current_job_id: currentJobId,
      p_hostname: agentConfig.hostname,
      p_metadata: metadata,
    });
    if (error) throw error;
  }

  async recoverInterruptedJobs(staleAfterSeconds = 90) {
    const safeStaleSeconds = Math.min(
      3_600,
      Math.max(30, staleAfterSeconds),
    );
    const staleBeforeMs = Date.now() - (safeStaleSeconds * 1_000);
    const staleBefore = new Date(staleBeforeMs).toISOString();
    const activeStatuses: FilingStatus[] = [
      'validating',
      'waiting_login',
      'filling_case',
      'validating_parties',
      'uploading_documents',
      'reviewing',
      'submitting',
    ];
    const { data, error } = await this.client
      .from('taqadi_filing_jobs')
      .select(
        'id,company_id,status,attempt_count,max_attempts,heartbeat_at,locked_at,updated_at,error_code',
      )
      .eq('locked_by', agentConfig.workerId)
      .in('status', activeStatuses);
    if (error) throw error;

    let requeued = 0;
    let needsHuman = 0;
    for (const job of (data || []) as InterruptedJobRow[]) {
      const decision = decideRestartRecovery(job, staleBeforeMs);
      if (!decision) continue;

      const refundsLoginAttempt = decision === 'requeue_login';
      const shouldRequeue = decision === 'requeue' || refundsLoginAttempt;
      const needsSubmissionVerification = decision === 'verify_submission';
      const hitAttemptLimit = decision === 'attempt_limit';
      const manuallyStopped = decision === 'manual_stop';
      const nextStatus = shouldRequeue ? 'queued' : 'needs_human';
      const nextStep = needsSubmissionVerification
        ? 'submission_verification'
        : hitAttemptLimit
          ? 'restart_recovery'
          : 'restart_recovery';
      const errorCode = needsSubmissionVerification
        ? 'SUBMISSION_UNCERTAIN'
        : manuallyStopped ? 'MANUALLY_STOPPED'
        : hitAttemptLimit
          ? 'RESTART_RECOVERY_LIMIT'
          : null;
      const errorMessage = needsSubmissionVerification
        ? 'أعيد تشغيل الوكيل أثناء الاعتماد النهائي؛ يجب التحقق من تقاضي قبل إعادة المحاولة.'
        : manuallyStopped ? 'تم حفظ طلب الإيقاف بعد إعادة تشغيل الوكيل. يمكنك متابعة المسودة الموجودة يدويًا.'
        : hitAttemptLimit
          ? 'توقفت المهمة بعد بلوغ الحد الأقصى للمحاولات؛ راجعها قبل إعادة المحاولة.'
          : null;
      const { data: updated, error: updateError } = await this.client
        .from('taqadi_filing_jobs')
        .update({
          status: nextStatus,
          current_step: nextStep,
          progress: shouldRequeue ? 0 : undefined,
          attempt_count: refundsLoginAttempt
            ? Math.max(0, job.attempt_count - 1)
            : undefined,
          locked_by: null,
          locked_at: null,
          heartbeat_at: null,
          error_code: errorCode,
          error_message: errorMessage,
          completed_at: shouldRequeue
            ? null
            : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('locked_by', agentConfig.workerId)
        .eq('status', job.status)
        .eq('updated_at', job.updated_at)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) continue;

      const message = needsSubmissionVerification
        ? 'توقف الجهاز أثناء الاعتماد النهائي؛ لم تتم إعادة الإرسال لحماية الدعوى من التكرار.'
        : manuallyStopped ? 'توقف الوكيل بناءً على طلب المستخدم؛ لم تتم إعادة تشغيل المهمة تلقائيًا.'
        : hitAttemptLimit
          ? 'تعذر استئناف المهمة تلقائيًا بعد إعادة التشغيل بسبب بلوغ حد المحاولات.'
          : refundsLoginAttempt
            ? 'أعيدت المهمة إلى الطابور بعد إعادة تشغيل الوكيل دون احتساب انتظار تسجيل الدخول كمحاولة رفع.'
            : 'تمت إعادة المهمة إلى الطابور تلقائيًا بعد إعادة تشغيل جهاز الوكيل.';
      const { error: eventError } = await this.client
        .from('taqadi_filing_job_events')
        .insert({
          company_id: job.company_id,
          job_id: job.id,
          event_type: shouldRequeue ? 'recovered' : 'needs_human',
          step: nextStep,
          status: nextStatus,
          message,
          details: {
            previousStatus: job.status,
            attemptCount: job.attempt_count,
            maxAttempts: job.max_attempts,
            attemptRefunded: refundsLoginAttempt,
          },
        });
      if (eventError) throw eventError;

      if (shouldRequeue) requeued += 1;
      else needsHuman += 1;
    }

    return { requeued, needsHuman, staleBefore };
  }

  async claimNext(): Promise<FilingJob | null> {
    const { data, error } = await this.client.rpc(
      'claim_next_taqadi_filing_job_v1',
      {
        p_worker_id: agentConfig.workerId,
        p_worker_version: agentConfig.version,
      },
    );
    if (error) throw error;
    if (data) this.progressByJob.set(data.id, data.progress || 0);
    return data as FilingJob | null;
  }

  observe(job: FilingJob, update: ProgressUpdate) {
    this.observationBuffer.push({
      company_id: job.company_id, job_id: job.id, event_type: 'observation',
      step: update.step, status: update.status, message: update.message,
      details: { ...update.details, observedAt: new Date().toISOString() },
    });
    void this.flushObservations();
  }

  async flushObservations(): Promise<void> {
    if (this.observationFlush) return this.observationFlush;
    this.observationFlush = (async () => {
      while (this.observationBuffer.length) {
        const batch = this.observationBuffer.splice(0);
        try {
          const { error } = await this.client.from('taqadi_filing_job_events')
            .insert(batch).abortSignal(AbortSignal.timeout(5_000));
          if (error) throw error;
        } catch (error) {
          console.warn('[TaqadiAgent] observation telemetry unavailable:', error);
        }
      }
    })();
    try { await this.observationFlush; } finally { this.observationFlush = null; }
  }

  async update(jobId: string, update: ProgressUpdate) {
    await this.assertCanContinue(jobId);
    const progress = Math.max(this.progressByJob.get(jobId) || 0, update.progress);
    const { data, error } = await this.client.rpc(
      'update_taqadi_filing_job_v1',
      {
        p_job_id: jobId,
        p_worker_id: agentConfig.workerId,
        p_status: update.status,
        p_step: update.step,
        p_progress: progress,
        p_message: update.message,
        p_details: update.details || {},
        p_error_code: update.errorCode || null,
        p_error_message: update.errorMessage || null,
      },
    );
    if (error) throw error;
    this.progressByJob.set(jobId, progress);
    return data as FilingJob;
  }

  async checkControl(jobId: string, acknowledge = false) {
    const { data, error } = await this.client.rpc('check_taqadi_filing_control_v1', {
      p_job_id: jobId, p_worker_id: agentConfig.workerId, p_acknowledge: acknowledge,
    }).abortSignal(AbortSignal.timeout(5_000));
    if (error) throw error;
    if (typeof data?.stopRequested !== 'boolean') throw new Error('Worker control state was not confirmed');
    return data as { stopRequested: boolean; status: FilingStatus; acknowledged?: boolean };
  }

  async assertCanContinue(jobId: string) {
    const control = await this.checkControl(jobId);
    if (control.stopRequested) throw new ManualStopRequestedError();
    if (['filed', 'cancelled', 'needs_human', 'failed'].includes(control.status)) {
      throw new Error('Filing job is no longer running');
    }
  }

  async validateBeforePortal(job: FilingJob) {
    if (!hasKnownTaqadiNationality(job.payload.defendant?.nationality)) {
      throw new HumanInterventionError(DEFENDANT_NATIONALITY_REQUIRED_MESSAGE,
        'DEFENDANT_NATIONALITY_REQUIRED', {
          field: 'defendant.nationality', resumeSupported: true,
          requiredActions: [DEFENDANT_NATIONALITY_REQUIRED_MESSAGE],
        });
    }
    const args = { p_company_id: job.company_id, p_contract_id: job.contract_id };
    const validation = await this.client.rpc('validate_taqadi_filing_payload_v1', {
      ...args, p_payload: job.payload,
    });
    if (validation.error) {
      throw new HumanInterventionError(
        `تعذر فحص حزمة الدعوى قبل فتح تقاضي: ${workerErrorDetails(validation.error).message}`,
        'FILING_PREFLIGHT_FAILED', { error: workerErrorDetails(validation.error), resumeSupported: true },
      );
    }
    if (validation.data?.ready !== true) {
      throw new HumanInterventionError(
        'حزمة الدعوى المحفوظة تحتاج تحديثاً؛ راجع المستندات وأعد تجهيز الحزمة قبل متابعة تقاضي.',
        'FILING_PACKAGE_INVALID', { missing: validation.data?.missing || [], resumeSupported: true },
      );
    }
    // The server defaults to the current Qatar business date. Recheck at final
    // approval as well: early validation cannot authorize a later stale claim.
    const claim = await this.client.rpc('calculate_legal_claim_amount_v1', args);
    if (claim.error) {
      throw new HumanInterventionError(
        `تعذر مطابقة مبلغ الدعوى قبل فتح تقاضي: ${workerErrorDetails(claim.error).message}`,
        'FILING_PREFLIGHT_FAILED', { error: workerErrorDetails(claim.error), resumeSupported: true },
      );
    }
    const currentAmount = typeof claim.data === 'number' ? claim.data : Number.NaN;
    const packageAmount = job.payload.case.amount;
    if (!Number.isFinite(currentAmount) || !Number.isFinite(packageAmount)
      || currentAmount <= 0 || Math.abs(currentAmount - packageAmount) > 0.009) {
      throw new HumanInterventionError(
        'مبلغ الحزمة لا يطابق المطالبة الحالية في النظام؛ حدّث الحزمة قبل بدء إجراءات تقاضي.',
        'FILING_CLAIM_CHANGED', { packageAmount, currentAmount: Number.isFinite(currentAmount) ? currentAmount : null, resumeSupported: true },
      );
    }
  }

  async approveReviewedLegalFile(
    job: FilingJob,
    reviewDetails: Record<string, unknown>,
  ) {
    await this.flushObservations();
    const { data, error } = await this.client.rpc(
      'approve_taqadi_reviewed_legal_file_v1',
      {
        p_job_id: job.id,
        p_worker_id: agentConfig.workerId,
        p_review_details: reviewDetails,
      },
    );
    if (error) {
      throw new HumanInterventionError(
        `تعذر اعتماد الملف القانوني داخل النظام قبل إرساله إلى تقاضي: ${workerErrorDetails(error).message}`,
        'LEGAL_FILE_APPROVAL_FAILED',
        { operation: 'approve_taqadi_reviewed_legal_file_v1', error: workerErrorDetails(error), resumeSupported: true },
      );
    }
    if (data?.approved !== true || data.jobId !== job.id
      || data.memoSnapshotId !== job.payload.memoSnapshotId) {
      throw new HumanInterventionError(
        'لم يؤكد النظام اعتماد نسخة المذكرة الخاصة بهذه الدعوى؛ توقف الإرسال قبل الضغط على اعتماد.',
        'LEGAL_FILE_APPROVAL_NOT_CONFIRMED',
        { operation: 'approve_taqadi_reviewed_legal_file_v1', resumeSupported: true },
      );
    }
    return data as Record<string, unknown>;
  }

  async refundLoginAttempt(job: FilingJob) {
    if (job.attempt_count <= 0) return false;

    const nextAttemptCount = job.attempt_count - 1;
    const { data, error } = await this.client
      .from('taqadi_filing_jobs')
      .update({
        attempt_count: nextAttemptCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('company_id', job.company_id)
      .eq('status', 'needs_human')
      .eq('current_step', 'login_required')
      .eq('error_code', 'LOGIN_REQUIRED')
      .eq('locked_by', agentConfig.workerId)
      .eq('attempt_count', job.attempt_count)
      .is('result', null)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return false;

    const { error: eventError } = await this.client
      .from('taqadi_filing_job_events')
      .insert({
        company_id: job.company_id,
        job_id: job.id,
        event_type: 'attempt_refunded',
        step: 'login_required',
        status: 'needs_human',
        message: 'لم تُحتسب مهلة تسجيل الدخول كمحاولة رفع للدعوى.',
        details: {
          previousAttemptCount: job.attempt_count,
          attemptCount: nextAttemptCount,
          reason: 'LOGIN_REQUIRED_BEFORE_CASE_DRAFT',
        },
      });
    if (eventError) throw eventError;
    return true;
  }

  // Canary jobs stop on the parties page by design; they end as `cancelled`
  // so they can never be confused with a real filed lawsuit.
  async completeCanary(job: FilingJob) {
    const completedAt = new Date().toISOString();
    const { error } = await this.client
      .from('taqadi_filing_jobs')
      .update({
        status: 'cancelled',
        current_step: 'canary_passed',
        progress: 100,
        result: { canary: true, passed: true, completedAt },
        error_code: null,
        error_message: null,
        locked_by: null,
        locked_at: null,
        heartbeat_at: null,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', job.id)
      .eq('locked_by', agentConfig.workerId);
    if (error) throw error;

    const { error: eventError } = await this.client
      .from('taqadi_filing_job_events')
      .insert({
        company_id: job.company_id,
        job_id: job.id,
        event_type: 'canary_passed',
        step: 'canary_passed',
        status: 'cancelled',
        message:
          'نجح فحص الكناري اليومي: بوابة تقاضي تعمل حتى صفحة الأطراف دون أي اعتماد.',
        details: { canary: true },
      });
    if (eventError) throw eventError;
  }

  async markReceiptSyncPending(receipt: SavedReceipt, message?: string) {
    // Conditional write: a lost completion response or a lock conflict must
    // never regress a filed case or a job already handed to an operator.
    const { error } = await this.client.from('taqadi_filing_jobs').update({
      current_step: 'receipt_sync_pending', progress: 99,
      error_code: 'RECEIPT_SYNC_PENDING',
      error_message: message || 'تم الإيداع في تقاضي — تحديث النظام قيد الاستكمال',
      updated_at: new Date().toISOString(),
    }).eq('id', receipt.jobId).eq('company_id', receipt.companyId)
      .eq('locked_by', agentConfig.workerId).eq('status', 'submitting')
      .abortSignal(AbortSignal.timeout(5_000));
    if (error) throw error;
  }

  async complete(jobId: string, result: FilingResult, receipt?: SavedReceipt) {
    await this.flushObservations();
    const { data, error } = await this.client.rpc(
      'complete_taqadi_filing_job_v1',
      {
        p_job_id: jobId,
        p_worker_id: agentConfig.workerId,
        p_case_number: result.caseNumber,
        p_reference_number: result.referenceNumber,
        p_court_fees: result.courtFees,
        p_result: {
          ...result,
          ...(receipt ? {
            receiptCapturedAt: receipt.capturedAt,
            sourceContext: {
              companyId: receipt.companyId,
              legalCaseId: receipt.legalCaseId,
              contractId: receipt.contractId,
              memoSnapshotId: receipt.memoSnapshotId,
              payloadHash: receipt.payloadHash,
            },
          } : {}),
        },
      },
    ).abortSignal(AbortSignal.timeout(15_000));
    if (error) throw error;
    if (!data || data.status !== 'filed') throw new Error('Completion response did not confirm filing');
    return data as FilingJob;
  }

  async uploadArtifact(input: {
    job: FilingJob;
    filePath: string;
    fileName: string;
    artifactType:
      | 'screenshot'
      | 'receipt'
      | 'submission_summary'
      | 'error_snapshot'
      | 'trace'
      | 'heal_proposal';
    mimeType: string;
    metadata?: Record<string, unknown>;
  }) {
    const storagePath = `${input.job.company_id}/${input.job.id}/${input.fileName}`;
    const file = await import('node:fs/promises').then((fs) =>
      fs.readFile(input.filePath),
    );
    const { error: uploadError } = await this.client.storage
      .from('taqadi-automation-artifacts')
      .upload(storagePath, file, {
        contentType: input.mimeType,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { error: recordError } = await this.client
      .from('taqadi_filing_artifacts')
      .insert({
        company_id: input.job.company_id,
        job_id: input.job.id,
        artifact_type: input.artifactType,
        storage_path: storagePath,
        file_name: input.fileName,
        mime_type: input.mimeType,
        metadata: input.metadata || {},
      });
    if (recordError) throw recordError;
  }
}
