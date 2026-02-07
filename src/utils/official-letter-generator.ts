/**
 * مولد الكتب الرسمية الموحد
 * يستخدم نفس التنسيق في جميع أنحاء التطبيق
 *
 * This file re-exports everything from the modular structure
 * under src/utils/official-letters/ to maintain backward compatibility.
 */

export {
  // Types
  type OfficialLetterData,
  type ClaimsStatementData,
  type DocumentsListData,
  type CriminalComplaintData,
  type ViolationsTransferData,
  type ExplanatoryMemoData,
  type DocumentPortfolioData,

  // Shared constants and helpers
  COMPANY_INFO,
  generateRefNumber,
  formatDateAr,
  extractHtmlBody,
  formatNumberEn,
  formatDateEn,
  formatPhoneNumber,

  // CSS styles
  getOfficialLetterStyles,

  // Header and signature templates
  generateOfficialHeader,
  generateSignatureSection,

  // Official letter
  generateOfficialLetter,

  // Explanatory memo
  generateExplanatoryMemoHtml,

  // Documents list
  generateDocumentsListHtml,

  // Claims statement
  generateClaimsStatementHtml,

  // Violations transfer and criminal complaint
  generateViolationsTransferHtml,
  generateCriminalComplaintHtml,

  // Document portfolio
  generateDocumentPortfolioHtml,

  // Print utility
  openLetterForPrint,
} from './official-letters';
