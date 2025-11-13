/**
 * useAuditLog Hook
 * 
 * Custom hook for logging audit trail of sensitive operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import type { 
  AuditLog, 
  CreateAuditLogParams, 
  AuditLogFilters,
  AuditAction,
  AuditResourceType 
} from '@/types/auditLog';
import { toast } from 'sonner';

/**
 * Hook to create audit logs
 */
export function useAuditLog() {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  const logAudit = useMutation({
    mutationFn: async (params: CreateAuditLogParams) => {
      if (!user) {
        throw new Error('User must be authenticated to create audit logs');
      }

      const auditLogData = {
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email,
        company_id: companyId,
        action: params.action,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        entity_name: params.entity_name,
        old_values: params.old_values,
        new_values: params.new_values,
        changes_summary: params.changes_summary,
        metadata: params.metadata,
        notes: params.notes,
        status: params.status || 'success',
        severity: params.severity || 'medium',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditLogData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create audit log:', error);
        throw error;
      }

      return data as AuditLog;
    },
    onSuccess: () => {
      // Invalidate audit logs queries
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      console.error('Audit log error:', error);
      // Don't show toast to user - audit logging should be silent
    },
  });

  return {
    logAudit: logAudit.mutateAsync,
    isLogging: logAudit.isPending,
  };
}

/**
 * Hook to fetch audit logs with filters
 */
export function useAuditLogs(filters?: AuditLogFilters, enabled = true) {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['audit-logs', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply company filter
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Apply filters
      if (filters) {
        if (filters.action) {
          if (Array.isArray(filters.action)) {
            query = query.in('action', filters.action);
          } else {
            query = query.eq('action', filters.action);
          }
        }

        if (filters.resource_type) {
          if (Array.isArray(filters.resource_type)) {
            query = query.in('resource_type', filters.resource_type);
          } else {
            query = query.eq('resource_type', filters.resource_type);
          }
        }

        if (filters.user_id) {
          query = query.eq('user_id', filters.user_id);
        }

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.severity) {
          query = query.eq('severity', filters.severity);
        }

        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from);
        }

        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to);
        }

        if (filters.search) {
          query = query.or(
            `entity_name.ilike.%${filters.search}%,` +
            `changes_summary.ilike.%${filters.search}%,` +
            `user_email.ilike.%${filters.search}%,` +
            `user_name.ilike.%${filters.search}%`
          );
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        throw error;
      }

      return data as AuditLog[];
    },
    enabled,
  });
}

/**
 * Hook to fetch a single audit log by ID
 */
export function useAuditLogById(id: string, enabled = true) {
  return useQuery({
    queryKey: ['audit-log', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Failed to fetch audit log:', error);
        throw error;
      }

      return data as AuditLog;
    },
    enabled: enabled && !!id,
  });
}

/**
 * Utility function to create a simple audit log
 * Use this for quick logging without needing the full hook
 */
export async function createAuditLog(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string,
  entityName?: string,
  additionalData?: Partial<CreateAuditLogParams>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot create audit log: User not authenticated');
      return null;
    }

    // Get company_id from user_roles
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    const auditLogData = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.user_metadata?.full_name || user.email,
      company_id: userRole?.company_id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      entity_name: entityName,
      status: 'success' as const,
      severity: 'medium' as const,
      created_at: new Date().toISOString(),
      ...additionalData,
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditLogData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }

    return data as AuditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
}

/**
 * Utility to generate a human-readable changes summary
 */
export function generateChangesSummary(
  action: AuditAction,
  resourceType: AuditResourceType,
  entityName?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): string {
  const entity = entityName || resourceType;
  
  switch (action) {
    case 'CREATE':
      return `Created ${resourceType}: ${entity}`;
    
    case 'UPDATE':
      if (oldValues && newValues) {
        const changes = Object.keys(newValues)
          .filter(key => oldValues[key] !== newValues[key])
          .map(key => `${key}: ${oldValues[key]} → ${newValues[key]}`)
          .join(', ');
        return `Updated ${resourceType} ${entity}: ${changes}`;
      }
      return `Updated ${resourceType}: ${entity}`;
    
    case 'DELETE':
      return `Deleted ${resourceType}: ${entity}`;
    
    case 'APPROVE':
      return `Approved ${resourceType}: ${entity}`;
    
    case 'REJECT':
      return `Rejected ${resourceType}: ${entity}`;
    
    case 'CANCEL':
      return `Cancelled ${resourceType}: ${entity}`;
    
    case 'ARCHIVE':
      return `Archived ${resourceType}: ${entity}`;
    
    case 'RESTORE':
      return `Restored ${resourceType}: ${entity}`;
    
    case 'EXPORT':
      return `Exported ${resourceType} data`;
    
    case 'IMPORT':
      return `Imported ${resourceType} data`;
    
    default:
      return `${action} ${resourceType}: ${entity}`;
  }
}
