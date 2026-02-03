/**
 * Diagnostics Page
 * 
 * This page helps diagnose connection and authentication issues
 * Especially useful for debugging mobile APK builds
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseConfig, getEnvironmentConfig } from '@/lib/env';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function DiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: DiagnosticResult[] = [];

    // 1. Check Platform
    diagnostics.push({
      name: 'Platform',
      status: 'success',
      message: Capacitor.isNativePlatform() 
        ? `Native Platform: ${Capacitor.getPlatform()}` 
        : 'Web Platform',
      details: {
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform(),
      }
    });

    // 2. Check Environment Config
    try {
      const envConfig = getEnvironmentConfig();
      const supabaseConfig = getSupabaseConfig();
      
      diagnostics.push({
        name: 'Environment Configuration',
        status: supabaseConfig.url && supabaseConfig.anonKey ? 'success' : 'error',
        message: supabaseConfig.url && supabaseConfig.anonKey 
          ? 'Environment variables loaded successfully' 
          : 'Missing environment variables',
        details: {
          hasUrl: !!supabaseConfig.url,
          hasKey: !!supabaseConfig.anonKey,
          urlPrefix: supabaseConfig.url?.substring(0, 30) + '...',
          keyPrefix: supabaseConfig.anonKey?.substring(0, 20) + '...',
          mode: envConfig.mode,
          isDevelopment: envConfig.isDevelopment,
          isProduction: envConfig.isProduction,
        }
      });
    } catch (error) {
      diagnostics.push({
        name: 'Environment Configuration',
        status: 'error',
        message: 'Failed to load environment configuration',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // 3. Check Supabase Connection
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .maybeSingle();

      if (error) {
        diagnostics.push({
          name: 'Supabase Connection',
          status: 'error',
          message: 'Failed to connect to Supabase',
          details: {
            error: error.message,
            code: error.code,
            hint: error.hint,
          }
        });
      } else {
        diagnostics.push({
          name: 'Supabase Connection',
          status: 'success',
          message: 'Successfully connected to Supabase',
          details: { connected: true }
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Network error connecting to Supabase',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // 4. Check Authentication State
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        diagnostics.push({
          name: 'Authentication State',
          status: 'warning',
          message: 'Error checking authentication state',
          details: error.message
        });
      } else if (session) {
        diagnostics.push({
          name: 'Authentication State',
          status: 'success',
          message: 'User is authenticated',
          details: {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
          }
        });
      } else {
        diagnostics.push({
          name: 'Authentication State',
          status: 'warning',
          message: 'No active session',
          details: { authenticated: false }
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Authentication State',
        status: 'error',
        message: 'Failed to check authentication',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // 5. Check Storage
    try {
      const testKey = '__diagnostic_test__';
      const testValue = 'test_value_' + Date.now();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      diagnostics.push({
        name: 'Local Storage',
        status: retrieved === testValue ? 'success' : 'error',
        message: retrieved === testValue 
          ? 'Local storage is working correctly' 
          : 'Local storage read/write failed',
        details: { 
          canWrite: true, 
          canRead: retrieved === testValue 
        }
      });
    } catch (error) {
      diagnostics.push({
        name: 'Local Storage',
        status: 'error',
        message: 'Local storage is not available',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // 6. Check Network
    try {
      const online = navigator.onLine;
      diagnostics.push({
        name: 'Network Status',
        status: online ? 'success' : 'error',
        message: online ? 'Device is online' : 'Device is offline',
        details: { online }
      });
    } catch (error) {
      diagnostics.push({
        name: 'Network Status',
        status: 'warning',
        message: 'Could not determine network status',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    setResults(diagnostics);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Diagnostics</span>
            <Button 
              onClick={runDiagnostics} 
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Diagnostic information for troubleshooting connection and authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.map((result, index) => (
            <div 
              key={index}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-semibold">{result.name}</h3>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </div>
              
              {result.details && (
                <details className="mt-2">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    Show Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}

          {results.length === 0 && !loading && (
            <div className="text-center text-muted-foreground py-8">
              Click "Refresh" to run diagnostics
            </div>
          )}

          {loading && (
            <div className="text-center text-muted-foreground py-8">
              Running diagnostics...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
