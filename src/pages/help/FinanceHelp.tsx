import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Receipt,
  Calculator,
  BookOpen,
  TrendingUp,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  ArrowRight,
  ChevronRight,
  Home,
  HelpCircle,
  Landmark,
  Shield,
  Target,
  Zap,
} from 'lucide-react';

export default function FinanceHelp() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Receipt,
      title: 'الفواتير والمدفوعات',
      description: 'نظام شامل لإدارة الفواتير مع موافقات تلقائية',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      icon: BookOpen,
      title: 'دليل الحسابات',
      description: 'تنظيم محاسبي كامل مع الحسابات الرئيسية والفرعية',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Calculator,
      title: 'دفتر الأستاذ',
      description: 'تتبع دقيق لجميع الحركات المالية والقيود المحاسبية',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: BarChart3,
      title: 'التقارير المالية',
      description: 'تقارير شاملة وتحليلات متقدمة للأداء المالي',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
  ];

  const invoiceWorkflow = [
    {
      step: 1,
      title: 'إنشاء الفاتورة',
      description: 'يتم إنشاء الفاتورة تلقائياً من العقد',
      icon: FileText,
      status: 'auto',
    },
    {
      step: 2,
      title: 'التحقق من المبلغ',
      description: 'النظام يفحص إذا كان المبلغ > 1000 د.ك',
      icon: Calculator,
      status: 'system',
    },
    {
      step: 3,
      title: 'طلب الموافقة',
      description: 'إذا كان المبلغ > 1000 د.ك، يتطلب موافقة المدير',
      icon: Shield,
      status: 'approval',
    },
    {
      step: 4,
      title: 'الموافقة/الرفض',
      description: 'المدير يوافق أو يرفض الفاتورة',
      icon: CheckCircle,
      status: 'decision',
    },
    {
      step: 5,
      title: 'تسجيل الدفعة',
      description: 'بعد الموافقة، يتم تسجيل الدفعة',
      icon: CreditCard,
      status: 'payment',
    },
  ];

  const paymentMethods = [
    { name: 'نقداً', icon: DollarSign, color: 'text-green-500' },
    { name: 'بطاقة ائتمان', icon: CreditCard, color: 'text-blue-500' },
    { name: 'تحويل بنكي', icon: Landmark, color: 'text-purple-500' },
    { name: 'K-Net', icon: CreditCard, color: 'text-orange-500' },
  ];

  const accountTypes = [
    {
      type: 'الأصول',
      examples: ['الخزينة', 'البنوك', 'الذمم المدينة', 'المركبات'],
      color: 'bg-blue-100 text-blue-700',
    },
    {
      type: 'الخصوم',
      examples: ['الذمم الدائنة', 'القروض', 'الأقساط المستحقة'],
      color: 'bg-red-100 text-red-700',
    },
    {
      type: 'حقوق الملكية',
      examples: ['رأس المال', 'الأرباح المحتجزة'],
      color: 'bg-purple-100 text-purple-700',
    },
    {
      type: 'الإيرادات',
      examples: ['إيرادات الإيجار', 'رسوم إضافية', 'غرامات التأخير'],
      color: 'bg-green-100 text-green-700',
    },
    {
      type: 'المصروفات',
      examples: ['الصيانة', 'الرواتب', 'التأمين', 'الوقود'],
      color: 'bg-orange-100 text-orange-700',
    },
  ];

  const reportTypes = [
    {
      name: 'قائمة الدخل',
      description: 'الإيرادات والمصروفات والأرباح',
      icon: TrendingUp,
    },
    {
      name: 'الميزانية العمومية',
      description: 'الأصول والخصوم وحقوق الملكية',
      icon: BarChart3,
    },
    {
      name: 'قائمة التدفقات النقدية',
      description: 'حركة النقد الداخل والخارج',
      icon: DollarSign,
    },
    {
      name: 'تقرير الذمم المدينة',
      description: 'المبالغ المستحقة من العملاء',
      icon: Receipt,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          الرئيسية
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/help')}
          className="gap-2"
        >
          <HelpCircle className="h-4 w-4" />
          مركز المساعدة
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">دليل المالية</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
          <DollarSign className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">دليل النظام المالي</h1>
          <p className="text-muted-foreground">
            دليل شامل لإدارة جميع العمليات المالية والمحاسبية
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          متقدم
        </Badge>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className={`p-3 rounded-lg ${feature.bgColor} w-fit`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Main Screenshot */}
      <Card>
        <CardHeader>
          <CardTitle>واجهة النظام المالي الرئيسية</CardTitle>
          <CardDescription>
            نظرة شاملة على جميع الأقسام المالية والأدوات المتاحة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <img
            src="/.playwright-mcp/finance-main.png"
            alt="واجهة النظام المالي"
            className="w-full rounded-lg border shadow-sm"
          />
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <DollarSign className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            الفواتير
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <BookOpen className="h-4 w-4" />
            دليل الحسابات
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2">
            <Calculator className="h-4 w-4" />
            دفتر الأستاذ
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            التقارير
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-500" />
                النظام المالي المتكامل
              </CardTitle>
              <CardDescription>
                نظام محاسبي شامل لإدارة جميع العمليات المالية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                النظام المالي في Fleetify هو نظام محاسبي متكامل يغطي جميع
                احتياجاتك المالية. من إدارة الفواتير والمدفوعات إلى إعداد
                التقارير المالية المتقدمة، كل شيء في مكان واحد.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">الميزات الرئيسية:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>نظام موافقات ذكي:</strong> موافقات تلقائية
                      للفواتير حسب المبلغ (أقل من 1000 د.ك تلقائي، أكثر يحتاج
                      موافقة)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>دليل حسابات شامل:</strong> تنظيم محاسبي كامل مع
                      الحسابات الرئيسية والفرعية
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>تتبع دقيق:</strong> دفتر أستاذ مفصل لكل حساب مع
                      تاريخ كامل للحركات
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>طرق دفع متعددة:</strong> نقد، بطاقة، تحويل بنكي،
                      K-Net
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>تقارير متقدمة:</strong> قائمة الدخل، الميزانية،
                      التدفقات النقدية
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-900">
                      للمسؤولين فقط
                    </h4>
                    <p className="text-sm text-blue-800">
                      النظام المالي يتطلب صلاحيات إدارية للوصول. تأكد من أن
                      لديك الصلاحيات المناسبة قبل البدء.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>طرق الدفع المتاحة</CardTitle>
              <CardDescription>
                جميع طرق الدفع المدعومة في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {paymentMethods.map((method, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <method.icon className={`h-8 w-8 ${method.color}`} />
                    <span className="text-sm font-medium">{method.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-500" />
                نظام الفواتير والموافقات
              </CardTitle>
              <CardDescription>
                إدارة الفواتير مع نظام موافقات ذكي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src="/.playwright-mcp/finance-invoices-main.png"
                alt="واجهة الفواتير"
                className="w-full rounded-lg border shadow-sm"
              />

              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-2">
                  نظام الموافقات الذكي
                </h4>
                <p className="text-sm text-orange-800 mb-3">
                  النظام يتعامل تلقائياً مع الفواتير حسب المبلغ:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>
                      <strong>أقل من 1000 د.ك:</strong> موافقة تلقائية فورية
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span>
                      <strong>1000 د.ك أو أكثر:</strong> يتطلب موافقة المدير
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>مسار الموافقة على الفواتير</CardTitle>
              <CardDescription>
                الخطوات التي تمر بها الفاتورة من الإنشاء حتى الدفع
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoiceWorkflow.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`p-3 rounded-full ${
                          item.status === 'auto'
                            ? 'bg-blue-100'
                            : item.status === 'system'
                            ? 'bg-purple-100'
                            : item.status === 'approval'
                            ? 'bg-orange-100'
                            : item.status === 'decision'
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 ${
                            item.status === 'auto'
                              ? 'text-blue-500'
                              : item.status === 'system'
                              ? 'text-purple-500'
                              : item.status === 'approval'
                              ? 'text-orange-500'
                              : item.status === 'decision'
                              ? 'text-green-500'
                              : 'text-gray-500'
                          }`}
                        />
                      </div>
                      {index < invoiceWorkflow.length - 1 && (
                        <div className="h-12 w-0.5 bg-gray-200 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">خطوة {item.step}</Badge>
                        <h4 className="font-semibold">{item.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>عرض الفواتير المحملة</CardTitle>
              <CardDescription>
                جدول الفواتير مع جميع التفاصيل والحالات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src="/.playwright-mcp/finance-invoices-loaded.png"
                alt="جدول الفواتير"
                className="w-full rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                دليل الحسابات (Chart of Accounts)
              </CardTitle>
              <CardDescription>
                التنظيم المحاسبي الكامل لجميع الحسابات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                دليل الحسابات هو القلب النابض للنظام المحاسبي. يحتوي على جميع
                الحسابات الرئيسية والفرعية المنظمة حسب التصنيف المحاسبي
                القياسي.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">أنواع الحسابات:</h4>
                <div className="space-y-3">
                  {accountTypes.map((type, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={type.color}>{type.type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {type.examples.map((example, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 px-2 py-1 rounded"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1">
                      الهيكل المحاسبي
                    </h4>
                    <p className="text-sm text-purple-800">
                      يمكنك إنشاء حسابات فرعية تحت كل حساب رئيسي لتنظيم أفضل.
                      مثلاً: "البنوك" → "بنك الكويت الوطني" → "حساب جاري".
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>معالج النظام المحاسبي</CardTitle>
              <CardDescription>
                أداة إعداد سريعة لدليل الحسابات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                إذا كنت تبدأ من الصفر، استخدم معالج النظام المحاسبي لإنشاء دليل
                حسابات كامل بنقرة واحدة.
              </p>
              <Button className="gap-2">
                <Zap className="h-4 w-4" />
                فتح معالج الإعداد
              </Button>
              <p className="text-xs text-muted-foreground">
                المعالج ينشئ تلقائياً جميع الحسابات الأساسية التي تحتاجها
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-purple-500" />
                دفتر الأستاذ العام (General Ledger)
              </CardTitle>
              <CardDescription>
                سجل تفصيلي لجميع الحركات المالية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                دفتر الأستاذ يعرض جميع القيود المحاسبية والحركات المالية لكل
                حساب. كل عملية مالية تسجل كقيد مزدوج (مدين ودائن) لضمان توازن
                الحسابات.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">ما يعرضه دفتر الأستاذ:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>التاريخ:</strong> متى حدثت الحركة المالية
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>الوصف:</strong> تفاصيل العملية المالية
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>المدين (Debit):</strong> المبالغ المضافة للحساب
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>الدائن (Credit):</strong> المبالغ المخصومة من
                      الحساب
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>الرصيد:</strong> الرصيد الحالي بعد كل حركة
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  مثال على قيد محاسبي:
                </h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>عند استلام دفعة إيجار 500 د.ك نقداً:</p>
                  <div className="bg-white rounded p-3 space-y-1">
                    <div className="flex justify-between">
                      <span>500 د.ك من حـ/ الخزينة (مدين)</span>
                      <span className="text-green-600">+500</span>
                    </div>
                    <div className="flex justify-between">
                      <span>500 د.ك إلى حـ/ إيرادات الإيجار (دائن)</span>
                      <span className="text-red-600">-500</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تتبع الدفعات</CardTitle>
              <CardDescription>
                نظام متقدم لتتبع جميع الدفعات والمستحقات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src="/.playwright-mcp/finance-payments-main.png"
                alt="نظام تتبع الدفعات"
                className="w-full rounded-lg border shadow-sm"
              />
              <p className="text-sm mt-3 text-muted-foreground">
                نظام تتبع الدفعات يعرض جميع المدفوعات المستلمة والمستحقة مع
                إمكانية الفلترة حسب التاريخ، العميل، الحالة، وطريقة الدفع.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                التقارير المالية والتحليلات
              </CardTitle>
              <CardDescription>
                تقارير شاملة ومتقدمة لتحليل الأداء المالي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src="/.playwright-mcp/reports-main.png"
                alt="واجهة التقارير"
                className="w-full rounded-lg border shadow-sm"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {reportTypes.map((report, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <report.icon className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{report.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الذمم المدينة (AR Aging)</CardTitle>
              <CardDescription>
                تقرير مفصل بالمبالغ المستحقة من العملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                تقرير الذمم المدينة يصنف المستحقات حسب عمرها:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="border rounded p-3 text-center">
                  <div className="font-semibold text-green-600">جاري</div>
                  <div className="text-xs text-muted-foreground">0-30 يوم</div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="font-semibold text-yellow-600">متأخر</div>
                  <div className="text-xs text-muted-foreground">
                    31-60 يوم
                  </div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="font-semibold text-orange-600">
                    متأخر جداً
                  </div>
                  <div className="text-xs text-muted-foreground">
                    61-90 يوم
                  </div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="font-semibold text-red-600">حرج</div>
                  <div className="text-xs text-muted-foreground">+90 يوم</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التصدير والطباعة</CardTitle>
              <CardDescription>
                تصدير التقارير بصيغ متعددة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">
                يمكنك تصدير أي تقرير مالي بالصيغ التالية:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  PDF
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  Excel
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  CSV
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  طباعة
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Best Practices */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            أفضل الممارسات المالية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-green-900">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>راجع التقارير دورياً:</strong> افحص التقارير المالية
              شهرياً للتأكد من دقة البيانات
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>تابع المستحقات:</strong> راقب تقرير الذمم المدينة بانتظام
              لتجنب تأخر الدفعات
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>استخدم المعالج:</strong> إذا كنت جديداً، ابدأ بمعالج
              النظام المحاسبي لإعداد سريع
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>نسخ احتياطية:</strong> تأكد من النسخ الاحتياطي للبيانات
              المالية بانتظام
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Warning Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertCircle className="h-5 w-5" />
            تنبيهات هامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-orange-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>صلاحيات محدودة:</strong> النظام المالي متاح للمسؤولين فقط
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>لا تحذف الحسابات:</strong> حذف حساب له حركات قد يسبب
              مشاكل في التقارير
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>راجع الموافقات:</strong> الفواتير فوق 1000 د.ك تحتاج
              موافقة يدوية
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/finance/invoices')} className="gap-2">
          <Receipt className="h-4 w-4" />
          افتح صفحة الفواتير
        </Button>
        <Button
          onClick={() => navigate('/finance/chart-of-accounts')}
          variant="outline"
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          افتح دليل الحسابات
        </Button>
        <Button
          onClick={() => navigate('/finance/reports')}
          variant="outline"
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          افتح التقارير
        </Button>
        <Button onClick={() => navigate('/help')} variant="ghost" className="gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة إلى مركز المساعدة
        </Button>
      </div>
    </div>
  );
}
