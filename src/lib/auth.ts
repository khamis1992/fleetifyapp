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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
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

    if (profileError) {
      console.error('📝 [AUTH] Profile fetch error:', profileError);
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

    const authUser: AuthUser = {
      ...user,
      profile: profile || undefined,
      company: profile?.companies || undefined,
      roles: roles?.map(r => r.role) || []
    };

    console.log('📝 [AUTH] Final authUser:', {
      id: authUser.id,
      email: authUser.email,
      company_id: authUser.profile?.company_id,
      company: authUser.company
    });

    return authUser;
  },

  async updateProfile(userId: string, updates: any) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    
    return { error };
  }
};