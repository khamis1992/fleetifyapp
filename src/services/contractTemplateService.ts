/**
 * Contract Template Learning Service
 * 
 * Learns from successful extractions to improve future accuracy and speed.
 * Stores patterns in localStorage for persistence across sessions.
 * 
 * Features:
 * - Pattern recognition for contract types
 * - Important page identification
 * - Field location mapping
 * - Success rate tracking
 */

interface ContractPattern {
  id: string;
  // Source that created this pattern
  source: 'direct' | 'tesseract' | 'deepseek' | 'manual';
  // Regex patterns for key fields
  fieldPatterns: Record<string, string[]>;
  // Which pages typically contain data
  importantPages: number[];
  // Confidence score
  confidence: number;
  // Usage statistics
  usageCount: number;
  lastUsed: number;
  successRate: number;
  // File characteristics
  avgFileSize: number;
  avgTextLength: number;
}

interface ExtractionResult {
  text: string;
  customerName?: string;
  qatariId?: string;
  plateNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  [key: string]: any;
}

const STORAGE_KEY = 'contract_patterns_v2';
const MAX_PATTERNS = 50;

class ContractTemplateService {
  private patterns: ContractPattern[] = [];
  private initialized = false;

  constructor() {
    this.loadPatterns();
  }

  private loadPatterns(): void {
    if (this.initialized) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.patterns = JSON.parse(stored);
        console.log(`[TemplateService] Loaded ${this.patterns.length} patterns`);
      }
    } catch (error) {
      console.error('[TemplateService] Failed to load patterns:', error);
      this.patterns = [];
    }

    this.initialized = true;
  }

  private savePatterns(): void {
    try {
      // Keep only the most successful patterns
      const sortedPatterns = this.patterns
        .sort((a, b) => (b.successRate * b.usageCount) - (a.successRate * a.usageCount))
        .slice(0, MAX_PATTERNS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedPatterns));
    } catch (error) {
      console.error('[TemplateService] Failed to save patterns:', error);
    }
  }

  /**
   * Learn from a successful extraction
   */
  learnFromExtraction(
    source: 'direct' | 'tesseract' | 'deepseek' | 'manual',
    result: ExtractionResult,
    pagesUsed: number[],
    confidence: number,
    metadata: { fileSize?: number }
  ): void {
    const textLength = result.text?.length || 0;

    // Extract patterns from the text for each found field
    const fieldPatterns: Record<string, string[]> = {};

    if (result.customerName) {
      fieldPatterns.customerName = this.extractPatternContext(result.text, result.customerName);
    }
    if (result.qatariId) {
      fieldPatterns.qatariId = this.extractPatternContext(result.text, result.qatariId);
    }
    if (result.plateNumber) {
      fieldPatterns.plateNumber = this.extractPatternContext(result.text, result.plateNumber);
    }

    // Find or create pattern
    const existingPattern = this.patterns.find(p => 
      p.source === source && 
      Math.abs(p.avgTextLength - textLength) < 1000
    );

    if (existingPattern) {
      // Update existing pattern
      existingPattern.usageCount++;
      existingPattern.lastUsed = Date.now();
      existingPattern.confidence = (existingPattern.confidence + confidence) / 2;
      existingPattern.successRate = Math.min(1, existingPattern.successRate * 0.9 + 0.1);

      // Merge important pages
      pagesUsed.forEach(page => {
        if (!existingPattern.importantPages.includes(page)) {
          existingPattern.importantPages.push(page);
        }
      });

      // Merge field patterns
      Object.entries(fieldPatterns).forEach(([field, patterns]) => {
        if (!existingPattern.fieldPatterns[field]) {
          existingPattern.fieldPatterns[field] = [];
        }
        patterns.forEach(p => {
          if (!existingPattern.fieldPatterns[field].includes(p)) {
            existingPattern.fieldPatterns[field].push(p);
          }
        });
        // Keep only top 5 patterns per field
        existingPattern.fieldPatterns[field] = existingPattern.fieldPatterns[field].slice(0, 5);
      });

    } else {
      // Create new pattern
      const newPattern: ContractPattern = {
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source,
        fieldPatterns,
        importantPages: pagesUsed,
        confidence,
        usageCount: 1,
        lastUsed: Date.now(),
        successRate: 1,
        avgFileSize: metadata.fileSize || 0,
        avgTextLength: textLength,
      };

      this.patterns.push(newPattern);
      console.log(`[TemplateService] Created new pattern: ${newPattern.id}`);
    }

    this.savePatterns();
  }

  /**
   * Extract the context around a found value to create a pattern
   */
  private extractPatternContext(text: string, value: string): string[] {
    const patterns: string[] = [];
    const index = text.indexOf(value);

    if (index === -1) return patterns;

    // Get surrounding context (20 chars before and after)
    const before = text.substring(Math.max(0, index - 30), index).trim();
    const after = text.substring(index + value.length, index + value.length + 30).trim();

    // Create patterns from context
    if (before.length > 5) {
      patterns.push(before.substring(before.length - 20));
    }
    if (after.length > 5) {
      patterns.push(after.substring(0, 20));
    }

    return patterns;
  }

  /**
   * Get recommended pages to process based on learned patterns
   */
  getRecommendedPages(): number[] {
    if (this.patterns.length === 0) {
      return [0, 1]; // Default: first 2 pages
    }

    // Aggregate important pages from successful patterns
    const pageScores: Record<number, number> = {};

    this.patterns.forEach(pattern => {
      pattern.importantPages.forEach(page => {
        pageScores[page] = (pageScores[page] || 0) + (pattern.successRate * pattern.usageCount);
      });
    });

    // Sort by score and return top pages
    const sortedPages = Object.entries(pageScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([page]) => parseInt(page));

    return sortedPages.length > 0 ? sortedPages : [0, 1];
  }

  /**
   * Get recommended extraction method based on history
   */
  getRecommendedMethod(): 'direct' | 'tesseract' | 'deepseek' {
    if (this.patterns.length === 0) {
      return 'direct';
    }

    // Calculate weighted scores for each method
    const methodScores: Record<string, number> = { direct: 0, tesseract: 0, deepseek: 0 };

    this.patterns.forEach(pattern => {
      const score = pattern.successRate * pattern.usageCount * pattern.confidence;
      methodScores[pattern.source] = (methodScores[pattern.source] || 0) + score;
    });

    // Return method with highest score
    const sortedMethods = Object.entries(methodScores)
      .filter(([method]) => ['direct', 'tesseract', 'deepseek'].includes(method))
      .sort(([, a], [, b]) => b - a);

    return (sortedMethods[0]?.[0] || 'direct') as 'direct' | 'tesseract' | 'deepseek';
  }

  /**
   * Get field-specific patterns for enhanced extraction
   */
  getFieldPatterns(field: string): string[] {
    const allPatterns: string[] = [];

    this.patterns.forEach(pattern => {
      if (pattern.fieldPatterns[field]) {
        allPatterns.push(...pattern.fieldPatterns[field]);
      }
    });

    // Deduplicate
    return [...new Set(allPatterns)];
  }

  /**
   * Report extraction failure to decrease success rate
   */
  reportFailure(source: 'direct' | 'tesseract' | 'deepseek'): void {
    const recentPattern = this.patterns
      .filter(p => p.source === source)
      .sort((a, b) => b.lastUsed - a.lastUsed)[0];

    if (recentPattern) {
      recentPattern.successRate = recentPattern.successRate * 0.8;
      this.savePatterns();
    }
  }

  /**
   * Get statistics about learned patterns
   */
  getStatistics(): {
    totalPatterns: number;
    totalExtractions: number;
    avgSuccessRate: number;
    methodBreakdown: Record<string, number>;
  } {
    const totalExtractions = this.patterns.reduce((sum, p) => sum + p.usageCount, 0);
    const avgSuccessRate = this.patterns.length > 0
      ? this.patterns.reduce((sum, p) => sum + p.successRate, 0) / this.patterns.length
      : 0;

    const methodBreakdown: Record<string, number> = {};
    this.patterns.forEach(p => {
      methodBreakdown[p.source] = (methodBreakdown[p.source] || 0) + p.usageCount;
    });

    return {
      totalPatterns: this.patterns.length,
      totalExtractions,
      avgSuccessRate,
      methodBreakdown,
    };
  }

  /**
   * Clear all learned patterns
   */
  clearPatterns(): void {
    this.patterns = [];
    localStorage.removeItem(STORAGE_KEY);
    console.log('[TemplateService] All patterns cleared');
  }
}

// Singleton instance
let instance: ContractTemplateService | null = null;

export function getContractTemplateService(): ContractTemplateService {
  if (!instance) {
    instance = new ContractTemplateService();
  }
  return instance;
}

export { ContractTemplateService };
