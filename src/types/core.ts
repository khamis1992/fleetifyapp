/**
 * Core Type Definitions
 * Enhanced types to replace 'any' usage throughout the application
 */

// === Base Entity Types ===

export interface BaseEntity {
  id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Timestamps {
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// === Document and File Types ===

export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface DocumentCollection {
  [key: string]: DocumentFile | null;
}

export interface FileUpload {
  file: File;
  preview?: string;
  name: string;
  size: number;
  type: string;
}

// === Status and State Types ===

export type Status = 'active' | 'inactive' | 'pending' | 'archived' | 'deleted';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// === Contact and Communication Types ===

export interface ContactInfo {
  email?: string;
  phone: string;
  alternative_phone?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

// === Financial Types ===

export interface Money {
  amount: number;
  currency: string;
}

export interface Pricing {
  daily_rate: number;
  weekly_rate?: number;
  monthly_rate?: number;
  yearly_rate?: number;
  security_deposit?: number;
}

export interface FinancialMetrics {
  total_revenue?: number;
  total_cost?: number;
  profit_margin?: number;
  total_paid?: number;
  balance_due?: number;
}

// === Address and Location Types ===

export interface Address {
  street?: string;
  street_ar?: string;
  city?: string;
  city_ar?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

// === User and Permission Types ===

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  permissions: string[];
  avatar_url?: string;
}

export interface AuditInfo {
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted_by?: string;
  deleted_at?: string;
}

// === Configuration and Settings Types ===

export interface SystemSettings {
  company_name: string;
  default_currency: string;
  date_format: string;
  time_format: string;
  language: string;
  timezone: string;
}

export interface FeatureFlags {
  [key: string]: boolean;
}

// === API and Response Types ===

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SearchFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

// === Form and Validation Types ===

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  required?: boolean;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: unknown) => string | undefined;
  };
  options?: Array<{ value: string; label: string }>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// === Activity and Log Types ===

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;
  user_id: string;
  timestamp: string;
  ip_address?: string;
}

export interface SystemMetrics {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  active_users?: number;
  request_count?: number;
  response_time?: number;
}

// === Utility Types ===

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type SortOrder = 'asc' | 'desc';
export type SortField<T> = keyof T;

// === Database Query Types ===

export interface DatabaseQuery<T> {
  select?: (keyof T)[];
  where?: Partial<T>;
  whereIn?: {
    field: keyof T;
    values: unknown[];
  };
  orderBy?: {
    field: keyof T;
    order: SortOrder;
  };
  limit?: number;
  offset?: number;
  join?: {
    table: string;
    localKey: keyof T;
    foreignKey: string;
    as?: string;
  }[];
}

export interface DatabaseResult<T> {
  data: T[];
  count: number;
  error?: string;
}

// === Component Prop Types ===

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  retry?: () => void;
}

// === Event Types ===

export interface CustomEvent<T = unknown> {
  type: string;
  payload?: T;
  timestamp: number;
  source: string;
}

export type EventHandler<T = unknown> = (event: CustomEvent<T>) => void;

// === Color and Theme Types ===

export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface ColorTheme {
  [key in ColorVariant]: {
    [shade in ColorShade]: string;
    DEFAULT: string;
    foreground: string;
  };
}