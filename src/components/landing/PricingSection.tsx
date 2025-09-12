import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveCard } from './InteractiveCard';

const plans = [
  {
    name: 'الأساسي',
    nameEn: 'Basic',
    price: '299',
    period: 'شهرياً',
    icon: Star,
    color: 'hsl(var(--accent))',
    popular: false,
    features: [
      'حتى 10 مستخدمين',
      'إدارة المخزون الأساسية',
      'التقارير الأساسية',
      'دعم عبر البريد الإلكتروني',
      'نسخ احتياطية يومية',
      'تطبيق موبايل'
    ]
  },
  {
    name: 'المتقدم',
    nameEn: 'Advanced',
    price: '599',
    period: 'شهرياً',
    icon: Zap,
    color: 'hsl(var(--primary))',
    popular: true,
    features: [
      'حتى 50 مستخدم',
      'جميع وحدات النظام',
      'تقارير متقدمة ولوحات تحكم',
      'دعم هاتفي وتشات مباشر',
      'API كامل للتكامل',
      'تدريب مجاني',
      'إدارة متعددة الفروع',
      'نسخ احتياطية كل ساعة'
    ]
  },
  {
    name: 'المؤسسي',
    nameEn: 'Enterprise',
    price: 'حسب الطلب',
    period: '',
    icon: Crown,
    color: 'hsl(var(--warning))',
    popular: false,
    features: [
      'مستخدمين غير محدودين',
      'تخصيص كامل للنظام',
      'مدير حساب مخصص',
      'SLA مضمون 99.9%',
      'خوادم مخصصة',
      'تكامل مع الأنظمة الحالية',
      'تدريب في الموقع',
      'دعم 24/7'
    ]
  }
];

export function PricingSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
      },
    },
  };

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="arabic-heading-lg mb-6 bg-gradient-primary bg-clip-text text-transparent text-center">
            خطط أسعار تناسب جميع الأحجام
          </h2>
          <p className="arabic-body-lg text-muted-foreground max-w-3xl mx-auto text-center">
            اختر الخطة المناسبة لحجم عملك مع إمكانية الترقية في أي وقت
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium arabic-body-sm z-10">
                  الأكثر شعبية
                </div>
              )}
              
              <InteractiveCard 
                glowColor={plan.color} 
                className={`h-full ${plan.popular ? 'ring-2 ring-primary/50' : ''}`}
              >
                <div className="p-8 space-y-6">
                  <div className="text-center">
                    <div 
                      className="inline-flex p-4 rounded-xl mb-4"
                      style={{ backgroundColor: `${plan.color}15` }}
                    >
                      <plan.icon 
                        className="h-8 w-8"
                        style={{ color: plan.color }}
                      />
                    </div>
                    
                    <h3 className="arabic-heading-sm mb-2 text-container">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.nameEn}</p>
                    
                    <div className="mb-6">
                      {plan.price === 'حسب الطلب' ? (
                        <div className="text-2xl font-bold text-container">{plan.price}</div>
                      ) : (
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold">{plan.price}</span>
                          <span className="text-xl font-medium mr-2">ر.س</span>
                          <span className="text-sm text-muted-foreground mr-2">{plan.period}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center arabic-body-sm">
                        <Check 
                          className="h-4 w-4 ml-3 flex-shrink-0"
                          style={{ color: plan.color }}
                        />
                        <span className="text-container">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full arabic-body ${plan.popular ? '' : 'variant-outline'}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.price === 'حسب الطلب' ? 'تواصل معنا' : 'ابدأ التجربة المجانية'}
                  </Button>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="arabic-body text-muted-foreground max-w-2xl mx-auto text-center">
            جميع الخطط تتضمن تجربة مجانية لمدة 14 يوم • لا توجد رسوم إعداد • إلغاء في أي وقت
          </p>
        </motion.div>
      </div>
    </section>
  );
}