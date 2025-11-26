/**
 * API Hooks - Centralized exports
 * These hooks fetch data from the backend API with Redis caching
 */

export {
  useDashboardData,
  useDashboardStats,
  useFinancialOverview,
  useRecentActivity,
  useVehiclesDashboard,
  useInvalidateDashboardCache,
} from './useDashboardApi';

// Re-export types
export type {
  DashboardData,
  DashboardStats,
  FinancialOverview,
  VehiclesDashboardData,
  RecentActivity,
} from '@/lib/api/client';

