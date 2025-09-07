import React from 'react';
import { BarChart3, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportsMobileActionButtons } from './ReportsMobileActionButtons';
import { cn } from '@/lib/utils';

interface ReportsMobileHeaderProps {
  onScheduleReport: () => void;
  onBulkExport: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export const ReportsMobileHeader: React.FC<ReportsMobileHeaderProps> = ({
  onScheduleReport,
  onBulkExport,
  onRefresh,
  onToggleFilters,
  isRefreshing = false,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">مركز التقارير</h1>
            <p className="text-sm text-muted-foreground">تقارير شاملة</p>
          </div>
        </div>
        
        {/* Mobile Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onToggleFilters}
            className="h-12 px-4 rounded-xl shadow-sm border-2"
          >
            <Filter className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-12 px-4 rounded-xl shadow-sm border-2"
          >
            <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>
      
      {/* Action Buttons */}
      <ReportsMobileActionButtons
        onScheduleReport={onScheduleReport}
        onBulkExport={onBulkExport}
      />
    </div>
  );
};