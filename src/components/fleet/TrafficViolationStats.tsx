import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin
} from 'lucide-react';

interface ViolationStatsProps {
  violations: Array<{
    id: string;
    violationType: string;
    fineAmount: number;
    date: string;
    location: string;
    status: 'extracted' | 'matched' | 'error';
  }>;
}

export const TrafficViolationStats: React.FC<ViolationStatsProps> = ({ violations }) => {
  // حساب الإحصائيات
  const stats = {
    total: violations.length,
    matched: violations.filter(v => v.status === 'matched').length,
    errors: violations.filter(v => v.status === 'error').length,
    totalFines: violations.reduce((sum, v) => sum + v.fineAmount, 0),
    avgFine: violations.length > 0 ? violations.reduce((sum, v) => sum + v.fineAmount, 0) / violations.length : 0
  };

  // تجميع المخالفات حسب النوع
  const violationsByType = violations.reduce((acc, violation) => {
    acc[violation.violationType] = (acc[violation.violationType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // تجميع المخالفات حسب الموقع
  const violationsByLocation = violations.reduce((acc, violation) => {
    const location = violation.location.split(' ')[0]; // أخذ أول كلمة من الموقع
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // أكثر أنواع المخالفات
  const topViolationTypes = Object.entries(violationsByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  // أكثر المواقع
  const topLocations = Object.entries(violationsByLocation)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* الإحصائيات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-600">إجمالي المخالفات</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.matched}</p>
                <p className="text-sm text-slate-600">مطابقة للمركبات</p>
                <p className="text-xs text-green-600">
                  {stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}% نجاح
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.errors}</p>
                <p className="text-sm text-slate-600">أخطاء</p>
                <p className="text-xs text-red-600">
                  {stats.total > 0 ? Math.round((stats.errors / stats.total) * 100) : 0}% فشل
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalFines.toFixed(2)}</p>
                <p className="text-sm text-slate-600">إجمالي الغرامات (د.ك)</p>
                <p className="text-xs text-slate-500">
                  متوسط: {stats.avgFine.toFixed(2)} د.ك
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التفاصيل المتقدمة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* أكثر أنواع المخالفات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              أكثر أنواع المخالفات
            </CardTitle>
            <CardDescription>
              الأنواع الأكثر تكراراً في الملفات المستوردة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topViolationTypes.length > 0 ? (
                topViolationTypes.map(([type, count], index) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm">{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-slate-500">
                        ({Math.round((count / stats.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  لا توجد بيانات متاحة
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* أكثر المواقع */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              أكثر المواقع
            </CardTitle>
            <CardDescription>
              المواقع الأكثر تكراراً للمخالفات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLocations.length > 0 ? (
                topLocations.map(([location, count], index) => (
                  <div key={location} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm">{location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-slate-500">
                        ({Math.round((count / stats.total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  لا توجد بيانات متاحة
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* توزيع الغرامات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            توزيع الغرامات
          </CardTitle>
          <CardDescription>
            تحليل مبالغ الغرامات المستوردة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {violations.filter(v => v.fineAmount < 100).length}
              </p>
              <p className="text-sm text-blue-800">أقل من 100 د.ك</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {violations.filter(v => v.fineAmount >= 100 && v.fineAmount < 300).length}
              </p>
              <p className="text-sm text-green-800">100 - 300 د.ك</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {violations.filter(v => v.fineAmount >= 300 && v.fineAmount < 500).length}
              </p>
              <p className="text-sm text-orange-800">300 - 500 د.ك</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {violations.filter(v => v.fineAmount >= 500).length}
              </p>
              <p className="text-sm text-red-800">500+ د.ك</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
