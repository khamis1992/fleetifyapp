import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'أحمد المنصوري',
      position: 'المدير التنفيذي',
      company: 'شركة النخبة للتأجير',
      avatar: 'أم',
      rating: 5,
      text: 'نظام FleetifyApp غيّر طريقة إدارتنا للأعمال بالكامل. وفرنا أكثر من 40 ساعة أسبوعياً وزادت كفاءتنا بنسبة 85%. أنصح به بشدة!',
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'فاطمة الخالدي',
      position: 'مديرة المالية',
      company: 'مجموعة الرؤية العقارية',
      avatar: 'فخ',
      rating: 5,
      text: 'التقارير المالية المتقدمة والتكامل مع المحاسبة جعل عملنا أسهل بكثير. النظام سهل الاستخدام والدعم الفني ممتاز.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      name: 'خالد السالم',
      position: 'مدير العمليات',
      company: 'شركة الأفق للتجارة',
      avatar: 'خس',
      rating: 5,
      text: 'إدارة المخزون أصبحت آلية بالكامل. النظام ذكي ويتنبأ بالاحتياجات قبل حدوثها. استثمار يستحق كل ريال!',
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'مريم العتيبي',
      position: 'مديرة المبيعات',
      company: 'مؤسسة التميز التجارية',
      avatar: 'مع',
      rating: 5,
      text: 'نظام CRM المدمج ساعدنا في مضاعفة مبيعاتنا. متابعة العملاء أصبحت منظمة واحترافية. أداة لا غنى عنها!',
      color: 'from-orange-500 to-orange-600'
    },
    {
      name: 'سعود الدوسري',
      position: 'المدير العام',
      company: 'شركة النجاح للخدمات',
      avatar: 'سد',
      rating: 5,
      text: 'التطبيق على الجوال يتيح لي متابعة العمل من أي مكان. التحديثات الفورية والإشعارات الذكية رائعة جداً.',
      color: 'from-red-500 to-red-600'
    },
    {
      name: 'نورة الشمري',
      position: 'مديرة الموارد البشرية',
      company: 'مجموعة الإنجاز',
      avatar: 'نش',
      rating: 5,
      text: 'إدارة الموظفين والرواتب أصبحت سهلة ومنظمة. التقارير التفصيلية توفر علينا ساعات من العمل اليدوي.',
      color: 'from-pink-500 to-pink-600'
    },
  ];

  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary/10 border border-primary/20 rounded-full">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-medium text-primary">تقييم 4.9/5 من 500+ عميل</span>
            </div>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              ماذا يقول عملاؤنا
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            آلاف الشركات تثق في نظامنا لإدارة أعمالها اليومية
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              {/* Glow Effect */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${testimonial.color} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500`} />

              {/* Card */}
              <div className="relative h-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-elevated">
                {/* Quote Icon */}
                <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${testimonial.color} mb-4 opacity-20`}>
                  <Quote className="h-6 w-6 text-white" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }, (_, i) => (
                    <Star key={i} className="h-4 w-4 text-warning fill-warning" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                  <Avatar className={`w-12 h-12 bg-gradient-to-r ${testimonial.color}`}>
                    <AvatarFallback className="text-white font-bold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.position}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col md:flex-row items-center gap-8 px-8 py-6 bg-card/30 backdrop-blur-sm border border-border/30 rounded-2xl">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">
                4.9/5
              </div>
              <p className="text-sm text-muted-foreground">متوسط التقييم</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-border/30" />
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">
                500+
              </div>
              <p className="text-sm text-muted-foreground">تقييم إيجابي</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-border/30" />
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">
                98%
              </div>
              <p className="text-sm text-muted-foreground">رضا العملاء</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

