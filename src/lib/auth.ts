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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('📝 [AUTH] No user found');
      return null;
    }

    console.log('📝 [AUTH] Fetching profile for user:', user.id);

    // Get user profile with company info - with better error handling
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        companies:company_id (
          id,
          name,
          name_ar
        )
      `)
      .eq('user_id', user.id)
      .single();

    console.log('📝 [AUTH] Profile query result:', { profile, profileError });

    // If no company from profile, try to get from employees table
    let employeeCompany = null;
    if (!profile?.company_id) {
      const { data: empData } = await supabase
        .from('employees')
        .select(`
          company_id,
          companies (
            id,
            name,
            name_ar
          )
        `)
        .eq('user_id', user.id)
        .single();
      
      employeeCompany = empData;
    }

    if (profileError) {
      console.error('📝 [AUTH] Profile fetch error:', profileError);
      
      // If profile doesn't exist, try to create it
      if (profileError.code === 'PGRST116') {
        console.log('📝 [AUTH] No profile found, attempting to create one...');
        try {
          const { data, error } = await supabase.functions.invoke('create-super-admin-profile');
          if (error) {
            console.error('📝 [AUTH] Failed to create profile via edge function:', error);
          } else {
            console.log('📝 [AUTH] Profile created successfully:', data);
            // Retry fetching the profile
            const { data: newProfile, error: retryError } = await supabase
              .from('profiles')
              .select(`
                *,
                companies:company_id (
                  id,
                  name,
                  name_ar
                )
              `)
              .eq('user_id', user.id)
              .single();
            
            if (!retryError && newProfile) {
              console.log('📝 [AUTH] Successfully fetched newly created profile');
              // Continue with the new profile
              profile = newProfile;
            }
          }
        } catch (edgeFunctionError) {
          console.error('📝 [AUTH] Edge function call failed:', edgeFunctionError);
        }
      }
    }

    console.log('📝 [AUTH] Profile data:', profile);

    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('📝 [AUTH] Roles fetch error:', rolesError);
    }

    // Get company info - prioritize from profiles, fallback to employees
    let companyInfo = profile?.companies;
    let companyId = profile?.company_id;
    
    // If no company from profiles, try from employees table
    if (!companyInfo && employeeCompany) {
      companyInfo = employeeCompany.companies;
      companyId = employeeCompany.company_id;
      
      console.log('📝 [AUTH] Using company info from employees table:', companyInfo);
    }

    const authUser: AuthUser = {
      ...user,
      profile: profile ? { ...profile, company_id: companyId } : undefined,
      company: companyInfo || undefined,
      roles: roles?.map(r => r.role) || []
    };

    // Enhanced logging for debugging
    console.log('📝 [AUTH] Creating AuthUser with:', {
      hasProfile: !!profile,
      profileCompanyId: profile?.company_id,
      companyId,
      hasCompanyInfo: !!companyInfo,
      roles: authUser.roles
    });

    console.log('📝 [AUTH] Final authUser:', {
      id: authUser.id,
      email: authUser.email,
      company_id: companyId,
      company: authUser.company,
      roles: authUser.roles
    });

    return authUser;
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