import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditTrailEntry {
  id: string;
  company_id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  changed_at: string;
  old_values: any;
  new_values: any;
  changed_fields: string[] | null;
  ip_address: string | null;
  user_agent: string | null;
  description: string | null;
  created_at: string;
}

export interface AuditTrailFilters {
  tableName?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface AuditTrailStats {
  totalEntries: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  uniqueUsers: number;
  tablesAffected: number;
}

/**
 * Hook لجلب سجل التدقيق
 */
export function useAuditTrail(filters?: AuditTrailFilters, limit = 100) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['audit-trail', companyId, filters, limit],
    queryFn: async (): Promise<{ entries: AuditTrailEntry[]; stats: AuditTrailStats } | null> => {
      if (!companyId) return null;

      // Build query
      let query = supabase
        .from('audit_trail')
        .select('*')
        .eq('company_id', companyId)
        .order('changed_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte('changed_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('changed_at', filters.endDate);
      }
      if (filters?.searchTerm) {
        query = query.or(`user_email.ilike.%${filters.searchTerm}%,user_name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,record_id.ilike.%${filters.searchTerm}%`);
      }

      const { data: entries, error } = await query;

      if (error) throw error;
      if (!entries) return null;

      // Calculate statistics
      const stats: AuditTrailStats = {
        totalEntries: entries.length,
        insertCount: entries.filter(e => e.action === 'INSERT').length,
        updateCount: entries.filter(e => e.action === 'UPDATE').length,
        deleteCount: entries.filter(e => e.action === 'DELETE').length,
        uniqueUsers: new Set(entries.map(e => e.user_id).filter(Boolean)).size,
        tablesAffected: new Set(entries.map(e => e.table_name)).size
      };

      return { entries, stats };
    },
    enabled: !!companyId
  });
}

/**
 * Hook لجلب سجل تدقيق سجل معين
 */
export function useRecordAuditTrail(tableName: string, recordId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['record-audit-trail', companyId, tableName, recordId],
    queryFn: async (): Promise<AuditTrailEntry[] | null> => {
      if (!companyId || !tableName || !recordId) return null;

      const { data: entries, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('company_id', companyId)
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return entries;
    },
    enabled: !!companyId && !!tableName && !!recordId
  });
}

/**
 * دالة مساعدة للحصول على اسم الجدول بالعربية
 */
export function getTableNameAr(tableName: string): string {
  const tableNames: Record<string, string> = {
    'journal_entries': 'القيود المحاسبية',
    'journal_entry_lines': 'سطور القيود',
    'chart_of_accounts': 'دليل الحسابات',
    'invoices': 'الفواتير',
    'payments': 'المدفوعات',
    'contracts': 'العقود',
    'customers': 'العملاء',
    'cost_centers': 'مراكز التكلفة',
    'vehicles': 'المركبات',
    'employees': 'الموظفين'
  };
  return tableNames[tableName] || tableName;
}

/**
 * دالة مساعدة للحصول على اسم الإجراء بالعربية
 */
export function getActionNameAr(action: string): string {
  const actionNames: Record<string, string> = {
    'INSERT': 'إضافة',
    'UPDATE': 'تعديل',
    'DELETE': 'حذف'
  };
  return actionNames[action] || action;
}

/**
 * دالة مساعدة للحصول على لون الإجراء
 */
export function getActionColor(action: string): string {
  const actionColors: Record<string, string> = {
    'INSERT': 'text-green-600 bg-green-100',
    'UPDATE': 'text-blue-600 bg-blue-100',
    'DELETE': 'text-red-600 bg-red-100'
  };
  return actionColors[action] || 'text-gray-600 bg-gray-100';
}

