import { motion } from 'framer-motion';
import {
  Calculator,
  Users,
  Package,
  BarChart3,
  Shield,
  Zap,
  Cloud,
  Smartphone,
  Lock,
  RefreshCw,
  Globe,
  Headphones,
} from 'lucide-react';

export function FeaturesGrid() {
  const features = [
    {
      icon: Calculator,
      title: 'المحاسبة المتقدمة',
      description: 'نظام محاسبي متكامل مع محاسبة مزدوجة، تقارير مالية، وإدارة ضرائب متطورة',
      color: 'from-blue-500 to-blue-600',
      benefits: ['دفتر الأستاذ', 'الميزانية', 'القوائم المالية', 'التقارير الضريبية']
    },
    {
      icon: Users,
      title: 'إدارة العملاء CRM',
      description: 'أدوات قوية لإدارة العملاء، تتبع التفاعلات، وبناء علاقات طويلة الأمد',
      color: 'from-purple-500 to-purple-600',
      benefits: ['ملفات العملاء', 'تتبع المبيعات', 'دعم العملاء', 'التحليلات']
    },
    {
      icon: Package,
      title: 'المخزون الذكي',
      description: 'تتبع مخزون لحظي مع إنذارات ذكية، تنبؤ بالطلب، وإدارة متعددة المستودعات',
      color: 'from-green-500 to-green-600',
      benefits: ['تتبع لحظي', 'تنبيهات ذكية', 'جرد آلي', 'تحليل الأداء']
    },
    {
      icon: BarChart3,
      title: 'تحليلات متقدمة',
      description: 'لوحات تحكم تفاعلية، تقارير مخصصة، ورؤى تنبؤية مدعومة بالذكاء الاصطناعي',
      color: 'from-orange-500 to-orange-600',
      benefits: ['ذكاء اصطناعي', 'تقارير مخصصة', 'KPIs', 'تنبؤات']
    },
    {
      icon: Shield,
      title: 'أمان على مستوى البنوك',
      description: 'تشفير متقدم، مصادقة ثنائية، صلاحيات دقيقة، ومراقبة أمنية مستمرة',
      color: 'from-red-500 to-red-600',
      benefits: ['تشفير AES-256', 'مصادقة ثنائية', 'نسخ احتياطي', 'مراقبة']
    },
    {
      icon: Zap,
      title: 'أتمتة العمليات',
      description: 'سير عمل ذكي، قواعد أعمال قابلة للتخصيص، وإشعارات تلقائية لتوفير الوقت',
      color: 'from-yellow-500 to-yellow-600',
      benefits: ['سير عمل آلي', 'إشعارات ذكية', 'قوالب جاهزة', 'جدولة']
    },
    {
      icon: Cloud,
      title: 'سحابي 100%',
      description: 'وصول من أي مكان، مزامنة فورية، نسخ احتياطي تلقائي، وتحديثات مستمرة',
      color: 'from-cyan-500 to-cyan-600',
      benefits: ['وصول عالمي', 'مزامنة', 'نسخ احتياطي', 'تحديثات']
    },
    {
      icon: Smartphone,
      title: 'تطبيقات الجوال',
      description: 'تطبيقات أصلية لـ iOS و Android مع جميع الميزات ومزامنة فورية',
      color: 'from-pink-500 to-pink-600',
      benefits: ['iOS & Android', 'دون اتصال', 'مزامنة', 'إشعارات']
    },
    {
      icon: Lock,
      title: 'خصوصية البيانات',
      description: 'GDPR متوافق، تحكم كامل في بياناتك، وحق النسيان والتصدير',
      color: 'from-indigo-500 to-indigo-600',
      benefits: ['GDPR', 'تشفير', 'استضافة آمنة', 'تحكم كامل']
    },
    {
      icon: RefreshCw,
      title: 'تكامل سلس',
      description: 'اتصال مع أدوات الأعمال المفضلة لديك عبر API قوي ومرن',
      color: 'from-teal-500 to-teal-600',
      benefits: ['REST API', 'Webhooks', 'تكاملات', 'مزامنة']
    },
    {
      icon: Globe,
      title: 'متعدد اللغات',
      description: 'دعم العربية والإنجليزية مع إمكانية إضافة لغات إضافية حسب الحاجة',
      color: 'from-violet-500 to-violet-600',
      benefits: ['عربي', 'إنجليزي', 'RTL', 'قابل للتوسع']
    },
    {
      icon: Headphones,
      title: 'دعم متميز',
      description: 'فريق دعم متخصص 24/7، قاعدة معرفية شاملة، وتدريب مجاني',
      color: 'from-rose-500 to-rose-600',
      benefits: ['دعم 24/7', 'تدريب', 'توثيق', 'مجتمع']
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary/10 border border-primary/20 rounded-full">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">ميزات متقدمة</span>
            </div>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              كل ما تحتاجه لإدارة أعمالك
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            منصة شاملة مع أكثر من 50 ميزة متقدمة لتحويل عملك رقمياً
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group"
            >
              <div className="relative h-full">
                {/* Glow Effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.color} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500`} />
                
                {/* Card */}
                <div className="relative h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-elevated">
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-4 shadow-lg`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Benefits */}
                  <div className="flex flex-wrap gap-1.5">
                    {feature.benefits.map((benefit, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-accent/10 text-foreground/70 rounded-md border border-border/30"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-6">
            هل تحتاج ميزة محددة لم تجدها؟
          </p>
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-elevated hover:shadow-glow transition-all"
          >
            تواصل معنا لحل مخصص
            <Zap className="h-4 w-4" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

