import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Home,
  FileText,
  Users,
  DollarSign,
  MessageSquare,
  Car,
  BarChart3,
  Zap,
  CheckCircle,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';

export default function UserGuide() {
  const navigate = useNavigate();

  const quickStart = [
    { step: 1, title: 'تسجيل الدخول', icon: Home, description: 'استخدم بياناتك المعتمدة للدخول' },
    { step: 2, title: 'استكشف لوحة التحكم', icon: BarChart3, description: 'تعرف على الإحصائيات الأساسية' },
    { step: 3, title: 'راجع الإعدادات', icon: CheckCircle, description: 'تأكد من ضبط البيانات الأساسية' },
    { step: 4, title: 'ابدأ العمل', icon: Zap, description: 'أضف عملاء وعقود جديدة' }
  ];

  const modules = [
    {
      title: 'لوحة التحكم',
      icon: Home,
      color: 'bg-blue-500',
      description: 'نقطة البداية - نظرة شاملة على جميع العمليات والإحصائيات',
      features: ['إحصائيات فورية', 'الإجراءات السريعة', 'التنبيهات المهمة']
    },
    {
      title: 'إدارة العقود',
      icon: FileText,
      color: 'bg-purple-500',
      description: 'الوضع السريع (70% أسرع)، التعديلات، والمتابعة',
      features: ['الوضع السريع', 'نظام التعديلات', 'الطباعة المتقدمة']
    },
    {
      title: 'إدارة العملاء',
      icon: Users,
      color: 'bg-green-500',
      description: 'قاعدة بيانات شاملة مع الإضافة السريعة',
      features: ['إضافة سريعة (15 ثانية)', 'سجل كامل', 'تقارير العملاء']
    },
    {
      title: 'النظام المالي',
      icon: DollarSign,
      color: 'bg-orange-500',
      description: 'محاسبة متكاملة، فواتير، مدفوعات، ودفتر أستاذ',
      features: ['الفواتير الذكية', 'دفتر الأستاذ', 'التقارير المالية']
    },
    {
      title: 'نظام التحصيل',
      icon: MessageSquare,
      color: 'bg-pink-500',
      description: 'تذكيرات واتساب تلقائية تزيد التحصيل 40%',
      features: ['واتساب تلقائي', '4 مراحل تذكير', 'إلغاء ذكي']
    },
    {
      title: 'إدارة الأسطول',
      icon: Car,
      color: 'bg-indigo-500',
      description: 'متابعة المركبات، الصيانة، والمخالفات',
      features: ['سجل الصيانة', 'المخالفات المرورية', 'التصاريح']
    }
  ];

  const workflows = [
    {
      title: 'عميل جديد يريد تأجير مركبة',
      time: '10-15 دقيقة',
      steps: [
        'إضافة العميل باستخدام الإضافة السريعة (15 ثانية)',
        'التحقق من المركبات المتاحة',
        'إنشاء العقد باستخدام الوضع السريع (3-5 دقائق)',
        'طباعة العقد للتوقيع',
        'تسجيل الدفعة الأولى',
        'تسليم المركبة وتوثيق الحالة'
      ]
    },
    {
      title: 'استلام دفعة من عميل',
      time: '2-3 دقائق',
      steps: [
        'البحث عن العميل بالاسم أو الرقم',
        'عرض العقد ومراجعة المستحقات',
        'تسجيل الدفعة مع تحديد الطريقة',
        'طباعة الإيصال للعميل',
        'النظام يلغي تذكيرات واتساب تلقائياً'
      ]
    },
    {
      title: 'مركبة تحتاج صيانة',
      time: '5-7 دقائق',
      steps: [
        'فتح سجل المركبة من قسم الأسطول',
        'إضافة طلب صيانة مع تحديد النوع',
        'تغيير حالة المركبة إلى "صيانة"',
        'تسجيل التكلفة بعد إتمام الصيانة',
        'إعادة المركبة لحالة "متاحة"'
      ]
    }
  ];

  const tips = [
    {
      category: 'للسرعة ⚡',
      items: [
        'استخدم الإضافة السريعة للعملاء دائماً',
        'استخدم الوضع السريع للعقود البسيطة',
        'احفظ قوالب للعقود المتكررة',
        'استخدم اختصارات لوحة المفاتيح'
      ]
    },
    {
      category: 'للدقة 🎯',
      items: [
        'راجع البيانات قبل الحفظ',
        'استخدم نظام التعديلات للتغييرات',
        'وثق كل شيء في الملاحظات',
        'تحقق من الأرقام مرتين'
      ]
    },
    {
      category: 'للأمان 🔒',
      items: [
        'لا تشارك كلمة المرور مع أحد',
        'سجّل خروج عند الانتهاء',
        'راجع سجل العمليات دورياً',
        'احتفظ بنسخ احتياطية'
      ]
    },
    {
      category: 'للإنتاجية 🚀',
      items: [
        'راجع لوحة التحكم يومياً',
        'اطلع على التقارير الأسبوعية',
        'قارن الأداء شهرياً',
        'استخدم الرسوم البيانية للفهم'
      ]
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
        <span className="text-foreground font-medium">دليل المستخدم الكامل</span>
      </div>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            دليل المستخدم الكامل
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          دليلك الشامل لاستخدام نظام Fleetify بكفاءة وفعالية
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            البدء السريع
          </CardTitle>
          <CardDescription>الخطوات الأولى للبدء باستخدام النظام</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickStart.map((step) => (
              <div key={step.step} className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                  {step.step}
                </div>
                <step.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
            <h4 className="font-bold text-blue-900 mb-2">💡 نصيحة للمبتدئين</h4>
            <p className="text-blue-800">
              ابدأ بإضافة بعض العملاء أولاً باستخدام الإضافة السريعة، ثم انتقل لإنشاء
              العقود باستخدام الوضع السريع. هذا سيساعدك على فهم النظام بشكل أسرع.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">الوحدات الرئيسية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold mb-2">{module.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                <div className="space-y-1">
                  {module.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            أمثلة سير العمل اليومي
          </CardTitle>
          <CardDescription>سيناريوهات عملية للعمليات اليومية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows.map((workflow, index) => (
              <div key={index} className="border-2 border-dashed rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg">{workflow.title}</h3>
                  <Badge variant="secondary">{workflow.time}</Badge>
                </div>
                <ol className="space-y-2">
                  {workflow.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips and Tricks */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6 text-green-600" />
            نصائح وحيل للاستخدام الأمثل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tips.map((tip, index) => (
              <div key={index} className="bg-white border rounded-lg p-4">
                <h3 className="font-bold mb-3">{tip.category}</h3>
                <ul className="space-y-2">
                  {tip.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Schedule */}
      <Card className="border-2 border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="text-2xl">⏰ تنظيم يومك</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-purple-700 mb-2">الصباح (9-11)</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• راجع لوحة التحكم</li>
                <li>• متابعة التنبيهات</li>
                <li>• رد على الاستفسارات</li>
              </ul>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-purple-700 mb-2">الظهر (11-2)</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• إنشاء عقود جديدة</li>
                <li>• استقبال عملاء</li>
                <li>• معالجة الطلبات</li>
              </ul>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-purple-700 mb-2">بعد الظهر (2-4)</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• استلام المدفوعات</li>
                <li>• متابعة العملاء</li>
                <li>• تحديث البيانات</li>
              </ul>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-purple-700 mb-2">نهاية اليوم (4-5)</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• مراجعة التقارير</li>
                <li>• التخطيط للغد</li>
                <li>• النسخ الاحتياطي</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Box */}
      <Card className="border-2 border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            تنبيهات مهمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• <strong>النسخ الاحتياطي:</strong> تأكد من عمل نسخ احتياطية دورية للبيانات المهمة</li>
            <li>• <strong>الصلاحيات:</strong> لا تمنح صلاحيات إدارية إلا للموثوقين</li>
            <li>• <strong>كلمات المرور:</strong> استخدم كلمات مرور قوية ولا تشاركها مع أحد</li>
            <li>• <strong>المراجعة:</strong> راجع التقارير والسجلات بانتظام للكشف عن الأخطاء</li>
          </ul>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-2 border-primary/20">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">🎓 هل أنت جاهز للبدء؟</h2>
          <p className="text-lg text-muted-foreground mb-6">
            استخدم هذا الدليل كمرجع دائم أثناء عملك. كلما استخدمت النظام أكثر، ستكتشف
            المزيد من الميزات والطرق لتحسين كفاءتك!
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/help')} variant="outline" size="lg">
              <Home className="mr-2 h-4 w-4" />
              العودة لمركز المساعدة
            </Button>
            <Button onClick={() => navigate('/dashboard')} size="lg">
              ابدأ الآن
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for ArrowRight icon
const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);