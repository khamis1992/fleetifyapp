/**
 * Taqadi Integration Service
 * Index file for easy imports
 *
 * @example
 * ```typescript
 * import { taqadiService } from '@/services/taqadi';
 *
 * const result = await taqadiService.prepareForSubmission(contractId, companyId);
 * ```
 */

// Main service
export { taqadiService, TaqadiService } from './TaqadiService';

// Types
export * from './TaqadiTypes';

// Sub-services
export { taqadiDataExtractor, TaqadiDataExtractor } from './TaqadiDataExtractor';
export { taqadiValidator, TaqadiValidator } from './TaqadiValidator';

// Browser automation
export {
  TaqadiBrowserAutomation,
  createTaqadiAutomation,
} from './TaqadiBrowserAutomation';
export type {
  BrowserAutomationConfig,
  AutomationResult,
  AutomationStep,
} from './TaqadiBrowserAutomation';

// Selectors
export {
  TAQADI_URLS,
  CASE_FORM_SELECTORS,
  LOGIN_SELECTORS,
  SELECTOR_GROUPS,
  WAIT_CONDITIONS,
} from './TaqadiSelectors';
