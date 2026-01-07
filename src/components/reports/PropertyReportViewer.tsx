import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Download, 
  Eye,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  Home,
  Briefcase
} from 'lucide-react';
import { usePropertyReports, usePropertyFinancialReport, usePropertyOccupancyReport, usePropertyPortfolioReport } from '@/hooks/usePropertyReports';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PropertyReportFilters } from './PropertyReportFilters';

interface PropertyReportViewerProps {
  reportId: string;
  filters: any;
  onClose: () => void;
  onExport: (data: any) => void;
}

export const PropertyReportViewer: React.FC<PropertyReportViewerProps> = ({
  reportId,
  filters,
  onClose,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: reportsData, isLoading } = usePropertyReports();
  const { data: financialData } = usePropertyFinancialReport(
    filters.dateRange?.from?.toISOString(),
    filters.dateRange?.to?.toISOString()
  );
  const { data: occupancyData } = usePropertyOccupancyReport();
  const { data: portfolioData } = usePropertyPortfolioReport();

  const getReportTitle = (reportId: string) => {
    const titles: Record<string, string> = {
      'property_financial': 'التقرير المالي للعقارات',
      'property_occupancy': 'تقرير الإشغال والشغور',
      'property_performance': 'تقرير أداء العقارات',
      'property_portfolio': 'تقرير المحفظة العقارية',
      'property_owners': 'تقارير الملاك',
      'property_tenants': 'تقارير المستأجرين',
      'property_maintenance': 'تقارير الصيانة',
      'property_roi': 'تقرير عائد الاستثمار',
      'property_market': 'تحليل السوق العقاري'
    };
    return titles[reportId] || 'تقرير العقارات';
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto" dir="rtl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{getReportTitle(reportId)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filters.dateRange?.from && filters.dateRange?.to && (
                  `من ${format(filters.dateRange.from, 'PPP', { locale: ar })} إلى ${format(filters.dateRange.to, 'PPP', { locale: ar })}`
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onExport(reportsData)}>
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
            <Button variant="outline" onClick={onClose}>
              <Eye className="h-4 w-4 mr-2" />
              إغلاق
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="financial">المالية</TabsTrigger>
            <TabsTrigger value="performance">الأداء</TabsTrigger>
            <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">إجمالي العقارات</p>
                      <p className="text-2xl font-bold">{reportsData?.financial.totalProperties || 0}</p>
                    </div>
                    <Building className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">العقارات المؤجرة</p>
                      <p className="text-2xl font-bold">{reportsData?.financial.occupiedProperties || 0}</p>
                    </div>
                    <Home className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">نسبة الإشغال</p>
                      <p className="text-2xl font-bold">{reportsData?.financial.occupancyRate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">الإيرادات الشهرية</p>
                      <p className="text-2xl font-bold">{reportsData?.financial.monthlyRevenue.toLocaleString()} د.ك</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Property Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  أداء العقارات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-2">اسم العقار</th>
                        <th className="text-right p-2">النوع</th>
                        <th className="text-right p-2">الموقع</th>
                        <th className="text-right p-2">الإيجار الشهري</th>
                        <th className="text-right p-2">الحالة</th>
                        <th className="text-right p-2">العائد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData?.performance.slice(0, 10).map((property) => (
                        <tr key={property.propertyId} className="border-b">
                          <td className="p-2 font-medium">{property.propertyName}</td>
                          <td className="p-2">{property.propertyType}</td>
                          <td className="p-2">{property.location}</td>
                          <td className="p-2">{property.monthlyRent.toLocaleString()} د.ك</td>
                          <td className="p-2">
                            <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                              {property.status === 'occupied' ? 'مؤجر' : 'شاغر'}
                            </Badge>
                          </td>
                          <td className="p-2">{property.roi.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    ملخص الإيرادات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>إجمالي الإيرادات:</span>
                    <span className="font-bold">{reportsData?.financial.totalRevenue.toLocaleString()} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الإيرادات الشهرية:</span>
                    <span className="font-bold">{reportsData?.financial.monthlyRevenue.toLocaleString()} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span>متوسط الإيجار:</span>
                    <span className="font-bold">{reportsData?.financial.averageRent.toLocaleString()} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span>معدل التحصيل:</span>
                    <span className="font-bold text-green-600">{reportsData?.financial.collectionRate}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Profitability Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    تحليل الربحية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>إجمالي الأرباح:</span>
                    <span className="font-bold text-green-600">{reportsData?.financial.totalProfit.toLocaleString()} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span>هامش الربح:</span>
                    <span className="font-bold">
                      {((reportsData?.financial.totalProfit || 0) / (reportsData?.financial.totalRevenue || 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>العائد على الاستثمار:</span>
                    <span className="font-bold text-blue-600">12.5%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Details Table */}
            {financialData && (
              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل المدفوعات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right p-2">تاريخ الدفع</th>
                          <th className="text-right p-2">العقار</th>
                          <th className="text-right p-2">المبلغ</th>
                          <th className="text-right p-2">طريقة الدفع</th>
                          <th className="text-right p-2">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialData.data.slice(0, 10).map((payment: any) => (
                          <tr key={payment.id} className="border-b">
                            <td className="p-2">{format(new Date(payment.payment_date), 'PPP', { locale: ar })}</td>
                            <td className="p-2">{payment.property_contracts?.properties?.property_name || 'غير محدد'}</td>
                            <td className="p-2">{payment.amount.toLocaleString()} د.ك</td>
                            <td className="p-2">{payment.payment_method || 'نقدي'}</td>
                            <td className="p-2">
                              <Badge variant="default">مدفوع</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Occupancy Analysis */}
            {occupancyData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      تحليل الإشغال
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>إجمالي العقارات:</span>
                      <span className="font-bold">{occupancyData.totalProperties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>العقارات المؤجرة:</span>
                      <span className="font-bold text-green-600">{occupancyData.occupiedProperties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>العقارات الشاغرة:</span>
                      <span className="font-bold text-red-600">{occupancyData.vacantProperties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>نسبة الإشغال:</span>
                      <span className="font-bold text-blue-600">{occupancyData.occupancyRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      توزيع أنواع العقارات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolioData && Object.entries(portfolioData.typeDistribution).map(([type, data]) => (
                      <div key={type} className="flex justify-between items-center py-2">
                        <span>{type}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{data.count}</span>
                          <div className="w-20 h-2 bg-slate-200 rounded">
                            <div 
                              className="h-full bg-primary rounded"
                              style={{ width: `${(data.count / (portfolioData.propertyCount || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Property Performance List */}
            <Card>
              <CardHeader>
                <CardTitle>أداء العقارات التفصيلي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportsData?.performance.map((property) => (
                    <div key={property.propertyId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{property.propertyName}</h4>
                          <p className="text-sm text-muted-foreground">{property.propertyType} - {property.location}</p>
                        </div>
                        <Badge variant={property.status === 'occupied' ? 'default' : 'secondary'}>
                          {property.status === 'occupied' ? 'مؤجر' : 'شاغر'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">الإيجار الشهري:</span>
                          <p className="font-semibold">{property.monthlyRent.toLocaleString()} د.ك</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الإيرادات الفعلية:</span>
                          <p className="font-semibold">{property.actualRevenue.toLocaleString()} د.ك</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">هامش الربح:</span>
                          <p className="font-semibold">{property.profitMargin.toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">العائد على الاستثمار:</span>
                          <p className="font-semibold">{property.roi.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Market Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    اتجاهات السوق
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>متوسط الإيجار في السوق:</span>
                      <span className="font-bold">850 د.ك</span>
                    </div>
                    <div className="flex justify-between">
                      <span>معدل نمو الأسعار:</span>
                      <span className="font-bold text-green-600">+3.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>متوسط فترة الإشغال:</span>
                      <span className="font-bold">15 يوم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مؤشر الطلب:</span>
                      <span className="font-bold text-blue-600">عالي</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investment Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    تحليل الاستثمار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>قيمة المحفظة:</span>
                      <span className="font-bold">{portfolioData?.totalValue.toLocaleString()} د.ك</span>
                    </div>
                    <div className="flex justify-between">
                      <span>العائد السنوي:</span>
                      <span className="font-bold text-green-600">12.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>فترة الاسترداد:</span>
                      <span className="font-bold">8 سنوات</span>
                    </div>
                    <div className="flex justify-between">
                      <span>التدفق النقدي الشهري:</span>
                      <span className="font-bold text-blue-600">{reportsData?.financial.monthlyRevenue.toLocaleString()} د.ك</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>التوصيات والاقتراحات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="font-semibold text-green-800">✓ أداء جيد</h5>
                    <p className="text-sm text-green-700">نسبة الإشغال مرتفعة ومعدل التحصيل جيد</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h5 className="font-semibold text-yellow-800">⚠ تحسينات مقترحة</h5>
                    <p className="text-sm text-yellow-700">يمكن تحسين معدل تجديد العقود بنسبة 15%</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-semibold text-blue-800">💡 فرص استثمارية</h5>
                    <p className="text-sm text-blue-700">منطقة حولي تظهر نمواً في الطلب على العقارات التجارية</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};