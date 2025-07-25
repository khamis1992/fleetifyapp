import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Car, Users, FileText, Shield, BarChart3, ArrowLeft, Crown } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary">
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
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-background">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-8 shadow-lg">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              KW RentFlow
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

            {/* Super Admin Access */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">للمطورين ومقدمي الخدمة</p>
              <Button asChild variant="outline" size="sm" className="gap-2 text-muted-foreground">
                <Link to="/super-admin">
                  <Crown className="w-4 h-4" />
                  دخول مزود الخدمة
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-card rounded-xl shadow-md hover:shadow-lg transition-smooth border border-border"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/15 transition-base">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="bg-card border border-border p-8 rounded-2xl text-center shadow-md">
            <h2 className="text-2xl font-semibold mb-8 text-foreground">لماذا تختار KW RentFlow؟</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">100%</div>
                <div className="text-muted-foreground">متوافق مع القوانين الكويتية</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-muted-foreground">دعم فني متواصل</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">Multi-Tenant</div>
                <div className="text-muted-foreground">دعم عدة شركات</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground py-8 mt-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sidebar-foreground/70">
            © 2024 KW RentFlow - جميع الحقوق محفوظة | مطور خصيصاً للسوق الكويتي
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
