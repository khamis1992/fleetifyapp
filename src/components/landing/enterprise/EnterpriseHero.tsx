import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export function EnterpriseHero() {
  return (
    <section className="relative min-h-screen flex items-center bg-slate-950 overflow-hidden" dir="rtl">
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(20, 184, 166, .05) 1px, transparent 1px),
            linear-gradient(rgba(20, 184, 166, .05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="container mx-auto px-6 pt-32 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 backdrop-blur-sm rounded-full border border-teal-500/20 text-white text-sm font-semibold mb-8"
            >
              <CheckCircle className="w-4 h-4 text-teal-400" />
              <span>حل متكامل لإدارة الأسطول</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6"
            >
              ادر أسطولك
              <br />
              <span className="text-teal-400">
                بذكاء وكفاءة
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl"
            >
              منصة متكاملة لإدارة الأسطول مع تحليلات فورية،
              تقارير مفصلة، ودعم على مدار الساعة
            </motion.p>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Main Dashboard Card */}
            <div className="relative bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <p className="text-slate-400 text-sm">لوحة التحكم</p>
                  <p className="text-white font-bold text-lg">نظرة عامة</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">المركبات النشطة</p>
                  <p className="text-white text-2xl font-bold">248</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">العقود</p>
                  <p className="text-white text-2xl font-bold">1,247</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">الإيرادات</p>
                  <p className="text-white text-2xl font-bold">45K</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">العملاء</p>
                  <p className="text-white text-2xl font-bold">89</p>
                </div>
              </div>

              {/* Activity Chart */}
              <div className="bg-slate-950 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-400 text-sm font-semibold">النشاط الأسبوعي</p>
                  <span className="text-teal-400 text-xs">+12%</span>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.1 + 0.6 }}
                      className="flex-1 bg-teal-500 rounded-t-lg"
                    />
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  <p className="text-slate-300 text-xs flex-1">إضافة مركبة جديدة</p>
                  <span className="text-slate-500 text-xs">منذ دقيقتين</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                  <p className="text-slate-300 text-xs flex-1">عقد جديد #1234</p>
                  <span className="text-slate-500 text-xs">منذ 5 دقائق</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-teal-300"></div>
                  <p className="text-slate-300 text-xs flex-1">تم استلام الدفعة</p>
                  <span className="text-slate-500 text-xs">منذ 8 دقائق</span>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -right-4 top-20 bg-teal-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold"
            >
              ✓ 99.9% مدة تشغيل
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -left-4 bottom-20 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold border border-teal-500/30"
            >
              أسرع 10 مرات
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
