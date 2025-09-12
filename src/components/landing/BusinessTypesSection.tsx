import { motion } from 'framer-motion';
import { 
  Car, Building, ShoppingBag, Heart, Factory, 
  ChefHat, Truck, GraduationCap, Users, HardHat 
} from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const businessTypes = [
  {
    icon: Car,
    title: 'تأجير السيارات',
    title_en: 'Car Rental',
    description: 'إدارة أسطول السيارات، الحجوزات، والصيانة',
    color: 'hsl(var(--primary))',
    modules: ['إدارة الأسطول', 'الحجوزات', 'العقود', 'الصيانة']
  },
  {
    icon: Building,
    title: 'العقارات',
    title_en: 'Real Estate',
    description: 'إدارة الممتلكات، المستأجرين، والصيانة',
    color: 'hsl(var(--accent))',
    modules: ['إدارة الممتلكات', 'المستأجرين', 'عقود الإيجار', 'الصيانة']
  },
  {
    icon: ShoppingBag,
    title: 'التجزئة',
    title_en: 'Retail',
    description: 'إدارة المخزون، المبيعات، ونقاط البيع',
    color: 'hsl(var(--success))',
    modules: ['نقاط البيع', 'إدارة المخزون', 'المبيعات', 'الموردين']
  },
  {
    icon: Heart,
    title: 'الرعاية الطبية',
    title_en: 'Medical',
    description: 'إدارة المرضى، المواعيد، والسجلات الطبية',
    color: 'hsl(var(--destructive))',
    modules: ['إدارة المرضى', 'المواعيد', 'السجلات الطبية', 'الفواتير']
  },
  {
    icon: Factory,
    title: 'التصنيع',
    title_en: 'Manufacturing',
    description: 'إدارة الإنتاج، المواد الخام، وسلسلة التوريد',
    color: 'hsl(var(--warning))',
    modules: ['إدارة الإنتاج', 'المواد الخام', 'مراقبة الجودة', 'التوريد']
  },
  {
    icon: ChefHat,
    title: 'المطاعم',
    title_en: 'Restaurant',
    description: 'إدارة القوائم، الطلبات، والمطبخ',
    color: 'hsl(var(--primary))',
    modules: ['إدارة القوائم', 'الطلبات', 'المطبخ', 'التوصيل']
  },
  {
    icon: Truck,
    title: 'اللوجستيات',
    title_en: 'Logistics',
    description: 'إدارة الشحن، المخازن، والتوزيع',
    color: 'hsl(var(--accent))',
    modules: ['إدارة الشحن', 'المخازن', 'التوزيع', 'التتبع']
  },
  {
    icon: GraduationCap,
    title: 'التعليم',
    title_en: 'Education',
    description: 'إدارة الطلاب، المناهج، والدرجات',
    color: 'hsl(var(--success))',
    modules: ['إدارة الطلاب', 'المناهج', 'الدرجات', 'الجداول']
  },
  {
    icon: Users,
    title: 'الاستشارات',
    title_en: 'Consulting',
    description: 'إدارة المشاريع، العملاء، والفواتير',
    color: 'hsl(var(--warning))',
    modules: ['إدارة المشاريع', 'تتبع الوقت', 'العملاء', 'الفواتير']
  },
  {
    icon: HardHat,
    title: 'البناء',
    title_en: 'Construction',
    description: 'إدارة المشاريع، المقاولين، والموارد',
    color: 'hsl(var(--destructive))',
    modules: ['إدارة المشاريع', 'المقاولين', 'الموارد', 'الجدولة']
  }
];

export function BusinessTypesSection() {
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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
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
            قطاعات الأعمال المدعومة
          </h2>
          <p className="arabic-body-lg text-muted-foreground max-w-3xl mx-auto text-center text-container">
            حلول مخصصة لأكثر من 10 قطاعات مختلفة مع وحدات متخصصة لكل نوع عمل
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
        >
          {businessTypes.map((business, index) => (
            <motion.div key={business.title} variants={itemVariants}>
              <InteractiveCard glowColor={business.color} className="h-full">
                <div className="space-y-4 text-center">
                  <div 
                    className="inline-flex p-4 rounded-lg mx-auto"
                    style={{ backgroundColor: `${business.color}15` }}
                  >
                    <business.icon 
                      className="h-8 w-8"
                      style={{ color: business.color }}
                    />
                  </div>
                  
                  <div>
                    <h3 className="arabic-heading-sm text-container mb-2">{business.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{business.title_en}</p>
                    <p className="arabic-body-sm text-muted-foreground text-container">{business.description}</p>
                  </div>
                  
                  <div className="space-y-1">
                    {business.modules.map((module, i) => (
                      <div key={i} className="flex items-center justify-center arabic-body-sm">
                        <div 
                          className="w-1 h-1 rounded-full mr-2"
                          style={{ backgroundColor: business.color }}
                        />
                        <span className="text-xs">{module}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="arabic-body text-muted-foreground max-w-2xl mx-auto text-container">
            لا تجد قطاع عملك؟ نظامنا مرن ويمكن تخصيصه ليناسب أي نوع عمل. 
            <span className="text-primary font-medium"> تواصل معنا لحل مخصص</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}