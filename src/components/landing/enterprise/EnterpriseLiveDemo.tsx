import { Play, Pause, RotateCcw, Plus, BarChart3, Calendar, Car } from 'lucide-react';
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

    await new Promise(resolve => setTimeout(resolve, 1500));
    setVehicleCount(prev => prev + 1);

    setCurrentStep('processing');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setContractCount(prev => prev + 1);
    setRevenue(prev => prev + 3500);

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
    <section id="demo" className="py-20 bg-slate-50 dark:bg-slate-950" dir="rtl">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-semibold mb-4 border border-teal-200 dark:border-teal-500/20">
            تجربة تفاعلية
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            جرب Fleetify الآن
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            شاهد كيف تعمل المنصة في الوقت الفعلي
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">لوحة التحكم</h3>
                    <p className="text-slate-400 text-sm">نظام إدارة الأسطول - Fleetify</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-green-400 text-sm font-semibold">مباشر</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-teal-50 dark:bg-teal-500/5 rounded-xl p-6 border border-teal-200 dark:border-teal-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center">
                      <Car className="w-7 h-7 text-white" />
                    </div>
                    {currentStep === 'adding' && (
                      <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        +1 جديد
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">إجمالي المركبات</p>
                  <p className="text-4xl font-bold text-slate-900 dark:text-white">
                    {vehicleCount}
                  </p>
                </div>

                <div className="bg-teal-50 dark:bg-teal-500/5 rounded-xl p-6 border border-teal-200 dark:border-teal-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    {currentStep === 'processing' && (
                      <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        +1 جديد
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">العقود النشطة</p>
                  <p className="text-4xl font-bold text-slate-900 dark:text-white">
                    {contractCount}
                  </p>
                </div>

                <div className="bg-teal-50 dark:bg-teal-500/5 rounded-xl p-6 border border-teal-200 dark:border-teal-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-teal-500 flex items-center justify-center">
                      <BarChart3 className="w-7 h-7 text-white" />
                    </div>
                    {currentStep === 'complete' && (
                      <span className="bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        +3,500 ر.ق
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">إجمالي الإيرادات</p>
                  <p className="text-4xl font-bold text-slate-900 dark:text-white">
                    {revenue.toLocaleString()} ر.ق
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">إضافة مركبة جديدة</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">شاهد كيف تعمل العملية بسهولة</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetDemo}
                      disabled={isPlaying}
                      className="min-h-[44px] px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-slate-300 dark:border-slate-600"
                    >
                      <RotateCcw className="w-4 h-4" />
                      إعادة تعيين
                    </button>
                    <button
                      onClick={runDemo}
                      disabled={isPlaying}
                      className="min-h-[44px] px-6 py-2 bg-teal-500 text-white rounded-xl font-semibold text-sm hover:bg-teal-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {[
                    { step: 'adding', label: 'إضافة المركبة', icon: Plus },
                    { step: 'processing', label: 'معالجة العقد', icon: Calendar },
                    { step: 'complete', label: 'تحديث الإحصائيات', icon: BarChart3 },
                  ].map((item, index) => (
                    <div
                      key={item.step}
                      className={`flex-1 flex items-center gap-3 ${
                        index < 2 ? 'border-l-2 border-slate-200 dark:border-slate-700' : ''
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                          currentStep === item.step
                            ? 'bg-teal-500 text-white border-teal-500'
                            : currentStep === 'complete' || index < ['adding', 'processing', 'complete'].indexOf(currentStep)
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${
                            currentStep === item.step ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </p>
                        {currentStep === item.step && (
                          <p className="text-xs text-teal-500 dark:text-teal-400">
                            جاري التنفيذ...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">النشاط الأخير</h5>
                <div className="space-y-2">
                  {[
                    { action: 'إضافة مركبة تويوتا كامري', time: 'منذ قليل', type: 'success' },
                    { action: 'إنشاء عقد جديد #1234', time: 'منذ دقيقة', type: 'info' },
                    { action: 'تحديث بيانات المركبة QR-456', time: 'منذ 3 دقائق', type: 'default' },
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
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
                        <span className="text-sm text-slate-700 dark:text-slate-300">{activity.action}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
