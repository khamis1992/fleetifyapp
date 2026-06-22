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

// Selectors (useful for bookmarklet)
export {
  TAQADI_URLS,
  CASE_FORM_SELECTORS,
  LOGIN_SELECTORS,
  SELECTOR_GROUPS,
  WAIT_CONDITIONS,
} from './TaqadiSelectors';

// Note: TaqadiBrowserAutomation is NOT exported here because it requires
// Playwright which is a Node.js-only library. Use the bookmarklet approach
// for client-side form filling instead.
