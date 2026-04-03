import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  HelpCircle,
  BookOpen,
  FileText,
  Users,
  Car,
  DollarSign,
  MessageSquare,
  Home,
  Zap,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Settings,
  BarChart3,
  Wrench,
  Receipt,
  Phone,
  Calendar,
  Target,
  Shield,
  CreditCard,
  Bell,
  Eye,
  Edit,
  Printer,
  Download,
  Play,
  ChevronRight,
  Lightbulb,
  AlertCircle,
  Plus,
  Filter,
  TrendingUp,
  Calculator,
  BookOpenCheck,
  Keyboard
} from 'lucide-react';

// ==========================================
// أنواع البيانات
// ==========================================

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path?: string;
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

interface Shortcut {
  keys: string[];
  description: string;
}

// ==========================================
// البيانات
// ==========================================

const quickStartSteps: QuickStartStep[] = [
  {
    id: 'contract',
    title: 'إنشاء عقد جديد',
    description: 'استخدم الوضع السريع لإنشاء عقد في 5 دقائق',
    icon: FileText,
    color: 'bg-blue-500',
    path: '/contracts'
  },
  {
    id: 'customer',
    title: 'إضافة عميل',
    description: 'إضافة سريعة بحقلين فقط في 15 ثانية',
    icon: Users,
    color: 'bg-green-500',
    path: '/customers'
  },
  {
    id: 'payment',
    title: 'تسجيل دفعة',
    description: 'تسجيل المدفوعات بسرعة وسهولة',
    icon: DollarSign,
    color: 'bg-purple-500',
    path: '/finance/payments'
  },
  {
    id: 'vehicle',
    title: 'إضافة مركبة',
    description: 'تسجيل مركبة جديدة للأسطول',
    icon: Car,
    color: 'bg-orange-500',
    path: '/fleet'
  }
];

const faqs: FAQ[] = [
  // لوحة التحكم
  {
    question: 'كم مرة يتم تحديث الإحصائيات في لوحة التحكم؟',
    answer: 'الإحصائيات يتم تحديثها في الوقت الفعلي. عند إضافة عقد جديد أو تسجيل دفعة، سترى التغيير فوراً.',
    category: 'dashboard'
  },
  {
    question: 'لماذا بعض الأرقام باللون الأحمر؟',
    answer: 'اللون الأحمر يشير إلى انخفاض أو مشكلة تحتاج انتباه، مثلاً انخفاض في الإيرادات أو زيادة في المتأخرات.',
    category: 'dashboard'
  },
  // العقود
  {
    question: 'ما الفرق بين الوضع السريع والوضع العادي في العقود؟',
    answer: 'الوضع السريع يوفر 70% من الوقت ويناسب العقود البسيطة. الوضع العادي يتيح إدخال تفاصيل أكثر للعقود المعقدة.',
    category: 'contracts'
  },
  {
    question: 'هل يمكن تعديل عقد بعد إنشائه؟',
    answer: 'نعم، من خلال نظام التعديلات. التعديلات تمر بمراحل (إنشاء → مراجعة → موافقة → تطبيق) مع حفظ سجل كامل.',
    category: 'contracts'
  },
  // العملاء
  {
    question: 'كيف أتجنب تكرار العملاء؟',
    answer: 'ابحث دائماً برقم الهاتف قبل إضافة عميل جديد. النظام سينبهك إذا وجد تطابق.',
    category: 'customers'
  },
  // المالية
  {
    question: 'متى تحتاج الفاتورة موافقة المدير؟',
    answer: 'الفواتير أقل من 1000 د.ك تُعتمد تلقائياً. الفواتير 1000 د.ك أو أكثر تحتاج موافقة المدير.',
    category: 'finance'
  },
  // الأسطول
  {
    question: 'كيف أتتبع صيانة المركبات؟',
    answer: 'النظام يرسل تذكيرات تلقائية عند اقتراب موعد الصيانة بناءً على الكيلومترات أو التاريخ المحدد.',
    category: 'fleet'
  },
  // التحصيل
  {
    question: 'هل يمكن جدولة رسائل واتساب تلقائية؟',
    answer: 'نعم، النظام يرسل تذكيرات تلقائية قبل 7 أيام، 3 أيام، يوم الاستحقاق، وبعد التأخير حسب الإعدادات.',
    category: 'collections'
  }
];

const shortcuts: Shortcut[] = [
  { keys: ['Ctrl', 'K'], description: 'البحث السريع في أي مكان' },
  { keys: ['Ctrl', 'N'], description: 'إنشاء عنصر جديد' },
  { keys: ['Ctrl', 'P'], description: 'طباعة الصفحة الحالية' },
  { keys: ['Ctrl', 'S'], description: 'حفظ التغييرات' },
  { keys: ['Esc'], description: 'إغلاق النافذة المنبثقة' },
  { keys: ['?'], description: 'فتح مركز المساعدة' }
];

// ==========================================
// المكون الرئيسي
// ==========================================

export default function HelpHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [faqCategory, setFaqCategory] = useState('all');

  const filteredFaqs = faqCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === faqCategory);

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-3">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <HelpCircle className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold">مركز المساعدة الشامل</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          دليلك الكامل لاستخدام نظام Fleetify بكفاءة عالية
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStartSteps.map((step) => (
          <Card 
            key={step.id} 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary"
            onClick={() => step.path && navigate(step.path)}
          >
            <CardHeader className="pb-2">
              <div className={`${step.color} w-12 h-12 rounded-xl flex items-center justify-center mb-2`}>
                <step.icon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
          <TabsTrigger value="overview" className="gap-1">
            <Home className="h-4 w-4" />
            <span className="hidden md:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">لوحة التحكم</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">العقود</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">العملاء</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-1">
            <Car className="h-4 w-4" />
            <span className="hidden md:inline">الأسطول</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="hidden md:inline">المالية</span>
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">التحصيل</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden md:inline">الأسئلة</span>
          </TabsTrigger>
        </TabsList>

        {/* ==========================================
            نظرة عامة
        ========================================== */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                مرحباً بك في نظام Fleetify
              </CardTitle>
              <CardDescription>
                نظام متكامل لإدارة أساطيل تأجير السيارات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                Fleetify هو نظام شامل لإدارة شركات تأجير السيارات. يوفر أدوات متقدمة لإدارة العقود، 
                العملاء، الأسطول، المالية، والتحصيل في مكان واحد.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    سرعة الأداء
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• عقد جديد في 5 دقائق</li>
                    <li>• عميل جديد في 15 ثانية</li>
                    <li>• دفعة في أقل من دقيقة</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    أمان البيانات
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• نظام صلاحيات متقدم</li>
                    <li>• سجل كامل للتغييرات</li>
                    <li>• نسخ احتياطي تلقائي</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4 bg-purple-50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-purple-600" />
                    تنبيهات ذكية
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• تذكير انتهاء العقود</li>
                    <li>• تنبيه الصيانة</li>
                    <li>• متابعة المدفوعات</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* اختصارات لوحة المفاتيح */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                اختصارات لوحة المفاتيح
              </CardTitle>
              <CardDescription>
                اختصارات لتسريع عملك اليومي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, i) => (
                        <kbd key={i} className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            لوحة التحكم
        ========================================== */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                لوحة التحكم (Dashboard)
              </CardTitle>
              <CardDescription>
                نقطة البداية - نظرة شاملة على جميع العمليات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                لوحة التحكم هي أول ما تراه عند تسجيل الدخول. توفر نظرة سريعة على أداء عملك 
                وتساعدك على اتخاذ قرارات مستنيرة.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    الإحصائيات الرئيسية
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      العقود النشطة مع نسبة التغيير
                    </li>
                    <li className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      الإيرادات الشهرية المتوقعة
                    </li>
                    <li className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      المركبات المتاحة للتأجير
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      المدفوعات المستحقة
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    إجراءات سريعة
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      إضافة عقد جديد
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      إضافة عميل جديد
                    </li>
                    <li className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      تسجيل دفعة
                    </li>
                    <li className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      عرض التقارير
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">💡 نصيحة</h4>
                <p className="text-sm text-blue-800">
                  راجع لوحة التحكم كل صباح للتحقق من الإحصائيات والتنبيهات المهمة.
                  الأرقام الحمراء تشير لأمور تحتاج انتباهك.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            العقود
        ========================================== */}
        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                إدارة العقود
              </CardTitle>
              <CardDescription>
                نظام متكامل لإدارة عقود الإيجار بميزات متقدمة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* الوضع السريع */}
              <div className="border-2 border-yellow-200 bg-yellow-50/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-6 w-6 text-yellow-600" />
                  <h4 className="font-semibold text-yellow-900">الوضع السريع ⚡</h4>
                  <Badge className="bg-yellow-200 text-yellow-800">70% أسرع</Badge>
                </div>
                <p className="text-sm text-yellow-800 mb-3">
                  إنشاء عقد في 3-5 دقائق بدلاً من 10-15 دقيقة
                </p>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {['فتح النموذج', 'اختيار العميل', 'اختيار المركبة', 'التفاصيل', 'حفظ ✅'].map((step, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center mb-1 font-bold">
                        {i + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* نظام التعديلات */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Edit className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold">نظام التعديلات</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  تعديل العقود النشطة مع حفظ سجل كامل للتغييرات
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {[
                    { title: 'إنشاء', color: 'bg-blue-100 text-blue-700' },
                    { title: 'مراجعة', color: 'bg-yellow-100 text-yellow-700' },
                    { title: 'موافقة', color: 'bg-green-100 text-green-700' },
                    { title: 'تطبيق', color: 'bg-purple-100 text-purple-700' }
                  ].map((phase, i) => (
                    <Badge key={i} className={phase.color}>{phase.title}</Badge>
                  ))}
                </div>
              </div>

              {/* ميزات إضافية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border rounded-lg p-3">
                  <Search className="h-5 w-5 text-purple-500 mb-2" />
                  <h5 className="font-semibold text-sm">البحث الذكي</h5>
                  <p className="text-xs text-muted-foreground">بالاسم، الرقم، المركبة</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Bell className="h-5 w-5 text-orange-500 mb-2" />
                  <h5 className="font-semibold text-sm">تنبيهات تلقائية</h5>
                  <p className="text-xs text-muted-foreground">انتهاء العقود والمدفوعات</p>
                </div>
                <div className="border rounded-lg p-3">
                  <Printer className="h-5 w-5 text-slate-500 mb-2" />
                  <h5 className="font-semibold text-sm">الطباعة والتصدير</h5>
                  <p className="text-xs text-muted-foreground">PDF, Excel, CSV</p>
                </div>
              </div>

              <Button onClick={() => navigate('/contracts')} className="w-full">
                افتح صفحة العقود <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            العملاء
        ========================================== */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                إدارة العملاء
              </CardTitle>
              <CardDescription>
                قاعدة بيانات شاملة مع الإضافة السريعة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* الإضافة السريعة */}
              <div className="border-2 border-green-200 bg-green-50/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-6 w-6 text-green-600" />
                  <h4 className="font-semibold text-green-900">الإضافة السريعة</h4>
                  <Badge className="bg-green-200 text-green-800">15 ثانية فقط!</Badge>
                </div>
                <p className="text-sm text-green-800 mb-3">
                  حقلين فقط: الاسم ورقم الهاتف. النظام يُنشئ رقم عميل تلقائياً.
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {['فتح النموذج', 'إدخال الاسم', 'إدخال الهاتف', 'حفظ ✅'].map((step, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center mb-1 font-bold">
                        {i + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* معلومات العميل */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">البيانات الأساسية</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• الاسم (عربي/إنجليزي)</li>
                    <li>• رقم الهوية والهاتف</li>
                    <li>• البريد والعنوان</li>
                    <li>• نوع العميل (فرد/شركة)</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">البيانات المالية</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• الرصيد الحالي</li>
                    <li>• إجمالي المدفوعات</li>
                    <li>• المبالغ المستحقة</li>
                    <li>• سجل العقود</li>
                  </ul>
                </div>
              </div>

              <Button onClick={() => navigate('/customers')} className="w-full">
                افتح صفحة العملاء <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            الأسطول
        ========================================== */}
        <TabsContent value="fleet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-orange-500" />
                إدارة الأسطول
              </CardTitle>
              <CardDescription>
                إدارة شاملة للمركبات والصيانة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* حالات المركبات */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { status: 'متاح', color: 'bg-green-100 text-green-700', icon: CheckCircle },
                  { status: 'مؤجر', color: 'bg-blue-100 text-blue-700', icon: Car },
                  { status: 'صيانة', color: 'bg-orange-100 text-orange-700', icon: Wrench },
                  { status: 'غير متاح', color: 'bg-red-100 text-red-700', icon: AlertCircle }
                ].map((item, i) => (
                  <div key={i} className={`${item.color} rounded-lg p-3 text-center`}>
                    <item.icon className="h-6 w-6 mx-auto mb-1" />
                    <span className="font-semibold text-sm">{item.status}</span>
                  </div>
                ))}
              </div>

              {/* الميزات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-5 w-5 text-orange-500" />
                    <h4 className="font-semibold">نظام الصيانة</h4>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• صيانة دورية (زيت، فرامل، إطارات)</li>
                    <li>• صيانة طارئة</li>
                    <li>• فحص سنوي</li>
                    <li>• تذكيرات تلقائية</li>
                  </ul>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h4 className="font-semibold">المخالفات</h4>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• تسجيل المخالفات المرورية</li>
                    <li>• تحديد المسؤولية</li>
                    <li>• متابعة الدفع</li>
                    <li>• ربط بالعقد</li>
                  </ul>
                </div>
              </div>

              <div className="bg-orange-50 border-r-4 border-orange-500 p-4 rounded">
                <h4 className="font-semibold text-orange-900 mb-2">🔔 تنبيهات تلقائية</h4>
                <p className="text-sm text-orange-800">
                  النظام ينبهك عند: اقتراب موعد الصيانة، انتهاء التأمين أو الملكية، وصول الكيلومترات المحددة.
                </p>
              </div>

              <Button onClick={() => navigate('/fleet')} className="w-full">
                افتح صفحة الأسطول <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            المالية
        ========================================== */}
        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                النظام المالي
              </CardTitle>
              <CardDescription>
                نظام محاسبي شامل لإدارة العمليات المالية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* الميزات الرئيسية */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { title: 'الفواتير', icon: Receipt, color: 'text-orange-500' },
                  { title: 'دليل الحسابات', icon: BookOpenCheck, color: 'text-blue-500' },
                  { title: 'دفتر الأستاذ', icon: Calculator, color: 'text-purple-500' },
                  { title: 'التقارير', icon: BarChart3, color: 'text-green-500' }
                ].map((item, i) => (
                  <div key={i} className="border rounded-lg p-3 text-center">
                    <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
                    <span className="font-semibold text-sm">{item.title}</span>
                  </div>
                ))}
              </div>

              {/* نظام الموافقات */}
              <div className="border-2 border-purple-200 bg-purple-50/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">نظام الموافقات الذكي</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span><strong>أقل من 1000 د.ك:</strong> موافقة تلقائية</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span><strong>1000+ د.ك:</strong> يتطلب موافقة المدير</span>
                  </div>
                </div>
              </div>

              {/* طرق الدفع */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">طرق الدفع المتاحة</h4>
                <div className="flex flex-wrap gap-2">
                  {['نقداً', 'بطاقة ائتمان', 'تحويل بنكي', 'K-Net'].map((method, i) => (
                    <Badge key={i} variant="secondary">{method}</Badge>
                  ))}
                </div>
              </div>

              <Button onClick={() => navigate('/finance/invoices')} className="w-full">
                افتح صفحة المالية <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            التحصيل
        ========================================== */}
        <TabsContent value="collections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-500" />
                نظام التحصيل والتذكيرات
              </CardTitle>
              <CardDescription>
                تذكيرات واتساب تلقائية لتحسين التدفق النقدي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* مميزات واتساب */}
              <div className="border-2 border-green-200 bg-green-50/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">رسائل واتساب تلقائية</h4>
                </div>
                <ul className="text-sm space-y-1 text-green-800">
                  <li>✓ معدل قراءة 98% (أعلى من الإيميل)</li>
                  <li>✓ رد فوري من العملاء</li>
                  <li>✓ تقليل الديون المتأخرة بنسبة 35%</li>
                </ul>
              </div>

              {/* جدول التذكيرات */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">جدول التذكيرات التلقائية</h4>
                <div className="space-y-2">
                  {[
                    { timing: 'قبل 7 أيام', type: 'تذكير ودي', color: 'text-blue-500' },
                    { timing: 'قبل 3 أيام', type: 'تذكير عادي', color: 'text-yellow-500' },
                    { timing: 'يوم الاستحقاق', type: 'تنبيه', color: 'text-orange-500' },
                    { timing: 'بعد 1 يوم', type: 'تحذير', color: 'text-red-500' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm">{item.timing}</span>
                      <Badge variant="outline" className={item.color}>{item.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* استراتيجيات التحصيل */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: 'تحصيل ناعم', desc: 'للعملاء الجيدين', color: 'bg-green-100' },
                  { title: 'تحصيل متوسط', desc: 'للتأخيرات المتكررة', color: 'bg-orange-100' },
                  { title: 'تحصيل حازم', desc: 'للحالات الحرجة', color: 'bg-red-100' }
                ].map((item, i) => (
                  <div key={i} className={`${item.color} rounded-lg p-3`}>
                    <h5 className="font-semibold text-sm">{item.title}</h5>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/collections')} className="w-full">
                افتح نظام التحصيل <ArrowRight className="mr-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            الأسئلة الشائعة
        ========================================== */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                الأسئلة الشائعة
              </CardTitle>
              <CardDescription>
                إجابات على أكثر الأسئلة شيوعاً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* فلتر الفئات */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'dashboard', label: 'لوحة التحكم' },
                  { id: 'contracts', label: 'العقود' },
                  { id: 'customers', label: 'العملاء' },
                  { id: 'finance', label: 'المالية' },
                  { id: 'fleet', label: 'الأسطول' },
                  { id: 'collections', label: 'التحصيل' }
                ].map((cat) => (
                  <Button
                    key={cat.id}
                    variant={faqCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFaqCategory(cat.id)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* قائمة الأسئلة */}
              <div className="space-y-3">
                {filteredFaqs.map((faq, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                      {faq.question}
                    </h4>
                    <p className="text-sm text-muted-foreground mr-6">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==========================================
          أفضل الممارسات العامة
      ========================================== */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-6 w-6" />
            أفضل الممارسات العامة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-900">✅ افعل</h4>
              <ul className="text-sm space-y-1 text-green-800">
                <li>• راجع لوحة التحكم يومياً في بداية العمل</li>
                <li>• استخدم الأوضاع السريعة لتوفير الوقت</li>
                <li>• احفظ نسخ احتياطية من العقود المهمة</li>
                <li>• تابع التنبيهات والإشعارات بانتظام</li>
                <li>• حدّث بيانات العملاء والمركبات دورياً</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-red-900">❌ لا تفعل</h4>
              <ul className="text-sm space-y-1 text-red-800">
                <li>• لا تتجاهل التنبيهات الحمراء</li>
                <li>• لا تحذف عقد نشط - استخدم الإلغاء</li>
                <li>• لا تشارك بيانات العملاء مع غير المصرح لهم</li>
                <li>• لا تؤجر مركبة في الصيانة</li>
                <li>• لا تؤجل الصيانة الدورية</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تحذيرات هامة */}
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="h-6 w-6" />
            تحذيرات هامة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-orange-800">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>الصلاحيات:</strong> بعض الميزات تتطلب صلاحيات إدارية</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>النسخ الاحتياطي:</strong> احفظ نسخ من البيانات المهمة بانتظام</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>التأمين:</strong> لا تؤجر مركبة بدون تأمين ساري</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span><strong>التعديلات:</strong> التعديلات على العقود تحتاج موافقة</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* زر العودة للرئيسية */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate('/dashboard')} size="lg">
          <Home className="mr-2 h-4 w-4" />
          العودة للوحة التحكم
        </Button>
      </div>
    </div>
  );
}
