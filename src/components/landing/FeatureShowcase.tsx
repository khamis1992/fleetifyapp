import { motion } from 'framer-motion';
import { Truck, Users, DollarSign, BarChart3, Shield, Zap } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const features = [
  {
    icon: Truck,
    title: 'إدارة الأسطول',
    description: 'تتبع شامل للمركبات، جدولة الصيانة، وتحسين المسارات',
    color: 'hsl(var(--primary))',
    benefits: ['تتبع GPS مباشر', 'صيانة تنبؤية', 'تحسين الوقود']
  },
  {
    icon: Users,
    title: 'إدارة الموارد البشرية',
    description: 'إدارة الموظفين المبسطة مع تتبع الحضور وكشوف المرتبات',
    color: 'hsl(var(--accent))',
    benefits: ['حضور رقمي', 'كشوف مرتبات آلية', 'تحليلات الأداء']
  },
  {
    icon: DollarSign,
    title: 'التحكم المالي',
    description: 'ميزات محاسبية متقدمة مع تقارير مالية في الوقت الفعلي',
    color: 'hsl(var(--success))',
    benefits: ['تقارير فورية', 'تتبع الميزانية', 'أتمتة الفواتير']
  },
  {
    icon: BarChart3,
    title: 'التحليلات والرؤى',
    description: 'ذكاء أعمال قوي مع تحليلات تنبؤية',
    color: 'hsl(var(--warning))',
    benefits: ['رؤى تنبؤية', 'لوحات مخصصة', 'مراقبة مؤشرات الأداء']
  },
  {
    icon: Shield,
    title: 'أمان على مستوى المؤسسات',
    description: 'أمان بمستوى البنوك مع تشفير متقدم والامتثال',
    color: 'hsl(var(--destructive))',
    benefits: ['تشفير شامل', 'امتثال GDPR', 'وصول قائم على الأدوار']
  },
  {
    icon: Zap,
    title: 'الأتمتة',
    description: 'أتمتة ذكية لتبسيط عمليات عملك',
    color: 'hsl(var(--primary))',
    benefits: ['أتمتة سير العمل', 'إشعارات ذكية', 'تحسين العمليات']
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent text-center">
            كل ما تحتاجه للنمو
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-center">
            أدوات إدارة أعمال شاملة مصممة للمؤسسات الحديثة
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
                  
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center text-sm">
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