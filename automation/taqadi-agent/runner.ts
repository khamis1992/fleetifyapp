import fs from 'node:fs/promises';
import path from 'node:path';
import {
  chromium,
  type BrowserContext,
  type Page,
} from 'playwright';
import {
  installEvaluationRuntime,
  isClosedBrowserError,
} from './browser-lifecycle';
import { planPortalAction, stageOrderIndex } from './adaptive-flow';
import { agentConfig } from './config';
import { TaqadiQueue } from './database';
import { captureHealProposal, JobDiagnostics } from './diagnostics';
import { materializeFilingDocuments } from './document-materializer';
import {
  processTaqadiParties,
  type PartyWorkflowPhase,
} from './party-workflow';
import {
  shouldRefundClaimAttempt,
  shouldRestartPortalFlow,
} from './retry-policy';
import {
  proposeSelectorHeal,
  type HealSuggestion,
} from './selector-healer';
import {
  addSessionOverride,
  clearSessionOverrides,
} from './selector-overrides';
import { observeTaqadiPage } from './portal-observer';
import {
  shouldAutoApplyHeal,
  verifySuggestionAgainstObservation,
} from './verified-healer';
import {
  navigationAdvisorEnabled,
  proposeNavigationAction,
  shouldFollowAdvisor,
  verifyNavigationTarget,
} from './navigation-advisor';
import { TaqadiPortal } from './taqadi-page';
import {
  HumanInterventionError,
  SubmissionUncertainError,
  type FilingJob,
} from './types';

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const MAX_PORTAL_ATTEMPTS = 5;

// Auto-heal retries per job: a verified session override gets exactly one
// chance to prove itself; a second failure goes back to the human flow.
const MAX_AUTO_HEAL_ATTEMPTS = 1;

export interface WorkerRuntimeState {
  status: 'idle' | 'busy' | 'waiting_login' | 'error' | 'offline';
  currentJobId: string | null;
  lastError: string | null;
  startedAt: string;
}

export class TaqadiWorker {
  private readonly queue = new TaqadiQueue();
  private readonly diagnostics = new JobDiagnostics();
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly trackedPages = new WeakSet<Page>();
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

    await this.queue.recoverInterruptedJobs().then((recovery) => {
      if (recovery.requeued > 0 || recovery.needsHuman > 0) {
        console.log(
          '[TaqadiAgent] restart recovery:',
          JSON.stringify(recovery),
        );
      }
    }).catch((error) => {
      console.warn(
        '[TaqadiAgent] restart recovery is unavailable; continuing:',
        error,
      );
    });

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
    await this.diagnostics.discardTracing();
    const context = this.context;
    this.context = null;
    this.page = null;
    await context?.close().catch(() => undefined);
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

  private forgetBrowserContext(context: BrowserContext) {
    this.diagnostics.forgetContext(context);
    if (this.context !== context) return;
    this.context = null;
    this.page = null;
  }

  private trackPage(context: BrowserContext, page: Page) {
    if (this.context !== context) return;
    this.page = page;
    if (this.trackedPages.has(page)) return;
    this.trackedPages.add(page);
    page.on('close', () => {
      if (this.page === page) this.page = null;
    });
  }

  private browserContextIsConnected(context: BrowserContext) {
    try {
      const browser = context.browser();
      return browser === null || browser.isConnected();
    } catch {
      return false;
    }
  }

  private async launchBrowserContext() {
    const context = await chromium.launchPersistentContext(
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
    this.context = context;
    this.page = null;
    context.setDefaultTimeout(agentConfig.actionTimeoutMs);
    context.on('page', (page) => this.trackPage(context, page));
    context.on('close', () => this.forgetBrowserContext(context));
    return context;
  }

  private async getPage(): Promise<Page> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let context = this.context;
      if (context && !this.browserContextIsConnected(context)) {
        this.forgetBrowserContext(context);
        await context.close().catch(() => undefined);
        context = null;
      }
      context ||= await this.launchBrowserContext();

      try {
        const currentPage = this.page && !this.page.isClosed()
          ? this.page
          : context.pages().find((page) => !page.isClosed())
            || await context.newPage();
        this.trackPage(context, currentPage);
        await installEvaluationRuntime(context, currentPage);
        return currentPage;
      } catch (error) {
        if (!isClosedBrowserError(error) || attempt > 0) throw error;
        console.warn(
          '[TaqadiAgent] Chrome was closed; opening a fresh browser session',
        );
        this.forgetBrowserContext(context);
        await context.close().catch(() => undefined);
      }
    }

    throw new Error('Unable to open the Taqadi browser session');
  }

  private async prepareBrowserForPortalRetry() {
    const context = this.context;
    const page = this.page;
    if (
      !context
      || !this.browserContextIsConnected(context)
      || !page
      || page.isClosed()
    ) return;

    await page.bringToFront().catch(() => undefined);
    const homeUrl = new URL('/itc/home', agentConfig.portalUrl).toString();
    await page.goto(homeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    }).catch(async (error) => {
      console.warn(
        '[TaqadiAgent] could not return the existing tab to the portal home before retry:',
        error,
      );
      await page.reload({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      }).catch(() => undefined);
    });
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

  private async uploadTraceArtifact(job: FilingJob) {
    const trace = await this.diagnostics.saveTracing(job).catch(() => null);
    if (!trace) return;
    await this.queue.uploadArtifact({
      job,
      filePath: trace.filePath,
      fileName: trace.fileName,
      artifactType: 'trace',
      mimeType: 'application/zip',
    }).catch((error) => {
      console.warn('[TaqadiAgent] trace upload failed:', error);
    });
  }

  private async uploadHealProposal(
    job: FilingJob,
    step: string,
    errorMessage: string,
    lookup?: { expectedLabels: string[]; expectedControlIds: string[] },
  ): Promise<HealSuggestion | null> {
    const proposal = await captureHealProposal(this.page, job, {
      step,
      errorMessage,
    }).catch(() => null);
    if (!proposal) return null;

    // The suggestion is stored for operator review. It is additionally
    // eligible for in-session auto-application, but only through
    // tryAutoApplyHeal's deterministic verification (Level 2).
    let suggestion: HealSuggestion | null = null;
    if (lookup && proposal.ariaSnapshot) {
      suggestion = await proposeSelectorHeal({
        step,
        errorMessage,
        url: proposal.url,
        expectedLabels: lookup.expectedLabels,
        expectedControlIds: lookup.expectedControlIds,
        ariaSnapshot: proposal.ariaSnapshot,
      });
    }

    await this.queue.uploadArtifact({
      job,
      filePath: proposal.filePath,
      fileName: proposal.fileName,
      artifactType: 'heal_proposal',
      mimeType: 'application/json',
      metadata: {
        step,
        url: proposal.url,
        capturedAt: proposal.capturedAt,
        healSuggestion: suggestion,
      },
    }).catch((error) => {
      console.warn('[TaqadiAgent] heal proposal upload failed:', error);
    });
    return suggestion;
  }

  /**
   * المستوى الثاني — تطبيق شفاء مؤقت بعد تحقق حتمي.
   * يُقيَّم الاقتراح مقابل ملاحظة حيّة للصفحة (وليس الثقة وحدها)، ويُسجَّل
   * كـ session override لا يُكتب على القرص ولا يتجاوز المهمة الحالية.
   */
  private async tryAutoApplyHeal(
    job: FilingJob,
    suggestion: HealSuggestion,
  ): Promise<boolean> {
    if (!this.page || !suggestion.overridesEntry) return false;
    const observation = await observeTaqadiPage(this.page, job.payload)
      .catch(() => null);
    if (!observation) return false;

    const verification = verifySuggestionAgainstObservation(
      suggestion,
      observation,
    );
    if (!shouldAutoApplyHeal(suggestion, verification)) {
      await this.queue.update(job.id, {
        status: 'validating',
        step: 'auto_heal_rejected',
        progress: Math.max(job.progress, 10),
        message: 'اقتراح الشفاء الذكي لم يجتز التحقق الآلي؛ بقي للمراجعة البشرية',
        details: { suggestion, verification, resumeSupported: true },
      }).catch(() => undefined);
      return false;
    }

    for (const [label, entry] of Object.entries(suggestion.overridesEntry)) {
      addSessionOverride(label, entry);
    }
    await this.queue.update(job.id, {
      status: 'validating',
      step: 'auto_heal_applied',
      progress: Math.max(job.progress, 10),
      message: `طبّق الوكيل إصلاحًا مؤقتًا متحققًا منه وسيستأنف: ${verification.reason}`,
      details: {
        suggestion,
        verification,
        sessionOnly: true,
        resumeSupported: true,
      },
    }).catch(() => undefined);
    console.log(
      `[TaqadiAgent] auto-heal applied for job ${job.id}: ${verification.reason}`,
    );
    return true;
  }

  /**
   * المستوى الثاني — مستشار التوجيه عند الصفحات غير المعروفة.
   * يسمح بنقرة واحدة على زر/رابط ظاهر اجتاز: تطابقًا حرفيًا مع النص المرئي،
   * قائمة الأفعال المحظورة، وثقة high من النموذج — ثم تعيد الحلقة التكيفية
   * تقييم الموقع من جديد.
   */
  private async tryAdvisorNavigation(
    job: FilingJob,
    clicksUsed: number,
  ): Promise<boolean> {
    if (!this.page) return false;
    if (clicksUsed >= agentConfig.advisorMaxClicks) return false;
    if (!navigationAdvisorEnabled()) return false;

    const observation = await observeTaqadiPage(this.page, job.payload)
      .catch(() => null);
    if (!observation) return false;

    const proposal = await proposeNavigationAction({
      goalDescription:
        'العودة إلى مسودة الدعوى قيد الرفع (تصنيف الدعوى أو تفاصيلها أو أطرافها أو مستنداتها)، أو فتح صفحة إدارة القضايا للوصول إلى المسودة',
      observation,
    });
    if (!proposal) return false;

    const verification = verifyNavigationTarget(proposal, observation);
    if (!shouldFollowAdvisor(proposal, verification)) {
      await this.queue.update(job.id, {
        status: 'validating',
        step: 'advisor_rejected',
        progress: Math.max(job.progress, 18),
        message: 'رفض الوكيل اقتراح التوجيه الذكي (تحقق حتمي أو ثقة غير كافية)',
        details: { proposal, verification, resumeSupported: true },
      }).catch(() => undefined);
      return false;
    }

    const targetText = verification.targetText;
    const targetKind = verification.targetKind;
    if (!targetText || !targetKind) return false;
    const role = targetKind === 'button' ? 'button' : 'link';
    let target = this.page
      .getByRole(role, { name: targetText, exact: true })
      .first();
    if ((await target.count()) === 0) {
      target = this.page.getByText(targetText, { exact: true }).first();
    }
    if (
      (await target.count()) === 0
      || !(await target.isVisible().catch(() => false))
    ) {
      return false;
    }

    await this.queue.update(job.id, {
      status: 'validating',
      step: 'advisor_navigation',
      progress: Math.max(job.progress, 18),
      message: `استرشد الوكيل بالمساعد الذكي وانتقل عبر: ${targetText}`,
      details: {
        proposal,
        verification,
        advisorClick: clicksUsed + 1,
        resumeSupported: true,
      },
    }).catch(() => undefined);
    console.log(
      `[TaqadiAgent] advisor navigation for job ${job.id}: ${targetText}`,
    );
    await target.click();
    await this.page.waitForTimeout(1_200);
    return true;
  }

  private async process(
    job: FilingJob,
    portalAttempt = 1,
    autoHealAttempts = 0,
  ): Promise<void> {
    // Fresh pipelines start with a clean session-override slate; portal
    // retries reset the browser context, so their overrides are moot too.
    if (autoHealAttempts === 0) clearSessionOverrides();
    let submissionStarted = false;
    let caseDraftStarted = false;
    let portal: TaqadiPortal | null = null;
    const canary = job.payload.canary === true;
    try {
      await this.queue.update(job.id, {
        status: 'validating',
        step: 'materialize_documents',
        progress: 5,
        message: 'جاري تجهيز ملفات الدعوى، بما فيها نسختا PDF وWord من المذكرة',
      });
      const documents = await materializeFilingDocuments(job);

      await this.queue.update(job.id, {
        status: 'validating',
        step: 'open_browser',
        progress: 12,
        message: `تم تجهيز ${documents.length} مستند وفتح متصفح تقاضي`,
      });
      const page = await this.getPage();
      await this.diagnostics
        .startTracing(page.context(), job)
        .catch((error) => {
          console.warn('[TaqadiAgent] tracing unavailable:', error);
        });
      portal = new TaqadiPortal(page);

      await portal.ensureAuthenticated(async () => {
        this.setRuntime('waiting_login', job.id, null);
        const tawtheeqAutoLogin = Boolean(
          agentConfig.tawtheeq.username
          && agentConfig.tawtheeq.password,
        );
        await this.queue.update(job.id, {
          status: 'waiting_login',
          step: 'login',
          progress: 15,
          message: tawtheeqAutoLogin
            ? 'تم فتح توثيق وإدخال بيانات الدخول تلقائيًا؛ أكمل التحقق البشري عند ظهوره'
            : 'بانتظار تسجيل الدخول كمتقاضٍ فرد في نافذة Chrome',
          details: {
            tawtheeqAutoLogin,
          },
        });
      });
      this.setRuntime('busy', job.id, null);

      const updatePartyPhase = async (phase: PartyWorkflowPhase) => {
        if (phase === 'save_parties_draft') {
          await this.queue.update(job.id, {
            status: 'validating_parties',
            step: 'save_parties_draft',
            progress: 44,
            message: 'جاري حفظ مسودة الدعوى في صفحة الأطراف قبل تسجيل الأطراف',
          });
          return;
        }
        if (phase === 'company') {
          await this.queue.update(job.id, {
            status: 'validating_parties',
            step: 'company_party',
            progress: 48,
            message: 'جاري التحقق من بيانات شركة العراف وحفظها كمدعٍ بالترتيب الأول',
          });
          return;
        }
        if (phase === 'defendant') {
          await this.queue.update(job.id, {
            status: 'validating_parties',
            step: 'defendant_party',
            progress: 54,
            message: 'تم حفظ الشركة؛ جاري إضافة المدعى عليه والتحقق من بياناته',
          });
          return;
        }
        await this.queue.update(job.id, {
          status: 'validating_parties',
          step: 'representative_last',
          progress: 58,
          message: `تمت إضافة أطراف الدعوى؛ جاري الآن مراجعة ${agentConfig.representative.name} وحفظ بياناته`,
        });
      };
      const resumeRequested = job.current_step === 'resume_requested';
      // After an auto-heal retry the draft already exists in the portal —
      // re-entering through openNewCase would create a duplicate lawsuit
      // draft, so the adaptive loop re-orients from the live page instead.
      if (!resumeRequested && autoHealAttempts === 0) {
        caseDraftStarted = true;
        await this.queue.update(job.id, {
          status: 'filling_case',
          step: 'open_case',
          progress: 18,
          message: 'جاري فتح نموذج دعوى جديد والتحقق من الصفحة الناتجة',
        });
        await portal.openNewCase();
        await portal.waitForPortalStage(
          'case_classification',
          job.payload,
          'login',
        );
      }

      let reviewVerified = false;
      let advisorClicksUsed = 0;
      let highestVerifiedStageIndex = 0;
      for (let cycle = 1; cycle <= 8; cycle += 1) {
        let position = await portal.detectCurrentPosition(job.payload);
        // Anti-flap guard: the Taqadi wizard keeps earlier steps' hidden
        // controls in the DOM, so a mid-transition observation can score an
        // earlier stage right after a verified forward transition. Distrust a
        // backward jump once: wait for the page to settle and re-observe.
        if (
          stageOrderIndex(position.stage) >= 0
          && stageOrderIndex(position.stage) < highestVerifiedStageIndex
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1_800));
          const settled = await portal.detectCurrentPosition(job.payload);
          if (stageOrderIndex(settled.stage) >= highestVerifiedStageIndex) {
            position = settled;
          }
        }
        const plan = planPortalAction(position);
        caseDraftStarted = caseDraftStarted
          || !['login', 'home', 'case_classification', 'unknown']
            .includes(position.stage);

        await this.queue.update(job.id, {
          status: 'validating',
          step: 'observe_portal',
          progress: Math.max(job.progress, 18),
          message: `تم فهم صفحة تقاضي الحالية: ${position.label}`,
          details: {
            cycle,
            portalStage: position.stage,
            portalLabel: position.label,
            portalConfidence: position.confidence,
            portalScore: position.score,
            evidence: position.evidence,
            candidates: position.candidates,
            plannedAction: plan.action,
            expectedStage: plan.expectedStage,
            validationMessages: position.validationMessages,
            url: position.url,
            resumeSupported: true,
          },
        });

        if (!plan.safeToRun && position.stage === 'unknown') {
          // المستوى الثاني: قبل طلب التدخل البشري، جرّب مستشار التوجيه —
          // نقرة واحدة متحقق منها قد تعيدنا إلى مسار المسودة.
          const followed = await this.tryAdvisorNavigation(
            job,
            advisorClicksUsed,
          );
          if (followed) {
            advisorClicksUsed += 1;
            continue;
          }
        }

        if (!plan.safeToRun) {
          throw new HumanInterventionError(
            position.stage === 'login'
              ? 'سجّل الدخول إلى تقاضي وافتح مسودة الدعوى ثم اضغط «متابعة من تقاضي»'
              : 'لم يتمكن الوكيل من فهم صفحة تقاضي الحالية بدرجة ثقة آمنة',
            'PORTAL_POSITION_REQUIRED',
            {
              portalStage: position.stage,
              portalLabel: position.label,
              portalConfidence: position.confidence,
              portalScore: position.score,
              evidence: position.evidence,
              candidates: position.candidates,
              plannedAction: plan.action,
              reason: plan.reason,
              resumeSupported: true,
              requiredActions: position.stage === 'login'
                ? ['سجّل الدخول', 'افتح مسودة الدعوى الحالية']
                : ['اترك صفحة مسودة الدعوى المطلوبة مفتوحة ثم تابع من النظام'],
              validationMessages: position.validationMessages,
              url: position.url,
            },
          );
        }

        if (plan.action === 'open_new_case') {
          await this.queue.update(job.id, {
            status: 'filling_case',
            step: 'open_case',
            progress: 18,
            message: 'تم التعرف على الصفحة الرئيسية؛ جاري فتح نموذج الدعوى مباشرة',
            details: { resumedFromHome: resumeRequested || autoHealAttempts > 0 },
          });
          await portal.openNewCase();
          caseDraftStarted = true;
        } else if (plan.action === 'configure_case') {
          await this.queue.update(job.id, {
            status: 'filling_case',
            step: 'classification',
            progress: 22,
            message: 'جاري تعبئة تصنيف الدعوى والتحقق من الانتقال',
          });
          await portal.configureCase(job.payload);
        } else if (plan.action === 'fill_case_details') {
          await this.queue.update(job.id, {
            status: 'filling_case',
            step: 'case_details',
            progress: 36,
            message: 'جاري التحقق من الوقائع والطلبات وقيمة المطالبة وحفظها',
          });
          await portal.fillCaseDetails(job.payload);
        } else if (plan.action === 'process_parties') {
          await this.queue.update(job.id, {
            status: 'validating_parties',
            step: 'company_and_defendant',
            progress: 48,
            message: 'جاري مطابقة أطراف الدعوى المفتوحة دون إنشاء أطراف مكررة',
          });
          await processTaqadiParties(portal, job.payload, {
            stopAfterParties: agentConfig.stopAfterParties || canary,
            onPhase: updatePartyPhase,
          });
        } else if (plan.action === 'upload_documents') {
          await this.queue.update(job.id, {
            status: 'uploading_documents',
            step: 'documents',
            progress: 68,
            message: `جاري التحقق من ${documents.length} مستند ورفعها إلى تقاضي`,
            details: { documentCount: documents.length },
          });
          const documentUpload = await portal.uploadDocuments(documents);
          await this.queue.update(job.id, {
            status: 'uploading_documents',
            step: 'documents_complete',
            progress: 78,
            message: documentUpload.skipped.length > 0
              ? `تم رفع المستندات المتاحة وتجاوز ${documentUpload.skipped.length} ملف رفضه تقاضي`
              : 'تم رفع جميع المستندات المتاحة إلى تقاضي',
            details: {
              uploadedDocuments: documentUpload.uploaded,
              skippedDocuments: documentUpload.skipped,
              alreadyPresentDocuments: documentUpload.alreadyPresent,
            },
          });
        } else if (plan.action === 'verify_review') {
          await this.queue.update(job.id, {
            status: 'reviewing',
            step: 'final_review',
            progress: 86,
            message: 'جاري مطابقة شاشة المراجعة مع حزمة Fleetify',
          });
          await portal.verifyReview(job.payload);
          reviewVerified = true;
          break;
        }

        if (plan.expectedStage) {
          const nextPosition = await portal.waitForPortalStage(
            plan.expectedStage,
            job.payload,
            plan.currentStage,
          );
          highestVerifiedStageIndex = Math.max(
            highestVerifiedStageIndex,
            stageOrderIndex(nextPosition.stage),
          );
          await this.queue.update(job.id, {
            status: 'validating',
            step: 'verify_portal_transition',
            progress: Math.max(job.progress, 20),
            message: `تم التحقق من الانتقال إلى: ${nextPosition.label}`,
            details: {
              cycle,
              previousStage: plan.currentStage,
              portalStage: nextPosition.stage,
              portalConfidence: nextPosition.confidence,
              portalScore: nextPosition.score,
              evidence: nextPosition.evidence,
              url: nextPosition.url,
            },
          });
        }
      }

      if (!reviewVerified) {
        throw new HumanInterventionError(
          'تجاوز الوكيل عدد دورات الفهم الآمنة قبل الوصول إلى المراجعة',
          'ADAPTIVE_FLOW_LIMIT_REACHED',
          { resumeSupported: true },
        );
      }
      await this.uploadScreenshot(job, 'final-review', 'screenshot')
        .catch((error) => {
          console.warn('[TaqadiAgent] review screenshot failed:', error);
        });

      if (
        canary
        || !agentConfig.finalApproval
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
      await this.diagnostics.discardTracing();
      this.setRuntime('idle', null, null);
      console.log(
        `[TaqadiAgent] filed job ${job.id}: ${result.referenceNumber || result.caseNumber}`,
      );
    } catch (error) {
      if (
        canary
        && error instanceof HumanInterventionError
        && error.code === 'PARTIES_DIAGNOSTIC_COMPLETE'
      ) {
        await this.uploadScreenshot(job, 'canary-parties', 'screenshot')
          .catch(() => undefined);
        await this.diagnostics.discardTracing();
        await this.queue.completeCanary(job);
        this.setRuntime('idle', null, null);
        console.log(`[TaqadiAgent] canary job ${job.id} passed`);
        return;
      }

      const retryablePortalError = shouldRestartPortalFlow(error, {
        caseDraftStarted,
        submissionStarted,
      });
      if (retryablePortalError && portalAttempt < MAX_PORTAL_ATTEMPTS) {
        const nextAttempt = portalAttempt + 1;
        const retryDelayMs = Math.min(
          60_000,
          15_000 * portalAttempt,
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
            browserPreserved: true,
          },
        });
        await this.diagnostics.discardTracing();
        await this.prepareBrowserForPortalRetry();
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

      await this.uploadTraceArtifact(job);

      if (normalized instanceof HumanInterventionError) {
        let assistanceDetails = normalized.details;
        if (
          portal
          && normalized.code !== 'SUBMISSION_UNCERTAIN'
          && normalized.code !== 'FINAL_APPROVAL_DISABLED'
        ) {
          const position = await portal
            .detectCurrentPosition(job.payload)
            .catch(() => null);
          if (position) {
            assistanceDetails = {
              ...normalized.details,
              portalStage: position.stage,
              portalLabel: position.label,
              portalConfidence: position.confidence,
              validationMessages: position.validationMessages,
              requiredActions: normalized.details.requiredActions
                || position.validationMessages,
              resumeSupported: true,
              url: position.url,
            };
          }
        }
        const uiChanged = !submissionStarted
          && (normalized.code === 'TAQADI_UI_CHANGED'
            || normalized.code === 'TAQADI_DROPDOWN_NOT_READY');
        if (uiChanged) {
          const asStrings = (value: unknown): string[] =>
            Array.isArray(value)
              ? value.filter(
                (item): item is string => typeof item === 'string',
              )
              : [];
          const suggestion = await this.uploadHealProposal(
            job,
            normalized.code.toLowerCase(),
            normalized.message,
            {
              expectedLabels: asStrings(normalized.details.expectedLabels),
              expectedControlIds: asStrings(normalized.details.controlIds),
            },
          );
          if (suggestion?.found) {
            // المستوى الثاني: اقتراح عالي الثقة يجتاز التحقق الحتمي يُطبَّق
            // كـ session override مؤقت وتُعاد العملية من موضع الصفحة الفعلي
            // (دون فتح مسودة جديدة). غير ذلك يبقى المسار اليدوي كما هو.
            const applied = autoHealAttempts < MAX_AUTO_HEAL_ATTEMPTS
              ? await this.tryAutoApplyHeal(job, suggestion)
              : false;
            if (applied) {
              return this.process(job, portalAttempt, autoHealAttempts + 1);
            }
            assistanceDetails = {
              ...assistanceDetails,
              healSuggestion: suggestion,
            };
          }
        }
        this.setRuntime('error', null, normalized.message);
        const updatedJob = await this.queue.update(job.id, {
          status: 'needs_human',
          step: normalized.code.toLowerCase(),
          progress: submissionStarted ? 96 : Math.max(job.progress, 10),
          message: normalized.message,
          details: assistanceDetails,
          errorCode: normalized.code,
          errorMessage: normalized.message,
        });
        if (shouldRefundClaimAttempt(normalized, {
          caseDraftStarted,
          submissionStarted,
        })) {
          const refunded = await this.queue.refundLoginAttempt(updatedJob);
          if (refunded) {
            console.log(
              `[TaqadiAgent] login wait did not consume a filing attempt for ${job.id}`,
            );
          }
        }
        return;
      }

      const message = normalized instanceof Error
        ? normalized.message
        : String(normalized);
      await this.uploadHealProposal(job, job.current_step, message);
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
