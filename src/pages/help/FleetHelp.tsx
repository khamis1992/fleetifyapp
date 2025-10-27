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
  Car,
  Wrench,
  FileText,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  MapPin,
  Shield,
  Fuel,
  Settings,
  Home,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  Zap,
  Activity,
  AlertCircle,
  CreditCard,
  Target,
  Users,
} from 'lucide-react';

export default function FleetHelp() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Car,
      title: 'إدارة المركبات',
      description: 'تسجيل كامل لجميع معلومات المركبات والحالة والموقع',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Wrench,
      title: 'الصيانة والإصلاح',
      description: 'تتبع الصيانة الدورية والطارئة مع تذكيرات تلقائية',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      icon: FileText,
      title: 'تصاريح الحركة',
      description: 'إصدار وإدارة تصاريح حركة المركبات',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: AlertTriangle,
      title: 'المخالفات',
      description: 'تسجيل ومتابعة المخالفات المرورية والدفع',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      icon: TrendingUp,
      title: 'الأقساط',
      description: 'إدارة أقساط شراء المركبات',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: BarChart3,
      title: 'التقارير',
      description: 'تقارير شاملة عن أداء الأسطول',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50',
    },
  ];

  const vehicleStatuses = [
    {
      status: 'متاح',
      description: 'المركبة جاهزة للإيجار',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
    },
    {
      status: 'مؤجر',
      description: 'المركبة حالياً مع عميل',
      icon: Car,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
    },
    {
      status: 'صيانة',
      description: 'المركبة في الورشة',
      icon: Wrench,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
    },
    {
      status: 'غير متاح',
      description: 'المركبة غير قابلة للإيجار',
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
    },
  ];

  const maintenanceTypes = [
    {
      type: 'صيانة دورية',
      description: 'صيانة منتظمة حسب الكيلومترات أو الوقت',
      examples: ['تغيير الزيت', 'فحص الفرامل', 'تبديل الإطارات'],
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      type: 'صيانة طارئة',
      description: 'إصلاحات غير مخططة بسبب أعطال',
      examples: ['إصلاح المحرك', 'استبدال البطارية', 'إصلاح التكييف'],
      icon: AlertTriangle,
      color: 'text-red-500',
    },
    {
      type: 'فحص سنوي',
      description: 'الفحص الفني السنوي الإلزامي',
      examples: ['فحص شامل', 'تجديد الملكية', 'تجديد التأمين'],
      icon: Shield,
      color: 'text-purple-500',
    },
  ];

  const dispatchPermitSteps = [
    {
      step: 1,
      title: 'طلب التصريح',
      description: 'العميل أو الموظف يطلب تصريح حركة',
      icon: FileText,
    },
    {
      step: 2,
      title: 'التحقق',
      description: 'فحص صلاحية السائق والمركبة',
      icon: CheckCircle,
    },
    {
      step: 3,
      title: 'الموافقة',
      description: 'موافقة المدير إذا لزم الأمر',
      icon: Shield,
    },
    {
      step: 4,
      title: 'الإصدار',
      description: 'إصدار التصريح وإرساله',
      icon: Send,
    },
  ];

  const reportCategories = [
    {
      category: 'الاستخدام والأداء',
      reports: [
        'معدل استخدام المركبات',
        'الإيرادات لكل مركبة',
        'المسافة المقطوعة',
        'استهلاك الوقود',
      ],
      icon: Activity,
    },
    {
      category: 'الصيانة والتكاليف',
      reports: [
        'تكاليف الصيانة',
        'الصيانة المستحقة',
        'تاريخ الصيانة',
        'مقارنة التكاليف',
      ],
      icon: Wrench,
    },
    {
      category: 'المخالفات والحوادث',
      reports: [
        'المخالفات المرورية',
        'الحوادث المسجلة',
        'التكاليف المترتبة',
        'السائقين المخالفين',
      ],
      icon: AlertTriangle,
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
        <span className="text-foreground font-medium">دليل إدارة الأسطول</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
          <Car className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">دليل إدارة الأسطول</h1>
          <p className="text-muted-foreground">
            دليل شامل لإدارة المركبات والصيانة والعمليات اليومية
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          متقدم
        </Badge>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Car className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-2">
            <Car className="h-4 w-4" />
            المركبات
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" />
            الصيانة
          </TabsTrigger>
          <TabsTrigger value="permits" className="gap-2">
            <FileText className="h-4 w-4" />
            التصاريح
          </TabsTrigger>
          <TabsTrigger value="violations" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            المخالفات
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
                <Car className="h-5 w-5 text-blue-500" />
                نظام إدارة الأسطول المتكامل
              </CardTitle>
              <CardDescription>
                إدارة شاملة لجميع جوانب أسطول المركبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                نظام إدارة الأسطول في Fleetify يوفر لك أدوات كاملة لإدارة
                مركباتك بكفاءة عالية. من تسجيل المركبات إلى الصيانة الدورية
                والتقارير التحليلية، كل شيء في مكان واحد.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">الميزات الرئيسية:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>سجل كامل:</strong> معلومات تفصيلية لكل مركبة
                      (موديل، لون، رقم الهيكل، الملكية، التأمين)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>تتبع الحالة:</strong> معرفة حالة كل مركبة لحظياً
                      (متاح، مؤجر، صيانة، غير متاح)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>صيانة ذكية:</strong> تذكيرات تلقائية للصيانة
                      الدورية حسب الكيلومترات أو التاريخ
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>تحليل الأداء:</strong> تقارير مفصلة عن
                      الاستخدام، الإيرادات، والتكاليف لكل مركبة
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>إدارة المخالفات:</strong> تسجيل ومتابعة
                      المخالفات المرورية والحوادث
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">
                      الهدف من النظام
                    </h4>
                    <p className="text-sm text-blue-800">
                      زيادة كفاءة استخدام المركبات، تقليل تكاليف الصيانة،
                      وتحسين العائد على الاستثمار من خلال إدارة فعالة ومبنية
                      على البيانات.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-500" />
                إدارة المركبات
              </CardTitle>
              <CardDescription>
                سجل كامل ومتابعة لحظية لجميع المركبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                صفحة المركبات تعرض جميع مركبات الأسطول مع إمكانية البحث
                والفلترة حسب الحالة، النوع، أو أي معيار آخر.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">المعلومات المسجلة لكل مركبة:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="border rounded-lg p-3">
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <Car className="h-4 w-4 text-blue-500" />
                      معلومات أساسية
                    </h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• رقم اللوحة</li>
                      <li>• نوع المركبة (سيدان، SUV، شاحنة...)</li>
                      <li>• الماركة والموديل</li>
                      <li>• سنة الصنع</li>
                      <li>• اللون</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      الوثائق الرسمية
                    </h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• رقم الهيكل (VIN)</li>
                      <li>• رقم الملكية</li>
                      <li>• تاريخ انتهاء الملكية</li>
                      <li>• بوليصة التأمين</li>
                      <li>• تاريخ انتهاء التأمين</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      المعلومات المالية
                    </h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• سعر الشراء</li>
                      <li>• القيمة الحالية</li>
                      <li>• سعر الإيجار اليومي</li>
                      <li>• تكاليف التشغيل</li>
                      <li>• العائد الشهري</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-500" />
                      حالة الاستخدام
                    </h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• الحالة الحالية</li>
                      <li>• قراءة العداد (km)</li>
                      <li>• تاريخ آخر صيانة</li>
                      <li>• الموقع الحالي</li>
                      <li>• العقد الحالي (إن وجد)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>حالات المركبات</CardTitle>
              <CardDescription>
                الحالات المختلفة التي يمكن أن تكون عليها المركبة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicleStatuses.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${item.bgColor}`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div>
                        <h5 className="font-semibold">{item.status}</h5>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                نظام الصيانة الذكي
              </CardTitle>
              <CardDescription>
                إدارة كاملة للصيانة الدورية والطارئة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                نظام الصيانة يساعدك على جدولة الصيانة الدورية، تسجيل
                الإصلاحات، وتتبع التكاليف. النظام يرسل تذكيرات تلقائية عند
                اقتراب موعد الصيانة.
              </p>

              <div className="space-y-4">
                <h4 className="font-semibold">أنواع الصيانة:</h4>
                {maintenanceTypes.map((type, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <type.icon className={`h-5 w-5 ${type.color}`} />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold">{type.type}</h5>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {type.examples.map((example, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">
                      تذكيرات الصيانة التلقائية
                    </h4>
                    <p className="text-sm text-orange-800 mb-2">
                      النظام يرسل تذكيرات تلقائية عندما:
                    </p>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        تصل المركبة للكيلومترات المحددة للصيانة
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        يقترب موعد انتهاء الملكية أو التأمين
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        يحين موعد الصيانة الدورية (كل 3/6 أشهر)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سجل الصيانة</CardTitle>
              <CardDescription>
                تتبع كامل لجميع أعمال الصيانة والتكاليف
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                لكل عملية صيانة، يتم تسجيل:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>تاريخ الصيانة</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>نوع الصيانة</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>الورشة المنفذة</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>التكلفة الإجمالية</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>قراءة العداد</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>الملاحظات</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permits Tab */}
        <TabsContent value="permits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                تصاريح الحركة
              </CardTitle>
              <CardDescription>
                إصدار وإدارة تصاريح حركة المركبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                تصاريح الحركة تستخدم للسماح للسائقين باستخدام المركبات. كل
                تصريح يحتوي على معلومات السائق، المركبة، والفترة الزمنية
                المسموحة.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">خطوات إصدار التصريح:</h4>
                <div className="space-y-3">
                  {dispatchPermitSteps.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="p-3 rounded-full bg-purple-100">
                          <item.icon className="h-5 w-5 text-purple-500" />
                        </div>
                        {index < dispatchPermitSteps.length - 1 && (
                          <div className="h-12 w-0.5 bg-gray-200 my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">خطوة {item.step}</Badge>
                          <h5 className="font-semibold">{item.title}</h5>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">
                  ما يتضمنه التصريح:
                </h4>
                <ul className="space-y-1 text-sm text-purple-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    معلومات السائق ورقم الرخصة
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    تفاصيل المركبة ورقم اللوحة
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    تاريخ ووقت البداية والنهاية
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    الغرض من الاستخدام
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    رقم التصريح الفريد
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                إدارة المخالفات المرورية
              </CardTitle>
              <CardDescription>
                تسجيل ومتابعة ودفع المخالفات والحوادث
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                نظام المخالفات يساعدك على تسجيل جميع المخالفات المرورية
                والحوادث، تحديد المسؤولية، ومتابعة الدفع والإجراءات القانونية.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold">المعلومات المسجلة:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <h5 className="font-semibold text-sm mb-2">
                      تفاصيل المخالفة
                    </h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• رقم المخالفة</li>
                      <li>• نوع المخالفة</li>
                      <li>• التاريخ والمكان</li>
                      <li>• المبلغ المستحق</li>
                      <li>• حالة الدفع</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h5 className="font-semibold text-sm mb-2">
                      تحديد المسؤولية
                    </h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• المركبة المخالفة</li>
                      <li>• السائق وقت المخالفة</li>
                      <li>• العقد المرتبط (إن وجد)</li>
                      <li>• من سيدفع (عميل/شركة)</li>
                      <li>• الملاحظات</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">
                      إدارة المخالفات في العقود
                    </h4>
                    <p className="text-sm text-red-800">
                      عندما يكون لديك عقد إيجار نشط، يمكنك تحديد من المسؤول
                      عن دفع المخالفات (العميل أو الشركة) في شروط العقد. النظام
                      يتتبع تلقائياً المخالفات ويضيفها للفاتورة إذا كان العميل
                      مسؤولاً.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أنواع المخالفات الشائعة</CardTitle>
              <CardDescription>
                المخالفات الأكثر شيوعاً في تأجير المركبات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>تجاوز السرعة</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>مخالفة وقوف</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>استخدام الجوال</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>عدم ربط الحزام</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>قطع إشارة حمراء</span>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>عدم تجديد الملكية</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-500" />
                التقارير والتحليلات
              </CardTitle>
              <CardDescription>
                تقارير شاملة عن أداء الأسطول والمركبات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                نظام التقارير يوفر رؤى قيمة عن أداء أسطولك، مساعدتك على اتخاذ
                قرارات مبنية على البيانات لتحسين الكفاءة وتقليل التكاليف.
              </p>

              <div className="space-y-4">
                {reportCategories.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-cyan-50 rounded-lg">
                        <category.icon className="h-5 w-5 text-cyan-500" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold mb-2">
                          {category.category}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.reports.map((report, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>{report}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-900 mb-2">
                  مؤشرات الأداء الرئيسية (KPIs):
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-cyan-600">92%</div>
                    <div className="text-xs text-muted-foreground">
                      معدل الاستخدام
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-green-600">450 د.ك</div>
                    <div className="text-xs text-muted-foreground">
                      العائد/مركبة
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-orange-600">120 د.ك</div>
                    <div className="text-xs text-muted-foreground">
                      تكلفة الصيانة
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-blue-600">8.5 L/100km</div>
                    <div className="text-xs text-muted-foreground">
                      استهلاك الوقود
                    </div>
                  </div>
                </div>
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
              <strong>صيانة منتظمة:</strong> التزم بجدول الصيانة الدورية
              لتجنب الأعطال المفاجئة
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>تتبع الكيلومترات:</strong> راقب قراءة العداد بانتظام
              لكل مركبة
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>حدّث الوثائق:</strong> تأكد من تجديد الملكية والتأمين
              قبل انتهائها
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>راجع التقارير:</strong> افحص تقارير الأداء شهرياً
              لتحسين الكفاءة
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
              <strong>لا تؤجر مركبة في الصيانة:</strong> تأكد من حالة المركبة
              قبل الإيجار
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>انتبه للتأمين:</strong> المركبات بدون تأمين ساري لا يجب
              تأجيرها
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>سجّل المخالفات فوراً:</strong> تسجيل فوري للمخالفات
              لتحديد المسؤولية بدقة
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/fleet')} className="gap-2">
          <Car className="h-4 w-4" />
          افتح صفحة المركبات
        </Button>
        <Button
          onClick={() => navigate('/fleet/maintenance')}
          variant="outline"
          className="gap-2"
        >
          <Wrench className="h-4 w-4" />
          افتح الصيانة
        </Button>
        <Button
          onClick={() => navigate('/fleet/reports')}
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
