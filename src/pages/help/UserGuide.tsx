import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  FileText,
  Users,
  DollarSign,
  Car,
  Settings,
  BarChart3,
  PlayCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Home,
  CreditCard,
  Receipt,
  Wrench,
  AlertTriangle,
  Clock,
  Calendar,
  Package,
  ShoppingCart,
  Phone,
  Shield,
  Bell,
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  ChevronRight,
  Layers,
  Target,
  Zap,
  Info,
  Lightbulb,
  AlertCircle,
  Star,
  Navigation,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Circle,
  CircleDot
} from 'lucide-react';

// ==========================================
// دليل سير العمل اليومي
// ==========================================

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  detailedSteps: string[];
  tips?: string[];
  warnings?: string[];
  relatedPath?: string;
}

interface DailyWorkflow {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'سهل' | 'متوسط' | 'متقدم';
  icon: React.ElementType;
  color: string;
  steps: WorkflowStep[];
}

const dailyWorkflows: DailyWorkflow[] = [
  // ==========================================
  // سير العمل 1: إنشاء عقد تأجير كامل
  // ==========================================
  {
    id: 'create-contract',
    title: 'إنشاء عقد تأجير جديد',
    description: 'خطوات كاملة لإنشاء عقد تأجير من البداية حتى تسليم المركبة للعميل',
    duration: '5-10 دقائق',
    difficulty: 'سهل',
    icon: FileText,
    color: 'bg-blue-500',
    steps: [
      {
        id: 'step1',
        title: 'التحقق من هوية العميل',
        description: 'قبل البدء، تأكد من صحة وثائق العميل',
        icon: Users,
        color: 'text-green-500',
        detailedSteps: [
          'اطلب من العميل الهوية الأصلية (البطاقة الشخصية أو جواز السفر)',
          'تأكد من أن الهوية سارية المفعول وغير منتهية',
          'اطلب رخصة القيادة الأصلية',
          'تأكد من أن الرخصة سارية وتسمح بقيادة نوع المركبة',
          'التقط صور واضحة للوثائق من الأمام والخلف'
        ],
        tips: [
          'قارن صورة الهوية بوجه العميل',
          'تأكد من عدم وجود شطب أو تعديل على الوثائق',
          'للعملاء الأجانب: تأكد من صلاحية الإقامة'
        ],
        warnings: [
          'لا تقبل صور الوثائق من الهاتف - اطلب الأصل',
          'رخصة القيادة الدولية وحدها لا تكفي - يجب وجود الرخصة الأصلية'
        ]
      },
      {
        id: 'step2',
        title: 'البحث عن العميل أو إضافته',
        description: 'ابحث عن العميل في النظام أو أنشئ ملف جديد',
        icon: Search,
        color: 'text-blue-500',
        detailedSteps: [
          'اذهب إلى صفحة العقود وانقر على "عقد جديد"',
          'في حقل العميل، اكتب اسم العميل أو رقم هاتفه',
          'إذا ظهر العميل في النتائج، انقر عليه لاختياره',
          'إذا لم يظهر، انقر على "إضافة عميل جديد"',
          'أدخل بيانات العميل: الاسم، الهوية، الهاتف، العنوان',
          'ارفع صور الوثائق',
          'احفظ بيانات العميل'
        ],
        tips: [
          'استخدم رقم الهاتف للبحث - أسرع من الاسم',
          'تأكد من عدم وجود العميل مسبقاً لتجنب التكرار'
        ],
        relatedPath: '/customers'
      },
      {
        id: 'step3',
        title: 'اختيار المركبة المناسبة',
        description: 'اختر مركبة متاحة تناسب احتياجات العميل',
        icon: Car,
        color: 'text-orange-500',
        detailedSteps: [
          'في شاشة اختيار المركبة، ستظهر المركبات المتاحة فقط',
          'استخدم الفلاتر لتضييق البحث (النوع، الفئة، السعر)',
          'راجع حالة المركبة: قراءة العداد، آخر صيانة',
          'انقر على المركبة لاختيارها',
          'تأكد من أن المركبة ليست محجوزة لتاريخ مطلوب'
        ],
        tips: [
          'اسأل العميل عن تفضيلاته (حجم، لون، ميزات)',
          'تحقق من وجود وقود كافٍ في المركبة',
          'راجع تقييمات المركبة إن وجدت'
        ],
        warnings: [
          'لا تختر مركبة تنتهي صيانتها خلال فترة العقد',
          'تأكد من سريان التأمين طوال فترة العقد'
        ],
        relatedPath: '/fleet'
      },
      {
        id: 'step4',
        title: 'تحديد تفاصيل العقد',
        description: 'أدخل تواريخ وأسعار العقد',
        icon: Calendar,
        color: 'text-purple-500',
        detailedSteps: [
          'حدد تاريخ ووقت استلام المركبة',
          'حدد تاريخ ووقت إرجاع المركبة',
          'سيحسب النظام عدد الأيام تلقائياً',
          'راجع السعر اليومي (يمكن تعديله)',
          'أضف أي خدمات إضافية (تأمين شامل، سائق، GPS)',
          'أدخل قيمة التأمين/الضمان',
          'راجع الإجمالي النهائي'
        ],
        tips: [
          'للعقود الطويلة (أسبوع+): اقترح سعر أسبوعي أو شهري مخفض',
          'وضّح للعميل ما يشمله السعر وما لا يشمله'
        ]
      },
      {
        id: 'step5',
        title: 'مراجعة واعتماد العقد',
        description: 'راجع كل التفاصيل قبل الاعتماد',
        icon: Eye,
        color: 'text-indigo-500',
        detailedSteps: [
          'راجع بيانات العميل (الاسم، الهوية، الهاتف)',
          'راجع بيانات المركبة (الرقم، اللوحة)',
          'راجع التواريخ والأسعار',
          'راجع الإجمالي والضريبة',
          'انقر على "اعتماد العقد"',
          'سيُنشئ النظام رقم عقد تلقائياً'
        ],
        tips: [
          'اقرأ الشروط للعميل أو دعه يقرأها',
          'أجب على أي أسئلة للعميل'
        ],
        warnings: [
          'بعد الاعتماد، التعديل يتطلب صلاحيات خاصة'
        ]
      },
      {
        id: 'step6',
        title: 'استلام الدفعة وطباعة العقد',
        description: 'استلم المبلغ واطبع نسختين من العقد',
        icon: CreditCard,
        color: 'text-green-500',
        detailedSteps: [
          'استلم مبلغ التأمين/الضمان',
          'استلم دفعة مقدمة أو كامل المبلغ',
          'سجّل الدفعة في النظام (نقد، بطاقة، تحويل)',
          'اطبع نسختين من العقد',
          'وقّع العقد أنت والعميل',
          'سلّم نسخة للعميل واحتفظ بنسخة'
        ],
        tips: [
          'تأكد من إعطاء العميل إيصال الدفع',
          'اشرح للعميل شروط استرداد التأمين'
        ],
        relatedPath: '/finance/payments'
      },
      {
        id: 'step7',
        title: 'تسليم المركبة للعميل',
        description: 'فحص المركبة وتسليمها للعميل',
        icon: CheckCircle,
        color: 'text-teal-500',
        detailedSteps: [
          'افحص المركبة مع العميل',
          'سجّل قراءة العداد الحالية',
          'وثّق أي خدوش أو ملاحظات موجودة',
          'تأكد من وجود الإطار الاحتياطي والمثلث',
          'أعطِ العميل مفاتيح المركبة',
          'اشرح للعميل كيفية التواصل في حالة الطوارئ',
          'ودّع العميل بابتسامة!'
        ],
        tips: [
          'التقط صوراً للمركبة قبل التسليم',
          'تأكد من فهم العميل لمكان محطات الوقود'
        ]
      }
    ]
  },

  // ==========================================
  // سير العمل 2: استلام مركبة وإنهاء عقد
  // ==========================================
  {
    id: 'end-contract',
    title: 'استلام المركبة وإنهاء العقد',
    description: 'خطوات استلام المركبة من العميل وإغلاق العقد بشكل صحيح',
    duration: '10-15 دقيقة',
    difficulty: 'متوسط',
    icon: CheckCircle2,
    color: 'bg-green-500',
    steps: [
      {
        id: 'step1',
        title: 'فتح العقد في النظام',
        description: 'ابحث عن العقد المطلوب إنهاؤه',
        icon: Search,
        color: 'text-blue-500',
        detailedSteps: [
          'اذهب إلى صفحة العقود',
          'ابحث بالرقم أو اسم العميل أو رقم المركبة',
          'انقر على العقد لفتحه',
          'تأكد من أن هذا هو العقد الصحيح'
        ]
      },
      {
        id: 'step2',
        title: 'فحص المركبة',
        description: 'افحص المركبة بدقة مع العميل',
        icon: Eye,
        color: 'text-orange-500',
        detailedSteps: [
          'افحص الهيكل الخارجي: خدوش، صدمات، كسور',
          'افحص الإطارات: التآكل، الضغط',
          'افحص الداخلية: النظافة، التلف',
          'افحص المحرك: أصوات غريبة، تسريبات',
          'سجّل قراءة العداد الحالية',
          'تحقق من مستوى الوقود',
          'تحقق من وجود جميع الملحقات (إطار احتياطي، مثلث، إلخ)'
        ],
        tips: [
          'افحص المركبة في ضوء جيد',
          'استخدم كشاف للمناطق المظلمة',
          'التقط صور لأي ملاحظات'
        ],
        warnings: [
          'لا توقع على الاستلام قبل الفحص الكامل',
          'وثّق أي ضرر جديد فوراً'
        ]
      },
      {
        id: 'step3',
        title: 'تسجيل الملاحظات والأضرار',
        description: 'وثّق أي مشاكل أو أضرار جديدة',
        icon: AlertTriangle,
        color: 'text-red-500',
        detailedSteps: [
          'في شاشة إنهاء العقد، ابحث عن قسم "ملاحظات الاستلام"',
          'سجّل أي خدوش أو أضرار جديدة',
          'ارفع صور الأضرار',
          'حدد المسؤول عن الضرر (العميل أو استهلاك طبيعي)',
          'أدخل تكلفة الإصلاح التقديرية'
        ],
        tips: [
          'قارن مع صور التسليم الأولي',
          'كن عادلاً في تقييم الأضرار'
        ]
      },
      {
        id: 'step4',
        title: 'حساب المستحقات النهائية',
        description: 'احسب أي مبالغ إضافية أو استردادات',
        icon: DollarSign,
        color: 'text-green-500',
        detailedSteps: [
          'راجع إجمالي أيام الاستخدام الفعلية',
          'احسب فرق الأيام (إن وجد تأخير أو تبكير)',
          'أضف تكلفة أي أضرار',
          'أضف تكلفة أي مخالفات مرورية',
          'احسب فرق الوقود (إن لم يُعد ممتلئاً)',
          'اخصم أي خصومات متفق عليها',
          'راجع الإجمالي النهائي'
        ],
        tips: [
          'اشرح للعميل كل بند بالتفصيل',
          'أعطِ العميل فرصة للاعتراض قبل التأكيد'
        ]
      },
      {
        id: 'step5',
        title: 'التسوية المالية',
        description: 'استلم أو أعد المبالغ المستحقة',
        icon: CreditCard,
        color: 'text-purple-500',
        detailedSteps: [
          'إذا كان على العميل مبلغ إضافي: استلم الدفعة',
          'إذا كان للعميل مبلغ مسترد: أعد المبلغ',
          'سجّل جميع الحركات المالية في النظام',
          'اطبع إيصال التسوية',
          'أعطِ العميل نسخة من الإيصال'
        ],
        warnings: [
          'لا تُغلق العقد قبل إتمام التسوية المالية'
        ]
      },
      {
        id: 'step6',
        title: 'إغلاق العقد في النظام',
        description: 'أكمل إجراءات الإغلاق',
        icon: CheckCircle2,
        color: 'text-teal-500',
        detailedSteps: [
          'انقر على "إنهاء العقد"',
          'راجع ملخص العقد النهائي',
          'أكد الإغلاق',
          'ستتحول حالة المركبة إلى "متاحة" تلقائياً',
          'اطبع تقرير إغلاق العقد'
        ]
      },
      {
        id: 'step7',
        title: 'شكر العميل وطلب التقييم',
        description: 'اختتم بشكل إيجابي',
        icon: Star,
        color: 'text-yellow-500',
        detailedSteps: [
          'اشكر العميل على التعامل',
          'اسأله عن تجربته',
          'اطلب منه تقييم الخدمة',
          'أعلمه بالعروض القادمة',
          'ودّعه بابتسامة!'
        ],
        tips: [
          'العميل الراضي يعود ويُحضر عملاء جدد',
          'تعامل مع الشكاوى بصدر رحب'
        ]
      }
    ]
  },

  // ==========================================
  // سير العمل 3: تسجيل دفعة من عميل
  // ==========================================
  {
    id: 'record-payment',
    title: 'تسجيل دفعة من عميل',
    description: 'كيفية تسجيل المدفوعات بشكل صحيح في النظام',
    duration: '2-3 دقائق',
    difficulty: 'سهل',
    icon: CreditCard,
    color: 'bg-green-500',
    steps: [
      {
        id: 'step1',
        title: 'الدخول لصفحة المدفوعات',
        description: 'الوصول السريع لتسجيل الدفعات',
        icon: Navigation,
        color: 'text-blue-500',
        detailedSteps: [
          'انقر على زر + في أسفل الشاشة',
          'اختر "تسجيل دفعة"',
          'أو: اذهب إلى المالية > المدفوعات > تسجيل دفعة'
        ],
        relatedPath: '/finance/payments/quick'
      },
      {
        id: 'step2',
        title: 'اختيار العميل',
        description: 'حدد العميل الذي يدفع',
        icon: Users,
        color: 'text-green-500',
        detailedSteps: [
          'ابحث بالاسم أو رقم الهاتف',
          'اختر العميل من القائمة',
          'سيظهر رصيده المستحق'
        ]
      },
      {
        id: 'step3',
        title: 'تحديد العقد أو الفاتورة',
        description: 'ربط الدفعة بالمستحق الصحيح',
        icon: FileText,
        color: 'text-purple-500',
        detailedSteps: [
          'اختر العقد أو الفاتورة المراد السداد لها',
          'سيظهر المبلغ المستحق',
          'يمكن اختيار أكثر من فاتورة'
        ]
      },
      {
        id: 'step4',
        title: 'إدخال تفاصيل الدفعة',
        description: 'سجل مبلغ وطريقة الدفع',
        icon: DollarSign,
        color: 'text-orange-500',
        detailedSteps: [
          'أدخل المبلغ المدفوع',
          'اختر طريقة الدفع: نقد، بطاقة، تحويل، شيك',
          'أدخل رقم المرجع (للبطاقة أو التحويل)',
          'أضف ملاحظات إن لزم'
        ],
        tips: [
          'للدفع النقدي: عُد النقود أمام العميل',
          'للبطاقة: تأكد من نجاح العملية'
        ]
      },
      {
        id: 'step5',
        title: 'تأكيد وطباعة الإيصال',
        description: 'احفظ الدفعة واطبع الإيصال',
        icon: Printer,
        color: 'text-teal-500',
        detailedSteps: [
          'راجع التفاصيل',
          'انقر على "تأكيد الدفعة"',
          'اطبع الإيصال',
          'أعطِ نسخة للعميل'
        ]
      }
    ]
  },

  // ==========================================
  // سير العمل 4: إضافة مركبة جديدة
  // ==========================================
  {
    id: 'add-vehicle',
    title: 'إضافة مركبة جديدة للأسطول',
    description: 'خطوات تسجيل مركبة جديدة في النظام',
    duration: '5-7 دقائق',
    difficulty: 'سهل',
    icon: Car,
    color: 'bg-orange-500',
    steps: [
      {
        id: 'step1',
        title: 'جمع وثائق المركبة',
        description: 'تجهيز جميع الأوراق المطلوبة',
        icon: FileText,
        color: 'text-blue-500',
        detailedSteps: [
          'استمارة المركبة الأصلية',
          'شهادة التأمين الساري',
          'شهادة الفحص الفني',
          'صور المركبة من جميع الجهات'
        ]
      },
      {
        id: 'step2',
        title: 'إنشاء ملف المركبة',
        description: 'بدء إضافة المركبة في النظام',
        icon: Plus,
        color: 'text-green-500',
        detailedSteps: [
          'اذهب إلى الأسطول > إضافة مركبة',
          'أدخل رقم اللوحة',
          'أدخل رقم الشاسيه (VIN)',
          'اختر الماركة والموديل وسنة الصنع',
          'اختر الفئة (اقتصادية، متوسطة، فاخرة)',
          'أدخل اللون ونوع الوقود والناقل'
        ],
        relatedPath: '/fleet'
      },
      {
        id: 'step3',
        title: 'بيانات التشغيل',
        description: 'المعلومات الفنية والتشغيلية',
        icon: Wrench,
        color: 'text-orange-500',
        detailedSteps: [
          'أدخل قراءة العداد الحالية',
          'حدد تاريخ الصيانة القادمة',
          'أدخل سعر الإيجار اليومي',
          'أدخل سعر الإيجار الأسبوعي (اختياري)',
          'أدخل سعر الإيجار الشهري (اختياري)'
        ]
      },
      {
        id: 'step4',
        title: 'بيانات التأمين والترخيص',
        description: 'معلومات التأمين وانتهاء الاستمارة',
        icon: Shield,
        color: 'text-purple-500',
        detailedSteps: [
          'أدخل رقم بوليصة التأمين',
          'أدخل تاريخ انتهاء التأمين',
          'أدخل تاريخ انتهاء الاستمارة',
          'أدخل تاريخ انتهاء الفحص الفني'
        ],
        tips: [
          'النظام سينبهك قبل انتهاء أي منها بـ 30 يوم'
        ]
      },
      {
        id: 'step5',
        title: 'رفع الصور والوثائق',
        description: 'إرفاق الصور والمستندات',
        icon: Download,
        color: 'text-teal-500',
        detailedSteps: [
          'ارفع صور المركبة (4 جهات على الأقل)',
          'ارفع صورة الاستمارة',
          'ارفع صورة التأمين',
          'ارفع صورة الفحص الفني'
        ]
      },
      {
        id: 'step6',
        title: 'مراجعة وحفظ',
        description: 'مراجعة البيانات وتفعيل المركبة',
        icon: CheckCircle,
        color: 'text-green-600',
        detailedSteps: [
          'راجع جميع البيانات المدخلة',
          'تأكد من صحة الأرقام',
          'انقر على "حفظ المركبة"',
          'ستصبح المركبة متاحة للتأجير'
        ]
      }
    ]
  }
];

// ==========================================
// المكون الرئيسي
// ==========================================

export default function UserGuide() {
  const navigate = useNavigate();
  const [selectedWorkflow, setSelectedWorkflow] = useState<DailyWorkflow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleSelectWorkflow = (workflow: DailyWorkflow) => {
    setSelectedWorkflow(workflow);
    setCurrentStepIndex(0);
  };

  const handleNextStep = () => {
    if (selectedWorkflow && currentStepIndex < selectedWorkflow.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'سهل': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'متوسط': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'متقدم': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-3">
          <BookOpen className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">دليل سير العمل اليومي</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          دليل تفصيلي خطوة بخطوة لإتمام المهام اليومية في نظام Fleetify
        </p>
        <Button variant="outline" onClick={() => navigate('/help')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة لمركز المساعدة
        </Button>
      </div>

      {!selectedWorkflow ? (
        // ==========================================
        // قائمة سير العمل
        // ==========================================
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dailyWorkflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary"
              onClick={() => handleSelectWorkflow(workflow)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`${workflow.color} w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <workflow.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{workflow.title}</CardTitle>
                    <CardDescription className="text-base">{workflow.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {workflow.duration}
                  </Badge>
                  <Badge className={getDifficultyColor(workflow.difficulty)}>
                    {workflow.difficulty}
                  </Badge>
                  <Badge variant="secondary">
                    {workflow.steps.length} خطوات
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>الخطوات: </span>
                  <div className="flex gap-1 mr-2">
                    {workflow.steps.slice(0, 5).map((_, idx) => (
                      <CircleDot key={idx} className="h-3 w-3" />
                    ))}
                    {workflow.steps.length > 5 && <span>+{workflow.steps.length - 5}</span>}
                  </div>
                </div>
                <Button variant="ghost" className="w-full mt-4 group">
                  ابدأ الدليل
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // ==========================================
        // عرض خطوات سير العمل
        // ==========================================
        <div className="space-y-6">
          {/* Header */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedWorkflow(null)}>
                    <ArrowRight className="h-4 w-4 ml-2" />
                    العودة
                  </Button>
                  <Separator orientation="vertical" className="h-8" />
                  <div className={`${selectedWorkflow.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <selectedWorkflow.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedWorkflow.title}</h2>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{selectedWorkflow.duration}</Badge>
                      <Badge className={getDifficultyColor(selectedWorkflow.difficulty)}>
                        {selectedWorkflow.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-primary">
                    {currentStepIndex + 1} / {selectedWorkflow.steps.length}
                  </p>
                  <p className="text-sm text-muted-foreground">الخطوة الحالية</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Progress */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {selectedWorkflow.steps.map((step, idx) => (
              <Button
                key={step.id}
                variant={idx === currentStepIndex ? 'default' : idx < currentStepIndex ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setCurrentStepIndex(idx)}
                className="flex-shrink-0 gap-2"
              >
                {idx < currentStepIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : idx === currentStepIndex ? (
                  <CircleDot className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span className="hidden md:inline">{step.title}</span>
                <span className="md:hidden">{idx + 1}</span>
              </Button>
            ))}
          </div>

          {/* Current Step */}
          {selectedWorkflow.steps[currentStepIndex] && (
            <Card className="border-2">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center`}>
                    {React.createElement(selectedWorkflow.steps[currentStepIndex].icon, {
                      className: `h-6 w-6 ${selectedWorkflow.steps[currentStepIndex].color}`
                    })}
                  </div>
                  <div>
                    <Badge className="mb-2">الخطوة {currentStepIndex + 1}</Badge>
                    <CardTitle className="text-2xl">{selectedWorkflow.steps[currentStepIndex].title}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {selectedWorkflow.steps[currentStepIndex].description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Detailed Steps */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    الخطوات التفصيلية:
                  </h4>
                  <div className="space-y-3">
                    {selectedWorkflow.steps[currentStepIndex].detailedSteps.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <p>{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                {selectedWorkflow.steps[currentStepIndex].tips && selectedWorkflow.steps[currentStepIndex].tips!.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      نصائح مفيدة:
                    </h4>
                    <div className="space-y-2">
                      {selectedWorkflow.steps[currentStepIndex].tips!.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <Star className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {selectedWorkflow.steps[currentStepIndex].warnings && selectedWorkflow.steps[currentStepIndex].warnings!.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      تحذيرات هامة:
                    </h4>
                    <div className="space-y-2">
                      {selectedWorkflow.steps[currentStepIndex].warnings!.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700 dark:text-red-300">{warning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Path */}
                {selectedWorkflow.steps[currentStepIndex].relatedPath && (
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(selectedWorkflow.steps[currentStepIndex].relatedPath!)}
                    className="gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    اذهب إلى الصفحة المرتبطة
                  </Button>
                )}
              </CardContent>

              {/* Navigation */}
              <div className="border-t p-4 flex items-center justify-between bg-muted/30">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className="gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  الخطوة السابقة
                </Button>

                <div className="flex items-center gap-2">
                  {selectedWorkflow.steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentStepIndex ? 'bg-primary' : idx < currentStepIndex ? 'bg-primary/50' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                {currentStepIndex < selectedWorkflow.steps.length - 1 ? (
                  <Button onClick={handleNextStep} className="gap-2">
                    الخطوة التالية
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => setSelectedWorkflow(null)} className="gap-2 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" />
                    إنهاء الدليل
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Quick Tips Section */}
      {!selectedWorkflow && (
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-purple-500/5 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              نصائح سريعة للعمل اليومي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Search, text: 'استخدم Ctrl+K للبحث السريع في أي مكان', color: 'text-blue-500' },
                { icon: Plus, text: 'زر + في أسفل الشاشة للإجراءات السريعة', color: 'text-green-500' },
                { icon: Bell, text: 'تابع التنبيهات يومياً لتجنب التأخير', color: 'text-orange-500' },
                { icon: Printer, text: 'اطبع نسختين من كل عقد دائماً', color: 'text-purple-500' },
                { icon: Download, text: 'صدّر التقارير نهاية كل أسبوع', color: 'text-teal-500' },
                { icon: Shield, text: 'تأكد من صلاحية الوثائق قبل التعاقد', color: 'text-red-500' }
              ].map((tip, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                  <tip.icon className={`h-5 w-5 ${tip.color} flex-shrink-0`} />
                  <p className="text-sm">{tip.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
