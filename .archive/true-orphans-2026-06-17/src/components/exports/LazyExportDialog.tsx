/**
 * Lazy Export Dialog Component
 * Dynamically imports heavy export functionality
 */

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Lazy load heavy export components
const PDFExportComponent = lazy(() => import('./PDFExportComponent'));
const ExcelExportComponent = lazy(() => import('./ExcelExportComponent'));
const CSVExportComponent = lazy(() => import('./CSVExportComponent'));

interface LazyExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: 'pdf' | 'excel' | 'csv';
  data: any[];
  title?: string;
}

export const LazyExportDialog: React.FC<LazyExportDialogProps> = ({
  isOpen,
  onClose,
  exportType,
  data,
  title = 'تصدير البيانات'
}) => {
  const renderExportComponent = () => {
    switch (exportType) {
      case 'pdf':
        return <PDFExportComponent data={data} title={title} />;
      case 'excel':
        return <ExcelExportComponent data={data} title={title} />;
      case 'csv':
        return <CSVExportComponent data={data} title={title} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="mr-2">جاري التحميل...</span>
            </div>
          }
        >
          {renderExportComponent()}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
};

// Export a memoized version for performance
export default React.memo(LazyExportDialog);