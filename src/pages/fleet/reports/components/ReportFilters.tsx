/**
 * مكون فلاتر التقارير المتقدمة
 * Report Filters Component
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  Download,
  SlidersHorizontal,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { DateFilterPeriod, ReportFilters as IReportFilters, ExportFormat } from '../types/reports.types';

interface ReportFiltersProps {
  filters: IReportFilters;
  onFiltersChange: (filters: IReportFilters) => void;
  onExport: (format: ExportFormat) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  isDark: boolean;
}

const periodOptions: { value: DateFilterPeriod; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'quarter', label: 'هذا الربع' },
  { value: 'year', label: 'هذه السنة' },
  { value: 'custom', label: 'فترة مخصصة' },
];

const exportOptions: { value: ExportFormat; label: string; icon: string }[] = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'excel', label: 'Excel', icon: '📊' },
  { value: 'csv', label: 'CSV', icon: '📋' },
];

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  isLoading,
  isDark,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const handlePeriodChange = (period: DateFilterPeriod) => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        // Keep existing dates for custom
        startDate = filters.startDate;
        endDate = filters.endDate;
        break;
    }

    onFiltersChange({
      ...filters,
      period,
      startDate,
      endDate,
    });
  };

  const handleCompareToggle = () => {
    onFiltersChange({
      ...filters,
      compareWithPrevious: !filters.compareWithPrevious,
    });
  };

  const activeFiltersCount = [
    filters.vehicleStatus?.length,
    filters.vehicleIds?.length,
    filters.compareWithPrevious,
  ].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-4",
        "backdrop-blur-xl border",
        isDark 
          ? "bg-slate-900/60 border-slate-800/50" 
          : "bg-white/80 border-slate-200/50",
        "shadow-lg"
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <CalendarIcon className={cn(
            "w-4 h-4",
            isDark ? "text-slate-400" : "text-slate-500"
          )} />
          <Select
            value={filters.period}
            onValueChange={(v) => handlePeriodChange(v as DateFilterPeriod)}
          >
            <SelectTrigger className={cn(
              "w-[160px] h-9",
              isDark 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-white border-slate-200"
            )}>
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {filters.period === 'custom' && (
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  isDark && "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                )}
              >
                {filters.startDate && filters.endDate ? (
                  <>
                    {format(filters.startDate, 'dd/MM', { locale: ar })}
                    {' - '}
                    {format(filters.endDate, 'dd/MM', { locale: ar })}
                  </>
                ) : (
                  'اختر التاريخ'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.startDate,
                  to: filters.endDate,
                }}
                onSelect={(range) => {
                  onFiltersChange({
                    ...filters,
                    startDate: range?.from,
                    endDate: range?.to,
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Compare Toggle */}
        <Button
          variant={filters.compareWithPrevious ? "default" : "outline"}
          size="sm"
          onClick={handleCompareToggle}
          className={cn(
            "h-9",
            !filters.compareWithPrevious && isDark && "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          )}
        >
          {filters.compareWithPrevious && <Check className="w-3 h-3 ml-1" />}
          مقارنة بالفترة السابقة
        </Button>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "h-9",
            isDark && "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          )}
        >
          <SlidersHorizontal className="w-4 h-4 ml-1" />
          فلاتر متقدمة
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        <div className="flex-1" />

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "h-9",
            isDark && "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          )}
        >
          <RefreshCw className={cn(
            "w-4 h-4 ml-1",
            isLoading && "animate-spin"
          )} />
          تحديث
        </Button>

        {/* Export Button */}
        <Popover open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              className="h-9 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600"
            >
              <Download className="w-4 h-4 ml-1" />
              تصدير
              <ChevronDown className="w-3 h-3 mr-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <div className="space-y-1">
              {exportOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onExport(option.value);
                    setExportMenuOpen(false);
                  }}
                >
                  <span className="ml-2">{option.icon}</span>
                  تصدير {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "mt-4 pt-4 border-t",
              isDark ? "border-slate-700" : "border-slate-200"
            )}>
              <div className="flex flex-wrap items-center gap-3">
                {/* Vehicle Status Filter */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}>
                    حالة المركبة:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {['available', 'rented', 'maintenance', 'reserved', 'reserved_employee'].map((status) => {
                      const isSelected = filters.vehicleStatus?.includes(status as any);
                      const labels = {
                        available: 'متاحة',
                        rented: 'مؤجرة',
                        maintenance: 'صيانة',
                        reserved: 'محجوزة',
                        reserved_employee: 'لموظف',
                      };
                      return (
                        <Button
                          key={status}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const current = filters.vehicleStatus || [];
                            const updated = isSelected
                              ? current.filter(s => s !== status)
                              : [...current, status as any];
                            onFiltersChange({
                              ...filters,
                              vehicleStatus: updated.length ? updated : undefined,
                            });
                          }}
                        >
                          {labels[status as keyof typeof labels]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onFiltersChange({
                        period: 'month',
                        compareWithPrevious: false,
                      });
                    }}
                    className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <X className="w-3 h-3 ml-1" />
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReportFilters;

