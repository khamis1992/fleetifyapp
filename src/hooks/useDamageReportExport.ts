import { useReportExport } from './useReportExport';
import { useToast } from '@/hooks/use-toast';

interface DamagePoint {
  id: string;
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
}

interface ExportDamageReportOptions {
  conditionReportId: string;
  damagePoints: DamagePoint[];
  title?: string;
}

export const useDamageReportExport = () => {
  const { exportToHTML, isExporting } = useReportExport();
  const { toast } = useToast();

  const exportDamageReport = async (options: ExportDamageReportOptions) => {
    try {
      await exportToHTML({
        reportId: `damage-${options.conditionReportId}`,
        moduleType: 'damage_report',
        title: options.title || 'تقرير أضرار المركبة',
        filters: {},
        conditionReportId: options.conditionReportId,
        damagePoints: options.damagePoints,
        format: 'html'
      });
    } catch (error) {
      console.error('Failed to export damage report:', error);
      toast({
        title: "فشل في تصدير التقرير",
        description: "حدث خطأ أثناء تصدير تقرير الأضرار",
        variant: "destructive",
      });
    }
  };

  return {
    exportDamageReport,
    isExporting
  };
};