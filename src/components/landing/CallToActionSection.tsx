import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveCard } from './InteractiveCard';

export function CallToActionSection() {
  const benefits = [
    'إعداد في أقل من 5 دقائق',
    'تجربة مجانية لـ 14 يوم',
    'لا حاجة لبطاقة ائتمان',
    'إلغاء في أي وقت',
    'دعم متميز مُتضمن',
    'مساعدة في نقل البيانات'
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-accent rounded-full opacity-10 blur-3xl"
      />
      <motion.div
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-primary rounded-full opacity-10 blur-3xl"
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <InteractiveCard>
            <div className="text-center space-y-8 p-8 md:p-12">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-full"
              >
                <Rocket className="h-8 w-8 text-primary-foreground" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="arabic-heading-lg bg-gradient-primary bg-clip-text text-transparent text-center text-container"
              >
                هل أنت مستعد لتحويل عملك؟
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="arabic-body-lg text-muted-foreground max-w-2xl mx-auto text-center text-container"
              >
                انضم إلى آلاف الشركات التي تستخدم فليتيفاي بالفعل لتبسيط العمليات، 
                تقليل التكاليف، ودفع النمو. ابدأ تجربتك المجانية اليوم.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto"
              >
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="flex items-center space-x-2 arabic-body-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    <span>{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button 
                  size="lg" 
                  className="arabic-body px-8 py-6 group transition-all duration-300 hover:scale-105"
                >
                  ابدأ تجربة مجانية
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="arabic-body px-8 py-6 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                >
                  احجز عرض توضيحي
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 1 }}
                className="arabic-body-sm text-muted-foreground text-center"
              >
                يثق بنا 500+ شركة • رضا العملاء 99% • أمان على مستوى المؤسسات
              </motion.p>
            </div>
          </InteractiveCard>
        </motion.div>
      </div>
    </section>
  );
}