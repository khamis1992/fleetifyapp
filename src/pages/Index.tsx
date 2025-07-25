import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Car, Users, FileText, Shield, BarChart3, ArrowLeft } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Car,
      title: 'إدارة الأسطول',
      description: 'إدارة شاملة لجميع المركبات مع تتبع الحالة والصيانة'
    },
    {
      icon: FileText,
      title: 'نظام العقود',
      description: 'إنشاء وإدارة عقود الإيجار بطريقة احترافية ومنظمة'
    },
    {
      icon: Users,
      title: 'إدارة العملاء',
      description: 'قاعدة بيانات متكاملة للعملاء مع سجل شامل'
    },
    {
      icon: BarChart3,
      title: 'التقارير المالية',
      description: 'تقارير مالية تفصيلية ومؤشرات أداء متقدمة'
    },
    {
      icon: Shield,
      title: 'الأمان والحماية',
      description: 'نظام أمان متقدم مع صلاحيات مخصصة لكل مستخدم'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-soft to-accent-muted" dir="rtl">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-8 shadow-glow">
              <Car className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent">
                KW RentFlow
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              نظام إدارة تأجير السيارات الأكثر تطوراً في الكويت
            </p>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
              حلول شاملة ومتكاملة لإدارة شركات تأجير السيارات مع دعم كامل لمتطلبات السوق الكويتي
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="text-lg px-8 py-4 h-auto">
                <Link to="/auth">
                  ابدأ الآن
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 h-auto">
                <Link to="/auth">
                  تسجيل الدخول
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-card rounded-2xl shadow-card hover:shadow-elevated transition-all duration-300 border-0"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="bg-gradient-primary p-8 rounded-3xl text-center text-primary-foreground shadow-elevated">
            <h2 className="text-2xl font-bold mb-8">لماذا تختار KW RentFlow؟</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-accent mb-2">100%</div>
                <div className="text-primary-foreground/80">متوافق مع القوانين الكويتية</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">24/7</div>
                <div className="text-primary-foreground/80">دعم فني متواصل</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">Multi-Tenant</div>
                <div className="text-primary-foreground/80">دعم عدة شركات</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-primary-foreground/80">
            © 2024 KW RentFlow - جميع الحقوق محفوظة | مطور خصيصاً للسوق الكويتي
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
