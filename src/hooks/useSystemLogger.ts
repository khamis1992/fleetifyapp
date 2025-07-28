import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyScope } from '@/hooks/useCompanyScope';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';
export type LogCategory = 
  | 'authentication'
  | 'customers' 
  | 'contracts'
  | 'vehicles'
  | 'employees'
  | 'finance'
  | 'fleet'
  | 'hr'
  | 'system'
  | 'security'
  | 'backup'
  | 'reports';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  action: string;
  message: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, any>;
}

export const useSystemLogger = () => {
  const { user } = useAuth();
  const { companyId } = useCompanyScope();

  const logMutation = useMutation({
    mutationFn: async (entry: LogEntry) => {
      if (!user || !companyId) {
        console.warn('Cannot log: missing user or company context');
        return;
      }

      const { error } = await supabase.from('system_logs').insert({
        company_id: companyId,
        user_id: user.id,
        level: entry.level,
        category: entry.category,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        message: entry.message,
        metadata: entry.metadata || {}
      });

      if (error) {
        console.error('Failed to log system event:', error);
        throw error;
      }
    },
  });

  const log = {
    info: (category: LogCategory, action: string, message: string, options?: Partial<LogEntry>) => {
      logMutation.mutate({ 
        level: 'info', 
        category, 
        action, 
        message, 
        ...options 
      });
    },
    warning: (category: LogCategory, action: string, message: string, options?: Partial<LogEntry>) => {
      logMutation.mutate({ 
        level: 'warning', 
        category, 
        action, 
        message, 
        ...options 
      });
    },
    error: (category: LogCategory, action: string, message: string, options?: Partial<LogEntry>) => {
      logMutation.mutate({ 
        level: 'error', 
        category, 
        action, 
        message, 
        ...options 
      });
    },
    debug: (category: LogCategory, action: string, message: string, options?: Partial<LogEntry>) => {
      logMutation.mutate({ 
        level: 'debug', 
        category, 
        action, 
        message, 
        ...options 
      });
    },
  };

  return { log, isLogging: logMutation.isPending };
};