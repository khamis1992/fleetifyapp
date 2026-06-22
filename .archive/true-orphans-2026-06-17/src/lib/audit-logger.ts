import { supabase } from '@/lib/supabase';

/**
 * Audit Logging Service
 * Tracks all important system events for security and compliance
 */

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  company_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'auth' | 'data' | 'system' | 'security' | 'api';
  metadata?: Record<string, any>;
}

/**
 * Main audit logger class
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private buffer: AuditLogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      severity: entry.severity || 'medium',
      category: entry.category || 'data',
    };

    // Add to buffer
    this.buffer.push(auditEntry);

    // Immediately flush for critical events
    if (entry.severity === 'critical') {
      await this.flush();
    } else if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    company_id: string,
    action: 'login' | 'logout' | 'login_failed' | 'password_change' | 'mfa_enabled',
    user_id?: string,
    email?: string,
    ip_address?: string,
    user_agent?: string,
    failure_reason?: string
  ): Promise<void> {
    await this.log({
      company_id,
      action: `auth.${action}`,
      resource_type: 'user',
      resource_id: user_id,
      category: 'auth',
      severity: action === 'login_failed' ? 'medium' : 'low',
      metadata: {
        email,
        failure_reason,
      },
      ip_address,
      user_agent,
    });
  }

  /**
   * Log data modifications
   */
  async logDataModification(
    company_id: string,
    action: 'create' | 'update' | 'delete',
    resource_type: string,
    resource_id: string,
    user_id: string,
    old_values?: Record<string, any>,
    new_values?: Record<string, any>,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      company_id,
      action: `data.${action}`,
      resource_type,
      resource_id,
      user_id,
      old_values,
      new_values,
      category: 'data',
      severity: action === 'delete' ? 'high' : 'medium',
      ip_address,
    });
  }

  /**
   * Log API access
   */
  async logAPIAccess(
    company_id: string,
    endpoint: string,
    method: string,
    user_id?: string,
    response_code?: number,
    duration_ms?: number,
    ip_address?: string,
    user_agent?: string
  ): Promise<void> {
    await this.log({
      company_id,
      action: 'api.access',
      resource_type: 'endpoint',
      resource_id: endpoint,
      user_id,
      category: 'api',
      severity: response_code && response_code >= 400 ? 'medium' : 'low',
      metadata: {
        method,
        response_code,
        duration_ms,
      },
      ip_address,
      user_agent,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    company_id: string,
    event: 'csrf_failure' | 'sql_injection_attempt' | 'xss_attempt' | 'rate_limit_exceeded' | 'suspicious_activity',
    user_id?: string,
    details?: Record<string, any>,
    ip_address?: string,
    user_agent?: string
  ): Promise<void> {
    await this.log({
      company_id,
      action: `security.${event}`,
      resource_type: 'security_event',
      user_id,
      category: 'security',
      severity: 'critical',
      metadata: details,
      ip_address,
      user_agent,
    });
  }

  /**
   * Flush buffered logs to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to write audit logs:', error);
        // Put logs back in buffer for retry
        this.buffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Put logs back in buffer for retry
      this.buffer.unshift(...logsToFlush);
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop periodic flush
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    // Flush any remaining logs
    this.flush();
  }
}

/**
 * Get audit logger instance
 */
export const auditLogger = AuditLogger.getInstance();

/**
 * Helper function to get client info
 */
export function getClientInfo(req: Request): {
  ip_address?: string;
  user_agent?: string;
} {
  return {
    ip_address: req.headers.get('x-forwarded-for') ||
                req.headers.get('x-real-ip') ||
                'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
  };
}

/**
 * HOC for React components to add audit logging
 */
export function withAuditLogging<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    action: string;
    resource_type: string;
    logOnMount?: boolean;
    logOnUnmount?: boolean;
  }
) {
  return function AuditedComponent(props: P) {
    const { user } = useAuth();
    const { company } = useCompany();

    useEffect(() => {
      if (options.logOnMount && user && company) {
        auditLogger.log({
          company_id: company.id,
          action: `ui.${options.action}`,
          resource_type: options.resource_type,
          user_id: user.id,
          category: 'system',
          severity: 'low',
        });
      }
    }, []);

    return <Component {...props} />;
  };
}

// Type definitions for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
      company?: any;
    }
  }
}