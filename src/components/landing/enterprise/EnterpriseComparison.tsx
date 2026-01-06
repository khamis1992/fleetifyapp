import { motion } from 'framer-motion';
import { X, Check, Clock, DollarSign, FileText, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const beforeItems = [
  { icon: Clock, label: 'تسجيل العقد يدوياً', time: '30 دقيقة', color: 'red' },
  { icon: FileText, label: 'البحث عن ملفات العميل', time: '15 دقيقة', color: 'red' },
  { icon: Users, label: 'التواصل مع الفريق', time: '20 دقيقة', color: 'red' },
  { icon: DollarSign, label: 'حساب الفواتير', time: '25 دقيقة', color: 'red' },
  { icon: AlertCircle, label: 'معالجة الأخطاء', time: '40 دقيقة', color: 'red' },
];

const afterItems = [
  { icon: Clock, label: 'تسجيل العقد بنقرة واحدة', time: '30 ثانية', color: 'green' },
  { icon: FileText, label: 'بحث فوري مع الفلترة', time: '5 ثواني', color: 'green' },
  { icon: Users, label: 'تنبيهات تلقائية للفريق', time: '0 ثانية', color: 'green' },
  { icon: DollarSign, label: 'حساب تلقائي للفواتير', time: 'فوري', color: 'green' },
  { icon: TrendingUp, label: 'بدون أخطاء', time: '0 ثانية', color: 'green' },
];

export function EnterpriseComparison() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const beforeTotalMinutes = 130; // 30 + 15 + 20 + 25 + 40
  const afterTotalSeconds = 35; // 30 + 5 + 0 + 0 + 0

  return (
    <section id="comparison" className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-teal-500/20 to-teal-500/20 text-teal-300 rounded-full text-sm font-bold mb-4 border border-teal-500/30">
            مقارنة واقعية
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            قبل وبعد Fleetify
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            شاهد الفرق الهائل في الإنتاجية والكفاءة مع Fleetify
          </p>
        </motion.div>

        {/* Comparison Slider */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700 cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ height: '600px' }}
          >
            {/* Before Panel */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-red-950">
              <div className="p-8 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-400">الطريقة التقليدية</h3>
                    <p className="text-slate-400 text-sm">عمليات يدوية وبطيئة</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto">
                  {beforeItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-red-950/50 rounded-xl border border-red-800/50"
                    >
                      <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{item.label}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-red-400 font-bold text-lg">{item.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-red-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">الإجمالي</p>
                      <p className="text-3xl font-bold text-red-400">{beforeTotalMinutes} دقيقة</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">للعملية الواحدة</p>
                      <p className="text-red-400 font-semibold">⚠️ بطيء وعرضة للأخطاء</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* After Panel (clipped) */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-teal-950 via-emerald-900 to-teal-950 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              <div className="p-8 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-teal-400">مع Fleetify</h3>
                    <p className="text-slate-400 text-sm">أتمتة كاملة وسرعة فائقة</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto">
                  {afterItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-teal-950/50 rounded-xl border border-teal-800/50"
                    >
                      <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{item.label}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-teal-400 font-bold text-lg">{item.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-teal-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">الإجمالي</p>
                      <p className="text-3xl font-bold text-teal-400">{afterTotalSeconds} ثانية</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">للعملية الواحدة</p>
                      <p className="text-teal-400 font-semibold">✓ أسرع بـ 99%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-col-resize z-20"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDragging(true);
              }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center cursor-col-resize hover:scale-110 transition-transform">
                <div className="w-1 h-6 bg-slate-300 rounded-full absolute"></div>
                <div className="w-1 h-6 bg-slate-300 rounded-full absolute rotate-90"></div>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 right-4 z-10">
              <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-bold border border-red-500/30">
                قبل
              </span>
            </div>
            <div className="absolute top-4 left-4 z-10">
              <span className="px-4 py-2 bg-teal-500/20 text-teal-400 rounded-full text-sm font-bold border border-teal-500/30">
                بعد
              </span>
            </div>
          </div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 grid md:grid-cols-3 gap-6"
          >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-teal-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">99%</p>
                  <p className="text-slate-400 text-sm">أسرع</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">توفير هائل في الوقت والجهد</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-teal-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">0%</p>
                  <p className="text-slate-400 text-sm">أخطاء</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">دقة تامة مع الأتمتة الكاملة</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-teal-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">70%</p>
                  <p className="text-slate-400 text-sm">توفير التكاليف</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">تقليل التكاليف التشغيلية</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
