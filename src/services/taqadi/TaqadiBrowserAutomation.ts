/**
 * Taqadi Browser Automation Service
 * Uses Playwright to automate form filling on Taqadi portal
 *
 * IMPORTANT: This service requires Playwright to be installed
 * Install with: npm install playwright
 * Download browsers: npx playwright install chromium
 */

import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { TAQADI_URLS, CASE_FORM_SELECTORS, WAIT_CONDITIONS } from './TaqadiSelectors';
import type { TaqadiSubmissionData } from './TaqadiTypes';

// ==========================================
// Configuration Types
// ==========================================

export interface BrowserAutomationConfig {
  /**
   * Whether to run in headless mode
   * @default false (show browser for visibility)
   */
  headless?: boolean;

  /**
   * Path to user data directory for session persistence
   * If not provided, a temporary directory will be used
   */
  userDataDir?: string;

  /**
   * Whether to save screenshots for debugging
   * @default true
   */
  screenshots?: boolean;

  /**
   * Screenshots directory
   */
  screenshotsDir?: string;

  /**
   * Whether to record video
   * @default false
   */
  recordVideo?: boolean;

  /**
   * Video directory
   */
  videoDir?: string;

  /**
   * Default timeout for operations (ms)
   * @default 30000
   */
  timeout?: number;

  /**
   * Whether to wait for network idle between actions
   * @default true
   */
  waitForNetworkIdle?: boolean;

  /**
   * Slow motion factor (for debugging)
   * Higher values slow down operations
   * @default 0 (no slow motion)
   */
  slowMo?: number;

  /**
   * Viewport size
   */
  viewport?: { width: number; height: number };

  /**
   * User agent string
   */
  userAgent?: string;
}

/**
 * Automation result
 */
export interface AutomationResult {
  success: boolean;
  message: string;
  caseReference?: string;
  screenshot?: string;
  video?: string;
  errors: string[];
  warnings: string[];
  metadata: {
    startedAt: string;
    completedAt: string;
    duration: number;
    steps: AutomationStep[];
  };
}

/**
 * Individual automation step for tracking
 */
export interface AutomationStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  screenshot?: string;
}

// ==========================================
// Main Automation Class
// ==========================================

export class TaqadiBrowserAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: Required<BrowserAutomationConfig>;
  private steps: AutomationStep[] = [];

  constructor(config: BrowserAutomationConfig = {}) {
    this.config = {
      headless: config.headless ?? false,
      userDataDir: config.userDataDir,
      screenshots: config.screenshots ?? true,
      screenshotsDir: config.screenshotsDir || './screenshots',
      recordVideo: config.recordVideo ?? false,
      videoDir: config.videoDir || './videos',
      timeout: config.timeout ?? WAIT_CONDITIONS.DEFAULT_TIMEOUT,
      waitForNetworkIdle: config.waitForNetworkIdle ?? true,
      slowMo: config.slowMo ?? 0,
      viewport: config.viewport || { width: 1280, height: 720 },
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
  }

  // ==========================================
  // Browser Management
  // ==========================================

  /**
   * Initialize browser with saved session
   */
  async initialize(): Promise<void> {
    const step = this.addStep('Initialize Browser');

    try {
      const launchOptions: LaunchOptions = {
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      };

      // Launch browser
      this.browser = await chromium.launch(launchOptions);

      // Create context with session storage
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
        acceptDownloads: true,
        // Load saved cookies if available
        storageState: this.config.userDataDir
          ? `${this.config.userDataDir}/storage-state.json`
          : undefined,
        // Record video if enabled
        recordVideo: this.config.recordVideo
          ? { dir: this.config.videoDir }
          : undefined,
      });

      // Create new page
      this.page = await this.context.newPage();

      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout);

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  /**
   * Save browser session for later use
   */
  async saveSession(): Promise<void> {
    if (!this.context || !this.config.userDataDir) {
      return;
    }

    try {
      await this.context.storageState({
        path: `${this.config.userDataDir}/storage-state.json`,
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    try {
      await this.saveSession();

      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  // ==========================================
  // Authentication
  // ==========================================

  /**
   * Navigate to Taqadi and check if logged in
   * Returns true if already logged in, false if login required
   */
  async checkLoginStatus(): Promise<boolean> {
    const step = this.addStep('Check Login Status');

    try {
      await this.navigate(TAQADI_URLS.BASE);

      // Wait for page load
      await this.page!.waitForLoadState('networkidle');

      // Check if we're on login page or dashboard
      const url = this.page!.url();
      const isLoggedIn = !url.includes('login') && !url.includes('auth');

      this.completeStep(step);
      return isLoggedIn;
    } catch (error: any) {
      this.failStep(step, error.message);
      return false;
    }
  }

  /**
   * Wait for user to manually log in
   * This keeps the browser open until user logs in
   */
  async waitForManualLogin(timeout: number = 300000): Promise<boolean> {
    const step = this.addStep('Wait for Manual Login');

    try {
      // Navigate to login page
      await this.navigate(TAQADI_URLS.LOGIN);

      // Wait for URL to change (indicates successful login)
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const url = this.page!.url();

        // If we're no longer on login page, consider it successful
        if (!url.includes('login') && !url.includes('auth')) {
          this.completeStep(step);

          // Save the session
          await this.saveSession();

          return true;
        }

        // Wait 1 second before checking again
        await this.page!.waitForTimeout(1000);
      }

      throw new Error('Login timeout exceeded');
    } catch (error: any) {
      this.failStep(step, error.message);
      return false;
    }
  }

  // ==========================================
  // Navigation
  // ==========================================

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    await this.page!.goto(url, {
      waitUntil: this.config.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
      timeout: WAIT_CONDITIONS.NAVIGATION_TIMEOUT,
    });
  }

  // ==========================================
  // Form Filling
  // ==========================================

  /**
   * Fill complete Taqadi form
   */
  async fillForm(data: TaqadiSubmissionData): Promise<AutomationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Initialize browser if not already
      if (!this.page) {
        await this.initialize();
      }

      // Navigate to case creation page
      await this.navigate(TAQADI_URLS.CASE_CREATE);

      // Fill each section
      await this.fillCaseType(data);
      await this.fillPlaintiff(data);
      await this.fillDefendant(data);
      await this.fillFactsAndClaims(data);
      await this.fillAmounts(data);
      await this.fillDates(data);

      // Take screenshot before submission
      const beforeSubmitScreenshot = await this.takeScreenshot('before-submission');

      const result: AutomationResult = {
        success: true,
        message: 'Form filled successfully. Please review and submit.',
        errors,
        warnings,
        screenshot: beforeSubmitScreenshot,
        metadata: {
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          steps: this.steps,
        },
      };

      return result;

    } catch (error: any) {
      const errorScreenshot = await this.takeScreenshot('error');

      return {
        success: false,
        message: `Automation failed: ${error.message}`,
        errors: [...errors, error.message],
        warnings,
        screenshot: errorScreenshot,
        metadata: {
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          steps: this.steps,
        },
      };
    }
  }

  /**
   * Fill case type
   */
  private async fillCaseType(data: TaqadiSubmissionData): Promise<void> {
    const step = this.addStep('Fill Case Type');

    try {
      const selector = CASE_FORM_SELECTORS.CASE_TYPE_SELECT;

      // Wait for selector
      await this.waitForSelector(selector);

      // Select the appropriate case type
      const caseType = data.case.caseType;

      let optionSelector: string;
      switch (caseType) {
        case 'commercial':
          optionSelector = CASE_FORM_SELECTORS.CASE_TYPE_COMMERCIAL;
          break;
        case 'rent':
          optionSelector = CASE_FORM_SELECTORS.CASE_TYPE_RENT;
          break;
        case 'compensation':
          optionSelector = CASE_FORM_SELECTORS.CASE_TYPE_COMPENSATION;
          break;
        case 'eviction':
          optionSelector = CASE_FORM_SELECTORS.CASE_TYPE_EVICTION;
          break;
        default:
          optionSelector = CASE_FORM_SELECTORS.CASE_TYPE_RENT;
      }

      await this.page!.selectOption(selector, caseType);

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  /**
   * Fill plaintiff information
   */
  private async fillPlaintiff(data: TaqadiSubmissionData): Promise<void> {
    const step = this.addStep('Fill Plaintiff Information');

    try {
      const plaintiff = data.plaintiff;

      // Company name
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_NAME_INPUT,
        plaintiff.companyNameArabic
      );

      // Commercial register
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_CR_INPUT,
        plaintiff.commercialRegisterNumber
      );

      // Address
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_ADDRESS_INPUT,
        plaintiff.address
      );

      // Phone
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_PHONE_INPUT,
        plaintiff.phone
      );

      // Email
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_EMAIL_INPUT,
        plaintiff.email
      );

      // IBAN
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_IBAN_INPUT,
        plaintiff.iban
      );

      // Representative name
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_REP_NAME_INPUT,
        plaintiff.representativeName
      );

      // Representative ID
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_REP_ID_INPUT,
        plaintiff.representativeId
      );

      // Representative position
      await this.fillInput(
        CASE_FORM_SELECTORS.PLAINTIFF_REP_POSITION_INPUT,
        plaintiff.representativePosition
      );

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  /**
   * Fill defendant information
   */
  private async fillDefendant(data: TaqadiSubmissionData): Promise<void> {
    const step = this.addStep('Fill Defendant Information');

    try {
      const defendant = data.defendant;

      // Defendant type
      await this.page!.selectOption(
        CASE_FORM_SELECTORS.DEFENDANT_TYPE_SELECT,
        defendant.type
      );

      // Name
      await this.fillInput(
        CASE_FORM_SELECTORS.DEFENDANT_NAME_INPUT,
        defendant.fullName
      );

      // ID number
      if (defendant.idNumber) {
        await this.fillInput(
          CASE_FORM_SELECTORS.DEFENDANT_ID_INPUT,
          defendant.idNumber
        );
      }

      // Address
      if (defendant.address) {
        await this.fillInput(
          CASE_FORM_SELECTORS.DEFENDANT_ADDRESS_INPUT,
          defendant.address
        );
      }

      // Phone
      if (defendant.phone) {
        await this.fillInput(
          CASE_FORM_SELECTORS.DEFENDANT_PHONE_INPUT,
          defendant.phone
        );
      }

      // Contract number
      if (defendant.contractNumber) {
        await this.fillInput(
          CASE_FORM_SELECTORS.CONTRACT_NUMBER_INPUT,
          defendant.contractNumber
        );
      }

      // Vehicle info (if available)
      if (defendant.vehicle) {
        await this.fillInput(
          CASE_FORM_SELECTORS.VEHICLE_MAKE_INPUT,
          `${defendant.vehicle.make} ${defendant.vehicle.model}`.trim()
        );

        await this.fillInput(
          CASE_FORM_SELECTORS.VEHICLE_YEAR_INPUT,
          defendant.vehicle.year.toString()
        );

        await this.fillInput(
          CASE_FORM_SELECTORS.VEHICLE_PLATE_INPUT,
          defendant.vehicle.plateNumber
        );
      }

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  /**
   * Fill facts and claims
   */
  private async fillFactsAndClaims(data: TaqadiSubmissionData): Promise<void> {
    const step = this.addStep('Fill Facts and Claims');

    try {
      // Case title
      await this.fillInput(
        CASE_FORM_SELECTORS.CASE_TITLE_INPUT,
        data.case.caseTitle
      );

      // Facts
      await this.fillTextarea(
        CASE_FORM_SELECTORS.FACTS_TEXTAREA,
        data.case.facts
      );

      // Claims
      await this.fillTextarea(
        CASE_FORM_SELECTORS.CLAIMS_TEXTAREA,
        data.case.claims
      );

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  /**
   * Fill amounts
   */
  private async fillAmounts(data: TaqadiSubmissionData): Promise<void> {
    const step = this.addStep('Fill Amounts');

    try {
      const amounts = data.case.amounts;

      // Principal amount
      await this.fillInput(
        CASE_FORM_SELECTORS.AMOUNT_PRINCIPAL_INPUT,
        amounts.principalAmount.toString()
      );

      // Late fees
      if (amounts.lateFees) {
        await this.fillInput(
          CASE_FORM_SELECTORS.AMOUNT_LATE_FEES_INPUT,
          amounts.lateFees.toString()
        );
      }

      // Violations fines
      if (amounts.violationsFines) {
        await this.fillInput(
          CASE_FORM_SELECTORS.AMOUNT_VIOLATIONS_INPUT,
          amounts.violationsFines.toString()
        );
      }

      // Other fees
      if (amounts.otherFees) {
        await this.fillInput(
          CASE_FORM_SELECTORS.AMOUNT_OTHER_INPUT,
          amounts.otherFees.toString()
        );
      }

      // Total amount
      await this.fillInput(
        CASE_FORM_SELECTORS.AMOUNT_TOTAL_INPUT,
        amounts.totalAmount.toString()
      );

      // Amount in words
      await this.fillInput(
        CASE_FORM_SELECTORS.AMOUNT_WORDS_INPUT,
        amounts.amountInWords
      );

      // Currency
      await this.page!.selectOption(
        CASE_FORM_SELECTORS.CURRENCY_SELECT,
        'QAR'
      );

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  /**
   * Fill dates
   */
  private async fillDates(data: TaqadiSubmissionData): Promise<void> {
    const step = this.addStep('Fill Dates');

    try {
      // Claim date (today)
      await this.fillInput(
        CASE_FORM_SELECTORS.CLAIM_DATE_INPUT,
        data.case.dates.claimDate
      );

      // Incident date if available
      if (data.case.dates.incidentDate) {
        await this.fillInput(
          CASE_FORM_SELECTORS.INCIDENT_DATE_INPUT,
          data.case.dates.incidentDate
        );
      }

      this.completeStep(step);
    } catch (error: any) {
      this.failStep(step, error.message);
      throw error;
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Fill an input field
   */
  private async fillInput(selector: string, value: string): Promise<void> {
    try {
      // Try multiple selector variations
      const selectors = selector.split(',').map(s => s.trim());

      for (const s of selectors) {
        try {
          await this.waitForSelector(s, { timeout: 5000 });
          await this.page!.fill(s, value);
          return; // Success
        } catch {
          continue; // Try next selector
        }
      }

      throw new Error(`Could not find field with selector: ${selector}`);
    } catch (error) {
      console.warn(`Failed to fill input ${selector}:`, error);
      // Don't throw - allow partial filling
    }
  }

  /**
   * Fill a textarea field
   */
  private async fillTextarea(selector: string, value: string): Promise<void> {
    try {
      const selectors = selector.split(',').map(s => s.trim());

      for (const s of selectors) {
        try {
          await this.waitForSelector(s, { timeout: 5000 });
          await this.page!.fill(s, value);
          return;
        } catch {
          continue;
        }
      }

      throw new Error(`Could not find textarea with selector: ${selector}`);
    } catch (error) {
      console.warn(`Failed to fill textarea ${selector}:`, error);
    }
  }

  /**
   * Wait for selector to be available
   */
  private async waitForSelector(
    selector: string,
    options: { timeout?: number } = {}
  ): Promise<void> {
    await this.page!.waitForSelector(selector, {
      timeout: options.timeout || this.config.timeout,
      state: 'visible',
    });
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(name: string): Promise<string | undefined> {
    if (!this.config.screenshots || !this.page) {
      return undefined;
    }

    try {
      const path = `${this.config.screenshotsDir}/${name}-${Date.now()}.png`;
      await this.page.screenshot({ path, fullPage: true });
      return path;
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      return undefined;
    }
  }

  /**
   * Add a new step
   */
  private addStep(name: string): AutomationStep {
    const step: AutomationStep = {
      name,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    this.steps.push(step);
    return step;
  }

  /**
   * Mark step as completed
   */
  private completeStep(step: AutomationStep): void {
    step.status = 'completed';
    step.completedAt = new Date().toISOString();
  }

  /**
   * Mark step as failed
   */
  private failStep(step: AutomationStep, error: string): void {
    step.status = 'failed';
    step.completedAt = new Date().toISOString();
    step.error = error;
  }
}

// ==========================================
// Factory Function
// ==========================================

/**
 * Create a new automation instance
 */
export function createTaqadiAutomation(config?: BrowserAutomationConfig) {
  return new TaqadiBrowserAutomation(config);
}

export default TaqadiBrowserAutomation;
