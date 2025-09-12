import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Award, Server, Users } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const securityFeatures = [
  {
    icon: Shield,
    title: 'تشفير متقدم',
    description: 'تشفير AES-256 لجميع البيانات أثناء النقل والتخزين',
    color: 'hsl(var(--primary))'
  },
  {
    icon: Lock,
    title: 'المصادقة متعددة العوامل',
    description: 'حماية إضافية مع المصادقة ثنائية العامل وSSO',
    color: 'hsl(var(--success))'
  },
  {
    icon: Eye,
    title: 'مراقبة مستمرة',
    description: 'مراقبة الأنشطة المشبوهة وتسجيل جميع العمليات',
    color: 'hsl(var(--warning))'
  },
  {
    icon: Server,
    title: 'خوادم آمنة',
    description: 'مراكز بيانات معتمدة ISO 27001 مع حماية فيزيائية',
    color: 'hsl(var(--accent))'
  },
  {
    icon: Users,
    title: 'إدارة الصلاحيات',
    description: 'تحكم دقيق في صلاحيات المستخدمين والوصول للبيانات',
    color: 'hsl(var(--destructive))'
  },
  {
    icon: Award,
    title: 'شهادات الامتثال',
    description: 'متوافق مع GDPR، SOC 2، ومعايير الأمان العالمية',
    color: 'hsl(var(--primary))'
  }
];

const certifications = [
  { name: 'ISO 27001', description: 'أمن المعلومات' },
  { name: 'SOC 2 Type II', description: 'أمان البيانات' },
  { name: 'GDPR', description: 'حماية البيانات الأوروبية' },
  { name: 'PCI DSS', description: 'أمان المدفوعات' }
];

export function SecuritySection() {
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
        duration: 0.6,
      },
    },
  };

  return (
    <section className="py-24 bg-muted/30 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full mb-6"
          >
            <Shield className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          
          <h2 className="arabic-heading-lg mb-6 bg-gradient-primary bg-clip-text text-transparent text-center">
            أمان على مستوى المؤسسات
          </h2>
          <p className="arabic-body-lg text-muted-foreground max-w-3xl mx-auto text-center">
            نحن نأخذ أمان بياناتك على محمل الجد. نظامنا محمي بأعلى معايير الأمان العالمية
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {securityFeatures.map((feature, index) => (
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
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-background rounded-2xl p-8 border border-border/50"
        >
          <div className="text-center mb-8">
            <h3 className="arabic-heading-md mb-4 text-center">شهادات الامتثال والأمان</h3>
            <p className="arabic-body text-muted-foreground text-center">
              نظامنا حاصل على أهم الشهادات العالمية في الأمان وحماية البيانات
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <motion.div
                key={cert.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="text-center p-6 rounded-xl bg-card border border-border/50 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Award className="h-6 w-6 text-primary-foreground" />
                </div>
                <h4 className="font-bold text-lg mb-2">{cert.name}</h4>
                <p className="arabic-body-sm text-muted-foreground text-container">{cert.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="arabic-body text-muted-foreground max-w-2xl mx-auto text-center">
            💚 نضمن أمان بياناتك بنسبة 99.9% • 🔒 نسخ احتياطية مشفرة كل ساعة • 📊 مراقبة مستمرة 24/7
          </p>
        </motion.div>
      </div>
    </section>
  );
}