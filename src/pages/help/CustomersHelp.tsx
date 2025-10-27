import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Home,
  Zap,
  Search,
  FileText,
  DollarSign,
  ChevronLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Edit,
  Eye
} from 'lucide-react';

export default function CustomersHelp() {
  const navigate = useNavigate();

  const quickAddSteps = [
    { step: 1, title: 'فتح النموذج', description: 'اضغط الزر الأخضر "إضافة سريعة" ⚡' },
    { step: 2, title: 'الاسم', description: 'أدخل اسم العميل بالعربي' },
    { step: 3, title: 'الهاتف', description: 'أدخل رقم الهاتف (8+ أرقام)' },
    { step: 4, title: 'احفظ', description: 'احفظ - تم في 15 ثانية! ✅' }
  ];

  const features = [
    {
      icon: Zap,
      title: 'الإضافة السريعة',
      description: 'إضافة عميل في 15 ثانية بحقلين فقط',
      badge: '80% أسرع',
      color: 'text-green-500'
    },
    {
      icon: Search,
      title: 'البحث الذكي',
      description: 'بحث بالاسم، الهاتف، أو رقم العميل',
      badge: 'سريع',
      color: 'text-blue-500'
    },
    {
      icon: FileText,
      title: 'سجل العقود',
      description: 'عرض جميع عقود العميل الحالية والسابقة',
      badge: 'شامل',
      color: 'text-purple-500'
    },
    {
      icon: DollarSign,
      title: 'المدفوعات',
      description: 'سجل كامل للمدفوعات والمستحقات',
      badge: 'تفصيلي',
      color: 'text-orange-500'
    }
  ];

  const customerInfo = [
    {
      category: 'البيانات الأساسية',
      items: ['الاسم (عربي/إنجليزي)', 'رقم الهوية', 'رقم الهاتف', 'البريد الإلكتروني', 'العنوان']
    },
    {
      category: 'معلومات التصنيف',
      items: ['نوع العميل (فرد/شركة)', 'فئة العميل', 'الحالة (نشط/معلق/محظور)', 'تاريخ التسجيل']
    },
    {
      category: 'البيانات المالية',
      items: ['الرصيد الحالي', 'إجمالي المدفوعات', 'المبالغ المستحقة', 'آخر دفعة']
    },
    {
      category: 'معلومات إضافية',
      items: ['الملاحظات', 'المرفقات', 'جهة الاتصال البديلة', 'تفضيلات العميل']
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
        <span className="text-foreground font-medium">إدارة العملاء</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 text-white rounded-lg">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">دليل إدارة العملاء</h1>
              <p className="text-muted-foreground">قاعدة بيانات شاملة مع الإضافة السريعة</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/customers')} size="lg">
          افتح صفحة العملاء <ArrowRight className="mr-2 h-4 w-4" />
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

      {/* Main Screenshot */}
      <Card>
        <CardHeader>
          <CardTitle>الواجهة الرئيسية لصفحة العملاء</CardTitle>
          <CardDescription>
            عرض شامل لجميع العملاء مع إمكانية البحث والفلترة السريعة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <img
            src="/.playwright-mcp/customers-main.png"
            alt="صفحة العملاء الرئيسية"
            className="w-full rounded-lg border-2 shadow-lg"
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="quick-add" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="quick-add">الإضافة السريعة</TabsTrigger>
          <TabsTrigger value="customer-info">معلومات العميل</TabsTrigger>
          <TabsTrigger value="search">البحث والفلترة</TabsTrigger>
          <TabsTrigger value="management">إدارة العملاء</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        {/* Quick Add Tab */}
        <TabsContent value="quick-add" className="space-y-4">
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-green-600" />
                <CardTitle className="text-green-900">الإضافة السريعة - 15 ثانية فقط!</CardTitle>
              </div>
              <CardDescription>
                أسرع طريقة لإضافة عميل جديد - حقلين فقط وجاهز!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                <h3 className="font-bold text-blue-900 mb-2">⚡ التوفير الزمني</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-700">قبل</p>
                    <p className="text-sm text-blue-600">2-3 دقائق</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">بعد</p>
                    <p className="text-sm text-blue-600">15 ثانية</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">التوفير</p>
                    <p className="text-sm text-blue-600">80% أسرع</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">📍 كيفية الوصول</h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <span>اذهب إلى صفحة <strong>العملاء</strong> من القائمة الجانبية</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <span>ابحث عن الزر الأخضر في أعلى يمين الصفحة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <span>الزر يحتوي على أيقونة ⚡ ونص "إضافة سريعة"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <span>يوجد شارة "15 ثانية" على الزر</span>
                  </li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {quickAddSteps.map((step) => (
                  <div key={step.step} className="text-center">
                    <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                      {step.step}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded">
                <h3 className="font-bold text-yellow-900 mb-2">💡 ماذا يحدث تلقائياً؟</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>✓ يُنشأ رقم عميل فريد تلقائياً (IND-25-XXXX)</li>
                  <li>✓ يُحدد النوع كـ "فرد" افتراضياً</li>
                  <li>✓ تُضبط الحالة على "نشط"</li>
                  <li>✓ تُضاف ملاحظة تذكير لإكمال البيانات لاحقاً</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-r-4 border-purple-500 p-4 rounded">
                <h3 className="font-bold text-purple-900 mb-2">🎯 متى تستخدم الإضافة السريعة؟</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• عند وجود عميل جديد على العداد يريد التأجير فوراً</li>
                  <li>• عند استقبال مكالمة هاتفية وتريد حجز بياناته بسرعة</li>
                  <li>• عندما يكون لديك قائمة كبيرة من العملاء للإضافة</li>
                  <li>• يمكنك إكمال التفاصيل الكاملة لاحقاً عند الحاجة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Info Tab */}
        <TabsContent value="customer-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات العميل الكاملة</CardTitle>
              <CardDescription>
                جميع البيانات التي يمكن تسجيلها للعميل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerInfo.map((section, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    <h3 className="font-bold mb-3 text-primary">{section.category}</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {section.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <img
                src="/.playwright-mcp/customers-page-full.png"
                alt="معلومات العميل الكاملة"
                className="w-full rounded-lg border shadow-sm mt-4"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>البحث والفلترة</CardTitle>
              <CardDescription>
                طرق متعددة للعثور على العملاء بسرعة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-600" />
                    البحث النصي
                  </h3>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• البحث بالاسم (عربي أو إنجليزي)</li>
                    <li>• البحث برقم الهاتف</li>
                    <li>• البحث برقم العميل</li>
                    <li>• البحث برقم الهوية</li>
                  </ul>
                </div>

                <div className="border-2 border-dashed border-purple-300 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Edit className="h-5 w-5 text-purple-600" />
                    الفلترة المتقدمة
                  </h3>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• حسب نوع العميل (فرد/شركة)</li>
                    <li>• حسب الحالة (نشط/معلق/محظور)</li>
                    <li>• حسب تاريخ التسجيل</li>
                    <li>• حسب الرصيد والمستحقات</li>
                  </ul>
                </div>
              </div>

              <img
                src="/.playwright-mcp/customers-list-table.png"
                alt="قائمة العملاء مع البحث"
                className="w-full rounded-lg border shadow-sm"
              />

              <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded">
                <h3 className="font-bold text-green-900 mb-2">⚡ نصيحة للبحث السريع</h3>
                <p className="text-sm text-green-800">
                  استخدم اختصار لوحة المفاتيح <kbd className="bg-green-200 px-2 py-1 rounded">Ctrl+K</kbd> للوصول
                  السريع لصندوق البحث العام. يمكنك البحث في جميع العملاء والعقود من مكان واحد!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إدارة ومتابعة العملاء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">عرض التفاصيل</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    انقر على أي عميل لعرض جميع التفاصيل، العقود، والمدفوعات
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold">تعديل البيانات</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    يمكنك تعديل أي معلومة في أي وقت مع حفظ سجل التعديلات
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">سجل العقود</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    عرض جميع العقود الحالية والسابقة للعميل في مكان واحد
                  </p>
                </div>
              </div>

              <img
                src="/.playwright-mcp/customers-list-complete.png"
                alt="إدارة العملاء"
                className="w-full rounded-lg border shadow-sm"
              />

              <div className="space-y-3">
                <h3 className="font-semibold">📋 الإجراءات المتاحة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 text-sm">
                    <UserPlus className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>إضافة عميل جديد:</strong> سريعة أو كاملة</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Edit className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span><strong>تعديل البيانات:</strong> تحديث أي معلومة</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Eye className="h-4 w-4 text-purple-600 mt-0.5" />
                    <span><strong>عرض السجل:</strong> عقود ومدفوعات</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-orange-600 mt-0.5" />
                    <span><strong>إنشاء عقد:</strong> مباشرة من بطاقة العميل</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تقارير العملاء</CardTitle>
              <CardDescription>
                تقارير تحليلية شاملة عن قاعدة العملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-2">📊 تقرير عام</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• إجمالي عدد العملاء</li>
                    <li>• العملاء النشطون vs المعلقون</li>
                    <li>• توزيع العملاء (أفراد/شركات)</li>
                    <li>• معدل العملاء الجدد شهرياً</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-2">💰 تقرير مالي</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• أعلى 10 عملاء إيراداً</li>
                    <li>• العملاء المتعثرون في الدفع</li>
                    <li>• توزيع الأرصدة</li>
                    <li>• تحليل المدفوعات حسب العميل</li>
                  </ul>
                </div>
              </div>

              <div className="bg-purple-50 border-r-4 border-purple-500 p-4 rounded">
                <h3 className="font-bold text-purple-900 mb-2">📤 التصدير</h3>
                <p className="text-sm text-purple-800 mb-2">
                  يمكنك تصدير قائمة العملاء والتقارير بصيغ متعددة:
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary">PDF</Badge>
                  <Badge variant="secondary">Excel</Badge>
                  <Badge variant="secondary">CSV</Badge>
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
                <span>استخدم الإضافة السريعة دائماً للعملاء الجدد</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">2.</span>
                <span>أكمل بيانات العميل الكاملة عند أول عقد</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">3.</span>
                <span>راجع قائمة العملاء دورياً وحدّث البيانات</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">4.</span>
                <span>استخدم الملاحظات لتسجيل تفضيلات العميل</span>
              </li>
            </ol>
            <ol className="space-y-2 text-sm" start={5}>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">5.</span>
                <span>تحقق من عدم وجود تكرار قبل إضافة عميل</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">6.</span>
                <span>احفظ نسخة من الهويات والمستندات</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">7.</span>
                <span>راجع سجل العقود قبل إنشاء عقد جديد</span>
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
            <li>• <strong>تحقق من التكرار:</strong> ابحث أولاً قبل إضافة عميل جديد لتجنب التكرار</li>
            <li>• <strong>خصوصية البيانات:</strong> لا تشارك بيانات العملاء مع أشخاص غير مصرح لهم</li>
            <li>• <strong>تحديث الأرقام:</strong> تأكد من صحة أرقام الهواتف للتواصل الفعال</li>
            <li>• <strong>حذر من الحذف:</strong> لا تحذف عميل له عقود نشطة أو سجل مالي</li>
          </ul>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/help')}>
          <Home className="mr-2 h-4 w-4" />
          العودة لمركز المساعدة
        </Button>
        <Button onClick={() => navigate('/customers')}>
          افتح صفحة العملاء <ArrowRight className="mr-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}