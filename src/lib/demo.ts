/**
 * Demo Mode Service
 * Handles demo account creation, trial tracking, and sample data
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays, isBefore } from 'date-fns';

export interface DemoSession {
  id: string;
  demo_user_id: string;
  trial_start_date: string;
  trial_end_date: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Demo credentials (pre-created demo account)
 * These should be created during initial database setup
 */
export const DEMO_CREDENTIALS = {
  companyName: 'شركة الأسطول التجريبية',
};

/**
 * Check if demo mode is available
 */
export const isDemoModeEnabled = (): boolean => {
  return false;
};

/**
 * Get trial period in days
 */
export const getTrialPeriodDays = (): number => {
  return 7; // 7-day trial
};

/**
 * Check if trial is still active
 */
export const isTrialActive = (trialEndDate: string): boolean => {
  const endDate = new Date(trialEndDate);
  const now = new Date();
  return isBefore(now, endDate);
};

/**
 * Calculate trial end date
 */
export const calculateTrialEndDate = (): Date => {
  return addDays(new Date(), getTrialPeriodDays());
};

/**
 * Get remaining trial days
 */
export const getRemainingTrialDays = (trialEndDate: string): number => {
  const endDate = new Date(trialEndDate);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Sign in to demo account
 */
export const signInToDemo = async () => ({
  data: null,
  error: new Error('Demo access is disabled until server-side session provisioning is configured'),
});

/**
 * Ensure demo session exists and is valid
 */
/**
 * Get demo session info for current user
 */
export const getDemoSessionInfo = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('demo_sessions' as any)
      .select('*')
      .eq('demo_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Silently return null if table doesn't exist (migration not yet applied)
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        return null;
      }
      // Only log unexpected errors
      console.warn('Demo session query failed (non-critical):', error.message);
      return null;
    }

    return data as any;
  } catch (error) {
    // Silently handle - demo sessions are optional
    return null;
  }
};
