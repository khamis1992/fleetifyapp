import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Play, CheckCircle, AlertCircle } from "lucide-react";
import { useDepreciationSystem } from "@/hooks/useDepreciationSystem";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';

export default function DepreciationAutomation() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { calculateMonthlyDepreciation } = useDepreciationSystem();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunDepreciation = async () => {
    setIsProcessing(true);
    try {
      const res = await calculateMonthlyDepreciation(selectedDate);
      setResult(res);
    } catch (error) {
      console.error("Failed to run depreciation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">الاستهلاك التلقائي</h1>
          <HelpIcon
            title={financialHelpContent.depreciationSystem.title}
            content={financialHelpContent.depreciationSystem.content}
            examples={financialHelpContent.depreciationSystem.examples}
            size="md"
          />
        </div>
        <p className="text-muted-foreground mt-2">
          حساب وتسجيل الاستهلاك الشهري للأصول الثابتة تلقائياً
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تشغيل الاستهلاك الشهري</CardTitle>
          <CardDescription>
            اختر الشهر والسنة لحساب الاستهلاك وإنشاء القيود المحاسبية تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">الشهر والسنة</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "MMMM yyyy", { locale: ar })
                    ) : (
                      <span>اختر التاريخ</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-shrink-0 pt-6">
              <Button
                onClick={handleRunDepreciation}
                disabled={isProcessing || !selectedDate}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    تشغيل الاستهلاك
                  </>
                )}
              </Button>
            </div>
          </div>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">تم بنجاح!</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      عدد الأصول
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.assetsProcessed}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      إجمالي الاستهلاك
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {result.totalDepreciation?.toFixed(2)} د.ك
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      القيود المنشأة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{result.journalEntriesCreated}</div>
                  </CardContent>
                </Card>
              </div>

              {result.errors && result.errors.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-orange-900">تحذيرات</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm text-orange-800">
                      {result.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>كيفية الاستخدام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <p>اختر الشهر والسنة المراد حساب الاستهلاك لها</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <p>اضغط على زر "تشغيل الاستهلاك" لبدء العملية</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <p>سيقوم النظام بحساب الاستهلاك لجميع الأصول الثابتة النشطة</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <p>سيتم إنشاء قيود محاسبية تلقائياً في دفتر الأستاذ</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">5</Badge>
            <p>يمكنك مراجعة النتائج والتحقق من القيود المنشأة</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ملاحظات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>• يتم حساب الاستهلاك بناءً على طريقة القسط الثابت (Straight-Line Method)</p>
          <p>• يجب التأكد من وجود الحسابات المحاسبية المطلوبة في دليل الحسابات</p>
          <p>• الحسابات المطلوبة: مصروف الاستهلاك (5120) ومجمع الاستهلاك (1300)</p>
          <p>• لا يتم حساب الاستهلاك للأصول المستهلكة بالكامل</p>
          <p>• يمكن تشغيل الاستهلاك مرة واحدة فقط لكل شهر</p>
        </CardContent>
      </Card>
    </div>
  );
}

