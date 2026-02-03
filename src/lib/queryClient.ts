/**
 * Consolidated React Query Client Configuration
 * 
 * This file re-exports from the main query-client.ts for backward compatibility.
 * All new code should import from './query-client' directly.
 */

// Export main query client functions and objects
export { getQueryClient, queryClient, queryKeys } from './query-client';
export type { QueryKeysType } from './query-client';

// Note: Optimized query/mutation functions are available in the original queryClient.ts
// Import them directly from there if needed: import { createOptimizedQueryFn } from './queryClient';
