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
  MessageSquare,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Phone,
  Bell,
  Calendar,
  DollarSign,
  Users,
  Zap,
  Settings,
  Home,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  FileText,
  Target,
  BarChart3,
  Filter,
} from 'lucide-react';

export default function CollectionsHelp() {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: 'رسائل WhatsApp تلقائية',
      description: 'إرسال تذكيرات ذكية عبر واتساب للعملاء',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: Clock,
      title: 'جدولة التذكيرات',
      description: 'جدول مرن للإرسال قبل وبعد تاريخ الاستحقاق',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Target,
      title: 'استهداف ذكي',
      description: 'اختر العملاء حسب المبلغ والحالة',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: BarChart3,
      title: 'تتبع النتائج',
      description: 'تقارير مفصلة عن الرسائل والمدفوعات',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  const reminderSchedule = [
    {
      timing: 'قبل 7 أيام',
      type: 'تذكير ودي',
      icon: Bell,
      color: 'text-blue-500',
      message: 'مرحباً، نذكرك بدفعتك القادمة خلال أسبوع',
    },
    {
      timing: 'قبل 3 أيام',
      type: 'تذكير عادي',
      icon: Clock,
      color: 'text-yellow-500',
      message: 'دفعتك مستحقة خلال 3 أيام',
    },
    {
      timing: 'يوم الاستحقاق',
      type: 'تنبيه',
      icon: AlertTriangle,
      color: 'text-orange-500',
      message: 'دفعتك مستحقة اليوم',
    },
    {
      timing: 'بعد 1 يوم',
      type: 'تحذير',
      icon: AlertTriangle,
      color: 'text-red-500',
      message: 'تأخرت دفعتك بيوم واحد',
    },
    {
      timing: 'بعد 7 أيام',
      type: 'إجراء قانوني',
      icon: FileText,
      color: 'text-red-600',
      message: 'إشعار قانوني - مطالبة رسمية',
    },
  ];

  const messageTemplates = [
    {
      name: 'التذكير الأول',
      when: 'قبل 7 أيام',
      tone: 'ودي',
      example:
        'مرحباً [الاسم]، نود تذكيرك بأن دفعة الإيجار القادمة بمبلغ [المبلغ] د.ك ستكون مستحقة في [التاريخ]. شكراً لتعاونك.',
    },
    {
      name: 'التذكير الثاني',
      when: 'قبل 3 أيام',
      tone: 'عادي',
      example:
        'عزيزي [الاسم]، دفعتك بمبلغ [المبلغ] د.ك ستكون مستحقة خلال 3 أيام في [التاريخ].',
    },
    {
      name: 'تنبيه يوم الاستحقاق',
      when: 'في يوم الاستحقاق',
      tone: 'رسمي',
      example:
        '[الاسم]، دفعتك بمبلغ [المبلغ] د.ك مستحقة اليوم. الرجاء السداد في أقرب وقت.',
    },
    {
      name: 'تحذير التأخير',
      when: 'بعد يوم من الاستحقاق',
      tone: 'تحذيري',
      example:
        '[الاسم]، لاحظنا تأخر دفعتك بمبلغ [المبلغ] د.ك. الرجاء السداد فوراً لتجنب غرامات التأخير.',
    },
    {
      name: 'الإجراء القانوني',
      when: 'بعد 7 أيام من التأخير',
      tone: 'قانوني',
      example:
        '[الاسم]، نفيدكم بأنه سيتم اتخاذ الإجراءات القانونية اللازمة في حال عدم السداد خلال 48 ساعة. المبلغ المستحق: [المبلغ] د.ك.',
    },
  ];

  const collectionStrategies = [
    {
      title: 'التحصيل الناعم',
      description: 'للعملاء ذوي السجل الجيد',
      steps: ['تذكير ودي', 'مكالمة هاتفية', 'زيارة شخصية'],
      icon: Users,
      color: 'text-green-500',
    },
    {
      title: 'التحصيل المتوسط',
      description: 'للتأخيرات المتكررة',
      steps: ['تحذير رسمي', 'غرامة تأخير', 'إيقاف الخدمة'],
      icon: AlertTriangle,
      color: 'text-orange-500',
    },
    {
      title: 'التحصيل الحازم',
      description: 'للحالات الحرجة',
      steps: ['إنذار قانوني', 'مطالبة رسمية', 'إجراءات قانونية'],
      icon: FileText,
      color: 'text-red-500',
    },
  ];

  const whatsappAdvantages = [
    'معدل قراءة 98% (أعلى من الإيميل والرسائل النصية)',
    'رد فوري من العملاء على الرسائل',
    'توفير وقت وجهد فريق التحصيل',
    'إمكانية المتابعة المباشرة مع العميل',
    'سجل كامل للمحادثات والتذكيرات',
    'تقليل نسبة الديون المتأخرة بنسبة 35%',
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
        <span className="text-foreground font-medium">دليل التحصيل</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">نظام التحصيل وتذكيرات واتساب</h1>
          <p className="text-muted-foreground">
            نظام تحصيل ذكي مع رسائل واتساب تلقائية لتحسين التدفق النقدي
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          تلقائي
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
          <CardTitle>واجهة نظام التحصيل الرئيسية</CardTitle>
          <CardDescription>
            نظرة شاملة على جميع وحدات التحصيل ورسائل واتساب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <img
            src="/.playwright-mcp/collections-main-page.png"
            alt="واجهة نظام التحصيل"
            className="w-full rounded-lg border shadow-sm"
          />
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <Phone className="h-4 w-4" />
            واتساب
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            الجدولة
          </TabsTrigger>
          <TabsTrigger value="strategies" className="gap-2">
            <Target className="h-4 w-4" />
            الاستراتيجيات
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            التتبع
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-500" />
                نظام التحصيل الذكي
              </CardTitle>
              <CardDescription>
                حلول متكاملة لإدارة التحصيل وتذكير العملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                نظام التحصيل في Fleetify يساعدك على تحسين التدفق النقدي من خلال
                تذكيرات ذكية عبر WhatsApp. النظام يتابع الدفعات المستحقة ويرسل
                رسائل تلقائية للعملاء قبل وبعد تاريخ الاستحقاق.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">لماذا واتساب؟</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {whatsappAdvantages.map((advantage, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{advantage}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">
                      نتائج مثبتة
                    </h4>
                    <p className="text-sm text-green-800">
                      الشركات التي تستخدم نظام التذكيرات عبر واتساب تحقق تحسن
                      بنسبة 35% في معدلات التحصيل وتقليل الديون المتأخرة بنسبة
                      50%.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الوحدات المتاحة</CardTitle>
              <CardDescription>
                جميع أدوات التحصيل في مكان واحد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src="/.playwright-mcp/collections-modules-view.png"
                alt="وحدات التحصيل"
                className="w-full rounded-lg border shadow-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                نظام رسائل واتساب التلقائية
              </CardTitle>
              <CardDescription>
                إرسال تذكيرات احترافية عبر WhatsApp بشكل تلقائي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                النظام يرسل رسائل تلقائية للعملاء عبر WhatsApp حسب الجدول
                المحدد. كل رسالة مخصصة باسم العميل والمبلغ المستحق وتاريخ
                الاستحقاق.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">كيف يعمل النظام؟</h4>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="p-3 rounded-full bg-blue-100">
                        <Filter className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="h-12 w-0.5 bg-gray-200 my-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <h5 className="font-semibold mb-1">
                        1. تحديد العملاء
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        النظام يجلب تلقائياً العملاء الذين لديهم دفعات قادمة أو
                        متأخرة
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="p-3 rounded-full bg-purple-100">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="h-12 w-0.5 bg-gray-200 my-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <h5 className="font-semibold mb-1">
                        2. تخصيص الرسالة
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        الرسالة تملأ تلقائياً بـ: اسم العميل، المبلغ، التاريخ،
                        رقم العقد
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="p-3 rounded-full bg-green-100">
                        <Send className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold mb-1">3. الإرسال</h5>
                      <p className="text-sm text-muted-foreground">
                        الرسائل ترسل تلقائياً حسب الجدول المحدد عبر WhatsApp
                        API
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  مثال على رسالة واتساب:
                </h4>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <span className="text-xs text-muted-foreground">
                      Fleetify
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">
                    مرحباً أحمد،
                    <br />
                    <br />
                    نود تذكيرك بأن دفعة الإيجار الشهرية بمبلغ 350 د.ك ستكون
                    مستحقة خلال 3 أيام في تاريخ 30/10/2025.
                    <br />
                    <br />
                    رقم العقد: #12345
                    <br />
                    <br />
                    للاستفسار: 99887766
                    <br />
                    <br />
                    شكراً لتعاونك
                  </p>
                  <div className="flex justify-end mt-2">
                    <span className="text-xs text-muted-foreground">
                      10:30 صباحاً
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>قوالب الرسائل</CardTitle>
              <CardDescription>
                رسائل مخصصة لكل مرحلة من مراحل التحصيل
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messageTemplates.map((template, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-semibold">{template.name}</h5>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {template.when}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              template.tone === 'ودي'
                                ? 'bg-green-100 text-green-700'
                                : template.tone === 'عادي'
                                ? 'bg-blue-100 text-blue-700'
                                : template.tone === 'رسمي'
                                ? 'bg-yellow-100 text-yellow-700'
                                : template.tone === 'تحذيري'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {template.tone}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground bg-gray-50 rounded p-3">
                      {template.example}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                جدول التذكيرات التلقائية
              </CardTitle>
              <CardDescription>
                جدولة ذكية للرسائل قبل وبعد تاريخ الاستحقاق
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                النظام يرسل رسائل تلقائية حسب الجدول التالي. يمكنك تخصيص
                التوقيتات والرسائل حسب احتياجاتك.
              </p>

              <div className="space-y-3">
                {reminderSchedule.map((reminder, index) => (
                  <div
                    key={index}
                    className="flex gap-4 border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`p-3 rounded-full ${
                          reminder.color.includes('blue')
                            ? 'bg-blue-100'
                            : reminder.color.includes('yellow')
                            ? 'bg-yellow-100'
                            : reminder.color.includes('orange')
                            ? 'bg-orange-100'
                            : 'bg-red-100'
                        }`}
                      >
                        <reminder.icon
                          className={`h-5 w-5 ${reminder.color}`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{reminder.timing}</Badge>
                        <span className="font-semibold">{reminder.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {reminder.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1">
                      تخصيص الجدول
                    </h4>
                    <p className="text-sm text-purple-800">
                      يمكنك تعديل التوقيتات والرسائل من صفحة الإعدادات. اختر
                      الأيام والأوقات المناسبة لعملائك.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                استراتيجيات التحصيل
              </CardTitle>
              <CardDescription>
                طرق مختلفة للتعامل مع أنواع العملاء
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {collectionStrategies.map((strategy, index) => (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <div className={`p-3 rounded-lg bg-gray-50 w-fit`}>
                        <strategy.icon
                          className={`h-6 w-6 ${strategy.color}`}
                        />
                      </div>
                      <CardTitle className="text-lg">
                        {strategy.title}
                      </CardTitle>
                      <CardDescription>
                        {strategy.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {strategy.steps.map((step, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                              {i + 1}
                            </div>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>متى تستخدم كل استراتيجية؟</CardTitle>
              <CardDescription>
                دليل سريع لاختيار الاستراتيجية المناسبة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>التحصيل الناعم:</strong> للعملاء الذين لديهم سجل
                    دفع جيد وتأخروا لأول مرة
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>التحصيل المتوسط:</strong> للعملاء الذين تأخروا
                    عدة مرات أو المبلغ كبير
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>التحصيل الحازم:</strong> للديون المتأخرة أكثر من
                    30 يوماً أو العملاء المتكررين
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                تتبع النتائج والتقارير
              </CardTitle>
              <CardDescription>
                قياس فعالية نظام التحصيل ورسائل واتساب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                النظام يوفر تقارير مفصلة عن جميع الرسائل المرسلة ونتائج
                التحصيل لمساعدتك في تحسين الأداء.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-sm">رسائل مرسلة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      1,234
                    </div>
                    <p className="text-xs text-muted-foreground">هذا الشهر</p>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-sm">معدل القراءة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      98%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      تم قراءة الرسائل
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-sm">دفعات مستلمة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      850
                    </div>
                    <p className="text-xs text-muted-foreground">
                      بعد التذكير
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-sm">نسبة النجاح</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      69%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      معدل التحصيل
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">
                  التقارير المتاحة:
                </h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    تقرير الرسائل المرسلة حسب التاريخ والعميل
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    تقرير الدفعات المستلمة بعد التذكير
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    تحليل أداء القوالب المختلفة
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    مقارنة معدلات التحصيل قبل وبعد النظام
                  </li>
                </ul>
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
            أفضل الممارسات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-green-900">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>كن محترماً:</strong> استخدم لغة مهذبة حتى في الرسائل
              التحذيرية
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>التوقيت المناسب:</strong> أرسل الرسائل في أوقات مناسبة
              (9 صباحاً - 8 مساءً)
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>التخصيص:</strong> استخدم اسم العميل وتفاصيل العقد في كل
              رسالة
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>المتابعة:</strong> تابع الردود على الرسائل بسرعة
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Warning Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="h-5 w-5" />
            تنبيهات هامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-orange-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>لا ترسل رسائل spam:</strong> لا ترسل رسائل كثيرة في يوم
              واحد
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>احترم الخصوصية:</strong> لا تشارك تفاصيل الديون مع الغير
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>تأكد من الأرقام:</strong> راجع أرقام الهواتف قبل الإرسال
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/collections')} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          افتح نظام التحصيل
        </Button>
        <Button onClick={() => navigate('/help')} variant="ghost" className="gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة إلى مركز المساعدة
        </Button>
      </div>
    </div>
  );
}
