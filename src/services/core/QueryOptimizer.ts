/**
 * Database Query Optimization Utilities
 *
 * Automatic query optimization, N+1 detection and resolution
 * Provides indexing recommendations and performance improvements
 * Optimized for Supabase/PostgreSQL queries
 */

import { logger } from '@/lib/logger';

export interface QueryPlan {
  query: string;
  params?: any[];
  estimatedCost?: number;
  indexes?: string[];
  recommendations?: QueryRecommendation[];
}

export interface QueryRecommendation {
  type: 'index' | 'join_optimization' | 'pagination' | 'filter_optimization' | 'select_optimization';
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedImprovement: number; // percentage
  sql?: string;
  reason: string;
}

export interface QueryMetrics {
  executionTime: number;
  rowsReturned: number;
  rowsExamined: number;
  indexesUsed: string[];
  tableScans: number;
  sortOperations: number;
  hashOperations: number;
  joinOperations: number;
}

export interface OptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  metrics: QueryMetrics;
  recommendations: QueryRecommendation[];
  improvementEstimate: number;
  beforeMetrics?: QueryMetrics;
  afterMetrics?: QueryMetrics;
}

export interface N1DetectionResult {
  hasN1Problem: boolean;
  pattern: string;
  affectedQueries: string[];
  recommendedSolution: string;
  estimatedImpact: number;
}

/**
 * Query Optimizer for database performance
 */
export class QueryOptimizer {
  private queryCache = new Map<string, OptimizationResult>();
  private indexCache = new Map<string, string[]>();
  private analysisCache = new Map<string, QueryRecommendation[]>();

  private config: {
    enableCache: boolean;
    maxCacheSize: number;
    analysisTimeout: number;
    enableAutoOptimization: boolean;
  };

  constructor(config: Partial<typeof QueryOptimizer.prototype.config> = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      maxCacheSize: config.maxCacheSize || 1000,
      analysisTimeout: config.analysisTimeout || 5000,
      enableAutoOptimization: config.enableAutoOptimization ?? false,
      ...config
    };

    logger.info('QueryOptimizer initialized', {
      config: this.config
    });
  }

  /**
   * Optimize a database query
   */
  async optimizeQuery(query: string, params?: any[]): Promise<OptimizationResult> {
    const cacheKey = this.createQueryCacheKey(query, params);

    if (this.config.enableCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      logger.debug('Query optimization returned from cache', { query: query.substring(0, 50) });
      return cached;
    }

    const startTime = performance.now();

    try {
      // Analyze the original query
      const originalMetrics = await this.analyzeQuery(query, params);
      const recommendations = await this.analyzeRecommendations(query, params);

      // Generate optimized query
      const optimizedQuery = await this.generateOptimizedQuery(query, params, recommendations);

      // Measure optimized query if auto-optimization is enabled
      let optimizedMetrics: QueryMetrics | undefined;
      if (this.config.enableAutoOptimization) {
        optimizedMetrics = await this.analyzeQuery(optimizedQuery, params);
      }

      const result: OptimizationResult = {
        originalQuery: query,
        optimizedQuery,
        metrics: originalMetrics,
        recommendations,
        improvementEstimate: this.calculateImprovement(originalMetrics, optimizedMetrics),
        beforeMetrics: originalMetrics,
        afterMetrics: optimizedMetrics
      };

      // Cache the result
      if (this.config.enableCache) {
        this.cacheResult(cacheKey, result);
      }

      const analysisTime = performance.now() - startTime;
      logger.debug('Query optimization completed', {
        queryLength: query.length,
        recommendationsCount: recommendations.length,
        improvementEstimate: result.improvementEstimate,
        analysisTime: analysisTime.toFixed(2) + 'ms'
      });

      return result;

    } catch (error) {
      const analysisTime = performance.now() - startTime;
      logger.error('Query optimization failed', {
        query: query.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
        analysisTime: analysisTime.toFixed(2) + 'ms'
      });

      // Return original query as fallback
      return {
        originalQuery: query,
        optimizedQuery: query,
        metrics: { executionTime: 0, rowsReturned: 0, rowsExamined: 0, indexesUsed: [], tableScans: 0, sortOperations: 0, hashOperations: 0, joinOperations: 0 },
        recommendations: [],
        improvementEstimate: 0
      };
    }
  }

  /**
   * Detect N+1 query problems
   */
  async detectN1Problems(queries: string[]): Promise<N1DetectionResult[]> {
    const results: N1DetectionResult[] = [];

    // Group similar queries
    const queryGroups = this.groupSimilarQueries(queries);

    for (const [pattern, groupedQueries] of queryGroups.entries()) {
      if (groupedQueries.length > 5) { // Potential N+1 problem
        const result = await this.analyzeN1Pattern(pattern, groupedQueries);
        results.push(result);
      }
    }

    logger.info('N+1 query analysis completed', {
      totalQueries: queries.length,
      groupsAnalyzed: queryGroups.size,
      problemsDetected: results.length
    });

    return results;
  }

  /**
   * Generate batch query to replace N+1 queries
   */
  generateBatchQuery(baseQuery: string, ids: string[]): string {
    // Detect the pattern and create an optimized batch query
    if (baseQuery.includes('WHERE id =')) {
      // Replace single ID query with IN clause
      const batchQuery = baseQuery.replace(
        /WHERE id = \$\d+/,
        `WHERE id = ANY($${ids.length})`
      );
      return batchQuery;
    }

    if (baseQuery.includes('WHERE')) {
      // Add OR conditions for batch
      const orConditions = ids.map((_, i) => `id = $${i + 1}`).join(' OR ');
      return baseQuery.replace(/WHERE .+/, `WHERE (${orConditions})`);
    }

    // Default: append WHERE IN clause
    return `${baseQuery} WHERE id = ANY($${ids.length})`;
  }

  /**
   * Recommend indexes for tables
   */
  async recommendIndexes(tableName: string, sampleQueries: string[]): Promise<QueryRecommendation[]> {
    const cacheKey = `${tableName}_${sampleQueries.length}`;

    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const recommendations: QueryRecommendation[] = [];

    // Analyze WHERE clauses
    const whereColumns = this.extractWhereColumns(sampleQueries);
    for (const column of whereColumns) {
      recommendations.push({
        type: 'index',
        description: `Add index on ${tableName}.${column}`,
        impact: 'high',
        estimatedImprovement: 75,
        sql: `CREATE INDEX CONCURRENTLY idx_${tableName}_${column} ON ${tableName} (${column});`,
        reason: `Frequently used in WHERE clauses`
      });
    }

    // Analyze JOIN conditions
    const joinColumns = this.extractJoinColumns(sampleQueries);
    for (const column of joinColumns) {
      recommendations.push({
        type: 'index',
        description: `Add index on ${tableName}.${column} for JOIN optimization`,
        impact: 'high',
        estimatedImprovement: 80,
        sql: `CREATE INDEX CONCURRENTLY idx_${tableName}_${column}_join ON ${tableName} (${column});`,
        reason: `Used in JOIN operations`
      });
    }

    // Analyze ORDER BY clauses
    const orderColumns = this.extractOrderColumns(sampleQueries);
    for (const column of orderColumns) {
      recommendations.push({
        type: 'index',
        description: `Add composite index on ${tableName} (${column}, id) for ORDER BY`,
        impact: 'medium',
        estimatedImprovement: 50,
        sql: `CREATE INDEX CONCURRENTLY idx_${tableName}_${column}_order ON ${tableName} (${column}, id);`,
        reason: `Frequently used in ORDER BY clauses`
      });
    }

    this.analysisCache.set(cacheKey, recommendations);
    return recommendations;
  }

  /**
   * Optimize SELECT clause (avoid SELECT *)
   */
  optimizeSelectClause(query: string, requiredColumns: string[]): string {
    if (query.includes('SELECT *') && requiredColumns.length > 0) {
      return query.replace('SELECT *', `SELECT ${requiredColumns.join(', ')}`);
    }
    return query;
  }

  /**
   * Add pagination optimization
   */
  addPaginationOptimization(query: string, limit: number, offset: number): string {
    // Add cursor-based pagination recommendation
    if (query.includes('LIMIT') && query.includes('OFFSET')) {
      // Suggest keyset pagination for large offsets
      if (offset > 10000) {
        logger.warn('Large OFFSET detected, consider keyset pagination', {
          offset,
          recommendation: 'Use cursor-based pagination for better performance'
        });
      }
    }

    return query;
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      cacheSize: this.queryCache.size,
      analysisCacheSize: this.analysisCache.size,
      indexCacheSize: this.indexCache.size,
      config: this.config,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.queryCache.clear();
    this.analysisCache.clear();
    this.indexCache.clear();

    logger.info('QueryOptimizer caches cleared');
  }

  /**
   * Destroy optimizer instance
   */
  destroy(): void {
    this.clearCaches();
    logger.info('QueryOptimizer destroyed');
  }

  // ============ Private Methods ============

  private async analyzeQuery(query: string, params?: any[]): Promise<QueryMetrics> {
    // Mock implementation - in real scenario, this would use EXPLAIN ANALYZE
    const queryComplexity = this.calculateQueryComplexity(query);
    const estimatedRows = this.estimateRowCount(query);

    return {
      executionTime: queryComplexity * 10 + Math.random() * 50, // Mock execution time
      rowsReturned: estimatedRows,
      rowsExamined: estimatedRows * 1.5, // Assume 50% more rows examined
      indexesUsed: this.detectIndexesUsed(query),
      tableScans: query.includes('FULL TABLE SCAN') ? 1 : 0,
      sortOperations: query.includes('ORDER BY') ? 1 : 0,
      hashOperations: query.includes('HASH') ? 1 : 0,
      joinOperations: (query.match(/JOIN/gi) || []).length
    };
  }

  private async analyzeRecommendations(query: string, params?: any[]): Promise<QueryRecommendation[]> {
    const recommendations: QueryRecommendation[] = [];

    // Check for SELECT *
    if (query.includes('SELECT *')) {
      recommendations.push({
        type: 'select_optimization',
        description: 'Replace SELECT * with specific columns',
        impact: 'medium',
        estimatedImprovement: 25,
        reason: 'Reduces data transfer and memory usage'
      });
    }

    // Check for missing indexes (simplified detection)
    const whereMatch = query.match(/WHERE\s+([\w.]+)/i);
    if (whereMatch && !query.includes('INDEX')) {
      recommendations.push({
        type: 'index',
        description: `Consider adding index on ${whereMatch[1]}`,
        impact: 'high',
        estimatedImprovement: 80,
        reason: 'WHERE clause performance improvement'
      });
    }

    // Check for large LIMIT without ORDER BY
    if (query.includes('LIMIT') && !query.includes('ORDER BY')) {
      recommendations.push({
        type: 'pagination',
        description: 'Add ORDER BY clause for consistent pagination',
        impact: 'low',
        estimatedImprovement: 10,
        reason: 'Ensures consistent result ordering'
      });
    }

    return recommendations;
  }

  private async generateOptimizedQuery(
    originalQuery: string,
    params?: any[],
    recommendations?: QueryRecommendation[]
  ): Promise<string> {
    let optimizedQuery = originalQuery;

    // Apply optimization recommendations
    for (const recommendation of recommendations || []) {
      switch (recommendation.type) {
        case 'select_optimization':
          // This would need column information from schema
          break;
        case 'join_optimization':
          // Add explicit JOIN syntax if needed
          if (originalQuery.includes(',') && originalQuery.includes('WHERE')) {
            optimizedQuery = this.convertImplicitToExplicitJoins(optimizedQuery);
          }
          break;
        case 'pagination':
          // Add index hint for pagination
          if (optimizedQuery.includes('ORDER BY') && !optimizedQuery.includes('LIMIT')) {
            optimizedQuery += ' LIMIT 100'; // Default limit
          }
          break;
      }
    }

    return optimizedQuery;
  }

  private calculateImprovement(before: QueryMetrics, after?: QueryMetrics): number {
    if (!after) {
      // Estimate improvement based on recommendations
      return 15; // Conservative estimate
    }

    const timeImprovement = ((before.executionTime - after.executionTime) / before.executionTime) * 100;
    const ioImprovement = ((before.rowsExamined - after.rowsExamined) / before.rowsExamined) * 100;

    return Math.max(timeImprovement, ioImprovement);
  }

  private groupSimilarQueries(queries: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const query of queries) {
      // Simplify query to its pattern (remove specific values)
      const pattern = query
        .replace(/\$\d+/g, '$?')
        .replace(/\d+/g, '?')
        .replace(/'[^^']*'/g, '?')
        .trim();

      if (!groups.has(pattern)) {
        groups.set(pattern, []);
      }
      groups.get(pattern)!.push(query);
    }

    return groups;
  }

  private async analyzeN1Pattern(pattern: string, queries: string[]): Promise<N1DetectionResult> {
    const hasN1Problem = queries.length > 5; // Threshold for N+1 detection
    const estimatedImpact = Math.min((queries.length - 5) * 20, 90); // Impact estimation

    return {
      hasN1Problem,
      pattern,
      affectedQueries: queries,
      recommendedSolution: `Use batch query with WHERE id = ANY($1) or implement eager loading`,
      estimatedImpact
    };
  }

  private extractWhereColumns(queries: string[]): Set<string> {
    const columns = new Set<string>();

    for (const query of queries) {
      const whereMatch = query.match(/WHERE\s+([\w.]+)/gi);
      if (whereMatch) {
        whereMatch.forEach(match => {
          const column = match.replace('WHERE ', '').trim();
          if (column && !column.includes('.')) {
            columns.add(column);
          }
        });
      }
    }

    return columns;
  }

  private extractJoinColumns(queries: string[]): Set<string> {
    const columns = new Set<string>();

    for (const query of queries) {
      const joinMatches = query.match(/ON\s+([\w.]+)\s*=\s*([\w.]+)/gi);
      if (joinMatches) {
        joinMatches.forEach(match => {
          const columnMatch = match.match(/ON\s+([\w.]+)\s*=/);
          if (columnMatch) {
            columns.add(columnMatch[1].trim());
          }
        });
      }
    }

    return columns;
  }

  private extractOrderColumns(queries: string[]): Set<string> {
    const columns = new Set<string>();

    for (const query of queries) {
      const orderMatch = query.match(/ORDER BY\s+([\w.]+)/i);
      if (orderMatch) {
        columns.add(orderMatch[1].trim());
      }
    }

    return columns;
  }

  private convertImplicitToExplicitJoins(query: string): string {
    // Simplified implementation - would need more sophisticated parsing
    return query.replace(/FROM\s+(\w+)\s*,\s*(\w+)/, 'FROM $1 JOIN $2');
  }

  private calculateQueryComplexity(query: string): number {
    let complexity = 1;

    // Add complexity for each JOIN
    complexity += (query.match(/JOIN/gi) || []).length * 2;

    // Add complexity for subqueries
    complexity += (query.match(/\(/g) || []).length;

    // Add complexity for WHERE clauses
    complexity += (query.match(/WHERE/gi) || []).length;

    // Add complexity for aggregate functions
    complexity += (query.match(/COUNT|SUM|AVG|MAX|MIN/gi) || []).length * 0.5;

    return complexity;
  }

  private estimateRowCount(query: string): number {
    // Simple estimation based on query patterns
    if (query.includes('LIMIT')) {
      const limitMatch = query.match(/LIMIT\s+(\d+)/i);
      return limitMatch ? parseInt(limitMatch[1]) : 100;
    }

    if (query.includes('WHERE')) {
      return 50; // Assume filtered result set
    }

    return 1000; // Default estimate
  }

  private detectIndexesUsed(query: string): string[] {
    const indexes: string[] = [];

    // Simplified index detection
    if (query.includes('WHERE')) {
      indexes.push('potential_where_index');
    }

    if (query.includes('ORDER BY')) {
      indexes.push('potential_order_index');
    }

    if (query.includes('JOIN')) {
      indexes.push('potential_join_index');
    }

    return indexes;
  }

  private createQueryCacheKey(query: string, params?: any[]): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    const normalizedParams = params ? JSON.stringify(params) : '';
    return `${normalizedQuery}_${normalizedParams}`;
  }

  private cacheResult(key: string, result: OptimizationResult): void {
    if (this.queryCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, result);
  }

  private calculateCacheHitRate(): number {
    // This would need actual hit/miss tracking
    return 0.75; // Mock value
  }
}

// Global query optimizer instance
export const globalQueryOptimizer = new QueryOptimizer({
  enableCache: true,
  maxCacheSize: 1000,
  analysisTimeout: 5000,
  enableAutoOptimization: false // Disabled by default for safety
});

/**
 * Query optimization utilities for common use cases
 */
export const queryOptimizationUtils = {
  /**
   * Create optimized SELECT with only needed columns
   */
  createOptimizedSelect(tableName: string, columns: string[], conditions?: string): string {
    const selectClause = columns.length > 0 ? columns.join(', ') : '*';
    const query = `SELECT ${selectClause} FROM ${tableName}`;
    return conditions ? `${query} WHERE ${conditions}` : query;
  },

  /**
   * Create optimized pagination query
   */
  createPaginatedQuery(baseQuery: string, limit: number, offset: number, orderBy?: string): string {
    let query = baseQuery;

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    } else {
      query += ' ORDER BY id';
    }

    query += ` LIMIT ${limit} OFFSET ${offset}`;
    return query;
  },

  /**
   * Create batch IN query
   */
  createBatchQuery(baseQuery: string, column: string, values: any[]): string {
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    return `${baseQuery} WHERE ${column} IN (${placeholders})`;
  },

  /**
   * Create keyset pagination query (more efficient than OFFSET)
   */
  createKeysetQuery(baseQuery: string, orderBy: string, lastValue: any, limit: number): string {
    return `${baseQuery} WHERE ${orderBy} > $1 ORDER BY ${orderBy} LIMIT ${limit}`;
  }
};

export default QueryOptimizer;