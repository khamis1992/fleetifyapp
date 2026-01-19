import { supabase } from "@/integrations/supabase/client";

/**
 * Fixes orphaned user records by creating missing profiles and assigning default roles
 * This handles cases where employees have user_id but no profile/roles
 */
export const fixOrphanedUsers = async (companyId: string) => {
  try {
    console.log('Starting orphaned users fix for company:', companyId);

    // Get employees with user_id but missing profiles
    const { data: orphanedEmployees, error: orphanedError } = await supabase
      .from('employees')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        company_id
      `)
      .eq('company_id', companyId)
      .not('user_id', 'is', null);

    if (orphanedError) {
      console.error('Error fetching orphaned employees:', orphanedError);
      throw orphanedError;
    }

    if (!orphanedEmployees || orphanedEmployees.length === 0) {
      console.log('No orphaned employees found');
      return { fixed: 0, errors: [] };
    }

    console.log('Found orphaned employees:', orphanedEmployees.length);

    const errors: string[] = [];
    let fixedCount = 0;

    for (const employee of orphanedEmployees) {
      try {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', employee.user_id)
          .maybeSingle();

        // Create profile if missing
        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: employee.user_id,
              first_name: employee.first_name,
              last_name: employee.last_name,
              email: employee.email,
              company_id: employee.company_id,
              is_active: true
            });

          if (profileError) {
            console.error('Error creating profile for employee:', employee.id, profileError);
            errors.push(`Failed to create profile for ${employee.email}: ${profileError.message}`);
            continue;
          }
          console.log('Created profile for employee:', employee.id);
        }

        // Check if user has roles
        const { data: existingRoles } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', employee.user_id);

        // Assign default role if missing
        if (!existingRoles || existingRoles.length === 0) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: employee.user_id,
              company_id: employee.company_id,
              role: 'employee'
            });

          if (roleError) {
            console.error('Error assigning role for employee:', employee.id, roleError);
            errors.push(`Failed to assign role for ${employee.email}: ${roleError.message}`);
            continue;
          }
          console.log('Assigned role for employee:', employee.id);
        }

        fixedCount++;
      } catch (error) {
        console.error('Error fixing employee:', employee.id, error);
        errors.push(`Error fixing ${employee.email}: ${error.message}`);
      }
    }

    console.log('Orphaned users fix completed. Fixed:', fixedCount, 'Errors:', errors.length);
    return { fixed: fixedCount, errors };

  } catch (error) {
    console.error('Error in fixOrphanedUsers:', error);
    throw error;
  }
};