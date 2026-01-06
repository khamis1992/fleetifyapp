import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useReportFavorites } from '@/hooks/useReportFavorites';
import { useRecentReports } from '@/hooks/useRecentReports';
import { quickReports } from '@/components/reports/QuickReports';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart3, Star, Clock, Play, Trash2 } from 'lucide-react';

/**
 * Reports Hub Component
 *
 * A centralized dashboard for quick access to reports, favorites, and recent reports.
 * Provides three main sections:
 * 1. Quick Reports - Predefined commonly used reports
 * 2. Favorites - User-saved favorite report configurations
 * 3. Recent Reports - History of recently generated reports
 *
 * @returns {JSX.Element} The Reports Hub page
 */
export default function ReportsHub() {
  const { toast } = useToast();
  const { favorites, isLoading: favoritesLoading, deleteFavorite } = useReportFavorites();
  const { recentReports, isLoading: recentLoading } = useRecentReports();

  /**
   * Handles quick report card click
   * Shows a placeholder toast notification
   */
  const handleQuickReportClick = (reportId: string, reportName: string) => {
    toast({
      title: 'قريباً',
      description: `سيتم تشغيل تقرير ${reportName} قريباً`,
    });
  };

  /**
   * Handles running a favorite report
   */
  const handleRunFavorite = (favoriteId: string, favoriteName: string) => {
    toast({
      title: 'قريباً',
      description: `سيتم تشغيل تقرير ${favoriteName} قريباً`,
    });
  };

  /**
   * Handles viewing a recent report
   */
  const handleViewReport = (reportId: string) => {
    toast({
      title: 'قريباً',
      description: 'سيتم عرض التقرير قريباً',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <div className="container mx-auto p-6 space-y-6" dir="rtl">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-2xl">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">مركز التقارير</h1>
            <p className="text-gray-600">الوصول السريع للتقارير المفضلة والمستخدمة بكثرة</p>
          </div>
        </div>

        {/* Quick Reports Section */}
        <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-gray-900">التقارير السريعة</CardTitle>
            <CardDescription className="text-gray-600">تقارير جاهزة للاستخدام الفوري</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickReports.map((report) => {
                const Icon = report.icon;
                return (
                  <Card
                    key={report.id}
                    className="cursor-pointer bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300"
                    onClick={() => handleQuickReportClick(report.id, report.name)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 rounded-xl">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-base text-gray-900">{report.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Favorites Section - Only show if user has favorites */}
        {!favoritesLoading && favorites.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Star className="h-5 w-5 text-yellow-500" />
                    التقارير المفضلة
                  </CardTitle>
                  <CardDescription className="text-gray-600">التقارير التي قمت بحفظها للوصول السريع</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-teal-500/10 text-teal-700 border-teal-500/20">{favorites.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((favorite) => (
                  <Card key={favorite.id} className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-gray-900">{favorite.name}</CardTitle>
                      <CardDescription className="text-xs">
                        <Badge variant="outline" className="text-xs border-teal-500/20 text-teal-700 bg-teal-500/10">
                          {favorite.report_type}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRunFavorite(favorite.id, favorite.name)}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/20"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        تشغيل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteFavorite(favorite.id)}
                        className="border-gray-200/50 hover:border-teal-500/30 hover:bg-teal-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Reports Section - Only show if user has recent reports */}
        {!recentLoading && recentReports.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Clock className="h-5 w-5 text-teal-600" />
                التقارير الأخيرة
              </CardTitle>
              <CardDescription className="text-gray-600">التقارير التي تم إنشاؤها مؤخراً</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right text-gray-900">اسم التقرير</TableHead>
                    <TableHead className="text-right text-gray-900">النوع</TableHead>
                    <TableHead className="text-right text-gray-900">التاريخ</TableHead>
                    <TableHead className="text-right text-gray-900">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-teal-500/5 transition-colors">
                      <TableCell className="font-medium text-gray-900">{report.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-teal-500/20 text-teal-700 bg-teal-500/10">{report.type}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {format(new Date(report.generated_at), 'PPp', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewReport(report.id)}
                          className="hover:bg-teal-500/10 hover:text-teal-700"
                        >
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Loading States */}
        {(favoritesLoading || recentLoading) && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        )}

        {/* Empty States */}
        {!favoritesLoading && favorites.length === 0 && !recentLoading && recentReports.length === 0 && (
          <Card className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl">
            <CardContent className="py-8">
              <div className="text-center text-gray-600">
                <p>لا توجد تقارير مفضلة أو حديثة بعد</p>
                <p className="text-sm mt-2">استخدم التقارير السريعة أعلاه للبدء</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
