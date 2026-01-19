/**
 * Phase 7: Strategic Caching Configuration
 * 
 * Different cache strategies for different data types
 * to optimize performance and reduce unnecessary API calls
 */

export const CACHE_TIERS = {
  // Tier 1: Static/Master Data - Changes rarely
  STATIC: {
    staleTime: 30 * 60 * 1000,  // 30 minutes
    gcTime: 60 * 60 * 1000,      // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Tier 2: Semi-Static Data - Changes occasionally
  SEMI_STATIC: {
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Tier 3: Dynamic Data - Changes frequently
  DYNAMIC: {
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Tier 4: Real-time Data - Always fresh
  REALTIME: {
    staleTime: 1 * 60 * 1000,   // 1 minute
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  },
} as const;

/**
 * Helper function to get cache config by data type
 */
export function getCacheConfig(dataType: 'static' | 'semi-static' | 'dynamic' | 'realtime') {
  switch (dataType) {
    case 'static':
      return CACHE_TIERS.STATIC;
    case 'semi-static':
      return CACHE_TIERS.SEMI_STATIC;
    case 'dynamic':
      return CACHE_TIERS.DYNAMIC;
    case 'realtime':
      return CACHE_TIERS.REALTIME;
    default:
      return CACHE_TIERS.DYNAMIC;
  }
}

/**
 * Data type classifications
 */
export const DATA_TYPE_CLASSIFICATION = {
  // Static data
  vendors: 'static',
  customers: 'static',
  vehicles: 'static',
  vendorCategories: 'static',
  
  // Semi-static data
  contracts: 'semi-static',
  invoices: 'semi-static',
  reports: 'semi-static',
  
  // Dynamic data
  payments: 'dynamic',
  transactions: 'dynamic',
  balances: 'dynamic',
  
  // Real-time data
  notifications: 'realtime',
  liveStatus: 'realtime',
} as const;
