/**
 * Optimistic Updates with Rollback
 * 
 * Provides utilities for implementing optimistic UI updates
 * with automatic rollback on error
 * 
 * Features:
 * - Automatic snapshot before mutation
 * - Instant UI updates
 * - Automatic rollback on error
 * - Type-safe contexts
 * - Support for multiple query keys
 */

import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Context type for optimistic updates
 * Stores previous data for rollback
 */
export interface OptimisticContext<T = unknown> {
  previousData: T;
  queryKey: QueryKey;
  timestamp: number;
}

/**
 * Options for optimistic update
 */
export interface OptimisticUpdateOptions<TData, TVariables> {
  /**
   * Query keys to update
   */
  queryKeys: QueryKey[];
  
  /**
   * Function to update the cache optimistically
   * @param oldData - Current data from cache
   * @param variables - Mutation variables
   * @returns New data to set in cache
   */
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  
  /**
   * Optional: Merge function for partial updates
   */
  mergeFn?: (oldData: TData | undefined, newData: Partial<TData>) => TData;
}

/**
 * Hook for managing optimistic updates with rollback
 * 
 * @example
 * const { optimisticUpdate, rollback } = useOptimisticUpdate();
 * 
 * const mutation = useMutation({
 *   mutationFn: updateCustomer,
 *   onMutate: async (variables) => {
 *     return optimisticUpdate({
 *       queryKeys: [['customers'], ['customer', variables.id]],
 *       updateFn: (oldData, vars) => {
 *         // Update logic
 *         return updatedData;
 *       }
 *     }, variables);
 *   },
 *   onError: (error, variables, context) => {
 *     rollback(context);
 *   }
 * });
 */
export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();

  /**
   * Perform optimistic update
   * Cancels in-flight queries and takes snapshot for rollback
   */
  const optimisticUpdate = useCallback(
    async <TData, TVariables>(
      options: OptimisticUpdateOptions<TData, TVariables>,
      variables: TVariables
    ): Promise<OptimisticContext[]> => {
      const { queryKeys, updateFn } = options;
      const contexts: OptimisticContext[] = [];

      for (const queryKey of queryKeys) {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(queryKey);

        // Store context for rollback
        contexts.push({
          previousData,
          queryKey,
          timestamp: Date.now(),
        });

        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, (oldData: TData | undefined) => {
          try {
            return updateFn(oldData, variables);
          } catch (error) {
            console.error('Error in optimistic update function:', error);
            return oldData; // Keep old data if update fails
          }
        });
      }

      return contexts;
    },
    [queryClient]
  );

  /**
   * Rollback optimistic updates
   * Restores previous data from context
   */
  const rollback = useCallback(
    (contexts: OptimisticContext[] | undefined) => {
      if (!contexts) {
        console.warn('No context provided for rollback');
        return;
      }

      for (const context of contexts) {
        queryClient.setQueryData(context.queryKey, context.previousData);
        console.log('🔄 Rolled back optimistic update for:', context.queryKey);
      }
    },
    [queryClient]
  );

  /**
   * Invalidate and refetch queries after successful mutation
   */
  const settle = useCallback(
    async (queryKeys: QueryKey[]) => {
      for (const queryKey of queryKeys) {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient]
  );

  return { optimisticUpdate, rollback, settle };
};

/**
 * Helper: Create optimistic update for adding item to list
 */
export const createOptimisticAdd = <T extends { id: string }>(
  newItem: T
) => {
  return (oldData: T[] | undefined): T[] => {
    if (!oldData) return [newItem];
    
    // Check if item already exists (prevent duplicates)
    const exists = oldData.some(item => item.id === newItem.id);
    if (exists) return oldData;
    
    // Add to beginning of list
    return [newItem, ...oldData];
  };
};

/**
 * Helper: Create optimistic update for updating item in list
 */
export const createOptimisticUpdate = <T extends { id: string }>(
  updatedItem: Partial<T> & { id: string }
) => {
  return (oldData: T[] | undefined): T[] => {
    if (!oldData) return [];
    
    return oldData.map(item =>
      item.id === updatedItem.id
        ? { ...item, ...updatedItem }
        : item
    );
  };
};

/**
 * Helper: Create optimistic update for removing item from list
 */
export const createOptimisticRemove = <T extends { id: string }>(
  itemId: string
) => {
  return (oldData: T[] | undefined): T[] => {
    if (!oldData) return [];
    
    return oldData.filter(item => item.id !== itemId);
  };
};

/**
 * Helper: Create optimistic update for single item
 */
export const createOptimisticSingle = <T>(
  updatedData: Partial<T>
) => {
  return (oldData: T | undefined): T => {
    if (!oldData) return updatedData as T;
    
    return { ...oldData, ...updatedData };
  };
};

/**
 * Hook for list-based optimistic updates
 * Provides common patterns for list operations
 */
export const useOptimisticList = <T extends { id: string }>() => {
  const { optimisticUpdate, rollback, settle } = useOptimisticUpdate();

  /**
   * Optimistically add item to list
   */
  const add = useCallback(
    async (queryKey: QueryKey, newItem: T) => {
      return optimisticUpdate<T[], T>(
        {
          queryKeys: [queryKey],
          updateFn: createOptimisticAdd(newItem),
        },
        newItem
      );
    },
    [optimisticUpdate]
  );

  /**
   * Optimistically update item in list
   */
  const update = useCallback(
    async (queryKey: QueryKey, updatedItem: Partial<T> & { id: string }) => {
      return optimisticUpdate<T[], Partial<T> & { id: string }>(
        {
          queryKeys: [queryKey],
          updateFn: createOptimisticUpdate(updatedItem),
        },
        updatedItem
      );
    },
    [optimisticUpdate]
  );

  /**
   * Optimistically remove item from list
   */
  const remove = useCallback(
    async (queryKey: QueryKey, itemId: string) => {
      return optimisticUpdate<T[], string>(
        {
          queryKeys: [queryKey],
          updateFn: createOptimisticRemove(itemId),
        },
        itemId
      );
    },
    [optimisticUpdate]
  );

  return { add, update, remove, rollback, settle };
};

/**
 * Hook for paginated optimistic updates
 * Handles updates across multiple pages
 */
export const useOptimisticPaginated = <T extends { id: string }>() => {
  const { optimisticUpdate, rollback, settle } = useOptimisticUpdate();
  const queryClient = useQueryClient();

  /**
   * Update item across all pages
   */
  const updateAcrossPages = useCallback(
    async (baseQueryKey: QueryKey, updatedItem: Partial<T> & { id: string }) => {
      // Get all queries that match the base key
      const queries = queryClient.getQueriesData({ queryKey: baseQueryKey });
      const queryKeys = queries.map(([queryKey]) => queryKey);

      return optimisticUpdate<T[], Partial<T> & { id: string }>(
        {
          queryKeys,
          updateFn: createOptimisticUpdate(updatedItem),
        },
        updatedItem
      );
    },
    [optimisticUpdate, queryClient]
  );

  /**
   * Remove item from all pages
   */
  const removeFromAllPages = useCallback(
    async (baseQueryKey: QueryKey, itemId: string) => {
      const queries = queryClient.getQueriesData({ queryKey: baseQueryKey });
      const queryKeys = queries.map(([queryKey]) => queryKey);

      return optimisticUpdate<T[], string>(
        {
          queryKeys,
          updateFn: createOptimisticRemove(itemId),
        },
        itemId
      );
    },
    [optimisticUpdate, queryClient]
  );

  return { updateAcrossPages, removeFromAllPages, rollback, settle };
};

/**
 * Utility: Log optimistic update for debugging
 */
export const logOptimisticUpdate = (
  operation: 'add' | 'update' | 'remove',
  queryKey: QueryKey,
  data: unknown
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 [Optimistic ${operation}]`, {
      queryKey,
      data,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Utility: Validate optimistic update
 * Ensures update doesn't create invalid state
 */
export const validateOptimisticUpdate = <T>(
  oldData: T | undefined,
  newData: T,
  validator: (data: T) => boolean
): T => {
  if (!validator(newData)) {
    console.warn('⚠️ Optimistic update validation failed, keeping old data');
    return oldData || newData;
  }
  return newData;
};
