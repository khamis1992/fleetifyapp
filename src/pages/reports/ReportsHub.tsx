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
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">مركز التقارير</h1>
          <p className="text-muted-foreground">الوصول السريع للتقارير المفضلة والمستخدمة بكثرة</p>
        </div>
      </div>

      {/* Quick Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle>التقارير السريعة</CardTitle>
          <CardDescription>تقارير جاهزة للاستخدام الفوري</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickReports.map((report) => {
              const Icon = report.icon;
              return (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleQuickReportClick(report.id, report.name)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{report.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Favorites Section - Only show if user has favorites */}
      {!favoritesLoading && favorites.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  التقارير المفضلة
                </CardTitle>
                <CardDescription>التقارير التي قمت بحفظها للوصول السريع</CardDescription>
              </div>
              <Badge variant="secondary">{favorites.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{favorite.name}</CardTitle>
                    <CardDescription className="text-xs">
                      <Badge variant="outline" className="text-xs">
                        {favorite.report_type}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRunFavorite(favorite.id, favorite.name)}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      تشغيل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteFavorite(favorite.id)}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              التقارير الأخيرة
            </CardTitle>
            <CardDescription>التقارير التي تم إنشاؤها مؤخراً</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم التقرير</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(report.generated_at), 'PPp', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewReport(report.id)}
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Empty States */}
      {!favoritesLoading && favorites.length === 0 && !recentLoading && recentReports.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>لا توجد تقارير مفضلة أو حديثة بعد</p>
              <p className="text-sm mt-2">استخدم التقارير السريعة أعلاه للبدء</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
