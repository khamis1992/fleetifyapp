import { motion } from 'framer-motion';
import { TrendingUp, Users, Building2, Globe } from 'lucide-react';

export function StatsSection() {
  const stats = [
    {
      icon: Building2,
      value: '500+',
      label: 'شركة تستخدم النظام',
      suffix: 'شركة',
      color: 'text-primary'
    },
    {
      icon: Users,
      value: '50K+',
      label: 'مستخدم نشط يومياً',
      suffix: 'مستخدم',
      color: 'text-success'
    },
    {
      icon: TrendingUp,
      value: '€2.5M+',
      label: 'معاملات شهرية',
      suffix: 'معاملة',
      color: 'text-accent'
    },
    {
      icon: Globe,
      value: '15+',
      label: 'دولة حول العالم',
      suffix: 'دولة',
      color: 'text-warning'
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-background to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              أرقام تتحدث عن نفسها
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            انضم لآلاف الشركات التي تثق في نظامنا لإدارة أعمالها
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Hover Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 blur-xl rounded-2xl transition-opacity duration-500`} />
              
              <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:shadow-elevated">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-primary/10 mb-4`}>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                
                <motion.div
                  initial={{ scale: 1 }}
                  whileInView={{ scale: [1, 1.1, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="mb-2"
                >
                  <h3 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {stat.value}
                  </h3>
                </motion.div>
                
                <p className="text-muted-foreground font-medium">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8"
        >
          {[
            'ISO 27001 معتمد',
            'GDPR متوافق',
            'دعم 24/7',
            '99.9% وقت التشغيل',
          ].map((badge, index) => (
            <motion.div
              key={badge}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-2 px-4 py-2 bg-card/30 backdrop-blur-sm border border-border/30 rounded-full"
            >
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">
                {badge}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

