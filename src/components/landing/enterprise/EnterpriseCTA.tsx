import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EnterpriseCTA() {
  const navigate = useNavigate();

  const benefits = [
    'تجربة مجانية 14 يوم',
    'لا حاجة لبطاقة ائتمانية',
    'إلغاء في أي وقت',
    'دعم فني 24/7',
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Ambient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 items-center justify-center mb-8 shadow-2xl shadow-amber-500/30"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>

          {/* Heading */}
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            جاهز لنقل عملك للمستوى التالي؟
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            انضم إلى مئات الشركات في قطر التي تستخدم فليتفاي لإدارة أسطولها بذكاء وفعالية
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.button
              onClick={() => navigate('/auth')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3"
            >
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </motion.button>

            <motion.button
              onClick={() => navigate('/auth')}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-4 bg-white/10 text-white rounded-xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all"
            >
              تسجيل الدخول
            </motion.button>
          </div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-300 text-sm">{benefit}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
