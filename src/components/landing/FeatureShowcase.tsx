import { motion } from 'framer-motion';
import { Building2, Calculator, Users, BarChart3, Shield, Zap } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const features = [
  {
    icon: Calculator,
    title: 'النظام المحاسبي',
    description: 'نظام محاسبي متكامل مع إدارة الميزانية والتقارير المالية المتقدمة',
    color: 'hsl(var(--primary))',
    benefits: ['محاسبة مزدوجة', 'تقارير مالية', 'إدارة الضرائب']
  },
  {
    icon: Users,
    title: 'إدارة العملاء والموردين',
    description: 'إدارة شاملة لقاعدة العملاء والموردين مع تتبع المعاملات',
    color: 'hsl(var(--accent))',
    benefits: ['ملفات العملاء', 'تتبع المدفوعات', 'تحليل العلاقات']
  },
  {
    icon: Building2,
    title: 'إدارة المخزون',
    description: 'تتبع المخزون المتقدم مع الإنذارات والتنبؤ بالطلب',
    color: 'hsl(var(--success))',
    benefits: ['تتبع المخزون', 'إدارة المستودعات', 'تحسين المشتريات']
  },
  {
    icon: BarChart3,
    title: 'التحليلات والتقارير',
    description: 'ذكاء أعمال متطور مع تحليلات تنبؤية ولوحات تحكم تفاعلية',
    color: 'hsl(var(--warning))',
    benefits: ['رؤى تنبؤية', 'لوحات مخصصة', 'مؤشرات الأداء']
  },
  {
    icon: Shield,
    title: 'الأمان والامتثال',
    description: 'أمان على مستوى المؤسسات مع التشفير المتقدم والامتثال للمعايير',
    color: 'hsl(var(--destructive))',
    benefits: ['تشفير متقدم', 'امتثال المعايير', 'صلاحيات متقدمة']
  },
  {
    icon: Zap,
    title: 'الأتمتة الذكية',
    description: 'أتمتة العمليات التجارية مع سير العمل الذكي والإشعارات التلقائية',
    color: 'hsl(var(--primary))',
    benefits: ['سير عمل ذكي', 'إشعارات تلقائية', 'تحسين الأداء']
  }
];

export function FeatureShowcase() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
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
          <h2 className="arabic-heading-lg mb-6 bg-gradient-primary bg-clip-text text-transparent text-center text-container">
            حلول ERP متكاملة
          </h2>
          <p className="arabic-body-lg text-muted-foreground max-w-3xl mx-auto text-center text-container">
            نظام إدارة أعمال شامل يغطي جميع احتياجات مؤسستك مع وحدات مخصصة لكل قطاع
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <InteractiveCard glowColor={feature.color} className="h-full">
                <div className="space-y-4">
                  <div 
                    className="inline-flex p-3 rounded-lg"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon 
                      className="h-6 w-6"
                      style={{ color: feature.color }}
                    />
                  </div>
                  
                  <h3 className="arabic-heading-sm text-container">{feature.title}</h3>
                  <p className="arabic-body text-muted-foreground text-container">{feature.description}</p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center arabic-body-sm">
                        <div 
                          className="w-1.5 h-1.5 rounded-full mr-2"
                          style={{ backgroundColor: feature.color }}
                        />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}