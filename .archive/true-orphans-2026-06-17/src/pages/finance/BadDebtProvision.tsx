import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AlertCircle, Calculator } from "lucide-react";
import { useBadDebtProvision } from "@/hooks/useBadDebtProvision";
import { toast } from "sonner";
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';

const BadDebtProvision = () => {
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { analyzeAndProvision } = useBadDebtProvision();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeAndProvision(analysisDate);
      
      if (result.success) {
        toast.success(`✅ تم تحليل ${result.total_analyzed} عميل`);
        if (result.provision_amount && result.provision_amount > 0) {
          toast.success(`تم إنشاء مخصص ديون معدومة: ${result.provision_amount.toFixed(2)} ريال`);
        }
      } else {
        toast.error(result.error || 'فشل التحليل');
      }
    } catch (error) {
      console.error('Error analyzing bad debts:', error);
      toast.error('حدث خطأ أثناء التحليل');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">لوحة التحكم</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>مخصص الديون المعدومة</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">مخصص الديون المعدومة</h1>
            <HelpIcon
              title={financialHelpContent.badDebtProvision.title}
              content={financialHelpContent.badDebtProvision.content}
              examples={financialHelpContent.badDebtProvision.examples}
              size="md"
            />
          </div>
          <p className="text-muted-foreground mt-2">
            تحليل العملاء المتعثرين وإنشاء مخصص للديون المشكوك في تحصيلها
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            معلومات مهمة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>• يتم تحليل جميع العملاء الذين لديهم ديون متأخرة</p>
          <p>• العملاء الذين تأخروا أكثر من 90 يوم يتم اعتبارهم متعثرين</p>
          <p>• يتم إنشاء قيد محاسبي تلقائي للمخصص</p>
          <p>• القيد: مدين - مصروف ديون معدومة / دائن - مخصص ديون معدومة</p>
        </CardContent>
      </Card>

      {/* Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل الديون المعدومة</CardTitle>
          <CardDescription>
            اختر تاريخ التحليل لتحديد الديون المتأخرة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-date">تاريخ التحليل</Label>
              <Input
                id="analysis-date"
                type="date"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'جاري التحليل...' : 'تحليل وإنشاء المخصص'}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>كيفية الاستخدام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-semibold">1. اختر تاريخ التحليل</h4>
            <p className="text-sm text-muted-foreground">
              حدد التاريخ الذي تريد تحليل الديون بناءً عليه (عادة نهاية الشهر أو السنة)
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">2. اضغط على "تحليل وإنشاء المخصص"</h4>
            <p className="text-sm text-muted-foreground">
              سيقوم النظام بتحليل جميع العملاء وتحديد الديون المتأخرة أكثر من 90 يوم
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">3. مراجعة النتائج</h4>
            <p className="text-sm text-muted-foreground">
              سيتم إنشاء قيد محاسبي تلقائي في دفتر الأستاذ لتسجيل المخصص
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BadDebtProvision;

