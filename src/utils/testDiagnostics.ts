/**
 * Test Diagnostics
 * 
 * Simple test to verify the diagnostic system is working
 */

import { logNavigation, logQueryStatus, logComponentLifecycle, logError, getDiagnosticReport } from './pageLoadDiagnostics';

// Test the diagnostic system
export const testDiagnostics = () => {
  console.log('🧪 Testing diagnostic system...');
  
  // Test navigation logging
  logNavigation('/test', 'https://example.com', 'push');
  
  // Test query logging
  logQueryStatus('/test', ['test'], 'success', { test: 'data' });
  
  // Test component lifecycle logging
  logComponentLifecycle('/test', 'TestComponent', 'mount', { test: 'props' });
  
  // Test error logging
  logError('/test', new Error('Test error'), 'test_context');
  
  // Get and log report
  const report = getDiagnosticReport();
  console.log('🧪 Diagnostic report:', report);
  
  return report;
};

// Make available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testDiagnostics = testDiagnostics;
}