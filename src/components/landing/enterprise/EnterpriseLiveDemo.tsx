import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Plus, BarChart3, Calendar, Users, Car } from 'lucide-react';
import { useState } from 'react';

type DemoStep = 'idle' | 'adding' | 'processing' | 'complete';

export function EnterpriseLiveDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<DemoStep>('idle');
  const [vehicleCount, setVehicleCount] = useState(12);
  const [contractCount, setContractCount] = useState(8);
  const [revenue, setRevenue] = useState(45200);

  const runDemo = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setCurrentStep('adding');

    // Step 1: Adding vehicle
    await new Promise(resolve => setTimeout(resolve, 1500));
    setVehicleCount(prev => prev + 1);

    // Step 2: Processing
    setCurrentStep('processing');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setContractCount(prev => prev + 1);
    setRevenue(prev => prev + 3500);

    // Step 3: Complete
    setCurrentStep('complete');
    await new Promise(resolve => setTimeout(resolve, 1500));

    setCurrentStep('idle');
    setIsPlaying(false);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentStep('idle');
    setVehicleCount(12);
    setContractCount(8);
    setRevenue(45200);
  };

  return (
    <section id="demo" className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden" dir="rtl">
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
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-teal-500/10 text-teal-400 rounded-full text-sm font-bold mb-4 border border-teal-500/20">
            تجربة تفاعلية
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            جرب Fleetify الآن
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            شاهد كيف تعمل المنصة في الوقت الفعلي
          </p>
        </motion.div>

        {/* Demo Interface */}
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden"
          >
            {/* Dashboard Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">لوحة التحكم</h3>
                    <p className="text-slate-400 text-sm">نظام إدارة الأسطول - Fleetify</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-green-400 text-sm font-bold">مباشر</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Stats Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Vehicles Stat */}
                <motion.div
                  animate={currentStep === 'adding' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-teal-50 to-white rounded-2xl p-6 border-2 border-teal-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                        <Car className="w-7 h-7 text-white" />
                      </div>
                      {currentStep === 'adding' && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full"
                        >
                          +1 جديد
                        </motion.span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm mb-1">إجمالي المركبات</p>
                    <motion.p
                      key={vehicleCount}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold text-slate-900"
                    >
                      {vehicleCount}
                    </motion.p>
                  </div>
                </motion.div>

                {/* Contracts Stat */}
                <motion.div
                  animate={currentStep === 'processing' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-teal-50 to-white rounded-2xl p-6 border-2 border-teal-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-white" />
                      </div>
                      {currentStep === 'processing' && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full"
                        >
                          +1 جديد
                        </motion.span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm mb-1">العقود النشطة</p>
                    <motion.p
                      key={contractCount}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold text-slate-900"
                    >
                      {contractCount}
                    </motion.p>
                  </div>
                </motion.div>

                {/* Revenue Stat */}
                <motion.div
                  animate={currentStep === 'complete' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-teal-50 to-white rounded-2xl p-6 border-2 border-teal-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                        <BarChart3 className="w-7 h-7 text-white" />
                      </div>
                      {currentStep === 'complete' && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full"
                        >
                          +3,500 ر.ق
                        </motion.span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm mb-1">إجمالي الإيرادات</p>
                    <motion.p
                      key={revenue}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold text-slate-900"
                    >
                      {revenue.toLocaleString()} ر.ق
                    </motion.p>
                  </div>
                </motion.div>
              </div>

              {/* Action Area */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">إضافة مركبة جديدة</h4>
                    <p className="text-slate-600 text-sm">شاهد كيف تعمل العملية بسهولة</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetDemo}
                      disabled={isPlaying}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      إعادة تعيين
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={runDemo}
                      disabled={isPlaying}
                      className="px-6 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          جاري المعالجة...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          تشغيل العرض
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                  {[
                    { step: 'adding', label: 'إضافة المركبة', icon: Plus },
                    { step: 'processing', label: 'معالجة العقد', icon: Calendar },
                    { step: 'complete', label: 'تحديث الإحصائيات', icon: BarChart3 },
                  ].map((item, index) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex-1 flex items-center gap-3 ${
                        index < 2 ? 'border-l-2 border-slate-200' : ''
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          currentStep === item.step
                            ? 'bg-teal-500 text-white scale-110 shadow-lg'
                            : currentStep === 'complete' || index <
                              ['adding', 'processing', 'complete'].indexOf(currentStep)
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${
                            currentStep === item.step ? 'text-teal-600' : 'text-slate-600'
                          }`}
                        >
                          {item.label}
                        </p>
                        {currentStep === item.step && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-teal-500"
                          >
                            جاري التنفيذ...
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mt-6">
                <h5 className="text-sm font-bold text-slate-700 mb-3">النشاط الأخير</h5>
                <div className="space-y-2">
                  {[
                    { action: 'إضافة مركبة تويوتا كامري', time: 'منذ قليل', type: 'success' },
                    { action: 'إنشاء عقد جديد #1234', time: 'منذ دقيقة', type: 'info' },
                    { action: 'تحديث بيانات المركبة QR-456', time: 'منذ 3 دقائق', type: 'default' },
                  ].map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activity.type === 'success'
                              ? 'bg-teal-500'
                              : activity.type === 'info'
                              ? 'bg-teal-400'
                              : 'bg-slate-400'
                          }`}
                        ></div>
                        <span className="text-sm text-slate-700">{activity.action}</span>
                      </div>
                      <span className="text-xs text-slate-500">{activity.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
