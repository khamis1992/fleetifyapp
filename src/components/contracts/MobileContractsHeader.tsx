import React from 'react';
import { Plus, Settings, FileText, Upload, Trash2, Menu, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface MobileContractsHeaderProps {
  onCreateContract: () => void;
  onShowTemplates: () => void;
  onShowExport: () => void;
  onShowCSVUpload: () => void;
  onShowBulkDelete: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  isRefreshing?: boolean;
}

export const MobileContractsHeader: React.FC<MobileContractsHeaderProps> = ({
  onCreateContract,
  onShowTemplates,
  onShowExport,
  onShowCSVUpload,
  onShowBulkDelete,
  onRefresh,
  onToggleFilters,
  isRefreshing = false
}) => {
  return (
    <div className="flex flex-col space-y-4">
      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">إدارة العقود</h1>
          <p className="text-sm text-muted-foreground">
            إدارة عقود الإيجار والخدمات
          </p>
        </div>
        
        {/* Menu Sheet for Actions */}
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="h-11 w-11 rounded-xl"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="text-right">إجراءات العقود</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-4 mt-6">
              {/* Primary Action */}
              <Button 
                onClick={onCreateContract}
                className="w-full h-12 text-base font-medium justify-start gap-3 rounded-xl"
                size="lg"
              >
                <Plus className="h-5 w-5" />
                إنشاء عقد جديد
              </Button>
              
              <Separator />
              
              {/* Secondary Actions */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={onShowTemplates}
                  className="w-full h-11 justify-start gap-3 rounded-xl"
                >
                  <Settings className="h-5 w-5" />
                  إدارة القوالب
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={onShowCSVUpload}
                  className="w-full h-11 justify-start gap-3 rounded-xl"
                >
                  <Upload className="h-5 w-5" />
                  رفع ملف CSV
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={onShowExport}
                  className="w-full h-11 justify-start gap-3 rounded-xl"
                >
                  <FileText className="h-5 w-5" />
                  تصدير التقرير
                </Button>
              </div>
              
              <Separator />
              
              {/* Destructive Action */}
              <Button 
                variant="destructive" 
                onClick={onShowBulkDelete}
                className="w-full h-11 justify-start gap-3 rounded-xl"
              >
                <Trash2 className="h-5 w-5" />
                حذف جميع العقود
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quick Action Bar */}
      <div className="flex items-center gap-3 p-3 bg-card/50 backdrop-blur-sm rounded-xl border">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilters}
          className="flex-1 h-10 gap-2 rounded-lg font-medium"
        >
          <Filter className="h-4 w-4" />
          فلترة
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex-1 h-10 gap-2 rounded-lg font-medium"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          تحديث
        </Button>
        
        <Button
          size="sm"
          onClick={onCreateContract}
          className="flex-1 h-10 gap-2 rounded-lg font-medium shadow-md"
        >
          <Plus className="h-4 w-4" />
          عقد جديد
        </Button>
      </div>
    </div>
  );
};