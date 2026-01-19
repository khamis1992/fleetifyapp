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

// Map action names from audit_logs to audit_trail format
const mapAction = (action: string): 'INSERT' | 'UPDATE' | 'DELETE' => {
  const actionMap: Record<string, 'INSERT' | 'UPDATE' | 'DELETE'> = {
    'CREATE': 'INSERT',
    'INSERT': 'INSERT',
    'UPDATE': 'UPDATE',
    'DELETE': 'DELETE',
    'APPROVE': 'UPDATE',
    'REJECT': 'UPDATE',
    'CANCEL': 'UPDATE',
  };
  return actionMap[action] || 'UPDATE';
};

// Map resource_type to table_name
const mapResourceType = (resourceType: string): string => {
  const resourceMap: Record<string, string> = {
    'payment': 'payments',
    'invoice': 'invoices',
    'contract': 'contracts',
    'customer': 'customers',
    'vehicle': 'vehicles',
    'journal_entry': 'journal_entries',
    'account': 'chart_of_accounts',
    'employee': 'employees',
  };
  return resourceMap[resourceType] || resourceType;
};

/**
 * Hook لجلب سجل التدقيق
 * يستخدم جدول audit_logs بدلاً من audit_trail
 */
export function useAuditTrail(filters?: AuditTrailFilters, limit = 100) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['audit-trail', companyId, filters, limit],
    queryFn: async (): Promise<{ entries: AuditTrailEntry[]; stats: AuditTrailStats } | null> => {
      if (!companyId) return null;

      // Build query using audit_logs table
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filters?.tableName) {
        // Map table_name back to resource_type
        const resourceType = Object.entries({
          'payments': 'payment',
          'invoices': 'invoice',
          'contracts': 'contract',
          'customers': 'customer',
          'vehicles': 'vehicle',
          'journal_entries': 'journal_entry',
          'chart_of_accounts': 'account',
          'employees': 'employee',
        }).find(([k]) => k === filters.tableName)?.[1] || filters.tableName;
        
        query = query.eq('resource_type', resourceType);
      }
      if (filters?.action) {
        // Map audit_trail action to audit_logs action
        const actionMap: Record<string, string[]> = {
          'INSERT': ['CREATE'],
          'UPDATE': ['UPDATE', 'APPROVE', 'REJECT', 'CANCEL'],
          'DELETE': ['DELETE'],
        };
        const actions = actionMap[filters.action] || [filters.action];
        query = query.in('action', actions);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.searchTerm) {
        query = query.or(`user_email.ilike.%${filters.searchTerm}%,user_name.ilike.%${filters.searchTerm}%,changes_summary.ilike.%${filters.searchTerm}%,entity_name.ilike.%${filters.searchTerm}%,resource_id.ilike.%${filters.searchTerm}%`);
      }

      const { data: rawEntries, error } = await query;

      if (error) throw error;
      if (!rawEntries) return null;

      // Transform audit_logs format to AuditTrailEntry format
      const entries: AuditTrailEntry[] = rawEntries.map((entry: any) => ({
        id: entry.id,
        company_id: entry.company_id,
        table_name: mapResourceType(entry.resource_type || ''),
        record_id: entry.resource_id || entry.id,
        action: mapAction(entry.action),
        user_id: entry.user_id,
        user_email: entry.user_email,
        user_name: entry.user_name,
        changed_at: entry.created_at,
        old_values: entry.old_values,
        new_values: entry.new_values,
        changed_fields: entry.old_values && entry.new_values 
          ? Object.keys(entry.new_values).filter(k => entry.old_values[k] !== entry.new_values[k])
          : null,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        description: entry.changes_summary || entry.notes || entry.entity_name,
        created_at: entry.created_at,
      }));

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
  return actionColors[action] || 'text-slate-600 bg-slate-100';
}

