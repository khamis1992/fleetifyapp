import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'أحمد العلي',
    position: 'مدير العمليات',
    company: 'شركة العراف لتأجير السيارات',
    content: 'فليتفاي غيّر طريقة إدارتنا للأساطيل تماماً. وفرنا 40% من الوقت في العمليات اليومية وزادت كفاءة فريقنا بشكل ملحوظ.',
    rating: 5,
    avatar: 'أ',
  },
  {
    name: 'فاطمة الخاطر',
    position: 'مديرة المالية',
    company: 'قطر للنقل',
    content: 'التقارير المالية والتحليلات المتقدمة ساعدتنا على اتخاذ قرارات أفضل. واجهنا سهلة الاستخدام والدعم الفني ممتاز.',
    rating: 5,
    avatar: 'ف',
  },
  {
    name: 'خالد المصري',
    position: 'مدير الأسطول',
    company: 'الدوحة للمقاولات',
    content: 'نستخدم فليتفاي منذ عامين ولم نعدم عنه. تتبع الصيانة والخدمات سهّل علينا حياة كثيرة.',
    rating: 5,
    avatar: 'خ',
  },
];

export function EnterpriseTestimonials() {
  return (
    <section id="testimonials" className="py-24 bg-slate-50" dir="rtl">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
            آراء العملاء
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            ماذا يقول عملاؤنا؟
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            استمع إلى قصص النجاح من الشركات التي تستخدم فليتفاي
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-slate-100"
            >
              {/* Quote Icon */}
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-6">
                <Quote className="w-6 h-6 text-slate-400" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-700 leading-relaxed mb-6">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-600">{testimonial.position}</p>
                  <p className="text-xs text-slate-500">{testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid md:grid-cols-3 gap-8"
        >
          {[
            { value: '98%', label: 'من العملاء راضون' },
            { value: '4.9/5', label: 'تقييم الخدمة' },
            { value: '24ساعة', label: 'متوسط وقت الاستجابة' },
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm">
              <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
