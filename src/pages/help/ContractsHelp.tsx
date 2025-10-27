import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Zap,
  Edit,
  Search,
  Printer,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Home,
  ChevronLeft
} from 'lucide-react';

export default function ContractsHelp() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'نظرة عامة', icon: FileText },
    { id: 'express', label: 'الوضع السريع', icon: Zap },
    { id: 'amendment', label: 'نظام التعديلات', icon: Edit },
    { id: 'management', label: 'الإدارة والمتابعة', icon: Search },
    { id: 'printing', label: 'الطباعة والتصدير', icon: Printer }
  ];

  const expressSteps = [
    { step: 1, title: 'فتح النموذج', description: 'اضغط على الزر الأصفر "الوضع السريع" ⚡' },
    { step: 2, title: 'اختيار العميل', description: 'اختر من القائمة أو أضف عميل جديد بسرعة' },
    { step: 3, title: 'اختيار المركبة', description: 'حدد المركبة المطلوب تأجيرها' },
    { step: 4, title: 'التفاصيل الأساسية', description: 'تاريخ البداية، المدة، القيمة الشهرية' },
    { step: 5, title: 'الحفظ', description: 'احفظ العقد - تم! ✅' }
  ];

  const amendmentPhases = [
    {
      phase: 1,
      title: 'الإنشاء',
      description: 'الموظف ينشئ طلب تعديل',
      badge: 'جديد',
      color: 'bg-blue-500'
    },
    {
      phase: 2,
      title: 'المراجعة',
      description: 'المدير يراجع التعديلات',
      badge: 'قيد المراجعة',
      color: 'bg-yellow-500'
    },
    {
      phase: 3,
      title: 'الموافقة',
      description: 'الموافقة أو الرفض مع ملاحظات',
      badge: 'معتمد',
      color: 'bg-green-500'
    },
    {
      phase: 4,
      title: 'التطبيق',
      description: 'التعديلات تُطبق تلقائياً',
      badge: 'مُطبق',
      color: 'bg-purple-500'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'الوضع السريع',
      description: 'إنشاء عقود في 3-5 دقائق بدلاً من 10-15 دقيقة',
      badge: '70% أسرع',
      color: 'text-yellow-500'
    },
    {
      icon: Edit,
      title: 'نظام التعديلات',
      description: 'تعديل العقود النشطة مع سجل كامل للتغييرات',
      badge: 'متقدم',
      color: 'text-blue-500'
    },
    {
      icon: Search,
      title: 'البحث الذكي',
      description: 'بحث بالاسم، رقم العقد، المركبة، أو أي معلومة',
      badge: 'سريع',
      color: 'text-purple-500'
    },
    {
      icon: CheckCircle,
      title: 'التنبيهات التلقائية',
      description: 'تنبيهات لانتهاء العقود والمدفوعات المستحقة',
      badge: 'آلي',
      color: 'text-green-500'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate('/help')}>
          <Home className="h-4 w-4 ml-1" />
          مركز المساعدة
        </Button>
        <ChevronLeft className="h-4 w-4" />
        <span className="text-foreground font-medium">إدارة العقود</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 text-white rounded-lg">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">دليل إدارة العقود</h1>
              <p className="text-muted-foreground">نظام متكامل لإدارة عقود الإيجار مع ميزات متقدمة</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/contracts')} size="lg">
          افتح صفحة العقود <ArrowRight className="mr-2 h-4 w-4" />
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <feature.icon className={`h-8 w-8 ${feature.color}`} />
              <CardTitle className="text-lg mt-2">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{feature.description}</p>
              <Badge variant="secondary">{feature.badge}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id} className="gap-2">
              <section.icon className="h-4 w-4" />
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نظرة عامة على نظام العقود</CardTitle>
              <CardDescription>
                نظام Fleetify لإدارة العقود هو حل شامل ومتطور لإدارة عقود الإيجار بجميع أنواعها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                <h3 className="font-bold text-blue-900 mb-2">الواجهة الرئيسية</h3>
                <p className="text-blue-800">
                  تتميز صفحة العقود بتصميم نظيف ومنظم يوفر رؤية شاملة لجميع العقود مع إمكانية الوصول
                  السريع لجميع الوظائف الأساسية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">مكونات الواجهة:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• شريط الأدوات العلوي (إضافة، تصدير، بحث)</li>
                    <li>• الإحصائيات السريعة (عقود نشطة، منتهية، إيرادات)</li>
                    <li>• البحث والفلترة المتقدمة</li>
                    <li>• قائمة العقود مع بطاقات تفصيلية</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">الإجراءات المتاحة:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• إنشاء عقد جديد (وضع عادي أو سريع)</li>
                    <li>• تعديل العقود النشطة</li>
                    <li>• طباعة العقود</li>
                    <li>• تصدير البيانات (PDF, Excel, CSV)</li>
                  </ul>
                </div>
              </div>

              <img
                src="/.playwright-mcp/contracts-main.png"
                alt="واجهة العقود الرئيسية"
                className="w-full rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Express Mode Tab */}
        <TabsContent value="express" className="space-y-4">
          <Card className="border-2 border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-600" />
                <CardTitle className="text-yellow-900">الوضع السريع - Express Mode</CardTitle>
              </div>
              <CardDescription>
                أحد أهم الميزات المبتكرة - توفير 70% من الوقت في إنشاء العقود
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded">
                <h3 className="font-bold text-green-900 mb-2">⚡ التوفير الزمني</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-700">قبل</p>
                    <p className="text-sm text-green-600">10-15 دقيقة</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">بعد</p>
                    <p className="text-sm text-green-600">3-5 دقائق</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">التوفير</p>
                    <p className="text-sm text-green-600">70% أسرع</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">📍 كيفية الوصول للوضع السريع</h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      1
                    </span>
                    <span>اذهب إلى صفحة <strong>العقود</strong> من القائمة الجانبية</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      2
                    </span>
                    <span>ابحث عن الزر الأصفر في أعلى يسار الصفحة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      3
                    </span>
                    <span>الزر يحتوي على أيقونة ⚡ ونص "الوضع السريع"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-yellow-200 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      4
                    </span>
                    <span>يوجد شارة "70% أسرع" على الزر</span>
                  </li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {expressSteps.map((step) => (
                  <div key={step.step} className="text-center">
                    <div className="bg-yellow-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                      {step.step}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>

              <img
                src="/.playwright-mcp/contracts-header-actions.png"
                alt="زر الوضع السريع"
                className="w-full rounded-lg border shadow-sm"
              />

              <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                <h3 className="font-bold text-blue-900 mb-2">💡 نصيحة مهمة</h3>
                <p className="text-blue-800 text-sm">
                  الوضع السريع مثالي للعقود البسيطة والمتكررة. للعقود المعقدة التي تحتاج
                  تفاصيل أكثر، استخدم الوضع العادي (زر "عقد جديد").
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Amendment Tab */}
        <TabsContent value="amendment" className="space-y-4">
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Edit className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-blue-900">نظام التعديلات - Amendment System</CardTitle>
              </div>
              <CardDescription>
                نظام متكامل لتعديل العقود النشطة مع الحفاظ على سجل كامل لجميع التغييرات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 border-r-4 border-purple-500 p-4 rounded">
                <h3 className="font-bold text-purple-900 mb-2">📋 ما هو نظام التعديلات؟</h3>
                <p className="text-purple-800 text-sm">
                  نظام يسمح بتعديل العقود النشطة بطريقة منظمة وآمنة. كل تعديل يمر بمراحل
                  (إنشاء → مراجعة → موافقة → تطبيق) مع حفظ سجل كامل لكل التغييرات.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">📍 كيفية الوصول لنظام التعديلات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">الطريقة 1: من بطاقة العقد</h4>
                    <ol className="text-sm space-y-1 text-muted-foreground">
                      <li>1. اذهب إلى صفحة العقود</li>
                      <li>2. ابحث عن العقد المطلوب</li>
                      <li>3. انقر على الزر الأزرق "تعديل"</li>
                    </ol>
                  </div>
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">الطريقة 2: من نافذة التفاصيل</h4>
                    <ol className="text-sm space-y-1 text-muted-foreground">
                      <li>1. انقر على العقد لعرض التفاصيل</li>
                      <li>2. في رأس النافذة</li>
                      <li>3. انقر زر "تعديل العقد"</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">🔄 مراحل التعديل الأربعة</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {amendmentPhases.map((phase) => (
                    <div key={phase.phase} className="text-center">
                      <div className={`${phase.color} text-white rounded-lg p-4 mb-2`}>
                        <div className="text-2xl font-bold mb-1">{phase.phase}</div>
                        <h4 className="font-semibold">{phase.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>
                      <Badge variant="secondary">{phase.badge}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <img
                src="/.playwright-mcp/contract-card-actions.png"
                alt="زر التعديل"
                className="w-full rounded-lg border shadow-sm"
              />

              <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded">
                <h3 className="font-bold text-green-900 mb-2">✅ مزايا نظام التعديلات</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800">
                  <li>✓ سجل كامل لجميع التغييرات</li>
                  <li>✓ شفافية كاملة في العملية</li>
                  <li>✓ تحكم كامل في الصلاحيات</li>
                  <li>✓ تتبع من قام بالتعديل ومتى</li>
                  <li>✓ إمكانية الرجوع للنسخة الأصلية</li>
                  <li>✓ موافقة المدير للتعديلات الهامة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إدارة ومتابعة العقود</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">🔍 البحث والفلترة</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>البحث النصي:</strong> بالاسم، رقم العقد، المركبة، الهاتف</li>
                    <li>• <strong>الفلترة بالحالة:</strong> نشط، منتهي، ملغى</li>
                    <li>• <strong>الفلترة بالتاريخ:</strong> حسب تاريخ الإنشاء أو الانتهاء</li>
                    <li>• <strong>الفلترة بالقيمة:</strong> نطاق معين من القيمة</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">📋 محتويات بطاقة العقد</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• رقم العقد وتاريخ الإنشاء</li>
                    <li>• اسم العميل ورقم الهاتف</li>
                    <li>• تفاصيل المركبة (نوع، موديل، لوحة)</li>
                    <li>• تاريخ البداية والنهاية</li>
                    <li>• القيمة الشهرية والكلية</li>
                    <li>• حالة العقد وأزرار الإجراءات</li>
                  </ul>
                </div>
              </div>

              <img
                src="/.playwright-mcp/contracts-filters-and-search.png"
                alt="البحث والفلترة"
                className="w-full rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Printing Tab */}
        <TabsContent value="printing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الطباعة والتصدير</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">🖨️ خيارات الطباعة</h3>
                  <div className="space-y-2">
                    <div className="border rounded p-3">
                      <h4 className="font-medium text-sm mb-1">عقد كامل</h4>
                      <p className="text-xs text-muted-foreground">طباعة العقد بجميع التفاصيل والشروط</p>
                    </div>
                    <div className="border rounded p-3">
                      <h4 className="font-medium text-sm mb-1">إيصال</h4>
                      <p className="text-xs text-muted-foreground">إيصال بتفاصيل العقد للعميل</p>
                    </div>
                    <div className="border rounded p-3">
                      <h4 className="font-medium text-sm mb-1">ملخص</h4>
                      <p className="text-xs text-muted-foreground">ملخص مختصر للعقد للأرشيف</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">📊 صيغ التصدير</h3>
                  <div className="space-y-2">
                    <div className="border rounded p-3 bg-red-50">
                      <h4 className="font-medium text-sm mb-1">📑 PDF</h4>
                      <p className="text-xs text-muted-foreground">للطباعة والأرشفة - جودة عالية</p>
                    </div>
                    <div className="border rounded p-3 bg-green-50">
                      <h4 className="font-medium text-sm mb-1">📊 Excel</h4>
                      <p className="text-xs text-muted-foreground">للتحليل والمعالجة - قابل للتعديل</p>
                    </div>
                    <div className="border rounded p-3 bg-blue-50">
                      <h4 className="font-medium text-sm mb-1">📄 CSV</h4>
                      <p className="text-xs text-muted-foreground">للاستيراد في برامج أخرى</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Best Practices */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            أفضل الممارسات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">1.</span>
                <span>استخدم الوضع السريع للعقود البسيطة والمتكررة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">2.</span>
                <span>راجع البيانات قبل إنشاء العقد للتأكد من دقتها</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">3.</span>
                <span>احفظ نسخة احتياطية من العقود المهمة في PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">4.</span>
                <span>استخدم نظام التعديلات بدلاً من إلغاء العقد</span>
              </li>
            </ol>
            <ol className="space-y-2 text-sm" start={5}>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">5.</span>
                <span>راجع العقود المنتهية دورياً للتجديد أو الإغلاق</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">6.</span>
                <span>استخدم التنبيهات لمتابعة مواعيد الانتهاء</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">7.</span>
                <span>وثّق التعديلات بملاحظات واضحة</span>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      <Card className="border-2 border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertCircle className="h-6 w-6 text-red-600" />
            تحذيرات مهمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-red-800">
            <li>• <strong>لا تقم بحذف عقد نشط</strong> - استخدم خيار "إلغاء" بدلاً من ذلك</li>
            <li>• <strong>تأكد من الموافقات</strong> اللازمة قبل تطبيق التعديلات</li>
            <li>• <strong>احتفظ بنسخ من العقود المطبوعة</strong> الموقّعة في الأرشيف</li>
            <li>• <strong>راجع شروط العقد</strong> مع العميل قبل التوقيع</li>
          </ul>
        </CardContent>
      </Card>

      {/* Back to Help Hub */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/help')}>
          <Home className="mr-2 h-4 w-4" />
          العودة لمركز المساعدة
        </Button>
        <Button onClick={() => navigate('/contracts')}>
          افتح صفحة العقود <ArrowRight className="mr-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}