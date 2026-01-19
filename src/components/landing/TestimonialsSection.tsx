import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const testimonials = [
  {
    name: "أحمد الراشد",
    company: "شركة الكويت للنقل",
    role: "مدير عمليات الأسطول",
    content: "فليتيفاي حولت عملياتنا بالكامل. رأينا انخفاضاً بنسبة 40% في تكاليف الصيانة وتحسناً بنسبة 25% في كفاءة الوقود. التتبع المباشر كان نقطة تحول حقيقية.",
    rating: 5,
    image: "👨‍💼",
    metrics: { savings: "€150K/سنة", efficiency: "+40%" }
  },
  {
    name: "سارة جونسون",
    company: "شركة الخدمات اللوجستية العالمية",
    role: "المدير التنفيذي",
    content: "لوحة التحكم الشاملة تمنحنا رؤى لم نحصل عليها من قبل. من إدارة الموارد البشرية إلى التتبع المالي، كل شيء متكامل بسلاسة. زادت إنتاجية فريقنا بنسبة 35%.",
    rating: 5,
    image: "👩‍💼",
    metrics: { productivity: "+35%", integration: "100%" }
  },
  {
    name: "محمد حسن",
    company: "شركة النسر الصحراوي للشحن",
    role: "مدير التكنولوجيا",
    content: "التنفيذ كان سلساً بشكل مفاجئ. تم تدريب الفريق في يومين فقط، وبدأنا نرى النتائج فوراً. ميزات الأتمتة وحدها توفر لنا 20 ساعة أسبوعياً.",
    rating: 5,
    image: "👨‍💻",
    metrics: { timeSaved: "20س/أسبوع", onboarding: "يومان" }
  }
];

export function TestimonialsSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent text-center">
            يثق بنا قادة الصناعة
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-center">
            شاهد كيف تحول الشركات مثل شركتك عملياتها مع فليتيفاي
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div key={testimonial.name} variants={itemVariants}>
              <InteractiveCard className="h-full">
                <div className="space-y-6">
                  {/* Quote Icon */}
                  <div className="flex justify-between items-start">
                    <Quote className="h-8 w-8 text-primary/30" />
                    <div className="flex space-x-1">
                      {Array.from({ length: testimonial.rating }, (_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <blockquote className="text-lg leading-relaxed text-foreground">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    {Object.entries(testimonial.metrics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <p className="text-lg font-bold text-primary">{value}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Author */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm font-medium text-primary">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { label: 'الشركات تثق بنا', value: '500+' },
            { label: 'المركبات المُدارة', value: '50K+' },
            { label: 'متوسط العائد على الاستثمار', value: '300%' },
            { label: 'رضا العملاء', value: '99%' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}