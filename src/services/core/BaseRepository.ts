/**
 * Base Repository Class
 * 
 * Provides data access layer abstraction for all repositories.
 * Handles database operations with Supabase.
 * 
 * @template T - The entity type this repository handles
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface QueryOptions {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Abstract base class for all repositories
 */
export abstract class BaseRepository<T extends { id?: string }> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      if (!result) throw new Error('No data returned from insert');

      return result as T;
    } catch (error) {
      logger.error(`[${this.tableName}] Create failed:`, error);
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!result) throw new Error(`Record with id ${id} not found`);

      return result as T;
    } catch (error) {
      logger.error(`[${this.tableName}] Update failed:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      logger.error(`[${this.tableName}] Delete failed:`, error);
      throw error;
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Return null if not found, throw on other errors
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as T;
    } catch (error) {
      logger.error(`[${this.tableName}] FindById failed:`, error);
      throw error;
    }
  }

  /**
   * Find all records
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    try {
      let query = supabase.from(this.tableName).select('*');

      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as T[];
    } catch (error) {
      logger.error(`[${this.tableName}] FindAll failed:`, error);
      throw error;
    }
  }

  /**
   * Find records with pagination
   */
  async findPaginated(page: number = 1, limit: number = 10): Promise<PaginatedResult<T>> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated data
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: (data || []) as T[],
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error(`[${this.tableName}] FindPaginated failed:`, error);
      throw error;
    }
  }

  /**
   * Find records matching criteria
   */
  async findWhere(criteria: Partial<T>): Promise<T[]> {
    try {
      let query = supabase.from(this.tableName).select('*');

      // Apply each criterion
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as T[];
    } catch (error) {
      logger.error(`[${this.tableName}] FindWhere failed:`, error);
      throw error;
    }
  }

  /**
   * Find one record matching criteria
   */
  async findOne(criteria: Partial<T>): Promise<T | null> {
    try {
      const results = await this.findWhere(criteria);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`[${this.tableName}] FindOne failed:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(criteria?: Partial<T>): Promise<number> {
    try {
      let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });

      if (criteria) {
        Object.entries(criteria).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error(`[${this.tableName}] Count failed:`, error);
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const record = await this.findById(id);
      return record !== null;
    } catch (error) {
      logger.error(`[${this.tableName}] Exists check failed:`, error);
      throw error;
    }
  }

  /**
   * Execute within a transaction
   * Note: Supabase doesn't natively support transactions in the client,
   * so this is a placeholder for future implementation or RPC calls
   */
  async transaction<R>(callback: (client: typeof supabase) => Promise<R>): Promise<R> {
    // For now, just execute the callback with the supabase client
    // In the future, this could use RPC with database transactions
    return callback(supabase);
  }

  /**
   * Bulk create records
   */
  async createMany(data: Omit<T, 'id'>[]): Promise<T[]> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data as any)
        .select();

      if (error) throw error;

      return (result || []) as T[];
    } catch (error) {
      logger.error(`[${this.tableName}] CreateMany failed:`, error);
      throw error;
    }
  }

  /**
   * Bulk delete records
   */
  async deleteMany(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      logger.error(`[${this.tableName}] DeleteMany failed:`, error);
      throw error;
    }
  }

  /**
   * Custom query execution
   */
  protected async executeQuery<R>(queryFn: () => Promise<{ data: R | null; error: any }>): Promise<R> {
    try {
      const { data, error } = await queryFn();

      if (error) throw error;
      if (!data) throw new Error('No data returned from query');

      return data;
    } catch (error) {
      logger.error(`[${this.tableName}] Query execution failed:`, error);
      throw error;
    }
  }
}

