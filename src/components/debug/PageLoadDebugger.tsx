/**
 * Page Load Debugger Component
 * 
 * A simple debug tool to help diagnose page loading issues
 * Shows real-time diagnostics about cache, queries, and component state
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Bug, Activity, Clock } from 'lucide-react';
import { getDiagnosticReport, clearDiagnostics } from '@/utils/pageLoadDiagnostics';

const PageLoadDebugger: React.FC = () => {
  const [diagnosticReport, setDiagnosticReport] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update report every 2 seconds when visible
    if (isVisible) {
      const interval = setInterval(() => {
        setDiagnosticReport(getDiagnosticReport());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleRefresh = () => {
    clearDiagnostics();
    window.location.reload();
  };

  const handleClearCache = () => {
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('🧹 All caches cleared');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleExportDiagnostics = () => {
    const report = getDiagnosticReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleetify-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-background border-2 shadow-lg"
      >
        <Bug className="h-4 w-4" />
        Debug
      </Button>
    );
  }

  let parsedReport: any = null;
  try {
    parsedReport = JSON.parse(diagnosticReport);
  } catch (e) {
    console.error('Failed to parse diagnostic report:', e);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Page Load Diagnostics
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleClearCache} size="sm" variant="outline">
              Clear Cache
            </Button>
            <Button onClick={handleExportDiagnostics} size="sm" variant="outline">
              Export
            </Button>
            <Button onClick={() => setIsVisible(false)} size="sm">
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Session Info */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Information
            </h3>
            {parsedReport?.sessionInfo && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Start Time:</strong> {new Date(parsedReport.sessionInfo.startTime).toLocaleString()}
                </div>
                <div>
                  <strong>Duration:</strong> {Math.round(parsedReport.sessionInfo.duration / 1000)}s
                </div>
                <div>
                  <strong>Navigation Count:</strong> {parsedReport.sessionInfo.navigationCount}
                </div>
                <div>
                  <strong>Total Events:</strong> {parsedReport.sessionInfo.totalEvents}
                </div>
              </div>
            )}
          </div>

          {/* Event Summary */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Event Summary
            </h3>
            {parsedReport?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsedReport.summary.navigationEvents}</Badge>
                  <span>Navigation Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsedReport.summary.cacheEvents}</Badge>
                  <span>Cache Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsedReport.summary.queryEvents}</Badge>
                  <span>Query Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsedReport.summary.componentEvents}</Badge>
                  <span>Component Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsedReport.summary.serviceWorkerEvents}</Badge>
                  <span>Service Worker Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{parsedReport.summary.errorEvents}</Badge>
                  <span>Error Events</span>
                </div>
              </div>
            )}
          </div>

          {/* Page Analysis */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Page Analysis
            </h3>
            {parsedReport?.pageAnalysis && (
              <div className="space-y-2">
                {Object.entries(parsedReport.pageAnalysis).map(([page, analysis]: [string, any]) => (
                  <div key={page} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{page}</h4>
                      <Badge variant={analysis.severity === 'high' ? 'destructive' : analysis.severity === 'medium' ? 'default' : 'secondary'}>
                        {analysis.severity}
                      </Badge>
                    </div>
                    {analysis.issues && analysis.issues.length > 0 && (
                      <div className="space-y-1">
                        <strong className="text-sm">Issues:</strong>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                          {analysis.issues.map((issue: string, index: number) => (
                            <li key={index} className="text-destructive">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <strong className="text-sm">Recommendations:</strong>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                          {analysis.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="text-muted-foreground">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Recent Events</h3>
            {parsedReport?.recentEvents && (
              <div className="space-y-2 max-h-48 overflow-auto">
                {parsedReport.recentEvents.map((event: any, index: number) => (
                  <div key={index} className="border-l-2 border-muted pl-4 text-sm">
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {event.type.toUpperCase()}
                      </Badge>
                      <span>{event.page}</span>
                      {event.details && (
                        <span className="text-muted-foreground">
                          {JSON.stringify(event.details, null, 2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default PageLoadDebugger;