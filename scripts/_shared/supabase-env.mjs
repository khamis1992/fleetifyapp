import 'dotenv/config';

export function requireSupabaseScriptConfig({ serviceRole = false } = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required');
  }
  if (!key) {
    throw new Error(serviceRole
      ? 'SUPABASE_SERVICE_ROLE_KEY is required'
      : 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is required');
  }

  return { url, key };
}
