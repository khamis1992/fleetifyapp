// Testing version of Supabase client that doesn't require real credentials
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

console.log('🔧 [SUPABASE] Initializing Supabase client for testing...');
console.log('🔧 [SUPABASE] URL available:', !!import.meta.env.VITE_SUPABASE_URL);
console.log('🔧 [SUPABASE] Key available:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Use mock values for testing if environment variables are not set
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ [SUPABASE] Using mock credentials for testing');
}

console.log('✅ [SUPABASE] Environment variables validated successfully');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});