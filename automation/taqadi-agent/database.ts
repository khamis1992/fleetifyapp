import { createClient } from '@supabase/supabase-js';
import { agentConfig } from './config';
import type {
  FilingJob,
  FilingResult,
  ProgressUpdate,
} from './types';

export class TaqadiQueue {
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

  async claimNext(): Promise<FilingJob | null> {
    const { data, error } = await this.client.rpc(
      'claim_next_taqadi_filing_job_v1',
      {
        p_worker_id: agentConfig.workerId,
        p_worker_version: agentConfig.version,
      },
    );
    if (error) throw error;
    return data as FilingJob | null;
  }

  async update(jobId: string, update: ProgressUpdate) {
    const { data, error } = await this.client.rpc(
      'update_taqadi_filing_job_v1',
      {
        p_job_id: jobId,
        p_worker_id: agentConfig.workerId,
        p_status: update.status,
        p_step: update.step,
        p_progress: update.progress,
        p_message: update.message,
        p_details: update.details || {},
        p_error_code: update.errorCode || null,
        p_error_message: update.errorMessage || null,
      },
    );
    if (error) throw error;
    return data as FilingJob;
  }

  async complete(jobId: string, result: FilingResult) {
    const { data, error } = await this.client.rpc(
      'complete_taqadi_filing_job_v1',
      {
        p_job_id: jobId,
        p_worker_id: agentConfig.workerId,
        p_case_number: result.caseNumber,
        p_reference_number: result.referenceNumber,
        p_court_fees: result.courtFees,
        p_result: result,
      },
    );
    if (error) throw error;
    return data as FilingJob;
  }

  async uploadArtifact(input: {
    job: FilingJob;
    filePath: string;
    fileName: string;
    artifactType: 'screenshot' | 'receipt' | 'submission_summary' | 'error_snapshot';
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
