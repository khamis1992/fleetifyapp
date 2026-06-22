import { supabase } from '@/integrations/supabase/client';

/**
 * Utility function to clean up orphaned employee records
 * These are records that have a user_id but the corresponding auth user or profile doesn't exist
 */
export const cleanupOrphanedEmployeeRecords = async (companyId: string) => {
  try {
    console.log('Starting cleanup of orphaned employee records for company:', companyId);
    
    // Find employees with user_id but no corresponding profile
    const { data: orphanedEmployees, error: orphanedError } = await supabase
      .from('employees')
      .select(`
        id,
        user_id,
        email,
        first_name,
        last_name,
        has_system_access
      `)
      .eq('company_id', companyId)
      .not('user_id', 'is', null)
      .eq('has_system_access', true);

    if (orphanedError) {
      console.error('Error finding orphaned employees:', orphanedError);
      return { success: false, error: orphanedError.message };
    }

    if (!orphanedEmployees || orphanedEmployees.length === 0) {
      console.log('No orphaned employee records found');
      return { success: true, cleaned: 0 };
    }

    let cleanedCount = 0;
    
    for (const employee of orphanedEmployees) {
      // Check if profile exists for this user_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', employee.user_id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error(`Error checking profile for employee ${employee.id}:`, profileError);
        continue;
      }

      // If no profile exists, this is an orphaned record
      if (!profile) {
        console.log(`Cleaning up orphaned employee record: ${employee.email} (ID: ${employee.id})`);
        
        // Reset the employee record to remove system access
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            user_id: null,
            has_system_access: false,
            account_status: null
          })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`Error cleaning up employee ${employee.id}:`, updateError);
        } else {
          cleanedCount++;
          console.log(`Successfully cleaned up employee ${employee.email}`);
        }
      }
    }

    console.log(`Cleanup completed. Cleaned ${cleanedCount} orphaned records.`);
    return { success: true, cleaned: cleanedCount };
    
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Function to get incomplete employee records that need attention
 */
export const getIncompleteEmployeeRecords = async (companyId: string) => {
  try {
    // Find employees with user_id but missing profile or roles
    const { data: incompleteEmployees, error } = await supabase
      .from('employees')
      .select(`
        id,
        user_id,
        email,
        first_name,
        last_name,
        has_system_access,
        profiles!left(id, is_active),
        user_roles!left(role)
      `)
      .eq('company_id', companyId)
      .not('user_id', 'is', null)
      .eq('has_system_access', true);

    if (error) {
      console.error('Error getting incomplete employees:', error);
      return { success: false, error: error.message };
    }

    const incomplete = (incompleteEmployees || []).filter(emp => {
      const hasProfile = emp.profiles && emp.profiles.length > 0;
      const hasRoles = emp.user_roles && emp.user_roles.length > 0;
      return !hasProfile || !hasRoles;
    });

    return { success: true, data: incomplete };
    
  } catch (error: any) {
    console.error('Error getting incomplete records:', error);
    return { success: false, error: error.message };
  }
};