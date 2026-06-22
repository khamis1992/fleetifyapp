/**
 * Taqadi Form Selectors
 * CSS selectors for Taqadi portal form fields
 *
 * These selectors are used by Playwright to locate and fill form fields
 * on the Taqadi website (https://taqadi.sjc.gov.qa)
 *
 * IMPORTANT: These selectors may need to be updated if Taqadi changes their UI
 */

// ==========================================
// Page URLs
// ==========================================

export const TAQADI_URLS = {
  BASE: 'https://taqadi.sjc.gov.qa',
  LOGIN: 'https://taqadi.sjc.gov.qa/itc/login',
  CASE_CREATE: 'https://taqadi.sjc.gov.qa/itc/f/caseinfoext/create',
  CASE_DRAFT: 'https://taqadi.sjc.gov.qa/itc/f/caseinfoext/draft',
  DASHBOARD: 'https://taqadi.sjc.gov.qa/itc/dashboard',
} as const;

// ==========================================
// Login Page Selectors
// ==========================================

export const LOGIN_SELECTORS = {
  // NAS (National Authentication Service) login button
  NAS_LOGIN_BUTTON: 'button[type="submit"], input[type="submit"]',

  // Username/password fields (if direct login)
  USERNAME_INPUT: 'input[name="username"], input[type="text"]',
  PASSWORD_INPUT: 'input[name="password"], input[type="password"]',
  LOGIN_BUTTON: 'button[type="submit"], input[type="submit"]',

  // Error messages
  ERROR_MESSAGE: '.error-message, .alert-danger, [role="alert"]',

  // Success indicators
  SUCCESS_INDICATOR: '.dashboard, .main-content, nav',
} as const;

// ==========================================
// Case Creation Page Selectors
// ==========================================

/**
 * Main case form selectors
 * These are the primary selectors used for form filling
 */
export const CASE_FORM_SELECTORS = {
  // ============================================
  // Section 1: Case Type (نوع الدعوى)
  // ============================================

  CASE_TYPE_SELECT: '#caseType, select[name="caseType"], [data-field="caseType"]',

  // Case type options
  CASE_TYPE_COMMERCIAL: 'option[value="commercial"], option:has-text("تجارية")',
  CASE_TYPE_RENT: 'option[value="rent"], option:has-text("إيجار")',
  CASE_TYPE_COMPENSATION: 'option[value="compensation"], option:has-text("تعويض")',
  CASE_TYPE_EVICTION: 'option[value="eviction"], option:has-text("إخلاء")',

  // ============================================
  // Section 2: Case Title (عنوان الدعوى)
  // ============================================

  CASE_TITLE_INPUT: `
    #caseTitle,
    input[name="caseTitle"],
    [data-field="caseTitle"] input,
    textarea[name="caseTitle"]
  `,

  // ============================================
  // Section 3: Plaintiff (المدعي)
  // ============================================

  // Plaintiff company name
  PLAINTIFF_NAME_INPUT: `
    #plaintiffName,
    input[name="plaintiffName"],
    input[name="companyName"],
    [data-field="plaintiffName"] input
  `,

  // Commercial register number
  PLAINTIFF_CR_INPUT: `
    #plaintiffCR,
    input[name="plaintiffCR"],
    input[name="commercialRegisterNumber"],
    [data-field="commercialRegisterNumber"] input
  `,

  // Plaintiff address
  PLAINTIFF_ADDRESS_INPUT: `
    #plaintiffAddress,
    textarea[name="plaintiffAddress"],
    [data-field="plaintiffAddress"] textarea
  `,

  // Plaintiff phone
  PLAINTIFF_PHONE_INPUT: `
    #plaintiffPhone,
    input[name="plaintiffPhone"],
    input[name="plaintiffMobile"],
    [data-field="plaintiffPhone"] input
  `,

  // Plaintiff email
  PLAINTIFF_EMAIL_INPUT: `
    #plaintiffEmail,
    input[name="plaintiffEmail"],
    [data-field="plaintiffEmail"] input
  `,

  // Plaintiff IBAN
  PLAINTIFF_IBAN_INPUT: `
    #plaintiffIBAN,
    input[name="plaintiffIBAN"],
    [data-field="plaintiffIBAN"] input
  `,

  // Representative name
  PLAINTIFF_REP_NAME_INPUT: `
    #representativeName,
    input[name="representativeName"],
    [data-field="representativeName"] input
  `,

  // Representative ID
  PLAINTIFF_REP_ID_INPUT: `
    #representativeId,
    input[name="representativeId"],
    [data-field="representativeId"] input
  `,

  // Representative position
  PLAINTIFF_REP_POSITION_INPUT: `
    #representativePosition,
    input[name="representativePosition"],
    select[name="representativePosition"],
    [data-field="representativePosition"] input
  `,

  // ============================================
  // Section 4: Defendant (المدعى عليه)
  // ============================================

  // Defendant type (person/company)
  DEFENDANT_TYPE_SELECT: `
    #defendantType,
    select[name="defendantType"],
    [data-field="defendantType"] select
  `,

  DEFENDANT_TYPE_PERSON: 'option[value="natural_person"], option:has-text("شخص طبيعي")',
  DEFENDANT_TYPE_COMPANY: 'option[value="legal_entity"], option:has-text("شخص اعتباري")',

  // Defendant name
  DEFENDANT_NAME_INPUT: `
    #defendantName,
    input[name="defendantName"],
    [data-field="defendantName"] input
  `,

  // Defendant ID number
  DEFENDANT_ID_INPUT: `
    #defendantId,
    input[name="defendantId"],
    input[name="defendantIdNumber"],
    [data-field="defendantIdNumber"] input
  `,

  // Defendant address
  DEFENDANT_ADDRESS_INPUT: `
    #defendantAddress,
    textarea[name="defendantAddress"],
    [data-field="defendantAddress"] textarea
  `,

  // Defendant phone
  DEFENDANT_PHONE_INPUT: `
    #defendantPhone,
    input[name="defendantPhone"],
    [data-field="defendantPhone"] input
  `,

  // Contract number
  CONTRACT_NUMBER_INPUT: `
    #contractNumber,
    input[name="contractNumber"],
    [data-field="contractNumber"] input
  `,

  // Vehicle info (for rental cases)
  VEHICLE_MAKE_INPUT: `
    #vehicleMake,
    input[name="vehicleMake"],
    [data-field="vehicleMake"] input
  `,

  VEHICLE_MODEL_INPUT: `
    #vehicleModel,
    input[name="vehicleModel"],
    [data-field="vehicleModel"] input
  `,

  VEHICLE_YEAR_INPUT: `
    #vehicleYear,
    input[name="vehicleYear"],
    [data-field="vehicleYear"] input
  `,

  VEHICLE_PLATE_INPUT: `
    #vehiclePlate,
    input[name="vehiclePlate"],
    input[name="plateNumber"],
    [data-field="plateNumber"] input
  `,

  // ============================================
  // Section 5: Facts (الوقائع)
  // ============================================

  FACTS_TEXTAREA: `
    #facts,
    textarea[name="facts"],
    [data-field="facts"] textarea,
    .facts-editor
  `,

  // ============================================
  // Section 6: Claims (الطلبات)
  // ============================================

  CLAIMS_TEXTAREA: `
    #claims,
    textarea[name="claims"],
    [data-field="claims"] textarea,
    .claims-editor
  `,

  // ============================================
  // Section 7: Amounts (المبالغ)
  // ============================================

  // Principal amount
  AMOUNT_PRINCIPAL_INPUT: `
    #principalAmount,
    input[name="principalAmount"],
    [data-field="principalAmount"] input
  `,

  // Late fees
  AMOUNT_LATE_FEES_INPUT: `
    #lateFees,
    input[name="lateFees"],
    [data-field="lateFees"] input
  `,

  // Violations fines
  AMOUNT_VIOLATIONS_INPUT: `
    #violationsFines,
    input[name="violationsFines"],
    [data-field="violationsFines"] input
  `,

  // Other fees
  AMOUNT_OTHER_INPUT: `
    #otherFees,
    input[name="otherFees"],
    [data-field="otherFees"] input
  `,

  // Total amount
  AMOUNT_TOTAL_INPUT: `
    #totalAmount,
    input[name="totalAmount"],
    [data-field="totalAmount"] input
  `,

  // Amount in words
  AMOUNT_WORDS_INPUT: `
    #amountInWords,
    input[name="amountInWords"],
    textarea[name="amountInWords"],
    [data-field="amountInWords"] textarea
  `,

  // Currency (usually QAR)
  CURRENCY_SELECT: `
    #currency,
    select[name="currency"],
    [data-field="currency"] select
  `,

  CURRENCY_QAR: 'option[value="QAR"], option:has-text("ريال قطري"), option:has-text("QAR")',

  // ============================================
  // Section 8: Dates (التواريخ)
  // ============================================

  // Incident date
  INCIDENT_DATE_INPUT: `
    #incidentDate,
    input[name="incidentDate"],
    input[type="date"][name*="incident"],
    [data-field="incidentDate"] input
  `,

  // Claim date
  CLAIM_DATE_INPUT: `
    #claimDate,
    input[name="claimDate"],
    input[type="date"][name*="claim"],
    [data-field="claimDate"] input
  `,

  // ============================================
  // Section 9: Document Uploads
  // ============================================

  // Commercial register upload
  UPLOAD_COMMERCIAL_REGISTER: `
    #commercialRegister,
    input[type="file"][name*="commercial"],
    [data-document="commercial_register"] input[type="file"]
  `,

  // IBAN certificate upload
  UPLOAD_IBAN: `
    #ibanCertificate,
    input[type="file"][name*="iban"],
    [data-document="iban_certificate"] input[type="file"]
  `,

  // Representative ID upload
  UPLOAD_REPRESENTATIVE_ID: `
    #representativeId,
    input[type="file"][name*="representative"],
    [data-document="representative_id"] input[type="file"]
  `,

  // Explanatory memo upload
  UPLOAD_MEMO: `
    #explanatoryMemo,
    input[type="file"][name*="memo"],
    [data-document="explanatory_memo"] input[type="file"]
  `,

  // Contract copy upload
  UPLOAD_CONTRACT: `
    #contractCopy,
    input[type="file"][name*="contract"],
    [data-document="contract_copy"] input[type="file"]
  `,

  // Claims statement upload
  UPLOAD_CLAIMS: `
    #claimsStatement,
    input[type="file"][name*="claims"],
    [data-document="claims_statement"] input[type="file"]
  `,

  // General file input (fallback)
  UPLOAD_ANY: 'input[type="file"]',

  // ============================================
  // Section 10: Action Buttons
  // ============================================

  // Save as draft
  SAVE_DRAFT_BUTTON: `
    #saveDraft,
    button:has-text("حفظ مسودة"),
    button:has-text("Save Draft"),
    input[type="submit"][value*="draft"]
  `,

  // Submit case
  SUBMIT_BUTTON: `
    #submit,
    button:has-text("إرسال"),
    button:has-text("رفع الدعوى"),
    button:has-text("Submit"),
    input[type="submit"][value*="submit"],
    input[type="submit"][value*="رفع"]
  `,

  // Cancel
  CANCEL_BUTTON: `
    #cancel,
    button:has-text("إلغاء"),
    button:has-text("Cancel")
  `,

  // ============================================
  // Section 11: Success/Error Indicators
  // ============================================

  SUCCESS_MESSAGE: '.success-message, .alert-success, [role="status"]:has-text("نجح")',
  ERROR_MESSAGE: '.error-message, .alert-danger, [role="alert"]',
  VALIDATION_ERROR: '.field-error, .validation-error, .error:has(span)',
  LOADING_INDICATOR: '.loading, .spinner, [role="progressbar"]',

  // Case reference number (after submission)
  CASE_REFERENCE: '.case-reference, .reference-number, [data-field="caseReference"]',

} as const;

// ==========================================
// Helper Selectors
// ==========================================

/**
 * Dynamic selector generators
 * These functions return selectors based on dynamic values
 */
export const DynamicSelectors = {
  /**
   * Get label-based input selector
   * Finds input by its associated label text
   */
  byLabel: (labelText: string) => `
    label:has-text("${labelText}") ~ input,
    label:has-text("${labelText}") ~ textarea,
    label:has-text("${labelText}") ~ select,
    label[for*="${labelText}"]
  `,

  /**
   * Get placeholder-based selector
   */
  byPlaceholder: (placeholder: string) => `
    input[placeholder*="${placeholder}"],
    textarea[placeholder*="${placeholder}"]
  `,

  /**
   * Get aria-label selector
   */
  byAriaLabel: (ariaLabel: string) => `
    [aria-label*="${ariaLabel}"]
  `,

  /**
   * Get data attribute selector
   */
  byDataAttribute: (attr: string, value: string) => `
    [data-${attr}*="${value}"]
  `,
} as const;

// ==========================================
// Selector Groups
// ==========================================

/**
 * Grouped selectors for common operations
 */
export const SELECTOR_GROUPS = {
  // All plaintiff fields
  PLAINTIFF: [
    CASE_FORM_SELECTORS.PLAINTIFF_NAME_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_CR_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_ADDRESS_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_PHONE_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_EMAIL_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_IBAN_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_REP_NAME_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_REP_ID_INPUT,
    CASE_FORM_SELECTORS.PLAINTIFF_REP_POSITION_INPUT,
  ],

  // All defendant fields
  DEFENDANT: [
    CASE_FORM_SELECTORS.DEFENDANT_TYPE_SELECT,
    CASE_FORM_SELECTORS.DEFENDANT_NAME_INPUT,
    CASE_FORM_SELECTORS.DEFENDANT_ID_INPUT,
    CASE_FORM_SELECTORS.DEFENDANT_ADDRESS_INPUT,
    CASE_FORM_SELECTORS.DEFENDANT_PHONE_INPUT,
  ],

  // All amount fields
  AMOUNTS: [
    CASE_FORM_SELECTORS.AMOUNT_PRINCIPAL_INPUT,
    CASE_FORM_SELECTORS.AMOUNT_LATE_FEES_INPUT,
    CASE_FORM_SELECTORS.AMOUNT_VIOLATIONS_INPUT,
    CASE_FORM_SELECTORS.AMOUNT_OTHER_INPUT,
    CASE_FORM_SELECTORS.AMOUNT_TOTAL_INPUT,
    CASE_FORM_SELECTORS.AMOUNT_WORDS_INPUT,
  ],

  // All document uploads
  DOCUMENTS: [
    CASE_FORM_SELECTORS.UPLOAD_COMMERCIAL_REGISTER,
    CASE_FORM_SELECTORS.UPLOAD_IBAN,
    CASE_FORM_SELECTORS.UPLOAD_REPRESENTATIVE_ID,
    CASE_FORM_SELECTORS.UPLOAD_MEMO,
    CASE_FORM_SELECTORS.UPLOAD_CONTRACT,
    CASE_FORM_SELECTORS.UPLOAD_CLAIMS,
  ],
} as const;

// ==========================================
// Fallback Selectors
// ==========================================

/**
 * Fallback selectors for when primary selectors fail
 * These use more generic patterns
 */
export const FALLBACK_SELECTORS = {
  INPUT_BY_INDEX: (index: number) => `input[type="text"]:nth-of-type(${index})`,
  TEXTAREA_BY_INDEX: (index: number) => `textarea:nth-of-type(${index})`,
  SELECT_BY_INDEX: (index: number) => `select:nth-of-type(${index})`,
  FILE_INPUT: 'input[type="file"]',
} as const;

// ==========================================
// Wait Conditions
// ==========================================

export const WAIT_CONDITIONS = {
  // Wait for network idle (no more than 2 requests for 500ms)
  NETWORK_IDLE: 'networkidle',

  // Wait for element to be visible
  VISIBLE: 'visible',

  // Wait for element to be attached to DOM
  ATTACHED: 'attached',

  // Default timeout (milliseconds)
  DEFAULT_TIMEOUT: 30000,

  // Navigation timeout
  NAVIGATION_TIMEOUT: 60000,
} as const;
