import React from 'react';

interface SimpleReportFiltersProps {
  filters?: Record<string, any>;
}

export function SimpleReportFilters({ filters }: SimpleReportFiltersProps) {
  const hasFilters = filters && Object.keys(filters).length > 0;

  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold text-slate-700 mb-2">معايير التصفية</h3>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-500">
        {hasFilters ? (
          <div className="space-y-1">
            {filters.startDate && (
              <div>من تاريخ: <span className="font-medium">{filters.startDate}</span></div>
            )}
            {filters.endDate && (
              <div>إلى تاريخ: <span className="font-medium">{filters.endDate}</span></div>
            )}
            {filters.moduleType && (
              <div>القسم: <span className="font-medium">{filters.moduleType}</span></div>
            )}
          </div>
        ) : (
          'لا توجد بيانات عرض'
        )}
      </div>
    </section>
  );
}