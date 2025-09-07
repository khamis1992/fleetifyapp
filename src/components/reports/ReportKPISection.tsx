import React from 'react';

interface KPIItem {
  label: string;
  value: number | string;
  type: 'currency' | 'number' | 'percentage';
  color?: 'green' | 'blue' | 'gray';
}

interface ReportKPISectionProps {
  kpis: KPIItem[];
  title?: string;
}

export function ReportKPISection({ kpis, title }: ReportKPISectionProps) {
  const formatValue = (value: number | string, type: KPIItem['type']): string => {
    if (typeof value === 'string') return value;
    
    switch (type) {
      case 'currency':
        return `${value.toFixed(2)} ر.ق`;
      case 'percentage':
        return `${value}%`;
      case 'number':
      default:
        return value.toLocaleString('ar-SA');
    }
  };

  const getTextColor = (color?: string): string => {
    switch (color) {
      case 'green':
        return 'text-green-700';
      case 'blue':
        return 'text-blue-800';
      case 'gray':
      default:
        return 'text-gray-800';
    }
  };

  if (!kpis || kpis.length === 0) {
    return null;
  }

  // Take only first 3 KPIs to match template
  const displayKpis = kpis.slice(0, 3);

  return (
    <section className="grid grid-cols-3 gap-6 mb-6 print:gap-4 print:mb-4">
      {displayKpis.map((kpi, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm no-break print:shadow-none print:p-4">
          <h4 className="text-sm text-gray-500 mb-2">{kpi.label}</h4>
          <p className={`text-3xl font-bold ${getTextColor(kpi.color)} print:text-2xl`}>
            {formatValue(kpi.value, kpi.type)}
          </p>
        </div>
      ))}
    </section>
  );
}