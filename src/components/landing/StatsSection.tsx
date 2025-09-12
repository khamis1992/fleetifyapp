import { motion } from 'framer-motion';
import { TrendingUp, Users, MapPin, Award } from 'lucide-react';

const stats = [
  {
    icon: Users,
    number: '50,000+',
    label: 'عميل نشط',
    description: 'يثقون في نظامنا يومياً'
  },
  {
    icon: MapPin,
    number: '25+',
    label: 'دولة',
    description: 'نخدمها حول العالم'
  },
  {
    icon: TrendingUp,
    number: '99.9%',
    label: 'وقت التشغيل',
    description: 'موثوقية عالية'
  },
  {
    icon: Award,
    number: '15+',
    label: 'عام خبرة',
    description: 'في تطوير أنظمة ERP'
  }
];

export function StatsSection() {
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
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="arabic-heading-lg mb-4 bg-gradient-primary bg-clip-text text-transparent text-center">
            أرقام تتحدث عن نجاحنا
          </h2>
          <p className="arabic-body-lg text-muted-foreground max-w-2xl mx-auto text-center">
            شركات من جميع الأحجام تعتمد على نظامنا لإدارة أعمالها بكفاءة
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="text-center group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-xl mb-4 group-hover:shadow-lg transition-shadow"
              >
                <stat.icon className="h-8 w-8 text-primary-foreground" />
              </motion.div>
              
              <motion.h3
                initial={{ scale: 0.5 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2"
              >
                {stat.number}
              </motion.h3>
              
              <h4 className="arabic-heading-sm mb-2 text-container">{stat.label}</h4>
              <p className="arabic-body-sm text-muted-foreground text-container">{stat.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}