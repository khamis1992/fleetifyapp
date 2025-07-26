import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface InconsistentAccount {
  employee_id: string;
  employee_email: string;
  user_id: string;
  has_system_access: boolean;
  employee_company_id: string;
  profile_company_id: string | null;
  role_count: number;
}

export const AccountConsistencyChecker: React.FC = () => {
  const [inconsistentAccounts, setInconsistentAccounts] = useState<InconsistentAccount[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const checkConsistency = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc('get_inconsistent_accounts');
      
      if (error) {
        throw error;
      }
      
      setInconsistentAccounts(data || []);
      
      toast({
        title: "Consistency Check Complete",
        description: `Found ${data?.length || 0} inconsistent accounts`,
      });
      
    } catch (error: any) {
      console.error('Error checking consistency:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check account consistency",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const fixInconsistentAccount = async (account: InconsistentAccount) => {
    setIsFixing(true);
    try {
      const { data, error } = await supabase.rpc('handle_incomplete_user_account', {
        p_user_id: account.user_id,
        p_employee_id: account.employee_id,
        p_company_id: account.employee_company_id,
        p_roles: ['sales_agent'] // Default role, can be adjusted
      });
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        toast({
          title: "Account Fixed",
          description: `Successfully fixed account for ${account.employee_email}`,
        });
        
        // Refresh the consistency check
        await checkConsistency();
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
      
    } catch (error: any) {
      console.error('Error fixing account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix account",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Account Consistency Checker
        </CardTitle>
        <CardDescription>
          Check and fix inconsistent user accounts that have system access but missing roles or company associations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkConsistency} 
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            'Check Account Consistency'
          )}
        </Button>
        
        {inconsistentAccounts.length > 0 && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {inconsistentAccounts.length} inconsistent account(s) that need attention.
              </AlertDescription>
            </Alert>
            
            {inconsistentAccounts.map((account) => (
              <Card key={account.user_id} className="border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium">{account.employee_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Employee ID: {account.employee_id}
                      </p>
                      <div className="text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          account.role_count === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {account.role_count} roles
                        </span>
                        <span className={`inline-block px-2 py-1 rounded text-xs ml-2 ${
                          !account.profile_company_id ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {account.profile_company_id ? 'Company set' : 'No company'}
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => fixInconsistentAccount(account)}
                      disabled={isFixing}
                      size="sm"
                      variant="outline"
                    >
                      {isFixing ? 'Fixing...' : 'Fix Account'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {inconsistentAccounts.length === 0 && !isChecking && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No inconsistent accounts found. All user accounts appear to be properly configured.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};