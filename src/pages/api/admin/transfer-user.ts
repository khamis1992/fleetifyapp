import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Response type
type TransferResponse = {
  success: boolean;
  transferLogId?: string;
  message?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransferResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Get the user's session token from the request
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    const userToken = authHeader.replace('Bearer ', '');

    // Create a regular Supabase client with the user's token to verify they're super_admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Verify the user is authenticated and is super_admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(userToken);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // Check if user has super_admin role
    const { data: roles, error: rolesError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError || !roles || !roles.some(r => r.role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Only super admins can transfer users'
      });
    }

    // Now use service role to perform the transfer
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error - Service role key not found'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Extract transfer data from request body
    const {
      userId,
      fromCompanyId,
      toCompanyId,
      newRoles,
      transferReason,
      dataHandlingStrategy
    } = req.body;

    // Validate required fields
    if (!userId || !fromCompanyId || !toCompanyId || !newRoles || !Array.isArray(newRoles)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, fromCompanyId, toCompanyId, newRoles'
      });
    }

    // Call the RPC function with service role privileges
    const { data, error } = await supabaseAdmin.rpc('transfer_user_to_company', {
      p_user_id: userId,
      p_from_company_id: fromCompanyId,
      p_to_company_id: toCompanyId,
      p_new_roles: newRoles,
      p_transfer_reason: transferReason || null,
      p_data_handling_strategy: dataHandlingStrategy || {}
    });

    if (error) {
      console.error('RPC function error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Transfer failed due to a database error'
      });
    }

    // data is the JSONB result from the function
    const result = data as TransferResponse;

    if (!result.success) {
      console.error('Transfer business logic error:', result);
      return res.status(400).json({
        success: false,
        error: result.error || 'Transfer failed for unknown reasons'
      });
    }

    // Success!
    return res.status(200).json(result);

  } catch (error) {
    console.error('Unexpected error in transfer-user API:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

