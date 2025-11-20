import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, exportToExcel } from '@/utils/exports';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface InventoryReportFilter {
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  categoryId?: string;
  itemType?: string;
  reportType: string;
}

export interface InventoryReport {
  id: string;
  reportName: string;
  reportType: string;
  parameters: Record<string, any>;
  data: any[];
  summary: Record<string, any>;
  generatedAt: string;
  generatedBy: string;
  fileUrl?: string;
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  excessStockItems: number;
  turnoverRate: number;
  accuracyRate: number;
  fulfillmentRate: number;
  holdingCost: number;
  stockoutCost: number;
}

export interface WarehousePerformance {
  warehouseId: string;
  warehouseName: string;
  totalItems: number;
  totalValue: number;
  utilizationRate: number;
  accuracyRate: number;
  averageDaysOfSupply: number;
  movementCount: number;
  lastCountDate?: string;
}

export interface ItemPerformance {
  itemId: string;
  itemName: string;
  itemCode?: string;
  category?: string;
  currentStock: number;
  avgMonthlyUsage: number;
  turnoverRate: number;
  daysOfSupply: number;
  totalValue: number;
  reorderPoint: number;
  safetyStock: number;
  lastMovementDate?: string;
  movementCount: number;
  stockouts: number;
  excessStockValue: number;
}

export interface InventoryAnalytics {
  overview: InventoryMetrics;
  warehousePerformance: WarehousePerformance[];
  topItems: {
    byValue: ItemPerformance[];
    byMovement: ItemPerformance[];
    byTurnover: ItemPerformance[];
  };
  lowStockAlerts: ItemPerformance[];
  excessStockAlerts: ItemPerformance[];
  categoryAnalysis: Array<{
    categoryName: string;
    itemCount: number;
    totalValue: number;
    averageTurnover: number;
    percentageOfTotalValue: number;
  }>;
  trendData: Array<{
    period: string;
    totalValue: number;
    movementCount: number;
    newItems: number;
    outOfStockItems: number;
  }>;
}

export const useInventoryReports = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-reports', user?.profile?.company_id],
    queryFn: async (): Promise<InventoryReport[]> => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('inventory_reports')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useInventoryAnalytics = (filters: {
  warehouseId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-analytics', user?.profile?.company_id, filters],
    queryFn: async (): Promise<InventoryAnalytics> => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID required');
      }

      // Get overview metrics
      const { data: overviewData, error: overviewError } = await supabase
        .rpc('get_inventory_overview_metrics', {
          p_company_id: user.profile.company_id,
          p_warehouse_id: filters.warehouseId,
          p_category_id: filters.categoryId,
        });

      if (overviewError) throw overviewError;

      // Get warehouse performance
      const { data: warehouseData, error: warehouseError } = await supabase
        .rpc('get_warehouse_performance_metrics', {
          p_company_id: user.profile.company_id,
        });

      if (warehouseError) throw warehouseError;

      // Get item performance
      const { data: itemData, error: itemError } = await supabase
        .rpc('get_item_performance_metrics', {
          p_company_id: user.profile.company_id,
          p_warehouse_id: filters.warehouseId,
          p_category_id: filters.categoryId,
        });

      if (itemError) throw itemError;

      // Get category analysis
      const { data: categoryData, error: categoryError } = await supabase
        .rpc('get_category_analysis', {
          p_company_id: user.profile.company_id,
        });

      if (categoryError) throw categoryError;

      // Get trend data
      const { data: trendData, error: trendError } = await supabase
        .rpc('get_inventory_trends', {
          p_company_id: user.profile.company_id,
          p_days: 90,
        });

      if (trendError) throw trendError;

      const items = itemData || [];
      const overview = overviewData[0] || {};

      return {
        overview: {
          totalItems: overview.total_items || 0,
          totalValue: parseFloat(overview.total_value) || 0,
          lowStockItems: overview.low_stock_items || 0,
          outOfStockItems: overview.out_of_stock_items || 0,
          excessStockItems: overview.excess_stock_items || 0,
          turnoverRate: parseFloat(overview.turnover_rate) || 0,
          accuracyRate: parseFloat(overview.accuracy_rate) || 0,
          fulfillmentRate: parseFloat(overview.fulfillment_rate) || 0,
          holdingCost: parseFloat(overview.holding_cost) || 0,
          stockoutCost: parseFloat(overview.stockout_cost) || 0,
        },
        warehousePerformance: warehouseData || [],
        topItems: {
          byValue: items
            .sort((a, b) => b.total_value - a.total_value)
            .slice(0, 10),
          byMovement: items
            .sort((a, b) => b.movement_count - a.movement_count)
            .slice(0, 10),
          byTurnover: items
            .sort((a, b) => b.turnover_rate - a.turnover_rate)
            .slice(0, 10),
        },
        lowStockAlerts: items.filter(item => item.current_stock <= item.reorder_point),
        excessStockAlerts: items.filter(item => item.current_stock > item.reorder_point * 2),
        categoryAnalysis: categoryData || [],
        trendData: trendData || [],
      };
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useGenerateInventoryReport = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      reportType,
      parameters,
    }: {
      reportType: string;
      parameters: Record<string, any>;
    }) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID required');
      }

      let data: any[] = [];

      switch (reportType) {
        case 'STOCK_VALUATION':
          const { data: valuationData } = await supabase.rpc('calculate_inventory_valuation', {
            p_company_id: user.profile.company_id,
            p_warehouse_id: parameters.warehouseId,
            p_category_id: parameters.categoryId,
          });
          data = valuationData || [];
          break;

        case 'STOCK_MOVEMENTS':
          const { data: movementsData } = await supabase
            .from('inventory_movements')
            .select(`
              *,
              item:item_name,
              warehouse:warehouse_name,
              creator:auth.users(name)
            `)
            .eq('company_id', user.profile.company_id)
            .gte('movement_date', parameters.dateFrom)
            .lte('movement_date', parameters.dateTo)
            .order('movement_date', { ascending: false });
          data = movementsData || [];
          break;

        case 'AGING_ANALYSIS':
          const { data: agingData } = await supabase
            .from('inventory_aging_analysis')
            .select('*')
            .eq('company_id', user.profile.company_id);
          data = agingData || [];
          break;

        case 'TURNOVER_ANALYSIS':
          const { data: turnoverData } = await supabase
            .from('inventory_turnover_analysis')
            .select('*')
            .eq('company_id', user.profile.company_id);
          data = turnoverData || [];
          break;

        case 'LOW_STOCK_ALERTS':
          const { data: alertsData } = await supabase
            .from('inventory_stock_alerts')
            .select('*')
            .eq('company_id', user.profile.company_id);
          data = alertsData || [];
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Save report to database
      const { data: reportData, error: reportError } = await supabase
        .from('inventory_reports')
        .insert({
          company_id: user.profile.company_id,
          report_name: `${reportType}_${new Date().toISOString().split('T')[0]}`,
          report_type: reportType,
          parameters,
          data,
          summary: this.generateSummary(data, reportType),
          generated_by: user.id,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      return reportData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-reports'] });
      toast({
        title: 'تم إنشاء التقرير',
        description: 'تم إنشاء تقرير المخزون بنجاح',
      });
    },
    onError: (error) => {
      console.error('Error generating inventory report:', error);
      toast({
        title: 'خطأ في إنشاء التقرير',
        description: 'حدث خطأ أثناء إنشاء تقرير المخزون',
        variant: 'destructive',
      });
    },
  });

  // Helper method to generate summary
  function generateSummary(data: any[], reportType: string): Record<string, any> {
    const summary: Record<string, any> = {
      totalRecords: data.length,
      generatedAt: new Date().toISOString(),
    };

    switch (reportType) {
      case 'STOCK_VALUATION':
        summary.totalValue = data.reduce((sum, item) => sum + parseFloat(item.total_cost_value || 0), 0);
        summary.totalQuantity = data.reduce((sum, item) => sum + parseFloat(item.total_quantity || 0), 0);
        summary.warehouseCount = new Set(data.map(item => item.warehouse_name)).size;
        break;

      case 'STOCK_MOVEMENTS':
        summary.totalMovements = data.length;
        summary.totalQuantity = data.reduce((sum, item) => sum + Math.abs(parseFloat(item.quantity || 0)), 0);
        summary.movementTypes = [...new Set(data.map(item => item.movement_type))];
        break;

      case 'LOW_STOCK_ALERTS':
        summary.totalAlerts = data.length;
        summary.totalShortage = data.reduce((sum, item) => sum + parseFloat(item.shortage_quantity || 0), 0);
        summary.criticalItems = data.filter(item => item.alert_type === 'نفذ المخزون').length;
        break;
    }

    return summary;
  }
};

export const useExportInventoryReport = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      reportId,
      format,
    }: {
      reportId: string;
      format: 'CSV' | 'EXCEL' | 'PDF';
    }) => {
      // Get report data
      const { data: report, error } = await supabase
        .from('inventory_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      const reportData = report.data || [];
      const fileName = `${report.report_name}_${new Date().toISOString().split('T')[0]}`;

      switch (format) {
        case 'CSV':
          return await exportToCSV(reportData, fileName);
        case 'EXCEL':
          return await exportToExcel(reportData, fileName);
        case 'PDF':
          return await generatePDFReport(report);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'تم تصدير التقرير',
        description: `تم تصدير التقرير بنجاح بصيغة ${variables.format}`,
      });
    },
    onError: (error) => {
      console.error('Error exporting inventory report:', error);
      toast({
        title: 'خطأ في التصدير',
        description: 'حدث خطأ أثناء تصدير التقرير',
        variant: 'destructive',
      });
    },
  });
};

// Helper function to generate PDF reports
async function generatePDFReport(report: InventoryReport) {
  const doc = new jsPDF();
  const arabicFont = await loadArabicFont(); // You'd need to implement this
  doc.addFont(arabicFont, 'Arabic', 'normal');
  doc.setFont('Arabic');

  // Add title
  doc.setFontSize(18);
  doc.text(report.reportName, 20, 20);

  // Add metadata
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 20, 30);
  doc.text(`Type: ${report.reportType}`, 20, 40);
  doc.text(`Records: ${report.data.length}`, 20, 50);

  // Add summary table
  const summaryData = Object.entries(report.summary).map(([key, value]) => [
    key.replace(/_/g, ' ').toUpperCase(),
    String(value),
  ]);

  (doc as any).autoTable({
    head: [['Metric', 'Value']],
    body: summaryData,
    startY: 60,
    theme: 'grid',
  });

  // Add data table
  if (report.data.length > 0) {
    const columns = Object.keys(report.data[0]);
    const rows = report.data.map((item: any) => columns.map(col => String(item[col] || '')));

    (doc as any).autoTable({
      head: [columns],
      body: rows,
      startY: doc.lastAutoTable.finalY + 20,
      theme: 'grid',
    });
  }

  // Save the PDF
  const fileName = `${report.reportName}.pdf`;
  doc.save(fileName);
  return fileName;
}

// Mock function - you'd need to implement Arabic font loading
async function loadArabicFont() {
  // Implementation for loading Arabic font
  return 'path-to-arabic-font';
}

export const useScheduleReport = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      reportType,
      schedule,
      parameters,
    }: {
      reportType: string;
      schedule: {
        frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
        time: string;
        recipients: string[];
      };
      parameters: Record<string, any>;
    }) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID required');
      }

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert({
          company_id: user.profile.company_id,
          report_type: reportType,
          schedule,
          parameters,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast({
        title: 'تم جدولة التقرير',
        description: 'تم جدولة التقرير التلقائي بنجاح',
      });
    },
    onError: (error) => {
      console.error('Error scheduling report:', error);
      toast({
        title: 'خطأ في الجدولة',
        description: 'حدث خطأ أثناء جدولة التقرير',
        variant: 'destructive',
      });
    },
  });
};

export const useScheduledReports = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scheduled-reports', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};