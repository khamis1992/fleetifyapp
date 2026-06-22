/**
 * Employee Performance Card Component
 * بطاقة أداء الموظف
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { EmployeePerformance, EmployeePerformanceGrade } from '@/types/employee-workspace.types';

interface EmployeePerformanceCardProps {
  performance: EmployeePerformance | null | undefined;
  performanceGrade: EmployeePerformanceGrade | null;
  isLoading: boolean;
}

export const EmployeePerformanceCard: React.FC<EmployeePerformanceCardProps> = ({
  performance,
  performanceGrade,
  isLoading
}) => {
  if (!performance) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-600">
          لا توجد بيانات أداء متاحة
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'نسبة التحصيل',
      value: performance.collection_rate,
      target: 85,
      weight: '35%'
    },
    {
      label: 'إنجاز المهام',
      value: performance.followup_completion_rate,
      target: 90,
      weight: '25%'
    },
    {
      label: 'تغطية المتابعات',
      value: performance.contact_coverage_rate,
      target: 85,
      weight: '20%'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📈 أدائي هذا الشهر</span>
          {performanceGrade && (
            <Badge className="text-lg px-4 py-2">
              <Star className="ml-2 h-5 w-5" />
              {performanceGrade.grade} - {performanceGrade.label_ar}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">النقاط الإجمالية</p>
            <p className="text-4xl font-bold text-gray-900">
              {Math.round(performance.performance_score)} / 100
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {metrics.map((metric, index) => (
            <div key={index}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-sm text-gray-600">
                  {Math.round(metric.value)}% (الهدف: {metric.target}%)
                </span>
              </div>
              <Progress value={metric.value} className="h-2" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">الوزن: {metric.weight}</span>
                {metric.value >= metric.target ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    فوق الهدف
                  </span>
                ) : (
                  <span className="text-xs text-orange-600 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    أقل من الهدف
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{performance.total_communications}</p>
            <p className="text-xs text-gray-600">تواصلات</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{performance.completed_followups}</p>
            <p className="text-xs text-gray-600">متابعات مكتملة</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{performance.assigned_contracts_count}</p>
            <p className="text-xs text-gray-600">عقود معيّنة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
