import React from 'react';
import PerformanceMonitor from './PerformanceMonitor';

/**
 * Simple test component to verify PerformanceMonitor works correctly
 */
const PerformanceMonitorTest: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Performance Monitor Test</h2>
      <PerformanceMonitor 
        className="border rounded-lg"
        showDetailedLogs={true}
        maxLogEntries={20}
      />
    </div>
  );
};

export default PerformanceMonitorTest;