// SECURITY FIX: Removed @ts-nocheck and added proper TypeScript types
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export interface AuthUser extends User {
  profile?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    company_id?: string;
    position?: string;
    avatar_url?: string;
    language_preference?: string;
  };
  company?: {
    id: string;
    name: string;
    name_ar?: string;
    business_type?: string;
    active_modules?: string[];
  };
  roles?: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Record<string, unknown>) => Promise<{ error: Error | null }>;
  changePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  sessionError?: string | null;
  validateSession?: () => Promise<boolean>;
  refreshUser?: () => Promise<void>;
}

export const authService = {
  async signUp(email: string, password: string, userData?: Record<string, unknown>) {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    return { error };
  },

  async signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      return { error };
    } catch (error) {
      console.error('📝 [AUTH_SERVICE] Sign in error:', error);
      return { error: error instanceof Error ? error : new Error('خطأ غير معروف في تسجيل الدخول') };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('📝 [AUTH_SERVICE] Sign out error:', error);
      return { error: error instanceof Error ? error : new Error('خطأ غير معروف في تسجيل الخروج') };
    }
  },

  async getCurrentUser() {
    try {
      console.log('📝 [AUTH] Starting getCurrentUser...');
      const startTime = Date.now();

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('📝 [AUTH] Error getting user:', userError);
        return null;
      }
      
      if (!user) {
        console.log('📝 [AUTH] No user found');
        return null;
      }

      console.log('📝 [AUTH] Fetching profile for user:', user.id);

      // OPTIMIZATION: Execute profile, employee, and roles queries IN PARALLEL
      // Add individual timeouts to prevent hanging on slow networks
      let profile = null;
      let employeeCompany = null;
      let roles = null;
      let profileError = null;

      try {
        // Add timeout wrapper for each query to prevent hanging
        // Each query has its own timeout, but we continue even if some fail
        const profileQuery = supabase
          .from('profiles')
          .select(`
            *,
            companies:company_id (
              id,
              name,
              name_ar,
              business_type,
              active_modules
            )
          `)
          .eq('user_id', user.id)
          .single();
        
        const employeeQuery = supabase
          .from('employees')
          .select(`
            company_id,
            companies (
              id,
              name,
              name_ar,
              business_type,
              active_modules
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        const rolesQuery = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        // Execute queries in parallel with individual timeout handling
        const [profileResult, employeeResult, rolesResult] = await Promise.all([
          Promise.race([
            profileQuery,
            new Promise<{ data: null; error: Error }>((resolve) => 
              setTimeout(() => resolve({ data: null, error: new Error('Profile query timeout') }), 8000)
            )
          ]).catch(() => ({ data: null, error: new Error('Profile query failed') })),
          
          Promise.race([
            employeeQuery,
            new Promise<{ data: null; error: null }>((resolve) => 
              setTimeout(() => resolve({ data: null, error: null }), 8000)
            )
          ]).catch(() => ({ data: null, error: null })),
          
          Promise.race([
            rolesQuery,
            new Promise<{ data: null; error: null }>((resolve) => 
              setTimeout(() => resolve({ data: null, error: null }), 5000)
            )
          ]).catch(() => ({ data: null, error: null }))
        ]);

        profile = profileResult.data;
        profileError = profileResult.error;
        employeeCompany = employeeResult.data;
        roles = rolesResult.data;
      } catch (error) {
        console.warn('📝 [AUTH] Error fetching profile data:', error);
        // Continue with null values
      }

      console.log('📝 [AUTH] Parallel queries completed in', Date.now() - startTime, 'ms');

      // DEBUG: Log what we got from the queries
      console.log('📝 [AUTH] Query results:', {
        hasProfile: !!profile,
        profileCompanyId: profile?.company_id,
        profileCompanies: profile?.companies,
        hasEmployeeCompany: !!employeeCompany,
        employeeCompanyId: employeeCompany?.company_id,
        rolesCount: roles?.length || 0
      });

      // Get company info - prioritize from profiles, fallback to employees
      let companyInfo = profile?.companies;
      let companyId = profile?.company_id;
      
      // If no company from profiles, try from employees table
      if (!companyId && employeeCompany) {
        companyInfo = employeeCompany.companies;
        companyId = employeeCompany.company_id;
        console.log('📝 [AUTH] Using company info from employees table');
      }

      // If still no profile, log warning but continue (don't block login)
      if (profileError) {
        console.warn('📝 [AUTH] Profile fetch error (continuing anyway):', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
      }

      // Log warning if no company found
      if (!companyId) {
        console.error('🚨 [AUTH] WARNING: User has no company association!', {
          userId: user.id,
          email: user.email,
          hasProfile: !!profile,
          hasEmployeeRecord: !!employeeCompany
        });
      }

      const authUser: AuthUser = {
        ...user,
        profile: profile ? { 
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          company_id: companyId ?? undefined,
          first_name_ar: profile.first_name_ar ?? undefined,
          last_name_ar: profile.last_name_ar ?? undefined,
          position: profile.position ?? undefined,
          avatar_url: profile.avatar_url ?? undefined,
          language_preference: profile.language_preference ?? undefined
        } : undefined,
        company: companyInfo ? {
          id: companyInfo.id,
          name: companyInfo.name,
          name_ar: companyInfo.name_ar ?? undefined,
          business_type: companyInfo.business_type ?? undefined,
          active_modules: companyInfo.active_modules ?? undefined
        } : undefined,
        roles: roles?.map((r: any) => r.role) || []
      };

      console.log('📝 [AUTH] User loaded in', Date.now() - startTime, 'ms:', {
        id: authUser.id,
        email: authUser.email,
        company_id: companyId,
        hasCompany: !!companyInfo,
        rolesCount: authUser.roles?.length || 0
      });

      return authUser;
    } catch (error) {
      console.error('📝 [AUTH] Unexpected error in getCurrentUser:', error);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    return { error };
  },

  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    return { error };
  }
};