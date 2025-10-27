/**
 * Demo Trial Page
 * Allows users to access demo mode and try the system
 * without login credentials
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft, CheckCircle2, Clock, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signInToDemo } from '@/lib/demo';
import { cn } from '@/lib/utils';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const DemoTrial: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const features: Feature[] = [
    {
      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
      title: 'الوصول الكامل',
      description: 'جميع الميزات متاحة بدون أي قيود أو حدود',
    },
    {
      icon: <Clock className="h-5 w-5 text-primary" />,
      title: '7 أيام كاملة',
      description: 'فترة تجريبية كاملة لاستكشاف النظام بعناية',
    },
    {
      icon: <Zap className="h-5 w-5 text-primary" />,
      title: 'بيانات حقيقية',
      description: 'بيانات تجريبية واقعية تساعدك على فهم النظام',
    },
    {
      icon: <Shield className="h-5 w-5 text-primary" />,
      title: 'آمن وخاص',
      description: 'بياناتك آمنة وعزلة عن باقي المستخدمين',
    },
  ];

  const benefits = [
    'إدارة أسطول السيارات - تتبع المركبات والصيانة والعقود',
    'نظام مالي متكامل - فواتير وحسابات ودفعات',
    'إدارة العملاء - بيانات شاملة لكل عميل',
    'تقارير متقدمة - رؤى عميقة عن عملك',
    'نظام قانوني - استشارات وتتبع النزاعات',
    'وأكثر من 100 ميزة أخرى',
  ];

  const handleStartDemo = async () => {
    setIsLoading(true);
    try {
      const result = await signInToDemo();

      if (result.error) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء الوصول للنسخة التجريبية. يرجى المحاولة مرة أخرى.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: 'مرحباً بك!',
        description: 'لديك 7 أيام لتجربة جميع ميزات النظام مجاناً',
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Demo access error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/auth')}
          className="gap-2 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة للتسجيل
        </Button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold">تجربة Fleetify مجاناً</h1>
            <p className="text-xl text-muted-foreground">
              ابدأ رحلتك مع أفضل نظام لإدارة الأساطيل والعمليات
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={handleStartDemo}
              disabled={isLoading}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  جاري التحضير...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  ابدأ التجربة الآن
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              size="lg"
            >
              لديك حساب بالفعل؟ سجل دخول
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            🎉 بدون بريد إلكتروني • بدون كلمة مرور • بدون بطاقة ائتمان
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-primary/20 hover:border-primary/50 transition-colors">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  {feature.icon}
                  <h3 className="font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="mb-16 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>ما الذي ستحصل عليه في النسخة التجريبية؟</CardTitle>
            <CardDescription>
              وصول كامل إلى جميع ميزات Fleetify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="space-y-4 mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">أسئلة شائعة</h2>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">هل سأحتاج إلى بطاقة ائتمان؟</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              لا بالتأكيد! التجربة المجانية لا تتطلب أي بيانات دفع. ستتمكن من الوصول الكامل لمدة 7 أيام كاملة.
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">هل يمكن الحفاظ على بياناتي بعد انتهاء التجربة؟</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              نعم! إذا اخترت الاشتراك بعد التجربة، سيتم الحفاظ على جميع بياناتك وعملك. لا شيء يضيع.
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">متى ستنتهي التجربة المجانية؟</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              لديك 7 أيام كاملة من اليوم الذي تبدأ فيه التجربة. سنذكرك قبل انتهاء الفترة مباشرة.
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">هل هناك حد للبيانات التي يمكنني إدخالها؟</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              لا حدود على الإطلاق! استخدم النظام كما لو كان نسختك الخاصة. أضف عدد السيارات والعملاء والعقود التي تريدها.
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 pt-12 border-t border-border/50">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">هل أنت مستعد للبدء؟</h3>
            <p className="text-muted-foreground">
              انضم إلى الآلاف من مديري الأساطيل الذين يثقون في Fleetify
            </p>
          </div>

          <Button
            onClick={handleStartDemo}
            disabled={isLoading}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                جاري التحضير...
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                ابدأ التجربة الآن - بدون بطاقة ائتمان
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            أو{' '}
            <button
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline font-semibold"
            >
              سجل الدخول
            </button>
            {' '}إذا كان لديك حساب بالفعل
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Fleetify - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
};

export default DemoTrial;
