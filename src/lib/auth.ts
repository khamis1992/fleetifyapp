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
  company_id?: string; // Direct access for easier use
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('📝 [AUTH] No user found');
        return null;
      }

      console.log('📝 [AUTH] Fetching profile for user:', user.id);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      // Get user profile with timeout protection
      const profilePromise = supabase
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

      let profile, profileError;
      try {
        const result = await Promise.race([profilePromise, timeoutPromise]) as any;
        profile = result.data;
        profileError = result.error;
      } catch (error) {
        console.error('📝 [AUTH] Profile fetch timeout or error:', error);
        profileError = error;
      }

      // If profile fetch fails, create fallback user immediately
      if (profileError) {
        console.error('📝 [AUTH] Profile fetch error, creating fallback user:', profileError);
        
        const fallbackUser: AuthUser = {
          ...user,
          profile: {
            id: user.id,
            first_name: user.user_metadata?.first_name || 'مستخدم',
            last_name: user.user_metadata?.last_name || '',
            company_id: user.user_metadata?.company_id || null
          },
          roles: ['user'], // Default role
          company_id: user.user_metadata?.company_id || null
        };
        
        console.log('📝 [AUTH] Returning fallback user');
        return fallbackUser;
      }

      // Quick roles fetch with timeout
      let roles = [];
      try {
        const rolesPromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const rolesResult = await Promise.race([
          rolesPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Roles fetch timeout')), 5000)
          )
        ]) as any;
        
        roles = rolesResult.data?.map((r: any) => r.role) || ['user'];
      } catch (rolesError) {
        console.error('📝 [AUTH] Roles fetch error, using default:', rolesError);
        roles = ['user'];
      }

      // Build auth user with available data
      const authUser: AuthUser = {
        ...user,
        profile: profile || {
          id: user.id,
          first_name: user.user_metadata?.first_name || 'مستخدم',
          last_name: user.user_metadata?.last_name || '',
          company_id: user.user_metadata?.company_id || null
        },
        company: profile?.companies || undefined,
        roles: roles,
        company_id: profile?.company_id || user.user_metadata?.company_id || null
      };

      console.log('📝 [AUTH] Successfully built authUser:', {
        id: authUser.id,
        email: authUser.email,
        company_id: authUser.company_id,
        roles: authUser.roles
      });

      return authUser;
    } catch (error) {
      console.error('📝 [AUTH] getCurrentUser failed completely:', error);
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