import { motion } from 'framer-motion';
import { Play, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EnterpriseFeatures() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="inline-block px-4 py-1.5 bg-teal-500/10 text-teal-400 rounded-full text-sm font-bold mb-4 border border-teal-500/20">
            ابدأ الآن
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            جرب Fleetify الآن
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            انضم إلى مئات الشركات التي تستخدم Fleetify لإدارة أساطيلها
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={() => navigate('/auth')}
              className="group px-8 py-4 bg-teal-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-teal-600 transition-all flex items-center gap-2"
            >
              ابدأ الفترة المجانية
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 bg-slate-800 text-white rounded-xl font-bold text-lg border border-slate-700 hover:border-teal-500/50 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5 text-teal-400" />
              شاهد العرض
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
