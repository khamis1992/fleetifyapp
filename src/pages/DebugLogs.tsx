import { useState, useEffect } from 'react';
import { MobileDebugger } from '@/lib/mobileDebug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function DebugLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadDebugInfo();
    // Refresh logs every 2 seconds
    const interval = setInterval(() => {
      setLogs(MobileDebugger.getLogs());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadDebugInfo = async () => {
    // Get device info
    const device = await MobileDebugger.getDeviceInfo();
    setDeviceInfo(device);

    // Get user info
    if (user) {
      setUserInfo({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Try to get company_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, name_ar')
          .eq('id', profileData.company_id)
          .single();

        setCompanyInfo({
          company_id: profileData.company_id,
          company_name: companyData?.name || companyData?.name_ar || 'Unknown',
        });
      } else {
        // Try employees table
        const { data: employeeData } = await supabase
          .from('employees')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (employeeData?.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('id, name, name_ar')
            .eq('id', employeeData.company_id)
            .single();

          setCompanyInfo({
            company_id: employeeData.company_id,
            company_name: companyData?.name || companyData?.name_ar || 'Unknown',
            source: 'employees table',
          });
        } else {
          setCompanyInfo({
            error: 'No company_id found in profiles or employees',
          });
        }
      }
    }

    // Load initial logs
    setLogs(MobileDebugger.getLogs());
  };

  const handleClearLogs = () => {
    MobileDebugger.clearLogs();
    setLogs([]);
  };

  const handleExportLogs = async () => {
    const logsText = await MobileDebugger.exportLogs();
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleetify-debug-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    MobileDebugger.log('TEST', 'Testing Supabase connection...');
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('count')
        .limit(1);
      
      if (error) {
        MobileDebugger.error('TEST', 'Supabase connection failed', error);
      } else {
        MobileDebugger.log('TEST', 'Supabase connection successful', { data });
      }
    } catch (error) {
      MobileDebugger.error('TEST', 'Supabase connection exception', error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">Device Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(deviceInfo, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-bold mb-2">User Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-bold mb-2">Company Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(companyInfo, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleClearLogs} variant="outline">
              Clear Logs
            </Button>
            <Button onClick={handleExportLogs} variant="outline">
              Export Logs
            </Button>
            <Button onClick={handleTestConnection} variant="outline">
              Test Connection
            </Button>
            <Button onClick={loadDebugInfo} variant="outline">
              Refresh Info
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Debug Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs h-96 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Navigate around the app to generate logs.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
