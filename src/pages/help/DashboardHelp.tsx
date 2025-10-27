import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Zap,
  Eye,
  ChevronLeft,
  ArrowRight,
  DollarSign,
  FileText,
  Car,
  Users,
  CheckCircle
} from 'lucide-react';

export default function DashboardHelp() {
  const navigate = useNavigate();

  const statistics = [
    {
      title: 'العقود النشطة',
      icon: FileText,
      color: 'text-blue-500',
      description: 'عدد العقود الحالية النشطة',
      details: 'يعرض عدد العقود النشطة مع نسبة التغيير عن الشهر السابق'
    },
    {
      title: 'الإيرادات الشهرية',
      icon: DollarSign,
      color: 'text-green-500',
      description: 'إجمالي الإيرادات المتوقعة',
      details: 'مجموع الإيرادات المتوقعة لهذا الشهر من جميع العقود'
    },
    {
      title: 'المركبات المتاحة',
      icon: Car,
      color: 'text-purple-500',
      description: 'عدد المركبات الجاهزة',
      details: 'المركبات المتاحة للتأجير حالياً وغير المؤجرة'
    },
    {
      title: 'المدفوعات المستحقة',
      icon: TrendingUp,
      color: 'text-orange-500',
      description: 'إجمالي المستحقات',
      details: 'إجمالي المبالغ المستحقة التحصيل من العملاء'
    }
  ];

  const quickActions = [
    {
      title: 'إضافة عقد جديد',
      icon: FileText,
      path: '/contracts',
      description: 'إنشاء عقد إيجار جديد بسرعة'
    },
    {
      title: 'إضافة عميل جديد',
      icon: Users,
      path: '/customers',
      description: 'تسجيل عميل جديد في النظام'
    },
    {
      title: 'تسجيل دفعة',
      icon: DollarSign,
      path: '/finance/payments',
      description: 'تسجيل دفعة مالية من عميل'
    },
    {
      title: 'عرض التقارير',
      icon: BarChart3,
      path: '/reports',
      description: 'الوصول للتقارير والتحليلات'
    }
  ];

  const widgets = [
    {
      name: 'الرسم البياني للإيرادات',
      description: 'يعرض تطور الإيرادات الشهرية على مدار السنة',
      features: ['عرض بياني', 'مقارنة شهرية', 'توقعات']
    },
    {
      name: 'العقود المنتهية قريباً',
      description: 'قائمة بالعقود التي ستنتهي في الأيام القادمة',
      features: ['تنبيهات', 'أولوية التجديد', 'تواصل سريع']
    },
    {
      name: 'المدفوعات المتأخرة',
      description: 'عرض العملاء والمدفوعات المتأخرة عن موعدها',
      features: ['ترتيب حسب التأخير', 'إجراءات سريعة', 'تذكيرات']
    },
    {
      name: 'حالة الأسطول',
      description: 'نظرة عامة على حالة جميع المركبات',
      features: ['متاح/مؤجر', 'صيانة', 'معطل']
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
        <span className="text-foreground font-medium">لوحة التحكم</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg">
              <Home className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">دليل لوحة التحكم</h1>
              <p className="text-muted-foreground">نقطة البداية - نظرة شاملة على جميع العمليات</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/dashboard')} size="lg">
          افتح لوحة التحكم <ArrowRight className="mr-2 h-4 w-4" />
        </Button>
      </div>

      {/* Main Screenshot */}
      <Card>
        <CardHeader>
          <CardTitle>الواجهة الرئيسية للوحة التحكم</CardTitle>
          <CardDescription>
            لوحة التحكم هي أول ما يراه المستخدم عند تسجيل الدخول - توفر نظرة سريعة وشاملة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <img
            src="/.playwright-mcp/dashboard-main.png"
            alt="لوحة التحكم الرئيسية"
            className="w-full rounded-lg border-2 shadow-lg"
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="statistics">الإحصائيات</TabsTrigger>
          <TabsTrigger value="actions">الإجراءات السريعة</TabsTrigger>
          <TabsTrigger value="widgets">الودجتس</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ما هي لوحة التحكم؟</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                لوحة التحكم (Dashboard) هي الصفحة الرئيسية في نظام Fleetify. تم تصميمها لتوفير
                نظرة سريعة وشاملة على حالة عملك، مما يساعدك على اتخاذ قرارات مستنيرة بسرعة.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    الهدف الرئيسي
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• توفير نظرة سريعة على الأداء</li>
                    <li>• عرض المؤشرات الرئيسية (KPIs)</li>
                    <li>• تنبيهات للأمور المهمة</li>
                    <li>• وصول سريع للإجراءات</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    الاستخدام اليومي
                  </h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• راجع لوحة التحكم كل صباح</li>
                    <li>• تحقق من الإحصائيات المهمة</li>
                    <li>• تابع التنبيهات الحمراء</li>
                    <li>• استخدم الإجراءات السريعة</li>
                  </ul>
                </div>
              </div>

              <img
                src="/.playwright-mcp/dashboard-overview.png"
                alt="نظرة عامة على لوحة التحكم"
                className="w-full rounded-lg border shadow-sm mt-4"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الإحصائيات الرئيسية</CardTitle>
              <CardDescription>
                بطاقات الإحصائيات في أعلى لوحة التحكم توفر أرقام فورية ومهمة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statistics.map((stat, index) => (
                  <div key={index} className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">{stat.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{stat.description}</p>
                        <p className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                          💡 {stat.details}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-purple-50 border-r-4 border-purple-500 p-4 rounded">
                <h3 className="font-bold text-purple-900 mb-2">📊 كيف تقرأ الإحصائيات؟</h3>
                <div className="text-sm text-purple-800 space-y-2">
                  <p><strong>الرقم الكبير:</strong> القيمة الحالية للمؤشر</p>
                  <p><strong>النسبة المئوية:</strong> التغيير مقارنة بالفترة السابقة</p>
                  <p><strong>السهم للأعلى ↑:</strong> زيادة (غالباً إيجابي)</p>
                  <p><strong>السهم للأسفل ↓:</strong> انخفاض (قد يكون سلبي)</p>
                </div>
              </div>

              <img
                src="/.playwright-mcp/dashboard-financial-overview.png"
                alt="الإحصائيات المالية"
                className="w-full rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات السريعة</CardTitle>
              <CardDescription>
                أزرار للوصول السريع للعمليات الأكثر استخداماً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <div
                    key={index}
                    className="border-2 border-dashed rounded-lg p-4 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                    onClick={() => navigate(action.path)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <action.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded">
                <h3 className="font-bold text-yellow-900 mb-2">⚡ نصيحة للإنتاجية</h3>
                <p className="text-sm text-yellow-800">
                  استخدم الإجراءات السريعة بدلاً من البحث في القوائم - توفر عليك الوقت!
                  يمكنك أيضاً استخدام اختصارات لوحة المفاتيح للوصول الأسرع.
                </p>
              </div>

              <img
                src="/.playwright-mcp/dashboard-quick-actions.png"
                alt="الإجراءات السريعة"
                className="w-full rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الودجتس والمكونات</CardTitle>
              <CardDescription>
                عناصر تفاعلية توفر معلومات مفصلة ورؤى تحليلية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {widgets.map((widget, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    <h3 className="font-bold mb-2">{widget.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{widget.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {widget.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                <h3 className="font-bold text-blue-900 mb-2">🎨 تخصيص لوحة التحكم</h3>
                <p className="text-sm text-blue-800">
                  يمكنك تخصيص لوحة التحكم حسب احتياجاتك من الإعدادات. أضف أو احذف الودجتس،
                  رتبها، أو اختر ما تريد عرضه.
                </p>
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
            أفضل الممارسات لاستخدام لوحة التحكم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-900">✅ افعل</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• راجع لوحة التحكم يومياً في بداية العمل</li>
                <li>• تحقق من الإحصائيات والمؤشرات الحمراء</li>
                <li>• استخدم الإجراءات السريعة لتوفير الوقت</li>
                <li>• تابع التنبيهات والإشعارات المهمة</li>
                <li>• قارن الأداء بالفترات السابقة</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-red-900">❌ لا تفعل</h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li>• لا تتجاهل التنبيهات المهمة</li>
                <li>• لا تعتمد فقط على الأرقام دون فهم السياق</li>
                <li>• لا تهمل مراجعة الرسوم البيانية</li>
                <li>• لا تؤجل الإجراءات المطلوبة</li>
                <li>• لا تنسَ تحديث البيانات بانتظام</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-2 border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-purple-600" />
            نصائح متقدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold mb-2">⏰ التوقيت المثالي</h3>
              <p className="text-sm text-muted-foreground">
                أفضل وقت لمراجعة لوحة التحكم هو أول شيء في الصباح (9-10 صباحاً) قبل بدء
                العمليات اليومية.
              </p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold mb-2">📱 الوصول من الموبايل</h3>
              <p className="text-sm text-muted-foreground">
                لوحة التحكم متوافقة تماماً مع الموبايل - يمكنك متابعة عملك من أي مكان.
              </p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold mb-2">🔔 الإشعارات</h3>
              <p className="text-sm text-muted-foreground">
                فعّل الإشعارات لتلقي تنبيهات فورية عن الأحداث المهمة مباشرة على الموبايل.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>أسئلة شائعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold mb-2">س: كم مرة يتم تحديث الإحصائيات؟</h3>
            <p className="text-sm text-muted-foreground">
              ج: الإحصائيات يتم تحديثها في الوقت الفعلي. عند إضافة عقد جديد أو تسجيل دفعة،
              سترى التغيير فوراً في لوحة التحكم.
            </p>
          </div>
          <div className="border-b pb-3">
            <h3 className="font-semibold mb-2">س: لماذا بعض الأرقام باللون الأحمر؟</h3>
            <p className="text-sm text-muted-foreground">
              ج: اللون الأحمر يشير إلى انخفاض أو مشكلة تحتاج انتباه. مثلاً، انخفاض في
              الإيرادات أو زيادة في المتأخرات.
            </p>
          </div>
          <div className="border-b pb-3">
            <h3 className="font-semibold mb-2">س: هل يمكن تخصيص لوحة التحكم؟</h3>
            <p className="text-sm text-muted-foreground">
              ج: نعم! يمكنك إخفاء أو إظهار الودجتس من الإعدادات، وترتيبها حسب أولوياتك.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">س: ماذا أفعل إذا لم تظهر البيانات؟</h3>
            <p className="text-sm text-muted-foreground">
              ج: تحقق من اتصال الإنترنت، ثم حدّث الصفحة. إذا استمرت المشكلة، اتصل بالدعم الفني.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/help')}>
          <Home className="mr-2 h-4 w-4" />
          العودة لمركز المساعدة
        </Button>
        <Button onClick={() => navigate('/dashboard')}>
          افتح لوحة التحكم <ArrowRight className="mr-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}