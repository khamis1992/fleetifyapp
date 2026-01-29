/**
 * Export Button Component
 * زر تصدير البيانات مع خيارات متعددة
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  onExportExcel?: () => Promise<void>;
  onExportPDF?: () => Promise<void>;
  onExportCSV?: () => Promise<void>;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportExcel,
  onExportPDF,
  onExportCSV,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  label = 'تصدير',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'excel' | 'pdf' | 'csv', handler?: () => Promise<void>) => {
    if (!handler) {
      toast.error('غير متاح', {
        description: `التصدير إلى ${type === 'excel' ? 'Excel' : type === 'pdf' ? 'PDF' : 'CSV'} غير متاح حالياً`,
      });
      return;
    }

    setIsExporting(true);
    try {
      await handler();
      toast.success('تم التصدير بنجاح', {
        description: `تم تصدير البيانات إلى ${type === 'excel' ? 'Excel' : type === 'pdf' ? 'PDF' : 'CSV'}`,
      });
    } catch (error: any) {
      toast.error('فشل التصدير', {
        description: error.message || 'حدث خطأ أثناء تصدير البيانات',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // If only one export option, show simple button
  const exportOptions = [
    onExportExcel && { type: 'excel' as const, label: 'Excel', icon: FileSpreadsheet, handler: onExportExcel },
    onExportPDF && { type: 'pdf' as const, label: 'PDF', icon: FileText, handler: onExportPDF },
    onExportCSV && { type: 'csv' as const, label: 'CSV', icon: FileSpreadsheet, handler: onExportCSV },
  ].filter(Boolean) as Array<{ type: 'excel' | 'pdf' | 'csv'; label: string; icon: any; handler: () => Promise<void> }>;

  if (exportOptions.length === 0) {
    return null;
  }

  if (exportOptions.length === 1) {
    const option = exportOptions[0];
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport(option.type, option.handler)}
        disabled={disabled || isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <option.icon className="h-4 w-4" />
        )}
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {exportOptions.map((option, index) => (
          <React.Fragment key={option.type}>
            <DropdownMenuItem
              onClick={() => handleExport(option.type, option.handler)}
              disabled={isExporting}
              className="gap-2 cursor-pointer"
            >
              <option.icon className="h-4 w-4" />
              <span>تصدير إلى {option.label}</span>
            </DropdownMenuItem>
            {index < exportOptions.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
