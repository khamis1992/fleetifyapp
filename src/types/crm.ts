/**
 * Customer CRM Types
 * نماذج البيانات لنظام إدارة علاقات العملاء
 */

export type CommunicationType = 'phone' | 'message' | 'meeting' | 'note';
export type FollowUpStatus = 'pending' | 'completed' | 'cancelled';
export type ActionType = 'quote' | 'contract' | 'payment' | 'maintenance' | 'renewal' | 'none';

/**
 * سجل تواصل مع العميل
 */
export interface CustomerCommunication {
  id: string;
  customer_id: string;
  communication_type: CommunicationType;
  communication_date: string;
  communication_time: string;
  duration_minutes?: number; // للمكالمات
  employee_id: string;
  employee_name: string;
  notes: string;
  action_required?: ActionType;
  action_description?: string;
  follow_up_scheduled?: boolean;
  follow_up_date?: string;
  follow_up_time?: string;
  follow_up_status?: FollowUpStatus;
  attachments?: string[]; // روابط المرفقات
  created_at: string;
  updated_at: string;
  company_id: string;
}

/**
 * بيانات العميل المحسّنة للـ CRM
 */
export interface CRMCustomer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  
  // Contract Information
  has_active_contract: boolean;
  contract_number?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_status?: 'active' | 'expiring_soon' | 'expired';
  days_until_expiry?: number;
  
  // Communication History
  last_contact_date?: string;
  last_contact_type?: CommunicationType;
  days_since_contact?: number;
  total_communications: number;
  pending_follow_ups: number;
  
  // Financial Summary
  total_outstanding?: number;
  overdue_amount?: number;
  
  // CRM Metadata
  priority_level?: 'high' | 'medium' | 'low';
  needs_follow_up: boolean;
  follow_up_reason?: string;
  
  // Company
  company_id: string;
}

/**
 * إحصائيات CRM
 */
export interface CRMStats {
  total_active_customers: number;
  total_calls_today: number;
  pending_follow_ups: number;
  completed_this_month: number;
  expiring_contracts_count: number;
  high_priority_count: number;
}

/**
 * فلاتر البحث
 */
export interface CRMFilters {
  search_term?: string;
  contract_status?: 'all' | 'active' | 'expiring_soon' | 'expired';
  last_contact_period?: 'today' | 'week' | 'month' | 'more_than_month' | 'all';
  follow_up_status?: 'all' | 'pending' | 'completed';
  priority_level?: 'all' | 'high' | 'medium' | 'low';
}

/**
 * نموذج إضافة متابعة جديدة
 */
export interface AddCommunicationInput {
  customer_id: string;
  communication_type: CommunicationType;
  communication_date: string;
  communication_time: string;
  duration_minutes?: number;
  notes: string;
  action_required?: ActionType;
  action_description?: string;
  follow_up_scheduled?: boolean;
  follow_up_date?: string;
  follow_up_time?: string;
}

