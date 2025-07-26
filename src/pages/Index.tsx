import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Car, Users, FileText, Shield, BarChart3, ArrowLeft, Crown, 
  Zap, Trophy, Star, CheckCircle, Play, ChevronDown 
} from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const yRange = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const pathLength = useSpring(scrollYProgress, { stiffness: 400, damping: 40 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Car,
      title: 'إدارة الأسطول',
      description: 'إدارة شاملة لجميع المركبات مع تتبع الحالة والصيانة الذكية',
      color: 'from-blue-500 to-cyan-500',
      delay: 0.1
    },
    {
      icon: FileText,
      title: 'نظام العقود',
      description: 'إنشاء وإدارة عقود الإيجار بطريقة احترافية ومنظمة',
      color: 'from-purple-500 to-pink-500',
      delay: 0.2
    },
    {
      icon: Users,
      title: 'إدارة العملاء',
      description: 'قاعدة بيانات متكاملة للعملاء مع سجل شامل وتحليلات متقدمة',
      color: 'from-green-500 to-emerald-500',
      delay: 0.3
    },
    {
      icon: BarChart3,
      title: 'التقارير المالية',
      description: 'تقارير مالية تفصيلية ومؤشرات أداء متقدمة مع ذكاء اصطناعي',
      color: 'from-orange-500 to-red-500',
      delay: 0.4
    },
    {
      icon: Shield,
      title: 'الأمان والحماية',
      description: 'نظام أمان متقدم مع صلاحيات مخصصة وحماية من الجيل الثالث',
      color: 'from-indigo-500 to-purple-500',
      delay: 0.5
    },
    {
      icon: Zap,
      title: 'الأتمتة الذكية',
      description: 'أتمتة العمليات اليومية بتقنيات الذكاء الاصطناعي المتطورة',
      color: 'from-yellow-500 to-orange-500',
      delay: 0.6
    }
  ];

  const stats = [
    { icon: Trophy, value: '500+', label: 'شركة تثق بنا', delay: 0.1 },
    { icon: Star, value: '99.9%', label: 'معدل الاستقرار', delay: 0.2 },
    { icon: CheckCircle, value: '24/7', label: 'دعم فني', delay: 0.3 },
    { icon: Zap, value: '10x', label: 'تحسين الكفاءة', delay: 0.4 }
  ];

  const testimonials = [
    {
      name: 'أحمد الكندري',
      company: 'شركة الكويت للتأجير',
      text: 'نظام Fleetify ثورة حقيقية في إدارة الأسطول. وفر علينا الكثير من الوقت والجهد.',
      rating: 5
    },
    {
      name: 'فاطمة العتيبي',
      company: 'مؤسسة الخليج للسيارات',
      text: 'الواجهة سهلة الاستخدام والتقارير مفصلة جداً. أنصح به بشدة.',
      rating: 5
    },
    {
      name: 'محمد الرشيد',
      company: 'شركة النجم الذهبي',
      text: 'خدمة العملاء ممتازة والنظام يعمل بسلاسة تامة.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-soft to-accent-muted relative overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-accent/10 to-secondary/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            {/* Animated Logo */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-primary rounded-full mb-8 shadow-glow relative"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-20"
              />
              <Car className="w-12 h-12 text-primary-foreground relative z-10" />
            </motion.div>
            
            {/* Animated Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-6xl md:text-8xl font-black mb-6 relative"
            >
              <motion.span 
                className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Fleetify
              </motion.span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-2xl md:text-3xl text-muted-foreground mb-4 max-w-3xl mx-auto font-light"
            >
              مستقبل إدارة تأجير السيارات
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-lg text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              نظام متطور يجمع بين الذكاء الاصطناعي والتكنولوجيا المتقدمة لتقديم حلول شاملة لإدارة شركات تأجير السيارات في الكويت
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="text-lg px-10 py-6 h-auto rounded-2xl shadow-xl bg-gradient-primary hover:shadow-2xl">
                  <Link to="/auth">
                    <Play className="w-5 h-5 ml-2" />
                    ابدأ التجربة المجانية
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild variant="outline" size="lg" className="text-lg px-10 py-6 h-auto rounded-2xl border-2 backdrop-blur-sm bg-background/50">
                  <Link to="/auth">
                    شاهد العرض التوضيحي
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-muted-foreground"
            >
              <ChevronDown className="w-6 h-6 mx-auto" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: stat.delay }}
                whileHover={{ scale: 1.05 }}
                className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-xl mb-4"
                >
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 1, delay: stat.delay + 0.3 }}
                  className="text-3xl font-bold text-primary mb-2"
                >
                  {stat.value}
                </motion.div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              مميزات استثنائية
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              اكتشف كيف يمكن لـ Fleetify تحويل إدارة أسطولك إلى تجربة سلسة ومتطورة
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: feature.delay }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative p-8 bg-card/80 backdrop-blur-sm rounded-3xl shadow-card hover:shadow-elevated border border-border/50 hover:border-primary/50 transition-all duration-500 overflow-hidden"
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
                
                {/* Icon */}
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl mb-6 shadow-lg`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                
                <h3 className="text-xl font-bold mb-4 relative z-10">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed relative z-10">{feature.description}</p>
                
                {/* Hover Effect */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ما يقوله عملاؤنا
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              تجارب حقيقية من شركاء النجاح الذين اختاروا Fleetify
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -5 }}
                className="p-8 bg-card/80 backdrop-blur-sm rounded-3xl shadow-card hover:shadow-elevated border border-border/50 hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
                <div>
                  <div className="font-bold text-primary">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-primary p-12 rounded-3xl shadow-elevated"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
              جاهز لتحويل إدارة أسطولك؟
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              انضم إلى مئات الشركات التي تثق في Fleetify لإدارة أساطيلها بكفاءة وذكاء
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button asChild size="lg" variant="secondary" className="text-lg px-10 py-6 h-auto rounded-2xl">
                <Link to="/auth">
                  ابدأ الآن مجاناً
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Super Admin Access */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="pt-6 border-t border-border/50"
          >
            <Button asChild variant="destructive" size="sm" className="gap-2">
              <Link to="/super-admin">
                <Crown className="w-4 h-4" />
                دخول مزود الخدمة
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary/95 backdrop-blur-sm text-primary-foreground py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Car className="w-8 h-8" />
                <span className="text-2xl font-bold">Fleetify</span>
              </div>
              <p className="text-primary-foreground/80">
                الحل الأمثل لإدارة أساطيل السيارات في الكويت
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">المنتج</h3>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>إدارة الأسطول</li>
                <li>نظام العقود</li>
                <li>التقارير المالية</li>
                <li>إدارة العملاء</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">الدعم</h3>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>الدعم الفني</li>
                <li>التدريب</li>
                <li>الوثائق</li>
                <li>مجتمع المطورين</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">التواصل</h3>
              <ul className="space-y-2 text-primary-foreground/80">
                <li>هاتف: +965 xxxx xxxx</li>
                <li>بريد: info@fleetify.kw</li>
                <li>العنوان: الكويت</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-primary-foreground/20 text-center text-primary-foreground/80">
            <p>© 2024 Fleetify - جميع الحقوق محفوظة | مطور خصيصاً للسوق الكويتي</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
