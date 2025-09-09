import React from 'react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface SummaryCard {
  title: string;
  value: number | string;
  color: 'gray' | 'green' | 'blue';
}

interface SimpleReportSummaryProps {
  cards: SummaryCard[];
}

export function SimpleReportSummary({ cards }: SimpleReportSummaryProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-700';
      case 'blue':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const formatValue = (value: number | string, title: string) => {
    if (typeof value === 'number' && title.includes('مبلغ')) {
      return formatCurrency(value);
    }
    return value.toString();
  };

  return (
    <section className="grid grid-cols-3 gap-6 mb-6">
      {cards.map((card, index) => (
        <div 
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm no-break"
        >
          <h4 className="text-sm text-gray-500 mb-2">{card.title}</h4>
          <p className={`text-3xl font-bold ${getColorClasses(card.color)}`}>
            {formatValue(card.value, card.title)}
          </p>
        </div>
      ))}
    </section>
  );
}