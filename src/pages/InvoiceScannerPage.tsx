/**
 * Invoice Scanner Page
 * Demonstrates the intelligent OCR and fuzzy matching system
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  FileText, 
  Settings, 
  BarChart3, 
  History, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import IntelligentInvoiceScanner from '@/components/IntelligentInvoiceScanner';
import InvoiceScannerAnalytics from '@/components/InvoiceScannerAnalytics';
import { useToast } from '@/hooks/use-toast';

const InvoiceScannerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const { toast } = useToast();

  const handleScanComplete = (result: any) => {
    // Add to recent scans
    setRecentScans(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
    
    // Show appropriate notification
    if (result.matching.total_confidence >= 85) {
      toast({
        title: "تم التطابق التلقائي",
        description: `تم تعيين الفاتورة تلقائياً للعميل: ${result.matching.best_match?.name}`,
        variant: "default"
      });
    } else if (result.matching.total_confidence >= 70) {
      toast({
        title: "يحتاج مراجعة",
        description: "تم إيجاد تطابقات محتملة، يرجى المراجعة",
        variant: "default"
      });
    } else {
      toast({
        title: "مراجعة يدوية مطلوبة",
        description: "لم يتم إيجاد تطابق موثوق، يرجى المراجعة اليدوية",
        variant: "destructive"
      });
    }
  };

  const statsData = {
    totalScans: recentScans.length,
    autoAssigned: recentScans.filter(s => s.matching.total_confidence >= 85).length,
    needsReview: recentScans.filter(s => s.matching.total_confidence >= 70 && s.matching.total_confidence < 85).length,
    manualReview: recentScans.filter(s => s.matching.total_confidence < 70).length,
    avgOcrConfidence: recentScans.length > 0 ? 
      Math.round(recentScans.reduce((sum, s) => sum + s.processing_info.ocr_confidence, 0) / recentScans.length) : 0,
    avgMatchConfidence: recentScans.length > 0 ? 
      Math.round(recentScans.reduce((sum, s) => sum + s.matching.total_confidence, 0) / recentScans.length) : 0
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                ماسح الفواتير الذكي
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </h1>
              <p className="text-gray-600 mt-2">
                نظام متقدم للتعرف الضوئي على النصوص والتطابق الذكي للعملاء باستخدام الذكاء الاصطناعي
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">الإحصائيات الحالية</div>
              <div className="text-2xl font-bold text-primary">{statsData.totalScans}</div>
              <div className="text-sm text-gray-500">مسح في هذه الجلسة</div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              الماسح الذكي
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              تحليلات متقدمة
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              سجل المسح
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              الإحصائيات
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner">
            <IntelligentInvoiceScanner onScanComplete={handleScanComplete} />
          </TabsContent>

          <TabsContent value="analytics">
            <InvoiceScannerAnalytics />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  سجل عمليات المسح الأخيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentScans.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد عمليات مسح حتى الآن</p>
                    <p className="text-sm">ابدأ بمسح أول فاتورة لترى النتائج هنا</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentScans.map((scan, index) => (
                      <div key={scan.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">مسح #{index + 1}</span>
                            <Badge variant="secondary" className="text-xs">
                              {scan.processing_info.language_detected}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {scan.matching.total_confidence >= 85 ? (
                              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                تم التطابق
                              </Badge>
                            ) : scan.matching.total_confidence >= 70 ? (
                              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                يحتاج مراجعة
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                مراجعة يدوية
                              </Badge>
                            )}
                            <span className="text-sm text-gray-500">
                              {scan.matching.total_confidence}% ثقة
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">العميل المستخرج:</span>
                            <p className="text-gray-600">{scan.data.customer_name || 'غير محدد'}</p>
                          </div>
                          <div>
                            <span className="font-medium">أفضل تطابق:</span>
                            <p className="text-gray-600">{scan.matching.best_match?.name || 'لا يوجد'}</p>
                          </div>
                          <div>
                            <span className="font-medium">دقة التعرف:</span>
                            <p className="text-gray-600">{scan.processing_info.ocr_confidence}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Overview Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">إحصائيات عامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>إجمالي المسحات:</span>
                    <span className="font-bold">{statsData.totalScans}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تم تعيينها تلقائياً:</span>
                    <span className="font-bold text-green-600">{statsData.autoAssigned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تحتاج مراجعة:</span>
                    <span className="font-bold text-yellow-600">{statsData.needsReview}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مراجعة يدوية:</span>
                    <span className="font-bold text-red-600">{statsData.manualReview}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Accuracy Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">دقة النظام</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>متوسط دقة التعرف الضوئي:</span>
                      <span className="font-bold">{statsData.avgOcrConfidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${statsData.avgOcrConfidence}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>متوسط دقة التطابق:</span>
                      <span className="font-bold">{statsData.avgMatchConfidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${statsData.avgMatchConfidence}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">نصائح لتحسين الأداء</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>استخدم صور عالية الجودة وواضحة</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>تأكد من إضاءة جيدة عند التصوير</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>تجنب الظلال والانعكاسات</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>حافظ على الفاتورة مسطحة ومستقيمة</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إعدادات النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    إعدادات النظام المتقدمة ستكون متاحة في التحديث القادم. 
                    يمكنك حالياً تخصيص إعدادات المسح من واجهة الماسح الذكي.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InvoiceScannerPage;