/**
 * مولد الكتب الرسمية الموحد
 * يستخدم نفس التنسيق في جميع أنحاء التطبيق
 *
 * Barrel export - re-exports all modules
 */

// Types
export type {
  OfficialLetterData,
  ClaimsStatementData,
  DocumentsListData,
  CriminalComplaintData,
  ViolationsTransferData,
  ExplanatoryMemoData,
  DocumentPortfolioData,
} from './types';

// Shared constants and helpers
export { COMPANY_INFO, generateRefNumber, formatDateAr, extractHtmlBody, formatNumberEn, formatDateEn, formatPhoneNumber } from './shared';

// CSS styles
export { getOfficialLetterStyles } from './styles';

// Header and signature templates
export { generateOfficialHeader, generateSignatureSection } from './templates';

// Official letter
export { generateOfficialLetter } from './official-letter';

// Explanatory memo
export { generateExplanatoryMemoHtml } from './explanatory-memo';

// Documents list
export { generateDocumentsListHtml } from './documents-list';

// Claims statement
export { generateClaimsStatementHtml } from './claims-statement';

// Violations transfer and criminal complaint
export { generateViolationsTransferHtml, generateCriminalComplaintHtml } from './violations-transfer';

// Document portfolio
export { generateDocumentPortfolioHtml } from './document-portfolio';

// Print utility
export { openLetterForPrint } from './print';
