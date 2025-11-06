/**
 * React Query Client Configuration
 * 
 * Centralized React Query configuration.
 * Optimized for FleetifyApp's needs.
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';
import { toast } from 'sonner';

/**
 * Default query options
 */
const defaultOptions = {
  queries: {
    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache (formerly cacheTime)
    
    // Retry configuration
    retry: 1, // Retry failed requests once
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch configuration
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchOnMount: true, // Refetch on component mount
    
    // Error handling
    throwOnError: false, // Handle errors via onError callbacks
  },
  
  mutations: {
    // Retry configuration for mutations
    retry: 0, // Don't retry mutations by default
    
    // Error handling
    onError: (error: Error) => {
      logger.error('Mutation error:', error);
      toast.error('حدث خطأ', {
        description: error.message
      });
    }
  }
};

/**
 * Create and configure the Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions,
  logger: {
    log: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message)
  }
});

/**
 * Query key factories
 * Use these for consistent query keys across the app
 */
export const queryKeys = {
  // Contracts
  contracts: {
    all: (companyId?: string) => ['contracts', companyId] as const,
    detail: (id: string) => ['contract', id] as const,
    byCustomer: (customerId: string) => ['contracts', 'customer', customerId] as const,
    stats: (companyId: string) => ['contract-stats', companyId] as const,
  },
  
  // Payments
  payments: {
    all: (companyId?: string) => ['payments', companyId] as const,
    detail: (id: string) => ['payment', id] as const,
    byContract: (contractId: string) => ['payments', 'contract', contractId] as const,
    unmatched: (companyId: string) => ['payments', 'unmatched', companyId] as const,
    matches: (paymentId: string) => ['payment-matches', paymentId] as const,
  },
  
  // Invoices
  invoices: {
    all: (companyId?: string) => ['invoices', companyId] as const,
    detail: (id: string) => ['invoice', id] as const,
    pending: (companyId: string) => ['invoices', 'pending', companyId] as const,
    overdue: (companyId: string) => ['invoices', 'overdue', companyId] as const,
  },
  
  // Customers
  customers: {
    all: (companyId?: string) => ['customers', companyId] as const,
    detail: (id: string) => ['customer', id] as const,
  },
  
  // Vehicles
  vehicles: {
    all: (companyId?: string) => ['vehicles', companyId] as const,
    detail: (id: string) => ['vehicle', id] as const,
    available: (companyId: string) => ['vehicles', 'available', companyId] as const,
  },
  
  // Approvals
  approvals: {
    pending: (userId: string) => ['pending-approvals', userId] as const,
    all: (companyId: string) => ['approvals', companyId] as const,
  }
};
