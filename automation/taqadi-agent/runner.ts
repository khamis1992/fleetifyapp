import fs from 'node:fs/promises';
import path from 'node:path';
import {
  chromium,
  type BrowserContext,
  type Page,
} from 'playwright';
import { agentConfig } from './config';
import { TaqadiQueue } from './database';
import { materializeFilingDocuments } from './document-materializer';
import { TaqadiPortal } from './taqadi-page';
import type { FilingJob } from './types';
import {
  HumanInterventionError,
  SubmissionUncertainError,
} from './types';

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const MAX_PORTAL_ATTEMPTS = 5;

export interface WorkerRuntimeState {
  status: 'idle' | 'busy' | 'waiting_login' | 'error' | 'offline';
  currentJobId: string | null;
  lastError: string | null;
  startedAt: string;
}

export class TaqadiWorker {
  private readonly queue = new TaqadiQueue();
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private stopping = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  readonly runtime: WorkerRuntimeState = {
    status: 'offline',
    currentJobId: null,
    lastError: null,
    startedAt: new Date().toISOString(),
  };

  async start() {
    await fs.mkdir(agentConfig.jobsDir, { recursive: true });
    await fs.mkdir(agentConfig.chromeProfileDir, { recursive: true });

    this.runtime.status = 'idle';
    await this.queue.heartbeat('idle', null, this.runtimeMetadata());
    this.heartbeatTimer = setInterval(() => {
      void this.queue
        .heartbeat(
          this.runtime.status,
          this.runtime.currentJobId,
          this.runtimeMetadata(),
        )
        .catch((error) => {
          console.error('[TaqadiAgent] heartbeat failed:', error);
        });
    }, 15_000);

    console.log(
      `[TaqadiAgent] worker ${agentConfig.workerId} is ready; polling every ${agentConfig.pollIntervalMs}ms`,
    );

    while (!this.stopping) {
      try {
        const job = await this.queue.claimNext();
        if (!job) {
          this.setRuntime('idle', null, null);
          await sleep(agentConfig.pollIntervalMs);
          continue;
        }

        this.setRuntime('busy', job.id, null);
        await this.process(job);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.setRuntime('error', null, message);
        console.error('[TaqadiAgent] worker loop failed:', error);
        await sleep(Math.max(agentConfig.pollIntervalMs, 5_000));
      }
    }
  }

  async stop() {
    this.stopping = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    await this.context?.close().catch(() => undefined);
    this.context = null;
    this.page = null;
    this.setRuntime('offline', null, null);
    await this.queue
      .heartbeat('offline', null, this.runtimeMetadata())
      .catch(() => undefined);
  }

  private setRuntime(
    status: WorkerRuntimeState['status'],
    currentJobId: string | null,
    lastError: string | null,
  ) {
    this.runtime.status = status;
    this.runtime.currentJobId = currentJobId;
    this.runtime.lastError = lastError;
  }

  private runtimeMetadata() {
    return {
      startedAt: this.runtime.startedAt,
      portalUrl: agentConfig.portalUrl,
      headless: agentConfig.headless,
      finalApproval: agentConfig.finalApproval,
    };
  }

  private async getPage() {
    if (!this.context) {
      this.context = await chromium.launchPersistentContext(
        agentConfig.chromeProfileDir,
        {
          headless: agentConfig.headless,
          channel: 'chrome',
          locale: 'ar-QA',
          viewport: null,
          args: ['--start-maximized'],
          acceptDownloads: true,
        },
      );
      this.context.setDefaultTimeout(agentConfig.actionTimeoutMs);
      this.context.on('page', (page) => {
        this.page = page;
      });
    }

    const pages = this.context.pages();
    this.page = this.page && !this.page.isClosed()
      ? this.page
      : pages[0] || await this.context.newPage();
    return this.page;
  }

  private async screenshot(job: FilingJob, name: string) {
    if (!this.page || this.page.isClosed()) return null;
    const directory = path.join(agentConfig.jobsDir, job.id, 'artifacts');
    await fs.mkdir(directory, { recursive: true });
    const fileName = `${Date.now()}-${name}.png`;
    const filePath = path.join(directory, fileName);
    await this.page.screenshot({ path: filePath, fullPage: true });
    return { fileName, filePath };
  }

  private async uploadScreenshot(
    job: FilingJob,
    name: string,
    artifactType: 'screenshot' | 'receipt' | 'error_snapshot',
  ) {
    const screenshot = await this.screenshot(job, name);
    if (!screenshot) return;
    await this.queue.uploadArtifact({
      job,
      filePath: screenshot.filePath,
      fileName: screenshot.fileName,
      artifactType,
      mimeType: 'image/png',
    });
  }

  private async process(job: FilingJob, portalAttempt = 1) {
    let submissionStarted = false;
    try {
      await this.queue.update(job.id, {
        status: 'validating',
        step: 'materialize_documents',
        progress: 5,
        message: 'جاري تحويل حزمة الدعوى إلى ملفات PDF قابلة للرفع',
      });
      const documents = await materializeFilingDocuments(job);

      await this.queue.update(job.id, {
        status: 'validating',
        step: 'open_browser',
        progress: 12,
        message: `تم تجهيز ${documents.length} مستند وفتح متصفح تقاضي`,
      });
      const page = await this.getPage();
      const portal = new TaqadiPortal(page);

      await portal.ensureAuthenticated(async () => {
        this.setRuntime('waiting_login', job.id, null);
        await this.queue.update(job.id, {
          status: 'waiting_login',
          step: 'login',
          progress: 15,
          message: 'بانتظار تسجيل الدخول كمتقاضٍ فرد في نافذة Chrome',
        });
      });
      this.setRuntime('busy', job.id, null);

      await this.queue.update(job.id, {
        status: 'filling_case',
        step: 'classification',
        progress: 22,
        message: 'جاري إنشاء الدعوى واختيار تصنيفها',
      });
      await portal.openNewCase();
      await portal.configureCase(job.payload);

      await this.queue.update(job.id, {
        status: 'filling_case',
        step: 'case_details',
        progress: 36,
        message: 'جاري إدخال الوقائع والطلبات وقيمة المطالبة',
      });
      await portal.fillCaseDetails(job.payload);

      await this.queue.update(job.id, {
        status: 'validating_parties',
        step: 'representative_first',
        progress: 48,
        message: `جاري مراجعة ${agentConfig.representative.name} وحفظه أولًا`,
      });
      await portal.validateRepresentativeFirst(job.payload);

      await this.queue.update(job.id, {
        status: 'validating_parties',
        step: 'company_and_defendant',
        progress: 58,
        message: 'جاري تثبيت ترتيب الشركة وإضافة بيانات المدعى عليه',
      });
      await portal.validateCompanyParty(job.payload);
      await portal.addDefendant(job.payload);

      await this.queue.update(job.id, {
        status: 'uploading_documents',
        step: 'documents',
        progress: 68,
        message: `جاري رفع ${documents.length} مستند إلى تقاضي`,
        details: { documentCount: documents.length },
      });
      await portal.uploadDocuments(documents);

      await this.queue.update(job.id, {
        status: 'reviewing',
        step: 'final_review',
        progress: 86,
        message: 'جاري مطابقة شاشة المراجعة مع حزمة Fleetify',
      });
      await portal.verifyReview(job.payload);
      await this.uploadScreenshot(job, 'final-review', 'screenshot')
        .catch((error) => {
          console.warn('[TaqadiAgent] review screenshot failed:', error);
        });

      if (
        !agentConfig.finalApproval
        || !job.final_approval
        || !job.payload.finalApproval
      ) {
        throw new HumanInterventionError(
          'الحزمة جاهزة لكن الاعتماد النهائي التلقائي غير مفعّل',
          'FINAL_APPROVAL_DISABLED',
        );
      }

      const result = await portal.submitFinal(async () => {
        submissionStarted = true;
        await this.queue.update(job.id, {
          status: 'submitting',
          step: 'final_approval',
          progress: 95,
          message: 'جاري الاعتماد النهائي في تقاضي',
        });
      });

      await this.uploadScreenshot(job, 'filing-receipt', 'receipt')
        .catch((error) => {
          console.warn('[TaqadiAgent] receipt screenshot failed:', error);
        });
      await this.queue.complete(job.id, result);
      this.setRuntime('idle', null, null);
      console.log(
        `[TaqadiAgent] filed job ${job.id}: ${result.referenceNumber || result.caseNumber}`,
      );
    } catch (error) {
      const emptyRemoteOptionList = error instanceof HumanInterventionError
        && error.code === 'TAQADI_OPTION_MISSING'
        && Array.isArray(error.details.availableOptions)
        && error.details.availableOptions.length === 0;
      const retryablePortalError = !submissionStarted
        && error instanceof HumanInterventionError
        && (
          [
            'PARTY_EDITOR_NOT_OPENED',
            'CASE_CLASSIFICATION_VALIDATION_FAILED',
            'TAQADI_OPTION_UNSTABLE',
            'TAQADI_UI_CHANGED',
          ].includes(error.code)
          || emptyRemoteOptionList
        );
      if (retryablePortalError && portalAttempt < MAX_PORTAL_ATTEMPTS) {
        const nextAttempt = portalAttempt + 1;
        const retryDelayMs = Math.min(
          20_000,
          4_000 + (portalAttempt * 3_000),
        );
        await this.queue.update(job.id, {
          status: 'filling_case',
          step: 'portal_retry',
          progress: 12,
          message: `رفض موقع تقاضي الطلب مؤقتًا؛ ستبدأ العملية من جديد تلقائيًا (المحاولة ${nextAttempt} من ${MAX_PORTAL_ATTEMPTS})`,
          details: {
            previousErrorCode: error.code,
            previousErrorMessage: error.message,
            previousErrorDetails: error.details,
            portalAttempt,
            retryDelayMs,
          },
        });
        if (this.context) {
          const pages = this.context.pages();
          const primaryPage = pages[0] || await this.context.newPage();
          await Promise.all(
            pages.slice(1).map((page) => page.close().catch(() => undefined)),
          );
          this.page = primaryPage;
          await primaryPage.goto(agentConfig.portalUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
          }).catch(() => undefined);
        }
        await sleep(retryDelayMs);
        return this.process(job, nextAttempt);
      }

      const screenshot = await this.screenshot(job, 'error').catch(() => null);
      if (screenshot) {
        await this.queue.uploadArtifact({
          job,
          filePath: screenshot.filePath,
          fileName: screenshot.fileName,
          artifactType: 'error_snapshot',
          mimeType: 'image/png',
        }).catch(() => undefined);
      }

      const uncertain = submissionStarted
        && !(error instanceof SubmissionUncertainError);
      const normalized = uncertain
        ? new SubmissionUncertainError(
            'حدث خطأ بعد بدء الاعتماد. يجب التحقق من تقاضي قبل أي إعادة للمحاولة.',
            { cause: error instanceof Error ? error.message : String(error) },
          )
        : error;

      if (normalized instanceof HumanInterventionError) {
        this.setRuntime('error', null, normalized.message);
        await this.queue.update(job.id, {
          status: 'needs_human',
          step: normalized.code.toLowerCase(),
          progress: submissionStarted ? 96 : Math.max(job.progress, 10),
          message: normalized.message,
          details: normalized.details,
          errorCode: normalized.code,
          errorMessage: normalized.message,
        });
        return;
      }

      const message = normalized instanceof Error
        ? normalized.message
        : String(normalized);
      this.setRuntime('error', null, message);
      await this.queue.update(job.id, {
        status: 'failed',
        step: 'worker_error',
        progress: Math.max(job.progress, 5),
        message: 'فشل تنفيذ عملية الرفع قبل الاعتماد النهائي',
        errorCode: 'WORKER_ERROR',
        errorMessage: message,
      });
    }
  }
}
