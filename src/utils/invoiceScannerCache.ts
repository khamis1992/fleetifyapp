/**
 * Advanced Caching System for Invoice Scanner
 * Phase 2 Priority: Improve performance through intelligent caching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
  accessCount: number;
  lastAccessed: number;
}

interface CustomerCacheEntry {
  id: string;
  name: string;
  phone?: string;
  contracts: Array<{
    id: string;
    contract_number: string;
    car_number?: string;
    monthly_amount?: number;
  }>;
}

interface OCRCacheEntry {
  text: string;
  confidence: number;
  language: string;
  structured_data: any;
}

class InvoiceScannerCache {
  private customerCache = new Map<string, CacheEntry<CustomerCacheEntry[]>>();
  private ocrCache = new Map<string, CacheEntry<OCRCacheEntry>>();
  private matchingCache = new Map<string, CacheEntry<any>>();
  
  // Cache configuration
  private readonly CUSTOMER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly OCR_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MATCHING_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Generate cache key from image file
   */
  private async generateImageKey(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Generate cache key from text content
   */
  private generateTextKey(text: string): string {
    // Simple hash function for text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Cache customers for a company
   */
  cacheCustomers(companyId: string, customers: CustomerCacheEntry[]): void {
    const key = `customers_${companyId}`;
    const entry: CacheEntry<CustomerCacheEntry[]> = {
      data: customers,
      timestamp: Date.now(),
      expires: Date.now() + this.CUSTOMER_CACHE_TTL,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    this.customerCache.set(key, entry);
    this.cleanupCache();
  }

  /**
   * Get cached customers for a company
   */
  getCachedCustomers(companyId: string): CustomerCacheEntry[] | null {
    const key = `customers_${companyId}`;
    const entry = this.customerCache.get(key);
    
    if (!entry || Date.now() > entry.expires) {
      this.customerCache.delete(key);
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  /**
   * Cache OCR result
   */
  async cacheOCRResult(file: File, result: OCRCacheEntry): Promise<void> {
    try {
      const key = await this.generateImageKey(file);
      const entry: CacheEntry<OCRCacheEntry> = {
        data: result,
        timestamp: Date.now(),
        expires: Date.now() + this.OCR_CACHE_TTL,
        accessCount: 0,
        lastAccessed: Date.now()
      };
      
      this.ocrCache.set(key, entry);
      this.cleanupCache();
    } catch (error) {
      console.warn('Failed to cache OCR result:', error);
    }
  }

  /**
   * Get cached OCR result
   */
  async getCachedOCRResult(file: File): Promise<OCRCacheEntry | null> {
    try {
      const key = await this.generateImageKey(file);
      const entry = this.ocrCache.get(key);
      
      if (!entry || Date.now() > entry.expires) {
        this.ocrCache.delete(key);
        return null;
      }
      
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      return entry.data;
    } catch (error) {
      console.warn('Failed to get cached OCR result:', error);
      return null;
    }
  }

  /**
   * Cache matching result
   */
  cacheMatchingResult(customerName: string, carNumber: string, result: any): void {
    const key = `match_${this.generateTextKey(`${customerName}_${carNumber}`)}`;
    const entry: CacheEntry<any> = {
      data: result,
      timestamp: Date.now(),
      expires: Date.now() + this.MATCHING_CACHE_TTL,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    this.matchingCache.set(key, entry);
    this.cleanupCache();
  }

  /**
   * Get cached matching result
   */
  getCachedMatchingResult(customerName: string, carNumber: string): any | null {
    const key = `match_${this.generateTextKey(`${customerName}_${carNumber}`)}`;
    const entry = this.matchingCache.get(key);
    
    if (!entry || Date.now() > entry.expires) {
      this.matchingCache.delete(key);
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  /**
   * Preload frequently used customers
   */
  async preloadFrequentCustomers(companyId: string, supabaseClient: any): Promise<void> {
    try {
      // Check if already cached and recent
      const cached = this.getCachedCustomers(companyId);
      if (cached) return;

      console.log('Preloading frequent customers for company:', companyId);

      const { data: customers } = await supabaseClient
        .from('customers')
        .select(`
          id,
          first_name_ar,
          last_name_ar,
          first_name,
          last_name,
          company_name_ar,
          company_name,
          phone,
          customer_type,
          contracts(
            id,
            contract_number,
            monthly_amount,
            car_number,
            status
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(200); // Limit for performance

      if (customers) {
        const processedCustomers = customers.map((customer: any) => ({
          id: customer.id,
          name: customer.company_name_ar || customer.company_name || 
                `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim(),
          phone: customer.phone,
          contracts: customer.contracts || []
        }));

        this.cacheCustomers(companyId, processedCustomers);
        console.log(`Cached ${processedCustomers.length} customers for company ${companyId}`);
      }
    } catch (error) {
      console.error('Failed to preload customers:', error);
    }
  }

  /**
   * Smart cache cleanup based on access patterns
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Clean expired entries
    for (const [key, entry] of this.customerCache.entries()) {
      if (now > entry.expires) {
        this.customerCache.delete(key);
      }
    }

    for (const [key, entry] of this.ocrCache.entries()) {
      if (now > entry.expires) {
        this.ocrCache.delete(key);
      }
    }

    for (const [key, entry] of this.matchingCache.entries()) {
      if (now > entry.expires) {
        this.matchingCache.delete(key);
      }
    }

    // If still over limit, remove least recently used entries
    if (this.ocrCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.ocrCache.entries())
        .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE + 100);
      toRemove.forEach(([key]) => this.ocrCache.delete(key));
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    
    const customerStats = Array.from(this.customerCache.values()).reduce((acc, entry) => {
      acc.total++;
      if (now <= entry.expires) acc.valid++;
      acc.totalAccesses += entry.accessCount;
      return acc;
    }, { total: 0, valid: 0, totalAccesses: 0 });

    const ocrStats = Array.from(this.ocrCache.values()).reduce((acc, entry) => {
      acc.total++;
      if (now <= entry.expires) acc.valid++;
      acc.totalAccesses += entry.accessCount;
      return acc;
    }, { total: 0, valid: 0, totalAccesses: 0 });

    const matchingStats = Array.from(this.matchingCache.values()).reduce((acc, entry) => {
      acc.total++;
      if (now <= entry.expires) acc.valid++;
      acc.totalAccesses += entry.accessCount;
      return acc;
    }, { total: 0, valid: 0, totalAccesses: 0 });

    return {
      customers: customerStats,
      ocr: ocrStats,
      matching: matchingStats,
      memory: {
        customerCache: this.customerCache.size,
        ocrCache: this.ocrCache.size,
        matchingCache: this.matchingCache.size
      }
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.customerCache.clear();
    this.ocrCache.clear();
    this.matchingCache.clear();
    console.log('All caches cleared');
  }

  /**
   * Warm up cache with popular data
   */
  async warmUpCache(companyId: string, supabaseClient: any): Promise<void> {
    console.log('Warming up cache for company:', companyId);
    
    // Preload customers in background
    this.preloadFrequentCustomers(companyId, supabaseClient);
    
    // Additional warm-up logic can be added here
  }
}

// Export singleton instance
export const invoiceScannerCache = new InvoiceScannerCache();

// Export hook for React components
export function useInvoiceScannerCache() {
  return {
    cacheCustomers: invoiceScannerCache.cacheCustomers.bind(invoiceScannerCache),
    getCachedCustomers: invoiceScannerCache.getCachedCustomers.bind(invoiceScannerCache),
    cacheOCRResult: invoiceScannerCache.cacheOCRResult.bind(invoiceScannerCache),
    getCachedOCRResult: invoiceScannerCache.getCachedOCRResult.bind(invoiceScannerCache),
    cacheMatchingResult: invoiceScannerCache.cacheMatchingResult.bind(invoiceScannerCache),
    getCachedMatchingResult: invoiceScannerCache.getCachedMatchingResult.bind(invoiceScannerCache),
    preloadFrequentCustomers: invoiceScannerCache.preloadFrequentCustomers.bind(invoiceScannerCache),
    warmUpCache: invoiceScannerCache.warmUpCache.bind(invoiceScannerCache),
    getCacheStats: invoiceScannerCache.getCacheStats.bind(invoiceScannerCache),
    clearAll: invoiceScannerCache.clearAll.bind(invoiceScannerCache)
  };
}