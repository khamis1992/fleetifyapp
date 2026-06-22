import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { 
  Plus, 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ContractsEnhancedHeaderProps {
  onCreateContract: () => void;
  onShowTemplates: () => void;
  onShowExport: () => void;
  onShowCSVUpload: () => void;
  onShowBulkDelete: () => void;
  onRefresh?: () => void;
  onToggleFilters?: () => void;
  activeFiltersCount?: number;
  totalContracts: number;
  activeContracts: number;
  pendingActions: number;
  isRefreshing?: boolean;
}

export const ContractsEnhancedHeader: React.FC<ContractsEnhancedHeaderProps> = ({
  onCreateContract,
  onShowTemplates,
  onShowExport,
  onShowCSVUpload,
  onShowBulkDelete,
  onRefresh,
  onToggleFilters,
  activeFiltersCount = 0,
  totalContracts,
  activeContracts,
  pendingActions,
  isRefreshing = false
}) => {
  const { isMobile, isTablet } = useSimpleBreakpoint();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Mobile Header with Stats */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold">إدارة العقود</h1>
              <Button
                onClick={onCreateContract}
                size="sm"
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 ml-1" />
                جديد
              </Button>
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <div className="text-sm font-semibold text-primary">{totalContracts}</div>
                <div className="text-xs text-muted-foreground">إجمالي</div>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <div className="text-sm font-semibold text-green-600">{activeContracts}</div>
                <div className="text-xs text-muted-foreground">نشط</div>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-lg">
                <div className="text-sm font-semibold text-orange-600">{pendingActions}</div>
                <div className="text-xs text-muted-foreground">معلق</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Action Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className="flex items-center gap-1 shrink-0"
          >
            <Filter className="h-4 w-4" />
            فلترة
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShowExport}
            className="flex items-center gap-1 shrink-0"
          >
            <Download className="h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Header with Enhanced Stats */}
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">إدارة العقود</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {activeContracts} عقد نشط
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  {pendingActions} إجراء معلق
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  {totalContracts} إجمالي العقود
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onToggleFilters}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                فلترة البيانات
                {activeFiltersCount > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                تحديث
              </Button>

              <Button
                onClick={onCreateContract}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                عقد جديد
              </Button>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowTemplates}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              قوالب العقود
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onShowExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير البيانات
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onShowCSVUpload}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">استيراد ذكي</span>
              <span className="sm:hidden">استيراد</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onShowBulkDelete}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              حذف مجمع
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};