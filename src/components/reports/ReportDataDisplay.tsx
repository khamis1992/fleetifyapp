import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportDataDisplayProps {
  data: any;
  reportId: string;
  moduleType: string;
}

export function ReportDataDisplay({ data }: ReportDataDisplayProps) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">لا توجد بيانات متاحة لهذا التقرير</p>
      </div>
    );
  }

  // Handle the data structure from useModuleReportData
  const displayData = data.data || data.employees || data.vehicles || data.customers || data.cases || data.invoices || data.payments || [];
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {Object.keys(summary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ملخص الإحصائيات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{key}</p>
                  <p className="text-xl font-bold">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {displayData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {Object.keys(displayData[0]).map((column) => (
                      <th key={column} className="text-right p-2 font-medium text-muted-foreground">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.slice(0, 10).map((item: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      {Object.entries(item).map(([column, value]) => (
                        <td key={column} className="p-2">
                          {String(value || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data message */}
      {displayData.length === 0 && Object.keys(summary).length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>بيانات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد بيانات متاحة لهذا التقرير</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}