import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Zap,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

export function PremiumHero() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const benefits = [
    { icon: CheckCircle2, text: 'تجربة مجانية 14 يوم' },
    { icon: Shield, text: 'لا حاجة لبطاقة ائتمانية' },
    { icon: Zap, text: 'إعداد في 5 دقائق' },
  ];

  return (
    <section 
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />
      
      {/* Floating Gradient Orbs */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 opacity-30"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-primary rounded-full blur-3xl opacity-20"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-accent rounded-full blur-3xl opacity-20"
        />
      </motion.div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            style={{ opacity }}
            className="space-y-8 text-right"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge 
                variant="outline" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary/10 border-primary/20 hover:bg-gradient-primary/20 transition-all"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">نظام ERP المتكامل رقم 1 في المنطقة</span>
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
            >
              <span className="block text-foreground">نظام إدارة شامل</span>
              <span className="block bg-gradient-to-l from-primary via-primary to-accent bg-clip-text text-transparent">
                لتحويل أعمالك رقمياً
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl"
            >
              منصة ERP سحابية متطورة تدعم 10+ قطاعات مختلفة
              مع حلول مخصصة للمحاسبة، المخزون، العملاء، والمزيد
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-7 group shadow-elevated hover:shadow-glow transition-all"
              >
                ابدأ تجربتك المجانية الآن
                <ArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-lg px-8 py-7 hover:bg-accent/10"
              >
                استكشف الميزات
              </Button>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-6 pt-4"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                    <benefit.icon className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-muted-foreground">{benefit.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Interactive Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-3xl" />
            
            {/* Main Card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-elevated"
            >
              {/* Window Controls */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icon: TrendingUp, label: 'الإيرادات', value: '€124K', change: '+12%', color: 'text-success' },
                  { icon: Users, label: 'العملاء', value: '2,847', change: '+8%', color: 'text-primary' },
                  { icon: Zap, label: 'المعاملات', value: '15.2K', change: '+23%', color: 'text-accent' },
                  { icon: TrendingUp, label: 'النمو', value: '156%', change: '+45%', color: 'text-warning' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 rounded-xl transition-opacity" />
                    <div className="relative p-4 bg-background/50 rounded-xl border border-border/30 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        <span className={`text-xs font-medium ${stat.color}`}>{stat.change}</span>
                      </div>
                      <p className="text-2xl font-bold mb-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart Simulation */}
              <div className="h-32 bg-muted/20 rounded-xl p-4 flex items-end gap-1">
                {Array.from({ length: 20 }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ 
                      height: `${Math.random() * 80 + 20}%`,
                    }}
                    transition={{
                      duration: 1,
                      delay: 1 + i * 0.05,
                      repeat: Infinity,
                      repeatType: "reverse",
                      repeatDelay: 3
                    }}
                    className="flex-1 bg-gradient-primary rounded-sm opacity-70"
                  />
                ))}
              </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{ 
                y: [0, -20, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -right-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">نظام آلي بالكامل</p>
                  <p className="text-xs text-muted-foreground">وفر 40+ ساعة شهرياً</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ 
                y: [0, 15, 0],
                rotate: [0, -3, 0]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">آمن 100%</p>
                  <p className="text-xs text-muted-foreground">تشفير من الدرجة البنكية</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-primary/30 rounded-full flex items-start justify-center p-2"
        >
          <motion.div 
            className="w-1.5 h-1.5 bg-primary rounded-full"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

