// @ts-nocheck
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
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
  sessionError?: string | null;
  validateSession?: () => Promise<boolean>;
  refreshUser?: () => Promise<void>;
}

export const authService = {
  async signUp(email: string, password: string, userData?: any) {
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
      const [profileResult, employeeResult, rolesResult] = await Promise.all([
        supabase
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
          .single(),
        
        supabase
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
          .maybeSingle(), // Use maybeSingle to avoid error if not found
        
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: employeeCompany } = employeeResult;
      const { data: roles } = rolesResult;

      console.log('📝 [AUTH] Parallel queries completed in', Date.now() - startTime, 'ms');

      // Get company info - prioritize from profiles, fallback to employees
      let companyInfo = profile?.companies;
      let companyId = profile?.company_id;
      
      // If no company from profiles, try from employees table
      if (!companyInfo && employeeCompany) {
        companyInfo = employeeCompany.companies;
        companyId = employeeCompany.company_id;
        console.log('📝 [AUTH] Using company info from employees table');
      }

      // If still no profile, log warning but continue (don't block login)
      if (profileError) {
        console.warn('📝 [AUTH] Profile fetch error (continuing anyway):', profileError.code);
      }

      const authUser: AuthUser = {
        ...user,
        profile: profile ? { ...profile, company_id: companyId } : undefined,
        company: companyInfo || undefined,
        roles: roles?.map(r => r.role) || []
      };

      console.log('📝 [AUTH] User loaded in', Date.now() - startTime, 'ms:', {
        id: authUser.id,
        email: authUser.email,
        company_id: companyId,
        hasCompany: !!companyInfo,
        rolesCount: authUser.roles.length
      });

      return authUser;
    } catch (error) {
      console.error('📝 [AUTH] Unexpected error in getCurrentUser:', error);
      return null;
    }
  },

  async updateProfile(userId: string, updates: any) {
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