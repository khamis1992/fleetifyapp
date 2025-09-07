import React from 'react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface SimpleDataTableProps {
  data: any[];
  title: string;
}

export function SimpleDataTable({ data, title }: SimpleDataTableProps) {
  const { formatCurrency } = useCurrencyFormatter();

  if (!data || data.length === 0) {
    return null;
  }

  const firstItem = data[0];
  const columns = Object.keys(firstItem);

  const formatCellValue = (value: any, column: string) => {
    if (typeof value === 'number' && column.includes('amount')) {
      return formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  };

  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th 
                  key={column} 
                  className="border border-gray-200 p-3 text-right font-semibold text-gray-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((column) => (
                  <td 
                    key={column} 
                    className="border border-gray-200 p-3 text-gray-600"
                  >
                    {formatCellValue(item[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <div className="mt-3 text-center text-sm text-gray-500">
            عرض 10 من أصل {data.length} عنصر
          </div>
        )}
      </div>
    </section>
  );
}