/**
 * Security utilities for Supabase Edge Functions
 * Handles authentication, authorization, and secure database connections
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AuthContext {
  user_id: string;
  company_id: string;
  role: string;
  permissions: string[];
}

/**
 * Creates a secure Supabase client with user authentication
 * @param authToken JWT token from the request header
 * @returns Authenticated Supabase client
 */
export function createAuthenticatedClient(authToken?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Creates a service role client for administrative operations
 * WARNING: Only use for operations that cannot be done with user authentication
 * @returns Service role Supabase client
 */
export function createServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role configuration');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Validates and extracts authentication context from request
 * @param req HTTP request object
 * @returns Authentication context or null if invalid
 */
export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createAuthenticatedClient(token);
  
  try {
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Invalid token:', error?.message);
      return null;
    }
    
    // Get user profile and company information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        company_id,
        user_roles (
          role,
          permissions
        )
      `)
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile not found:', profileError?.message);
      return null;
    }
    
    return {
      user_id: user.id,
      company_id: profile.company_id,
      role: profile.user_roles?.[0]?.role || 'user',
      permissions: profile.user_roles?.[0]?.permissions || []
    };
    
  } catch (error) {
    console.error('Auth context error:', error);
    return null;
  }
}

/**
 * Middleware to enforce authentication on functions
 */
export function requireAuth(handler: (req: Request, auth: AuthContext) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const authContext = await getAuthContext(req);
    
    if (!authContext) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return handler(req, authContext);
  };
}

/**
 * Rate limiting implementation
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    // Reset the window
    current.count = 1;
    current.resetTime = now + windowMs;
  } else {
    current.count++;
  }
  
  rateLimitStore.set(key, current);
  
  return current.count <= limit;
}

/**
 * Input validation utilities
 */
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'uuid' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: any[];
}

export function validateInput(data: any, rules: ValidationRule[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const rule of rules) {
    const value = data[rule.field];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }
    
    // Skip validation for optional empty fields
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string`);
        } else {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`${rule.field} must be no more than ${rule.maxLength} characters`);
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(`${rule.field} format is invalid`);
          }
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${rule.field} must be a valid number`);
        }
        break;
        
      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${rule.field} must be a valid email address`);
        }
        break;
        
      case 'uuid':
        if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
          errors.push(`${rule.field} must be a valid UUID`);
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${rule.field} must be an array`);
        }
        break;
    }
    
    // Check allowed values
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Audit logging for security events
 */
export async function logSecurityEvent(
  event_type: 'auth_failure' | 'unauthorized_access' | 'rate_limit_exceeded' | 'invalid_input',
  details: any,
  request: Request,
  auth?: AuthContext
) {
  try {
    const supabase = createServiceRoleClient();
    
    await supabase.from('security_audit_logs').insert({
      event_type,
      details,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      user_id: auth?.user_id,
      company_id: auth?.company_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}