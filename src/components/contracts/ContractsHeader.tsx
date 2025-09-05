import * as React from 'react';
import { Plus, Settings, FileText, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContractsHeaderProps {
  onCreateContract: () => void;
  onShowTemplates: () => void;
  onShowExport: () => void;
  onShowCSVUpload: () => void;
  onShowBulkDelete: () => void;
}

export const ContractsHeader: React.FC<ContractsHeaderProps> = ({
  onCreateContract,
  onShowTemplates,
  onShowExport,
  onShowCSVUpload,
  onShowBulkDelete
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إدارة العقود</h1>
        <p className="text-muted-foreground">
          إدارة عقود الإيجار والخدمات مع العملاء
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onShowTemplates}>
          <Settings className="h-4 w-4 mr-2" />
          القوالب
        </Button>
        <Button variant="outline" onClick={onShowCSVUpload}>
          <Upload className="h-4 w-4 mr-2" />
          رفع CSV
        </Button>
        <Button variant="outline" onClick={onShowExport}>
          <FileText className="h-4 w-4 mr-2" />
          تصدير التقرير
        </Button>
        <Button variant="destructive" onClick={onShowBulkDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          حذف جميع العقود
        </Button>
        <Button onClick={onCreateContract}>
          <Plus className="h-4 w-4 mr-2" />
          إنشاء عقد جديد
        </Button>
      </div>
    </div>
  );
};