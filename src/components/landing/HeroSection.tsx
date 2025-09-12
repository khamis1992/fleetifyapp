import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate('/auth');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      {/* Clean background with subtle gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-muted/20" />
      
      {/* Navigation Bar */}
      <nav className="relative z-50 w-full py-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary">
              دفترة
            </div>
            <div className="hidden md:flex items-center space-x-8 arabic-body">
              <a href="#" className="text-foreground hover:text-primary transition-colors">اتصل بنا</a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">الأسعار</a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">مجالات العمل</a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">البرامج</a>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={handleLogin}
                className="arabic-body"
              >
                دخول
              </Button>
              <Button 
                onClick={handleStartTrial}
                className="arabic-body bg-success hover:bg-success/90"
              >
                ابدأ الاستخدام مجاناً
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh] py-12">
          
          {/* Right Content - Text */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-right space-y-8 order-2 lg:order-1"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="arabic-heading-xl text-foreground leading-tight"
            >
              نظام ERP متكامل لإدارة كافة
              <br />
              <span className="text-primary">أعمالك</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="arabic-body-lg text-muted-foreground leading-relaxed max-w-2xl"
            >
              يعتبر دفترة برنامج ERP متكامل يعمل على مساعدتك في إدارة كل جوانب أعمالك بواجهة
              سهلة الاستخدام تدعم اللغة العربية أحدث قوانين وأمر مبيعاتك ومخزونك وعملائك
              موظفيك ومحاسباتك ودورة العمل ليديك، بتطبيقات إدارة شاملة وقابلة للتخصيص لتلبية
              احتياجات أعمالك حيث يُمكنك استخدامه في أي وقت ومن أي مكان لتكون ناجحاً محلياً
              وإقليمياً أمان فوق تحتوى سلامة بياناتك.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg" 
                onClick={handleStartTrial}
                className="arabic-body px-8 py-4 bg-success hover:bg-success/90 text-white group text-lg"
              >
                ابدأ الاستخدام مجاناً
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center space-x-8 arabic-body-sm text-muted-foreground"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>حاضر للعمل فوراً</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-success" />
                <span>متاح دون رسوم بطاقة ائتمانية</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-success" />
                <span>تجربة مجانية</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Left Content - Illustration */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main Dashboard Illustration */}
              <div className="relative">
                {/* Computer Monitor */}
                <div className="bg-card rounded-t-2xl border-2 border-border p-4 shadow-card">
                  <div className="bg-primary/10 rounded-lg p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-destructive rounded-full" />
                        <div className="w-3 h-3 bg-warning rounded-full" />
                        <div className="w-3 h-3 bg-success rounded-full" />
                      </div>
                      <div className="text-xs text-muted-foreground">ERP Dashboard</div>
                    </div>
                    
                    {/* Charts and Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-card/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">المبيعات</div>
                        <div className="text-lg font-bold text-primary">124K</div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-success rounded-full" />
                        </div>
                      </div>
                      <div className="bg-card/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">العملاء</div>
                        <div className="text-lg font-bold text-primary">847</div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full w-1/2 bg-accent rounded-full" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Chart Area */}
                    <div className="bg-card/30 rounded-lg p-3 h-20 flex items-end space-x-1">
                      {Array.from({ length: 8 }, (_, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.random() * 100}%` }}
                          transition={{ duration: 0.8, delay: 1 + i * 0.1 }}
                          className="flex-1 bg-primary/60 rounded-sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Monitor Base */}
                <div className="w-full h-4 bg-border rounded-b-2xl" />
                <div className="w-1/3 h-3 bg-border mx-auto rounded-b-lg" />
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
              >
                <CheckCircle className="h-6 w-6" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-success text-success-foreground rounded-full p-3 shadow-lg"
              >
                <Shield className="h-6 w-6" />
              </motion.div>

              {/* Payment Card */}
              <motion.div
                animate={{ x: [0, 5, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-12 -right-8 bg-gradient-primary rounded-lg p-4 shadow-lg text-white"
              >
                <div className="text-xs opacity-80 mb-1">PAY</div>
                <div className="font-bold">***  ***</div>
              </motion.div>

              {/* Mobile Phone */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-0 left-12 bg-card rounded-2xl border-2 border-border p-2 shadow-lg w-20 h-32"
              >
                <div className="bg-primary/20 rounded-lg h-full flex flex-col justify-center items-center">
                  <div className="w-8 h-1 bg-primary rounded-full mb-2" />
                  <div className="w-6 h-6 bg-primary/60 rounded-full" />
                </div>
              </motion.div>

              {/* Calculator */}
              <motion.div
                animate={{ rotate: [0, 3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-16 -left-8 bg-card rounded-lg border border-border p-2 shadow-lg"
              >
                <div className="grid grid-cols-3 gap-1 w-12">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="w-3 h-3 bg-muted rounded-sm" />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}