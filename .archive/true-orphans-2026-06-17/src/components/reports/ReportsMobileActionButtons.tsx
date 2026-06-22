import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Download, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportsMobileActionButtonsProps {
  onScheduleReport: () => void;
  onBulkExport: () => void;
  onShowMore?: () => void;
  className?: string;
}

export const ReportsMobileActionButtons: React.FC<ReportsMobileActionButtonsProps> = ({
  onScheduleReport,
  onBulkExport,
  onShowMore,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* More Actions Button */}
      {onShowMore && (
        <Button
          variant="outline"
          size="lg"
          onClick={onShowMore}
          className="h-12 px-4 rounded-xl shadow-sm border-2 font-medium"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      )}
      
      {/* Schedule Report Button */}
      <Button
        variant="outline"
        size="lg"
        onClick={onScheduleReport}
        className="flex-1 h-12 gap-3 rounded-xl shadow-sm border-2 font-medium text-base min-w-0"
      >
        <Calendar className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">جدولة تقرير</span>
      </Button>
      
      {/* Primary Export Button */}
      <Button
        size="lg"
        onClick={onBulkExport}
        className="flex-1 h-12 gap-3 rounded-xl shadow-lg font-medium text-base min-w-0"
      >
        <Download className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">تصدير مجمع</span>
      </Button>
    </div>
  );
};

/* Floating Action Button for Mobile Reports */
export const FloatingReportsButton: React.FC<{ onBulkExport: () => void }> = ({
  onBulkExport
}) => {
  return (
    <Button
      size="lg"
      onClick={onBulkExport}
      className="fixed bottom-20 left-4 h-14 w-14 rounded-full shadow-2xl z-50 p-0"
    >
      <Download className="h-6 w-6" />
    </Button>
  );
};