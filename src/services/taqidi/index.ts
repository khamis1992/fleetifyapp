/**
 * Taqadi Integration Service
 * Index file for easy imports
 *
 * @example
 * ```typescript
 * import { taqadiService } from '@/services/taqidi';
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
