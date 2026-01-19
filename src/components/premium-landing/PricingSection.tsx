import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Sparkles, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function PricingSection() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'الأساسي',
      nameEn: 'Starter',
      description: 'مثالي للشركات الصغيرة والناشئة',
      icon: Zap,
      monthlyPrice: 49,
      yearlyPrice: 470,
      currency: '€',
      popular: false,
      color: 'from-blue-500 to-blue-600',
      features: [
        'حتى 3 مستخدمين',
        '10 GB تخزين سحابي',
        'المحاسبة الأساسية',
        'إدارة العملاء',
        'إدارة المخزون',
        'تقارير أساسية',
        'دعم عبر البريد',
        'تطبيق الجوال',
      ],
    },
    {
      name: 'الاحترافي',
      nameEn: 'Professional',
      description: 'الأفضل للشركات المتوسطة والمتنامية',
      icon: Crown,
      monthlyPrice: 99,
      yearlyPrice: 950,
      currency: '€',
      popular: true,
      color: 'from-purple-500 to-purple-600',
      features: [
        'حتى 10 مستخدمين',
        '50 GB تخزين سحابي',
        'جميع ميزات الأساسي',
        'محاسبة متقدمة',
        'تحليلات وذكاء اصطناعي',
        'أتمتة سير العمل',
        'تكاملات API',
        'دعم أولوية',
        'تدريب مجاني',
        'تقارير مخصصة',
      ],
    },
    {
      name: 'المؤسسي',
      nameEn: 'Enterprise',
      description: 'حلول مخصصة للشركات الكبرى',
      icon: Sparkles,
      monthlyPrice: null,
      yearlyPrice: null,
      currency: '€',
      popular: false,
      color: 'from-orange-500 to-orange-600',
      features: [
        'مستخدمين غير محدودين',
        'تخزين غير محدود',
        'جميع ميزات الاحترافي',
        'مدير حساب مخصص',
        'SLA 99.9%',
        'تخصيص كامل',
        'استضافة خاصة (اختياري)',
        'تدريب متقدم',
        'دعم 24/7',
        'تطوير مخصص',
        'استشارات مجانية',
      ],
    },
  ];

  const discount = billingPeriod === 'yearly' ? 20 : 0;

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-gradient-primary opacity-10 blur-3xl rounded-full" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-gradient-accent opacity-10 blur-3xl rounded-full" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4"
          >
            <Badge variant="outline" className="px-4 py-2 bg-gradient-primary/10 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary ml-2" />
              <span className="font-medium">خطط مرنة تناسب الجميع</span>
            </Badge>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              اختر الخطة المناسبة لك
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            ابدأ بتجربة مجانية لـ 14 يوم - لا حاجة لبطاقة ائتمان
          </p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 mt-8"
          >
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              شهري
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingPeriod === 'yearly' ? 'bg-gradient-primary' : 'bg-muted'
              }`}
            >
              <motion.div
                animate={{ x: billingPeriod === 'yearly' ? 28 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                سنوي
              </span>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                وفر 20%
              </Badge>
            </div>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative group ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
                >
                  <Badge className={`bg-gradient-to-r ${plan.color} text-white border-0 px-4 py-1 shadow-lg`}>
                    الأكثر شعبية ⭐
                  </Badge>
                </motion.div>
              )}

              {/* Glow Effect */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${plan.color} rounded-3xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500`} />

              {/* Card */}
              <div className={`relative h-full bg-card/50 backdrop-blur-sm border ${
                plan.popular ? 'border-primary/50 shadow-elevated' : 'border-border/50'
              } rounded-3xl p-8 hover:border-primary/30 transition-all duration-300`}>
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${plan.color} mb-4 shadow-lg`}>
                  <plan.icon className="h-6 w-6 text-white" />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-1">{plan.nameEn}</p>
                <p className="text-muted-foreground mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {billingPeriod === 'monthly' 
                            ? plan.monthlyPrice 
                            : Math.round(plan.yearlyPrice / 12)}
                        </span>
                        <span className="text-xl text-muted-foreground">{plan.currency}</span>
                        <span className="text-muted-foreground">/شهر</span>
                      </div>
                      {billingPeriod === 'yearly' && (
                        <p className="text-sm text-muted-foreground">
                          تُدفع {plan.yearlyPrice}€ سنوياً
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-3xl font-bold text-foreground mb-2">
                      تواصل معنا
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => navigate('/auth')}
                  className={`w-full mb-8 group ${
                    plan.popular
                      ? `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
                      : 'bg-accent/10 text-foreground hover:bg-accent/20'
                  } transition-all`}
                  size="lg"
                >
                  {plan.monthlyPrice ? 'ابدأ تجربتك المجانية' : 'تواصل مع المبيعات'}
                  <ArrowRight className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                {/* Features List */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground mb-4">
                    ما تحصل عليه:
                  </p>
                  {plan.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center mt-0.5`}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-4">
            جميع الخطط تشمل تجربة مجانية لـ 14 يوم وضمان استرداد لمدة 30 يوم
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>إلغاء في أي وقت</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>لا رسوم خفية</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>تحديثات مجانية</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <span>دعم فني متميز</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

