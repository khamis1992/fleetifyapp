import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    question: 'كم يستغرق تنفيذ النظام؟',
    answer: 'عادة ما يستغرق التنفيذ من 2-4 أسابيع حسب حجم الشركة ومتطلباتها. نبدأ بالوحدات الأساسية ثم نضيف الوحدات الأخرى تدريجياً لضمان انتقال سلس.'
  },
  {
    question: 'هل يمكن نقل البيانات من النظام الحالي؟',
    answer: 'نعم، فريقنا مختص في نقل البيانات من جميع الأنظمة الشائعة. نضمن نقل آمن وكامل لجميع بياناتك مع التحقق من صحتها قبل بدء التشغيل.'
  },
  {
    question: 'هل النظام متوافق مع الأجهزة المحمولة؟',
    answer: 'نعم، النظام مُحسّن بالكامل للأجهزة المحمولة والأجهزة اللوحية. كما يتوفر تطبيق مخصص لنظامي iOS وAndroid مع جميع الميزات الأساسية.'
  },
  {
    question: 'كيف يتم تأمين البيانات؟',
    answer: 'نستخدم تشفير AES-256 لجميع البيانات، مع استضافة في مراكز بيانات معتمدة ISO 27001. جميع الاتصالات محمية بـ SSL/TLS ونجري نسخ احتياطية مشفرة كل ساعة.'
  },
  {
    question: 'ما هي تكلفة التدريب والدعم؟',
    answer: 'التدريب الأساسي مُتضمن في جميع الخطط. نوفر تدريب عن بُعد أو في الموقع، مع دليل مستخدم شامل ومقاطع فيديو تعليمية. الدعم الفني متاح 24/7 لجميع العملاء.'
  },
  {
    question: 'هل يمكن تخصيص النظام حسب احتياجاتنا؟',
    answer: 'بالطبع، النظام مرن جداً ويمكن تخصيصه بالكامل. يمكننا إضافة حقول مخصصة، تقارير خاصة، وحتى وحدات جديدة لتناسب طبيعة عملك بدقة.'
  },
  {
    question: 'كيف يعمل نظام النسخ الاحتياطية؟',
    answer: 'نجري نسخ احتياطية آلية كل ساعة مع تشفير كامل. البيانات محفوظة في مواقع متعددة جغرافياً. يمكن استرجاع البيانات خلال دقائق في حالة الطوارئ.'
  },
  {
    question: 'ما هو الحد الأدنى للمستخدمين؟',
    answer: 'لا يوجد حد أدنى للمستخدمين. يمكن البدء بمستخدم واحد والتوسع تدريجياً. الأسعار تتدرج حسب عدد المستخدمين مما يجعل النظام اقتصادي للشركات الصغيرة.'
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
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
          <h2 className="arabic-heading-lg mb-6 bg-gradient-primary bg-clip-text text-transparent text-center">
            الأسئلة الشائعة
          </h2>
          <p className="arabic-body-lg text-muted-foreground max-w-3xl mx-auto text-center">
            إجابات على أكثر الأسئلة شيوعاً حول نظام ERP
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="mb-4"
            >
              <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  className="w-full p-6 text-right justify-between arabic-body hover:bg-muted/50"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="font-medium text-container">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </Button>
                
                <motion.div
                  initial={false}
                  animate={{
                    height: openIndex === index ? "auto" : 0,
                    opacity: openIndex === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 border-t border-border/50">
                    <p className="arabic-body text-muted-foreground leading-relaxed text-container">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="arabic-body text-muted-foreground mb-6 text-center">
            لم تجد إجابة لسؤالك؟ فريق الدعم جاهز لمساعدتك
          </p>
          <Button size="lg" className="arabic-body">
            تواصل مع الدعم
          </Button>
        </motion.div>
      </div>
    </section>
  );
}