import { motion } from 'framer-motion';
import { BarChart3, Users, TrendingUp, Calendar, DollarSign, MapPin } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

export function DashboardPreview() {
  const mockData = [
    { label: 'إجمالي الإيرادات', value: '€524,300', icon: DollarSign, change: '+18%' },
    { label: 'الشركات النشطة', value: '2,847', icon: Users, change: '+12%' },
    { label: 'معدل النمو', value: '94.2%', icon: TrendingUp, change: '+8%' },
    { label: 'المعاملات اليومية', value: '1,256', icon: Calendar, change: '+24%' },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent text-center">
            لوحة تحكم ERP متقدمة
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-center">
            راقب جميع جوانب عملك من مكان واحد مع تحليلات شاملة ومؤشرات أداء متقدمة
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {mockData.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <InteractiveCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-sm text-success font-medium">
                      {item.change}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <InteractiveCard className="max-w-4xl mx-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">أداء النظام الشامل</h3>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">مراقبة مباشرة</span>
                </div>
              </div>
              
              {/* Mock Chart */}
              <div className="h-48 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg flex items-center justify-center relative overflow-hidden">
                <BarChart3 className="h-16 w-16 text-primary/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform translate-x-[-100%] animate-shimmer" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">847</p>
                  <p className="text-sm text-muted-foreground">الشركات المسجلة</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">99.9%</p>
                  <p className="text-sm text-muted-foreground">وقت التشغيل</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">€1.2M</p>
                  <p className="text-sm text-muted-foreground">المعاملات الشهرية</p>
                </div>
              </div>
            </div>
          </InteractiveCard>
        </motion.div>
      </div>
    </section>
  );
}