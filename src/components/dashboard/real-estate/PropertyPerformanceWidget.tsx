import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowUpDown, Building } from 'lucide-react';
import { usePropertyReports } from '@/hooks/usePropertyReports';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

type SortField = 'propertyName' | 'occupancyRate' | 'monthlyRent' | 'maintenanceCosts' | 'roi' | 'netIncome';
type SortDirection = 'asc' | 'desc';

export const PropertyPerformanceWidget: React.FC = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { data: reportsData, isLoading } = usePropertyReports();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

  const [sortField, setSortField] = useState<SortField>('roi');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<string>('all');

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={2} />;
  }

  if (!reportsData || !reportsData.performance) return null;

  const properties = reportsData.performance || [];

  // Calculate average performance
  const avgROI = properties.length > 0
    ? properties.reduce((sum, p) => sum + p.roi, 0) / properties.length
    : 0;

  const avgProfitMargin = properties.length > 0
    ? properties.reduce((sum, p) => sum + p.profitMargin, 0) / properties.length
    : 0;

  // Filter properties
  const filteredProperties = filterType === 'all'
    ? properties
    : properties.filter(p => p.propertyType.toLowerCase() === filterType.toLowerCase());

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (sortField) {
      case 'propertyName':
        aValue = a.propertyName;
        bValue = b.propertyName;
        break;
      case 'occupancyRate':
        aValue = a.status === 'occupied' ? 100 : 0;
        bValue = b.status === 'occupied' ? 100 : 0;
        break;
      case 'monthlyRent':
        aValue = a.monthlyRent;
        bValue = b.monthlyRent;
        break;
      case 'maintenanceCosts':
        aValue = a.maintenanceCosts;
        bValue = b.maintenanceCosts;
        break;
      case 'roi':
        aValue = a.roi;
        bValue = b.roi;
        break;
      case 'netIncome':
        aValue = a.actualRevenue - a.maintenanceCosts;
        bValue = b.actualRevenue - b.maintenanceCosts;
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue, 'ar')
        : bValue.localeCompare(aValue, 'ar');
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPerformanceColor = (value: number, avg: number) => {
    if (value >= avg * 1.1) return 'text-green-700 bg-green-50';
    if (value <= avg * 0.9) return 'text-red-700 bg-red-50';
    return 'text-slate-700 bg-slate-50';
  };

  // Get unique property types
  const propertyTypes = ['all', ...new Set(properties.map(p => p.propertyType))];

  // Prepare export data
  const exportData = React.useMemo(() => [
    { المؤشر: 'متوسط العائد على الاستثمار', القيمة: `${avgROI.toFixed(1)}%` },
    { المؤشر: 'متوسط هامش الربح', القيمة: `${avgProfitMargin.toFixed(1)}%` },
    ...sortedProperties.map(p => ({
      'اسم العقار': p.propertyName,
      'الإيجار الشهري': formatCurrency(p.monthlyRent),
      'تكاليف الصيانة': formatCurrency(p.maintenanceCosts),
      'صافي الدخل': formatCurrency(p.actualRevenue - p.maintenanceCosts),
      'العائد %': `${p.roi.toFixed(1)}%`,
      'الحالة': p.status === 'occupied' ? 'مشغول' : p.status === 'vacant' ? 'شاغر' : p.status,
    })),
  ], [avgROI, avgProfitMargin, sortedProperties, formatCurrency]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                مقارنة أداء العقارات
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="property_performance"
                title="مقارنة أداء العقارات"
                variant="ghost"
                size="sm"
              />
              <button
                onClick={() => navigate('/properties')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                عرض التفاصيل ←
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent ref={chartRef} className="p-6 space-y-6">
          {/* Empty State */}
          {properties.length === 0 ? (
            <EmptyStateCompact
              type="no-data"
              title="لا توجد عقارات"
              description="ستظهر بيانات أداء العقارات هنا عند إضافتها"
            />
          ) : (
            <>
          {/* Average Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
              <EnhancedTooltip kpi={kpiDefinitions.roi}>
                <div className="text-sm text-slate-600 mb-1">متوسط العائد على الاستثمار</div>
              </EnhancedTooltip>
              <div className="text-3xl font-bold text-blue-700">{avgROI.toFixed(1)}%</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-600 mb-1">متوسط هامش الربح</div>
              <div className="text-3xl font-bold text-green-700">{avgProfitMargin.toFixed(1)}%</div>
            </div>
          </div>

          {/* Property Type Filter */}
          {propertyTypes.length > 2 && (
            <div className="flex gap-2 flex-wrap justify-end">
              {propertyTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filterType === type
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'all' ? 'الكل' : type}
                </button>
              ))}
            </div>
          )}

          {/* Properties Performance Table */}
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 rounded-t-lg border-b border-slate-200 text-xs font-semibold text-slate-600">
                <button
                  onClick={() => handleSort('propertyName')}
                  className="flex items-center justify-end gap-1 hover:text-emerald-600 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>العقار</span>
                </button>
                <button
                  onClick={() => handleSort('monthlyRent')}
                  className="flex items-center justify-end gap-1 hover:text-emerald-600 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>الإيجار</span>
                </button>
                <button
                  onClick={() => handleSort('maintenanceCosts')}
                  className="flex items-center justify-end gap-1 hover:text-emerald-600 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>الصيانة</span>
                </button>
                <button
                  onClick={() => handleSort('netIncome')}
                  className="flex items-center justify-end gap-1 hover:text-emerald-600 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>صافي الدخل</span>
                </button>
                <button
                  onClick={() => handleSort('roi')}
                  className="flex items-center justify-end gap-1 hover:text-emerald-600 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>العائد %</span>
                </button>
                <div className="text-right">الحالة</div>
              </div>

              {/* Table Body */}
              <div className="max-h-96 overflow-y-auto">
                {sortedProperties.slice(0, 10).map((property, index) => {
                  const netIncome = property.actualRevenue - property.maintenanceCosts;
                  const roiColor = getPerformanceColor(property.roi, avgROI);
                  const profitColor = getPerformanceColor(netIncome, avgProfitMargin);

                  return (
                    <div
                      key={property.propertyId}
                      className={`grid grid-cols-6 gap-2 p-3 border-b border-slate-100 text-xs hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium text-slate-800 truncate">
                          {property.propertyName}
                        </span>
                        <Building className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      </div>
                      <div className="text-right font-medium text-slate-700">
                        {formatCurrency(property.monthlyRent)}
                      </div>
                      <div className="text-right font-medium text-orange-600">
                        {formatCurrency(property.maintenanceCosts)}
                      </div>
                      <div className={`text-right font-bold px-2 py-1 rounded ${profitColor}`}>
                        {formatCurrency(netIncome)}
                      </div>
                      <div className={`text-right font-bold px-2 py-1 rounded ${roiColor}`}>
                        {property.roi.toFixed(1)}%
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            property.status === 'occupied'
                              ? 'bg-green-100 text-green-700'
                              : property.status === 'vacant'
                              ? 'bg-orange-100 text-orange-700'
                              : property.status === 'maintenance'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {property.status === 'occupied'
                            ? 'مشغول'
                            : property.status === 'vacant'
                            ? 'شاغر'
                            : property.status === 'maintenance'
                            ? 'صيانة'
                            : 'متاح'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-50 border border-green-200"></div>
              <span>أداء أعلى من المتوسط</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>
              <span>أداء أقل من المتوسط</span>
            </div>
          </div>

          {/* Quick Action */}
          <button
            onClick={() => navigate('/properties')}
            className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            عرض تفاصيل العقارات
          </button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
