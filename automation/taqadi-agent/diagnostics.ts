import fs from 'node:fs/promises';
import path from 'node:path';
import type { BrowserContext, Page } from 'playwright';
import { agentConfig } from './config';
import type { FilingJob } from './types';

export interface SavedTrace {
  fileName: string;
  filePath: string;
}

export interface HealProposal {
  fileName: string;
  filePath: string;
  capturedAt: string;
  url: string | null;
  step: string;
  errorMessage: string;
  ariaSnapshot: string | null;
}

const artifactsDir = (job: FilingJob) =>
  path.join(agentConfig.jobsDir, job.id, 'artifacts');

export class JobDiagnostics {
  private tracingContext: BrowserContext | null = null;

  async startTracing(context: BrowserContext, job: FilingJob) {
    if (this.tracingContext === context) return;
    await this.discardTracing();
    await context.tracing.start({
      screenshots: agentConfig.traceSnapshots,
      snapshots: agentConfig.traceSnapshots,
      title: `taqadi-${job.id}`,
    });
    this.tracingContext = context;
  }

  async discardTracing() {
    const context = this.tracingContext;
    this.tracingContext = null;
    if (!context) return;
    await context.tracing.stop().catch(() => undefined);
  }

  async saveTracing(job: FilingJob): Promise<SavedTrace | null> {
    const context = this.tracingContext;
    this.tracingContext = null;
    if (!context) return null;
    const directory = artifactsDir(job);
    await fs.mkdir(directory, { recursive: true });
    const fileName = `${Date.now()}-trace.zip`;
    const filePath = path.join(directory, fileName);
    try {
      await context.tracing.stop({ path: filePath });
      return { fileName, filePath };
    } catch {
      return null;
    }
  }

  forgetContext(context: BrowserContext) {
    if (this.tracingContext === context) this.tracingContext = null;
  }
}

// Groundwork for propose-mode selector healing: whenever the portal flow
// fails, we persist what the worker was looking at (URL + accessibility tree)
// so a reviewer — or a future LLM healer — can propose an updated locator
// without re-running the filing.
export async function captureHealProposal(
  page: Page | null,
  job: FilingJob,
  input: { step: string; errorMessage: string },
): Promise<HealProposal | null> {
  if (!page || page.isClosed()) return null;
  const capturedAt = new Date().toISOString();
  const ariaSnapshot = await page
    .locator('body')
    .ariaSnapshot({ timeout: 5_000 })
    .catch(() => null);
  const url = page.url() || null;
  if (!ariaSnapshot && !url) return null;

  const directory = artifactsDir(job);
  await fs.mkdir(directory, { recursive: true });
  const fileName = `${Date.now()}-heal-proposal.json`;
  const filePath = path.join(directory, fileName);
  const proposal: HealProposal = {
    fileName,
    filePath,
    capturedAt,
    url,
    step: input.step,
    errorMessage: input.errorMessage,
    ariaSnapshot,
  };
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        schemaVersion: '1.0',
        jobId: job.id,
        legalCaseId: job.legal_case_id,
        capturedAt,
        url,
        step: input.step,
        errorMessage: input.errorMessage,
        ariaSnapshot,
      },
      null,
      2,
    ),
    'utf8',
  );
  return proposal;
}
