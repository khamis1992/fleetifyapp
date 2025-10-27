import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveCard } from './InteractiveCard';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/auth');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-64 h-64 bg-gradient-primary rounded-full opacity-10 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 30, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-accent rounded-full opacity-10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-gradient-primary/10 px-4 py-2 rounded-full border border-primary/20"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="arabic-body-sm font-medium text-primary">نظام ERP متكامل لجميع القطاعات</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="arabic-heading-xl text-right text-container"
            >
              <span className="block">نظام إدارة شامل</span>
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                لجميع أنواع الأعمال
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="arabic-body-lg text-muted-foreground max-w-2xl text-right text-container"
            >
              منصة ERP متطورة تدعم 10 قطاعات مختلفة مع حلول مخصصة
              لتأجير السيارات، العقارات، التجزئة، الطب، التصنيع، والمزيد.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg" 
                onClick={handleLoginClick}
                className="arabic-body px-8 py-6 group transition-all duration-300 hover:scale-105"
              >
                تسجيل الدخول
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/demo-trial')}
                className="arabic-body px-8 py-6 group transition-all duration-300 hover:scale-105 border-2 border-primary/30 hover:bg-primary/5"
              >
                <Rocket className="h-5 w-5 ml-2" />
                تجربة مجانية
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center space-x-8 arabic-body-sm text-muted-foreground"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span>تجربة مجانية لـ 14 يوم</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>لا حاجة لبطاقة ائتمان</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span>إعداد في 5 دقائق</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Interactive Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <InteractiveCard className="p-0 overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-background via-background/50 to-muted/30 p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="arabic-heading-sm text-container">لوحة تحكم ERP</h3>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-destructive rounded-full" />
                      <div className="w-3 h-3 bg-warning rounded-full" />
                      <div className="w-3 h-3 bg-success rounded-full" />
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'الشركات النشطة', value: '156', color: 'bg-primary' },
                      { label: 'الإيرادات الشهرية', value: '€124K', color: 'bg-success' },
                      { label: 'المعاملات', value: '2,847', color: 'bg-accent' },
                      { label: 'النمو', value: '+12%', color: 'bg-warning' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                        className="p-4 bg-card/50 rounded-lg border border-border/30"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 ${stat.color} rounded-full`} />
                          <span className="arabic-body-sm text-muted-foreground text-container">{stat.label}</span>
                        </div>
                        <p className="arabic-body font-bold mt-1 text-container">{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Chart Area */}
                  <div className="h-20 bg-muted/30 rounded-lg flex items-end space-x-1 p-2">
                    {Array.from({ length: 12 }, (_, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.random() * 100}%` }}
                        transition={{ duration: 0.8, delay: 1 + i * 0.05 }}
                        className="flex-1 bg-gradient-primary rounded-sm opacity-60"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </InteractiveCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}