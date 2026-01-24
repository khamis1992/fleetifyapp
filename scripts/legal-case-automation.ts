/**
 * Legal Case Automation Script for Qatar Court System
 * Automates the submission of legal cases through the Qatar court portal
 *
 * Usage: npm run automate:case -- --customer="Customer Name" --headless=false
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import config, { getScreenshotPath, getLogFilePath } from './config/automation.config';
import { readCustomerData, findCustomerDocuments, validateCustomerData, validateDocuments } from './utils/excelReader';
import { convertAmountToArabic } from './utils/amountConverter';
import { detectCaptcha, handleCaptcha, checkAndHandleCaptcha } from './utils/captchaHandler';
import { CustomerData, StepResult, AutomationResult, StepStatus } from './types/automation.types';

// Logger utility
class Logger {
  private logFile: fs.WriteStream | null = null;

  constructor(customerName: string) {
    const logDir = config.automation.logsDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath = getLogFilePath(customerName);
    this.logFile = fs.createWriteStream(logPath, { flags: 'a' });
  }

  log(message: string, step?: number): void {
    const timestamp = new Date().toISOString();
    const prefix = step !== undefined ? `[Step ${step}] ` : '';
    const logMessage = `[${timestamp}] ${prefix}${message}\n`;

    process.stdout.write(logMessage);
    if (this.logFile) {
      this.logFile.write(logMessage);
    }
  }

  error(message: string, step?: number): void {
    const timestamp = new Date().toISOString();
    const prefix = step !== undefined ? `[Step ${step}] ` : '';
    const logMessage = `[${timestamp}] ERROR: ${prefix}${message}\n`;

    process.stderr.write(logMessage);
    if (this.logFile) {
      this.logFile.write(logMessage);
    }
  }

  success(message: string, step?: number): void {
    const timestamp = new Date().toISOString();
    const prefix = step !== undefined ? `[Step ${step}] ` : '';
    const logMessage = `[${timestamp}] ✓ ${prefix}${message}\n`;

    process.stdout.write(logMessage);
    if (this.logFile) {
      this.logFile.write(logMessage);
    }
  }

  close(): void {
    if (this.logFile) {
      this.logFile.end();
    }
  }
}

// Main Automation Class
export class LegalCaseAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private logger: Logger | null = null;
  private customerName: string;
  private customerData: CustomerData | null = null;
  private documents: Map<string, string[]> | null = null;
  private steps: StepResult[] = [];
  private startTime: Date = new Date();

  constructor(customerName: string) {
    this.customerName = customerName;
  }

  /**
   * Initialize the automation
   */
  async initialize(): Promise<void> {
    this.logger = new Logger(this.customerName);
    this.logger.log(`Starting automation for customer: ${this.customerName}`);

    // Create directories
    if (!fs.existsSync(config.automation.screenshotsDir)) {
      fs.mkdirSync(config.automation.screenshotsDir, { recursive: true });
    }

    const customerScreenshotDir = path.join(config.automation.screenshotsDir, this.customerName);
    if (!fs.existsSync(customerScreenshotDir)) {
      fs.mkdirSync(customerScreenshotDir, { recursive: true });
    }

    // Read customer data
    try {
      this.customerData = readCustomerData(this.customerName);
      this.logger.success('Customer data loaded successfully');

      const validation = validateCustomerData(this.customerData);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load customer data: ${error.message}`);
      throw error;
    }

    // Find documents
    try {
      this.documents = findCustomerDocuments(this.customerName);
      this.logger.success(`Found ${this.documents.size} document types`);

      const validation = validateDocuments(this.documents);
      if (!validation.valid) {
        throw new Error(`Missing required documents: ${validation.missing.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Failed to validate documents: ${error.message}`);
      throw error;
    }

    // Initialize browser
    this.browser = await chromium.launch({
      headless: config.automation.headless,
      slowMo: config.automation.slowMo
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ar-QA'
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(config.automation.timeout);

    this.logger.success('Browser initialized');
  }

  /**
   * Execute a step with error handling and logging
   */
  private async executeStep(
    stepNumber: number,
    description: string,
    action: () => Promise<void>
  ): Promise<void> {
    const stepResult: StepResult = {
      stepNumber,
      description,
      status: StepStatus.IN_PROGRESS,
      timestamp: new Date()
    };

    this.steps.push(stepResult);
    this.logger.log(description, stepNumber);

    try {
      // Check for CAPTCHA before step
      await checkAndHandleCaptcha(this.page!, description);

      // Execute action
      await action();

      stepResult.status = StepStatus.COMPLETED;
      this.logger.success(`${description} - Completed`, stepNumber);
    } catch (error) {
      stepResult.status = StepStatus.FAILED;
      stepResult.error = error.message;

      // Take screenshot on error
      const screenshotPath = getScreenshotPath(this.customerName, stepNumber);
      await this.page!.screenshot({ path: screenshotPath, fullPage: true });
      stepResult.screenshot = screenshotPath;

      this.logger.error(`${description} - Failed: ${error.message}`, stepNumber);
      this.logger.error(`Screenshot saved: ${screenshotPath}`, stepNumber);

      throw error;
    }
  }

  /**
   * Wait for element with retry
   */
  private async waitForElement(selector: string, timeout: number = config.automation.timeout): Promise<void> {
    const maxAttempts = config.automation.retryAttempts;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        await this.page!.waitForSelector(selector, { timeout });
        return;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw error;
        }
        this.logger!.log(`Retry ${attempt}/${maxAttempts} for selector: ${selector}`);
        await this.page!.waitForTimeout(config.automation.retryDelay);
      }
    }
  }

  /**
   * Run the complete automation workflow
   */
  async run(): Promise<AutomationResult> {
    try {
      await this.initialize();

      // Phase 1: Authentication (Steps 1-4)
      await this.executeStep(1, 'Login - Select National Authentication', () => this.step1_LoginSelect());
      await this.executeStep(2, 'National Authentication - Enter credentials', () => this.step2_Authenticate());
      await this.executeStep(3, 'Select user type', () => this.step3_SelectUserType());
      await this.executeStep(4, 'Ensure sidebar is visible', () => this.step4_EnsureSidebar());

      // Phase 2: Navigate to Case Creation (Step 5)
      await this.executeStep(5, 'Navigate to case creation', () => this.step5_NavigateToCaseCreation());

      // Phase 6: Fill Court & Case Type (Step 6)
      await this.executeStep(6, 'Fill court and case type', () => this.step6_FillCourtInfo());

      // Phase 8: Case Details (Step 8)
      await this.executeStep(8, 'Fill case details', () => this.step8_FillCaseDetails());

      // Phase 9-18: Add Defendant Party (Steps 9-19)
      await this.executeStep(9, 'Click add party', () => this.step9_AddParty());
      await this.executeStep(10, 'Fill party classification', () => this.step10_PartyClassification());
      await this.executeStep(11, 'Fill party capacity', () => this.step11_PartyCapacity());
      await this.executeStep(12, 'Fill party order', () => this.step12_PartyOrder());
      await this.executeStep(13, 'Fill party name', () => this.step13_PartyName());
      await this.executeStep(14, 'Fill party gender', () => this.step14_PartyGender());
      await this.executeStep(15, 'Fill party nationality', () => this.step15_PartyNationality());
      await this.executeStep(16, 'Fill party ID details', () => this.step16_PartyIDDetails());
      await this.executeStep(17, 'Fill party additional info', () => this.step17_PartyAdditionalInfo());
      await this.executeStep(18, 'Fill party contact info', () => this.step18_PartyContact());
      await this.executeStep(19, 'Save party', () => this.step19_SaveParty());

      // Phase 20-21: Edit & Save Party (Steps 20-21)
      await this.executeStep(20, 'Find and edit party', () => this.step20_FindParty());
      await this.executeStep(21, 'Save party changes', () => this.step21_SavePartyChanges());

      // Phase 23-27: Upload Documents (Steps 23-27)
      await this.executeStep(23, 'Upload memo documents', () => this.step23_UploadMemo());
      await this.executeStep(24, 'Upload portfolio', () => this.step24_UploadPortfolio());
      await this.executeStep(25, 'Upload IBAN', () => this.step25_UploadIBAN());
      await this.executeStep(26, 'Upload ID card', () => this.step26_UploadIDCard());
      await this.executeStep(27, 'Upload commercial record', () => this.step27_UploadCommercialRecord());

      // Phase 28-30: Final Submission (Steps 28-30)
      await this.executeStep(28, 'Click next (first time)', () => this.step28_Next1());
      await this.executeStep(29, 'Click next (second time)', () => this.step29_Next2());
      await this.executeStep(30, 'Submit case', () => this.step30_Submit());

      // Success!
      const endTime = new Date();
      const duration = endTime.getTime() - this.startTime.getTime();

      this.logger.success('='.repeat(80));
      this.logger.success('AUTOMATION COMPLETED SUCCESSFULLY!');
      this.logger.success(`Duration: ${Math.round(duration / 1000)} seconds`);
      this.logger.success('='.repeat(80));

      return {
        success: true,
        customerName: this.customerName,
        steps: this.steps,
        errors: [],
        timestamp: this.startTime,
        duration
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - this.startTime.getTime();

      this.logger.error('='.repeat(80));
      this.logger.error('AUTOMATION FAILED!');
      this.logger.error(`Error: ${error.message}`);
      this.logger.error('='.repeat(80));

      return {
        success: false,
        customerName: this.customerName,
        steps: this.steps,
        errors: [error.message],
        timestamp: this.startTime,
        duration
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Step 1: Login - Select National Authentication
   */
  private async step1_LoginSelect(): Promise<void> {
    // Navigate to login page
    await this.page!.goto('https://adlsala.ada.gov.qa/Pages/Default.aspx', {
      waitUntil: 'networkidle'
    });

    // Wait for page to load
    await this.page!.waitForTimeout(3000);

    // Select "الدخول عبر النظام التوثيق الوطني" (right option)
    const nationalAuthOption = this.page!.locator('text=الدخول عبر النظام التوثيق الوطني').or(
      this.page!.locator('[class*="national"]')
    );

    await nationalAuthOption.click();
    await this.page!.waitForTimeout(1000);

    // Click "متابعة"
    const continueButton = this.page!.locator('button:has-text("متابعة")').or(
      this.page!.locator('[class*="continue"]')
    );

    await continueButton.click();
    await this.page!.waitForTimeout(2000);
  }

  /**
   * Step 2: National Authentication
   */
  private async step2_Authenticate(): Promise<void> {
    // Wait for authentication page
    await this.page!.waitForTimeout(3000);

    // Check for CAPTCHA
    const captchaDetected = await detectCaptcha(this.page!);
    if (captchaDetected.detected) {
      await handleCaptcha(this.page!);
    }

    // Enter username
    const usernameInput = this.page!.locator('input[type="text"]').or(
      this.page!.locator('[id*="username"]')
    ).or(
      this.page!.locator('[name*="username"]')
    );

    await usernameInput.fill(config.credentials.username);
    await this.page!.waitForTimeout(500);

    // Enter password
    const passwordInput = this.page!.locator('input[type="password"]').or(
      this.page!.locator('[id*="password"]')
    );

    await passwordInput.fill(config.credentials.password);
    await this.page!.waitForTimeout(500);

    // Click "أنا لست روبوت" (I'm not a robot)
    const notRobotCheckbox = this.page!.locator('text=أنا لست روبوت').or(
      this.page!.locator('[class*="captcha"]')
    );

    if (await notRobotCheckbox.count() > 0) {
      await notRobotCheckbox.first().click();
      await this.page!.waitForTimeout(2000);
    }

    // Click "استمر" (Continue)
    const submitButton = this.page!.locator('button:has-text("استمر")').or(
      this.page!.locator('button[type="submit"]')
    ).or(
      this.page!.locator('input[type="submit"]')
    );

    await submitButton.click();

    // Wait for navigation
    await this.page!.waitForTimeout(5000);
  }

  /**
   * Step 3: Select user type
   */
  private async step3_SelectUserType(): Promise<void> {
    // Wait for user type selection
    await this.page!.waitForTimeout(3000);

    // Select "مُتقاضي فرد" (Individual Plaintiff)
    const individualOption = this.page!.locator('text=مُتقاضي فرد').or(
      this.page!.locator('[value*="individual"]')
    );

    await individualOption.click();
    await this.page!.waitForTimeout(1000);

    // Click "تسجيل دخول" (Login)
    const loginButton = this.page!.locator('button:has-text("تسجيل دخول")').or(
      this.page!.locator('[class*="login"]')
    );

    await loginButton.click();

    // Wait for navigation
    await this.page!.waitForTimeout(5000);
  }

  /**
   * Step 4: Ensure sidebar is visible
   */
  private async step4_EnsureSidebar(): Promise<void> {
    await this.page!.waitForTimeout(3000);

    // Try to find and click sidebar toggle if sidebar is hidden
    const sidebarToggle = this.page!.locator('[class*="sidebar-toggle"]').or(
      this.page!.locator('[class*="menu-toggle"]')
    );

    if (await sidebarToggle.count() > 0) {
      await sidebarToggle.first().click();
      await this.page!.waitForTimeout(1000);
    }
  }

  /**
   * Step 5: Navigate to case creation
   */
  private async step5_NavigateToCaseCreation(): Promise<void> {
    // Click "إدارة الدعاوى" (Case Management)
    const caseManagement = this.page!.locator('text=إدارة الدعاوى').or(
      this.page!.locator('[href*="case"]')
    );

    await caseManagement.click();
    await this.page!.waitForTimeout(2000);

    // Click "إنشاء دعوى" (Create Case)
    const createCase = this.page!.locator('text=إنشاء دعوى').or(
      this.page!.locator('[href*="create"]')
    );

    await createCase.click();

    // Wait for case creation form
    await this.page!.waitForTimeout(3000);
  }

  /**
   * Step 6: Fill court and case type
   */
  private async step6_FillCourtInfo(): Promise<void> {
    // Fill court name
    await this.fillDropdown('المحكمة', config.court.courtName);

    // Fill proceeding type
    await this.fillDropdown('نوع الإجراء', config.court.proceedingType);

    // Fill litigation degree
    await this.fillDropdown('درجة التقاضي', config.court.litigationDegree);

    // Fill type
    await this.fillDropdown('النوع', config.court.type);

    // Fill subtype
    await this.fillDropdown('النوع الفرعي', config.court.subtype);

    // Fill subject
    await this.fillDropdown('الموضوع الفرعي', config.court.subject);

    // Fill classification
    await this.fillDropdown('التصنيف', config.court.classification);

    await this.page!.waitForTimeout(1000);
  }

  /**
   * Helper: Fill dropdown by label
   */
  private async fillDropdown(label: string, value: string): Promise<void> {
    const dropdown = this.page!.locator(`text=${label}`).locator('..').locator('select').or(
      this.page!.locator(`[label="${label}"]`)
    );

    await dropdown.selectOption({ label: value });
    await this.page!.waitForTimeout(500);
  }

  /**
   * Step 8: Fill case details
   */
  private async step8_FillCaseDetails(): Promise<void> {
    const data = this.customerData!;

    // Fill case title
    await this.fillInput('عنوان الدعوى', config.case.title);

    // Fill facts
    await this.fillTextArea('الوقائع', data.facts);

    // Fill requests
    await this.fillTextArea('الطلبات', data.requests);

    // Fill claim type
    await this.fillDropdown('نوع المطالبة', config.case.claimType);

    // Fill amount
    await this.fillInput('المبلغ', data.amount.toString());

    // Fill amount in words
    const amountInWords = convertAmountToArabic(data.amount);
    await this.fillInput('المبلغ الإجمالي كتابة', amountInWords);

    await this.page!.waitForTimeout(1000);
  }

  /**
   * Helper: Fill input by label
   */
  private async fillInput(label: string, value: string): Promise<void> {
    const input = this.page!.locator(`text=${label}`).locator('..').locator('input[type="text"]').or(
      this.page!.locator(`[placeholder*="${label}"]`)
    ).or(
      this.page!.locator(`[name*="${label}"]`)
    );

    await input.fill(value);
    await this.page!.waitForTimeout(300);
  }

  /**
   * Helper: Fill textarea by label
   */
  private async fillTextArea(label: string, value: string): Promise<void> {
    const textarea = this.page!.locator(`text=${label}`).locator('..').locator('textarea').or(
      this.page!.locator(`[placeholder*="${label}"]`)
    );

    await textarea.fill(value);
    await this.page!.waitForTimeout(300);
  }

  /**
   * Step 9: Click add party
   */
  private async step9_AddParty(): Promise<void> {
    const addButton = this.page!.locator('button:has-text("إضافة طرف")').or(
      this.page!.locator('[class*="add-party"]')
    );

    await addButton.click();
    await this.page!.waitForTimeout(2000);
  }

  /**
   * Step 10: Party classification
   */
  private async step10_PartyClassification(): Promise<void> {
    await this.fillDropdown('تصنيف الطرف', 'شخص طبيعي');
  }

  /**
   * Step 11: Party capacity
   */
  private async step11_PartyCapacity(): Promise<void> {
    await this.fillDropdown('صفة الطرف', 'المدعى عليه');
  }

  /**
   * Step 12: Party order
   */
  private async step12_PartyOrder(): Promise<void> {
    await this.fillInput('الترتيب', '1');
  }

  /**
   * Step 13: Party name
   */
  private async step13_PartyName(): Promise<void> {
    const data = this.customerData!;

    await this.fillInput('اسم العائلة', data.familyName);
    await this.fillInput('الاسم الأول', data.firstName);
  }

  /**
   * Step 14: Party gender
   */
  private async step14_PartyGender(): Promise<void> {
    await this.fillDropdown('الجنس', 'ذكر');
  }

  /**
   * Step 15: Party nationality
   */
  private async step15_PartyNationality(): Promise<void> {
    const data = this.customerData!;
    await this.fillDropdown('الجنسية', data.nationality);
  }

  /**
   * Step 16: Party ID details
   */
  private async step16_PartyIDDetails(): Promise<void> {
    const data = this.customerData!;

    await this.fillDropdown('نوع البطاقة', 'رخصة مقيم');
    await this.fillInput('رقم الهوية', data.idNumber);
  }

  /**
   * Step 17: Party additional info
   */
  private async step17_PartyAdditionalInfo(): Promise<void> {
    await this.fillDropdown('مترجم مطلوب', 'لا');
    await this.fillDropdown('وارث', 'لا');
    await this.fillInput('العنوان', config.case.address);
  }

  /**
   * Step 18: Party contact
   */
  private async step18_PartyContact(): Promise<void> {
    const data = this.customerData!;

    await this.fillInput('الجوال', data.mobile);
    await this.fillInput('البريد الإلكتروني', config.case.email);
  }

  /**
   * Step 19: Save party
   */
  private async step19_SaveParty(): Promise<void> {
    const saveButton = this.page!.locator('button:has-text("حفظ")').or(
      this.page!.locator('[class*="save"]')
    );

    await saveButton.click();
    await this.page!.waitForTimeout(2000);
  }

  /**
   * Step 20: Find and edit party
   */
  private async step20_FindParty(): Promise<void> {
    const partyName = `${this.customerData!.firstName} ${this.customerData!.familyName}`;

    // Search for party in list
    const partyRow = this.page!.locator(`text=${partyName}`).or(
      this.page!.locator(`[class*="party"]`)
    );

    await partyRow.first().scrollIntoViewIfNeeded();
    await this.page!.waitForTimeout(1000);

    // Click edit button
    const editButton = partyRow.locator('..').locator('button:has-text("تعديل")').or(
      this.page!.locator('[class*="edit"]')
    );

    await editButton.click();
    await this.page!.waitForTimeout(2000);
  }

  /**
   * Step 21: Save party changes
   */
  private async step21_SavePartyChanges(): Promise<void> {
    // Scroll down
    await this.page!.evaluate(() => window.scrollBy(0, 500));
    await this.page!.waitForTimeout(1000);

    // Click save
    const saveButton = this.page!.locator('button:has-text("حفظ")').or(
      this.page!.locator('[class*="save"]')
    );

    await saveButton.click();
    await this.page!.waitForTimeout(2000);
  }

  /**
   * Step 23: Upload memo documents
   */
  private async step23_UploadMemo(): Promise<void> {
    const memoDocs = this.documents!.get('memo') || [];

    for (const doc of memoDocs) {
      await this.uploadDocument('المذكرة الشارحة', doc);
    }
  }

  /**
   * Step 24: Upload portfolio
   */
  private async step24_UploadPortfolio(): Promise<void> {
    const portfolioDocs = this.documents!.get('portfolio') || [];

    for (const doc of portfolioDocs) {
      await this.uploadDocument('حافظة المستندات', doc);
    }
  }

  /**
   * Step 25: Upload IBAN
   */
  private async step25_UploadIBAN(): Promise<void> {
    const ibanDocs = this.documents!.get('iban') || [];

    for (const doc of ibanDocs) {
      await this.uploadDocument('رقم الحساب الدولي', doc);
    }
  }

  /**
   * Step 26: Upload ID card
   */
  private async step26_UploadIDCard(): Promise<void> {
    const idCardDocs = this.documents!.get('idCard') || [];

    for (const doc of idCardDocs) {
      await this.uploadDocument('بطاقة شخصية', doc);
    }
  }

  /**
   * Step 27: Upload commercial record
   */
  private async step27_UploadCommercialRecord(): Promise<void> {
    const crDocs = this.documents!.get('commercialRecord') || [];

    for (const doc of crDocs) {
      await this.uploadDocument('سجل تجاري', doc);
    }
  }

  /**
   * Helper: Upload document
   */
  private async uploadDocument(documentType: string, filePath: string): Promise<void> {
    // Find file input for document type
    const fileInput = this.page!.locator(`text=${documentType}`).locator('..').locator('input[type="file"]').or(
      this.page!.locator(`[accept*="${path.extname(filePath)}"]`)
    );

    await fileInput.setInputFiles(filePath);
    await this.page!.waitForTimeout(2000);

    this.logger!.log(`Uploaded: ${path.basename(filePath)}`);
  }

  /**
   * Step 28: Click next (first time)
   */
  private async step28_Next1(): Promise<void> {
    const nextButton = this.page!.locator('button:has-text("التالي")').or(
      this.page!.locator('[class*="next"]')
    );

    await nextButton.click();
    await this.page!.waitForTimeout(3000);
  }

  /**
   * Step 29: Click next (second time)
   */
  private async step29_Next2(): Promise<void> {
    const nextButton = this.page!.locator('button:has-text("التالي")').or(
      this.page!.locator('[class*="next"]')
    );

    await nextButton.click();
    await this.page!.waitForTimeout(3000);
  }

  /**
   * Step 30: Submit case
   */
  private async step30_Submit(): Promise<void> {
    const submitButton = this.page!.locator('button:has-text("اعتماد")').or(
      this.page!.locator('[class*="submit"]')
    );

    await submitButton.click();

    // Wait for submission confirmation
    await this.page!.waitForTimeout(5000);

    // Try to capture case reference number
    try {
      const referenceElement = this.page!.locator('[class*="reference"]').or(
        this.page!.locator('text=رقم الدعوى')
      );

      if (await referenceElement.count() > 0) {
        const reference = await referenceElement.textContent();
        this.logger!.success(`Case Reference: ${reference}`);
      }
    } catch (error) {
      this.logger!.log('Could not capture case reference number');
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.logger) {
      this.logger.close();
    }

    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const customerArg = args.find(arg => arg.startsWith('--customer='));
  const headlessArg = args.find(arg => arg.startsWith('--headless='));

  if (!customerArg) {
    console.error('Error: --customer parameter is required');
    console.error('Usage: npm run automate:case -- --customer="Customer Name" --headless=false');
    process.exit(1);
  }

  const customerName = customerArg.split('=')[1];

  if (headlessArg) {
    config.automation.headless = headlessArg.split('=')[1] === 'true';
  }

  console.log('='.repeat(80));
  console.log('Qatar Court System - Legal Case Automation');
  console.log('='.repeat(80));
  console.log(`Customer: ${customerName}`);
  console.log(`Headless: ${config.automation.headless}`);
  console.log('='.repeat(80));
  console.log('');

  const automation = new LegalCaseAutomation(customerName);
  const result = await automation.run();

  // Save result to file
  const resultsDir = path.join(process.cwd(), 'logs', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultPath = path.join(resultsDir, `${customerName}-${Date.now()}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  console.log(`\nResult saved: ${resultPath}`);

  if (!result.success) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default LegalCaseAutomation;
