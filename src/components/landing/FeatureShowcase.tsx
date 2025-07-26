import { motion } from 'framer-motion';
import { Truck, Users, DollarSign, BarChart3, Shield, Zap } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const features = [
  {
    icon: Truck,
    title: 'Fleet Management',
    description: 'Complete vehicle tracking, maintenance scheduling, and route optimization',
    color: 'hsl(var(--primary))',
    benefits: ['Real-time GPS tracking', 'Predictive maintenance', 'Fuel optimization']
  },
  {
    icon: Users,
    title: 'HR Management',
    description: 'Streamlined employee management with attendance tracking and payroll',
    color: 'hsl(var(--accent))',
    benefits: ['Digital attendance', 'Automated payroll', 'Performance analytics']
  },
  {
    icon: DollarSign,
    title: 'Financial Control',
    description: 'Advanced accounting features with real-time financial reporting',
    color: 'hsl(var(--success))',
    benefits: ['Real-time reporting', 'Budget tracking', 'Invoice automation']
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Powerful business intelligence with predictive analytics',
    color: 'hsl(var(--warning))',
    benefits: ['Predictive insights', 'Custom dashboards', 'KPI monitoring']
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade security with advanced encryption and compliance',
    color: 'hsl(var(--destructive))',
    benefits: ['End-to-end encryption', 'GDPR compliance', 'Role-based access']
  },
  {
    icon: Zap,
    title: 'Automation',
    description: 'Intelligent automation to streamline your business processes',
    color: 'hsl(var(--primary))',
    benefits: ['Workflow automation', 'Smart notifications', 'Process optimization']
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Everything You Need to Scale
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive business management tools designed for modern enterprises
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