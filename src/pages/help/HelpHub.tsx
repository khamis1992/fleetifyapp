import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  FileText,
  Users,
  DollarSign,
  Car,
  MessageSquare,
  Settings,
  BarChart3,
  HelpCircle,
  PlayCircle,
  Search,
  Download
} from 'lucide-react';

export default function HelpHub() {
  const navigate = useNavigate();

  const mainModules = [
    {
      id: 'dashboard',
      title: 'لوحة التحكم',
      description: 'نظرة شاملة على جميع العمليات والإحصائيات',
      icon: BarChart3,
      color: 'bg-indigo-500',
      path: '/help/dashboard',
      features: ['الإحصائيات', 'الإجراءات السريعة', 'الويدجت']
    },
    {
      id: 'contracts',
      title: 'إدارة العقود',
      description: 'دليل شامل لنظام العقود، الوضع السريع، والتعديلات',
      icon: FileText,
      color: 'bg-blue-500',
      path: '/help/contracts',
      features: ['الوضع السريع', 'نظام التعديلات', 'البحث والفلترة']
    },
    {
      id: 'customers',
      title: 'إدارة العملاء',
      description: 'تعلم كيفية إدارة قاعدة بيانات العملاء بكفاءة',
      icon: Users,
      color: 'bg-green-500',
      path: '/help/customers',
      features: ['الإضافة السريعة', 'سجل العقود', 'المدفوعات']
    },
    {
      id: 'finance',
      title: 'النظام المالي',
      description: 'المحاسبة، الفواتير، المدفوعات، ودفتر الأستاذ',
      icon: DollarSign,
      color: 'bg-purple-500',
      path: '/help/finance',
      features: ['الفواتير', 'دفتر الأستاذ', 'التقارير المالية']
    },
    {
      id: 'fleet',
      title: 'إدارة الأسطول',
      description: 'متابعة المركبات، الصيانة، والمخالفات',
      icon: Car,
      color: 'bg-orange-500',
      path: '/help/fleet',
      features: ['الصيانة', 'المخالفات', 'تصاريح الحركة']
    },
    {
      id: 'collections',
      title: 'نظام التحصيل',
      description: 'التذكيرات التلقائية وتحصيل المدفوعات',
      icon: MessageSquare,
      color: 'bg-pink-500',
      path: '/help/collections',
      features: ['تذكيرات واتساب', 'المتابعة التلقائية']
    }
  ];

  const quickLinks = [
    {
      title: 'دليل المستخدم الكامل',
      description: 'دليل شامل لجميع ميزات النظام',
      icon: BookOpen,
      path: '/help/user-guide',
      badge: 'شامل'
    },
    {
      title: 'البدء السريع',
      description: 'ابدأ باستخدام النظام في دقائق',
      icon: PlayCircle,
      path: '/help/getting-started',
      badge: 'للمبتدئين'
    },
    {
      title: 'الأسئلة الشائعة',
      description: 'إجابات للأسئلة المتكررة',
      icon: HelpCircle,
      path: '/help/faq',
      badge: 'مفيد'
    },
    {
      title: 'سير العمل اليومي',
      description: 'أمثلة عملية للعمليات اليومية',
      icon: Settings,
      path: '/help/workflows',
      badge: 'عملي'
    }
  ];

  const stats = [
    { label: 'وحدة رئيسية', value: '13+', icon: Settings },
    { label: 'ميزة متقدمة', value: '50+', icon: BarChart3 },
    { label: 'تقارير متاحة', value: '30+', icon: FileText },
    { label: 'دعم 24/7', value: '✓', icon: HelpCircle }
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            مركز المساعدة والدعم
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          دليلك الشامل لاستخدام نظام Fleetify بكفاءة وفعالية
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <stat.icon className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold text-primary">{stat.value}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث في الدليل... (مثال: كيفية إنشاء عقد)"
              className="flex-1 bg-transparent outline-none text-lg"
            />
            <Button>بحث</Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PlayCircle className="h-6 w-6 text-primary" />
          روابط سريعة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Card
              key={link.path}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary"
              onClick={() => navigate(link.path)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <link.icon className="h-8 w-8 text-primary" />
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {link.badge}
                  </span>
                </div>
                <CardTitle className="text-lg mt-2">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Modules */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          أدلة الوحدات الرئيسية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mainModules.map((module) => (
            <Card
              key={module.id}
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2 hover:border-primary group"
              onClick={() => navigate(module.path)}
            >
              <CardHeader>
                <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{module.title}</CardTitle>
                <CardDescription className="text-base">{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">المواضيع الرئيسية:</p>
                  <div className="flex flex-wrap gap-2">
                    {module.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground">
                  عرض الدليل ←
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Download className="h-6 w-6" />
            موارد إضافية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <Download className="h-5 w-5" />
            <span>تحميل دليل PDF</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <PlayCircle className="h-5 w-5" />
            <span>شاهد الفيديوهات التعليمية</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <HelpCircle className="h-5 w-5" />
            <span>اتصل بالدعم الفني</span>
          </Button>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="border-2 border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">هل تحتاج مساعدة إضافية؟</h3>
              <p className="text-muted-foreground">
                فريق الدعم الفني جاهز لمساعدتك على مدار الساعة
              </p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>📧 support@fleetify.com</span>
                <span>📱 +965 9999 9999</span>
              </div>
            </div>
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              تواصل معنا
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}