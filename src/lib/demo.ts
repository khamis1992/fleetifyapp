/**
 * Demo Mode Service
 * Handles demo account creation, trial tracking, and sample data
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays, isBefore } from 'date-fns';
import { generateShortContractNumber } from '@/utils/contractNumberGenerator';

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
  email: 'demo@fleetify.app',
  password: 'FleetifyDemo2025!',
  companyName: 'شركة الأسطول التجريبية',
};

/**
 * Check if demo mode is available
 */
export const isDemoModeEnabled = (): boolean => {
  return true; // Always enabled for this implementation
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
export const signInToDemo = async () => {
  try {
    // Sign in with demo credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    });

    if (error) {
      // If demo account doesn't exist, create it
      if (error.message.includes('Invalid login credentials')) {
        return await createDemoAccount();
      }
      throw error;
    }

    // Check/create trial session
    if (data.user) {
      await ensureDemoSession(data.user.id);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Demo sign-in error:', error);
    return { data: null, error };
  }
};

/**
 * Create demo account if it doesn't exist
 */
const createDemoAccount = async () => {
  try {
    // Create demo user account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      options: {
        data: {
          full_name: 'Demo User',
          role: 'company_admin',
          is_demo_account: true,
        },
        emailRedirectTo: undefined, // Skip email confirmation for demo
      },
    });

    if (signUpError) throw signUpError;

    // Auto-confirm demo account (if possible)
    // Note: This might require admin API access
    
    // Sign in immediately after creation
    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    });

    if (error) throw error;

    // Create demo session
    if (data.user) {
      await ensureDemoSession(data.user.id);
      await seedDemoData(data.user.id);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Demo account creation error:', error);
    return { data: null, error };
  }
};

/**
 * Ensure demo session exists and is valid
 */
const ensureDemoSession = async (userId: string) => {
  try {
    // Check for existing demo session
    const { data: existingSessions, error: fetchError } = await supabase
      .from('demo_sessions' as any)
      .select('*')
      .eq('demo_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError && !fetchError.message.includes('does not exist')) {
      throw fetchError;
    }

    // If table doesn't exist, skip (demo_sessions table is optional)
    if (fetchError?.message.includes('does not exist')) {
      console.warn('demo_sessions table does not exist - skipping trial tracking');
      return;
    }

    const existingSession = existingSessions?.[0] as any;

    // If session exists and is active, return it
    if (existingSession && isTrialActive(existingSession.trial_end_date)) {
      return existingSession;
    }

    // Create new demo session
    const trialEndDate = calculateTrialEndDate();
    const { data: newSession, error: insertError } = await supabase
      .from('demo_sessions' as any)
      .insert({
        demo_user_id: userId,
        trial_start_date: new Date().toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating demo session:', insertError);
      return null;
    }

    return newSession;
  } catch (error) {
    console.error('Error ensuring demo session:', error);
    return null;
  }
};

/**
 * Seed demo data for new demo accounts
 */
const seedDemoData = async (userId: string) => {
  try {
    // Get or create demo company
    const { data: companies, error: companyFetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', DEMO_CREDENTIALS.companyName)
      .limit(1);

    if (companyFetchError) throw companyFetchError;

    let companyId: string;

    if (companies && companies.length > 0) {
      companyId = companies[0].id;
    } else {
      // Create demo company
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: DEMO_CREDENTIALS.companyName,
          name_en: 'Demo Fleet Company',
          is_demo: true,
          trial_end_date: calculateTrialEndDate().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      companyId = newCompany.id;
    }

    // Update user profile with company
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        company_id: companyId,
        role: 'company_admin',
        is_demo_user: true,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating demo profile:', profileError);
    }

    // Seed sample data (vehicles, customers, etc.)
    await seedSampleVehicles(companyId);
    await seedSampleCustomers(companyId);
    await seedSampleContracts(companyId);

    return { success: true };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return { success: false, error };
  }
};

/**
 * Seed sample vehicles
 */
const seedSampleVehicles = async (companyId: string) => {
  try {
    const sampleVehicles = [
      {
        company_id: companyId,
        plate_number: 'ABC-1234',
        registration_number: 'ABC-1234',
        registration_number_en: 'ABC-1234',
        make: 'تويوتا',
        make_en: 'Toyota',
        model: 'كامري',
        model_en: 'Camry',
        year: 2023,
        color: 'أبيض',
        color_en: 'White',
        vehicle_type: 'سيدان',
        status: 'available',
        daily_rate: 150,
        mileage: 15000,
      },
      {
        company_id: companyId,
        plate_number: 'XYZ-5678',
        registration_number: 'XYZ-5678',
        registration_number_en: 'XYZ-5678',
        make: 'هوندا',
        make_en: 'Honda',
        model: 'أكورد',
        model_en: 'Accord',
        year: 2022,
        color: 'أسود',
        color_en: 'Black',
        vehicle_type: 'سيدان',
        status: 'available',
        daily_rate: 140,
        mileage: 22000,
      },
      {
        company_id: companyId,
        plate_number: 'DEF-9012',
        registration_number: 'DEF-9012',
        registration_number_en: 'DEF-9012',
        make: 'نيسان',
        make_en: 'Nissan',
        model: 'باترول',
        model_en: 'Patrol',
        year: 2023,
        color: 'فضي',
        color_en: 'Silver',
        vehicle_type: 'دفع رباعي',
        status: 'rented',
        daily_rate: 250,
        mileage: 8000,
      },
    ] as any[];

    const { error } = await supabase
      .from('vehicles')
      .insert(sampleVehicles as any);

    if (error) {
      console.error('Error seeding vehicles:', error);
    }
  } catch (error) {
    console.error('Error in seedSampleVehicles:', error);
  }
};

/**
 * Seed sample customers
 */
const seedSampleCustomers = async (companyId: string) => {
  try {
    const sampleCustomers = [
      {
        company_id: companyId,
        full_name: 'أحمد محمد علي',
        full_name_en: 'Ahmed Mohammed Ali',
        phone: '+966501234567',
        email: 'ahmed@example.com',
        national_id: '1234567890',
        status: 'active',
      },
      {
        company_id: companyId,
        full_name: 'فاطمة عبدالله',
        full_name_en: 'Fatima Abdullah',
        phone: '+966507654321',
        email: 'fatima@example.com',
        national_id: '0987654321',
        status: 'active',
      },
    ];

    const { error } = await supabase
      .from('customers')
      .insert(sampleCustomers);

    if (error) {
      console.error('Error seeding customers:', error);
    }
  } catch (error) {
    console.error('Error in seedSampleCustomers:', error);
  }
};

/**
 * Seed sample contracts
 */
const seedSampleContracts = async (companyId: string) => {
  try {
    // Get sample vehicle and customer for contract
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'rented')
      .limit(1);

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .limit(1);

    if (!vehicles || !customers || vehicles.length === 0 || customers.length === 0) {
      return;
    }

    const sampleContract = {
      company_id: companyId,
      vehicle_id: vehicles[0].id,
      customer_id: customers[0].id,
      contract_number: generateShortContractNumber(),
      contract_date: new Date().toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0],
      end_date: addDays(new Date(), 7).toISOString().split('T')[0],
      daily_rate: 250,
      total_amount: 1750,
      status: 'active',
    } as any;

    const { error } = await supabase
      .from('contracts')
      .insert(sampleContract as any);

    if (error) {
      console.error('Error seeding contracts:', error);
    }
  } catch (error) {
    console.error('Error in seedSampleContracts:', error);
  }
};

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
