/**
 * Backend API Client
 * Handles communication with the FleetifyApp backend API
 * with automatic authentication and error handling
 */

import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '@/lib/env';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
  cached?: boolean;
  timestamp?: string;
}

export interface ApiError extends Error {
  code: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  /**
   * Get current auth token from Supabase session
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Make an authenticated API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getAuthToken();

    if (!token) {
      throw this.createError('Authentication required', 'AUTH_REQUIRED', 401);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw this.createError(
          data.error?.message || 'Request failed',
          data.error?.code || 'API_ERROR',
          response.status
        );
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw error;
      }
      
      // Network or parsing error
      throw this.createError(
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR',
        0
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url = `${endpoint}?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Create a typed error
   */
  private createError(message: string, code: string, status: number): ApiError {
    const error = new Error(message) as ApiError;
    error.code = code;
    error.status = status;
    return error;
  }

  /**
   * Check if backend is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for dashboard data
export interface DashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  activeContracts: number;
  totalContracts: number;
  totalCustomers: number;
  totalProperties: number;
  totalPropertyOwners: number;
  monthlyRevenue: number;
  propertyRevenue: number;
  vehiclesChange: string;
  contractsChange: string;
  customersChange: string;
  propertiesChange: string;
  revenueChange: string;
  vehicleActivityRate: number;
  contractCompletionRate: number;
  customerSatisfactionRate: number;
}

export interface FinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  profitMargin: number;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  projectedMonthlyRevenue: number;
  projectedAnnualRevenue: number;
}

export interface RecentActivity {
  id: string;
  type: 'contract' | 'payment' | 'customer' | 'vehicle' | 'property';
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardData {
  stats: DashboardStats;
  financialOverview: FinancialOverview;
  recentActivity: RecentActivity[];
  generatedAt: string;
}

export interface VehiclesDashboardData {
  totalVehicles: number;
  activeVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  pendingMaintenance: number;
  monthlyRevenue: number;
  utilizationRate: number;
  vehiclesByMake: Record<string, number>;
  vehiclesByYear: Record<string, number>;
}

