import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, AlertTriangle, Info, Target } from 'lucide-react';

interface ExecutiveSummaryProps {
  data: any;
  moduleType: string;
  reportId: string;
}

export function ReportExecutiveSummary({ data, moduleType, reportId }: ExecutiveSummaryProps) {
  const generateSummaryContent = () => {
    const insights = [];
    const recommendations = [];
    const highlights = [];

    // Generate insights based on data and module type
    if (data?.metrics) {
      const metrics = data.metrics;
      
      switch (moduleType) {
        case 'employees':
          if (metrics.totalEmployees) {
            insights.push(`يضم النظام إجمالي ${metrics.totalEmployees} موظف`);
            if (metrics.activeEmployees) {
              const activePercentage = ((metrics.activeEmployees / metrics.totalEmployees) * 100).toFixed(1);
              insights.push(`نسبة الموظفين النشطين: ${activePercentage}%`);
              
              if (parseFloat(activePercentage) > 90) {
                highlights.push({ type: 'success', text: 'نسبة عالية من الموظفين النشطين' });
              } else if (parseFloat(activePercentage) < 70) {
                highlights.push({ type: 'warning', text: 'انخفاض في نسبة الموظفين النشطين' });
                recommendations.push('مراجعة أسباب عدم نشاط بعض الموظفين واتخاذ الإجراءات اللازمة');
              }
            }
            
            if (metrics.averageSalary) {
              insights.push(`متوسط الراتب: ${metrics.averageSalary.toLocaleString('ar-KW')} د.ك`);
            }
          }
          break;

        case 'vehicles':
          if (metrics.totalVehicles) {
            insights.push(`إجمالي المركبات في الأسطول: ${metrics.totalVehicles}`);
            if (metrics.activeVehicles) {
              const activePercentage = ((metrics.activeVehicles / metrics.totalVehicles) * 100).toFixed(1);
              insights.push(`نسبة المركبات النشطة: ${activePercentage}%`);
              
              if (parseFloat(activePercentage) > 85) {
                highlights.push({ type: 'success', text: 'استغلال ممتاز للأسطول' });
              } else {
                recommendations.push('تحسين استغلال المركبات غير النشطة أو إعادة تقييم الحاجة لها');
              }
            }
            
            if (metrics.maintenanceCount && metrics.totalMaintenanceCost) {
              const avgMaintenanceCost = metrics.totalMaintenanceCost / metrics.maintenanceCount;
              insights.push(`متوسط تكلفة الصيانة للمركبة: ${avgMaintenanceCost.toLocaleString('ar-KW')} د.ك`);
            }
          }
          break;

        case 'customers':
          if (metrics.totalCustomers) {
            insights.push(`قاعدة عملاء تضم ${metrics.totalCustomers} عميل`);
            if (metrics.activeCustomers) {
              const retentionRate = ((metrics.activeCustomers / metrics.totalCustomers) * 100).toFixed(1);
              insights.push(`معدل الاحتفاظ بالعملاء: ${retentionRate}%`);
              
              if (parseFloat(retentionRate) > 80) {
                highlights.push({ type: 'success', text: 'معدل احتفاظ ممتاز بالعملاء' });
              } else {
                recommendations.push('تطوير برامج لتحسين الاحتفاظ بالعملاء وزيادة الولاء');
              }
            }
            
            if (metrics.averageContractValue) {
              insights.push(`متوسط قيمة العقد: ${metrics.averageContractValue.toLocaleString('ar-KW')} د.ك`);
            }
          }
          break;

        case 'invoices':
          if (metrics.totalInvoices && metrics.totalAmount) {
            const avgInvoiceValue = metrics.totalAmount / metrics.totalInvoices;
            insights.push(`إجمالي ${metrics.totalInvoices} فاتورة بقيمة ${metrics.totalAmount.toLocaleString('ar-KW')} د.ك`);
            insights.push(`متوسط قيمة الفاتورة: ${avgInvoiceValue.toLocaleString('ar-KW')} د.ك`);
            
            if (metrics.paidAmount && metrics.pendingAmount) {
              const collectionRate = ((metrics.paidAmount / metrics.totalAmount) * 100).toFixed(1);
              insights.push(`معدل التحصيل: ${collectionRate}%`);
              
              if (parseFloat(collectionRate) > 90) {
                highlights.push({ type: 'success', text: 'معدل تحصيل ممتاز' });
              } else if (parseFloat(collectionRate) < 70) {
                highlights.push({ type: 'warning', text: 'انخفاض في معدل التحصيل' });
                recommendations.push('تحسين إجراءات المتابعة والتحصيل للمبالغ المعلقة');
              }
            }
          }
          break;
      }
    }

    // Add general recommendations if none were generated
    if (recommendations.length === 0) {
      recommendations.push('مراجعة البيانات بشكل دوري لضمان الدقة والتحديث');
      recommendations.push('تطوير مؤشرات أداء إضافية لتحسين المتابعة');
    }

    return { insights, recommendations, highlights };
  };

  const { insights, recommendations, highlights } = generateSummaryContent();

  if (insights.length === 0 && recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-card border-0 shadow-card print:bg-white print:border print:shadow-none">
      <CardHeader className="print:pb-2">
        <CardTitle className="flex items-center gap-2 arabic-heading-sm print:text-black">
          <FileText className="w-5 h-5 text-primary" />
          الملخص التنفيذي
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 print:p-4">
        {/* Key Highlights */}
        {highlights.length > 0 && (
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 print:text-black">
              <Target className="w-4 h-4 text-primary" />
              النقاط البارزة
            </h4>
            <div className="space-y-2">
              {highlights.map((highlight, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    highlight.type === 'success' 
                      ? 'bg-success/10 text-success border border-success/20 print:bg-green-100 print:text-green-800' 
                      : 'bg-warning/10 text-warning border border-warning/20 print:bg-yellow-100 print:text-yellow-800'
                  }`}
                >
                  {highlight.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span className="font-medium">{highlight.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insights */}
        {insights.length > 0 && (
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 print:text-black">
              <Info className="w-4 h-4 text-primary" />
              الرؤى الأساسية
            </h4>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground print:text-gray-700">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 print:bg-gray-600"></div>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-accent/10 rounded-lg p-4 print:bg-gray-50">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2 print:text-black">
              <CheckCircle className="w-4 h-4 text-primary" />
              التوصيات
            </h4>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground print:text-gray-700">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 print:bg-gray-600"></div>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Report Metadata */}
        <div className="border-t border-border/30 pt-4 print:border-t print:border-gray-300">
          <p className="text-xs text-muted-foreground print:text-gray-500">
            هذا الملخص تم إنشاؤه تلقائياً بناءً على تحليل البيانات المتاحة في التقرير رقم {reportId}. 
            يُنصح بمراجعة البيانات التفصيلية للحصول على فهم أعمق.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}