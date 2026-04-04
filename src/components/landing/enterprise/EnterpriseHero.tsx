import { CheckCircle, ArrowLeft, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EnterpriseHero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center bg-white dark:bg-slate-950" dir="rtl">
      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-50 dark:bg-teal-500/10 rounded-xl border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 text-sm font-semibold mb-8">
              <CheckCircle className="w-4 h-4" />
              <span>حل متكامل لإدارة الأسطول</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              ادر أسطولك
              <br />
              <span className="text-teal-600 dark:text-teal-400">
                بذكاء وكفاءة
              </span>
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              منصة متكاملة لإدارة الأسطول مع تحليلات فورية،
              تقارير مفصلة، ودعم على مدار الساعة
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="min-h-[44px] px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                ابدأ مجاناً
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="min-h-[44px] px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold text-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                شاهد العرض
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">لوحة التحكم</p>
                  <p className="text-slate-900 dark:text-white font-bold text-lg">نظرة عامة</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">المركبات النشطة</p>
                  <p className="text-slate-900 dark:text-white text-2xl font-bold">248</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">العقود</p>
                  <p className="text-slate-900 dark:text-white text-2xl font-bold">1,247</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">الإيرادات</p>
                  <p className="text-slate-900 dark:text-white text-2xl font-bold">45K</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">العملاء</p>
                  <p className="text-slate-900 dark:text-white text-2xl font-bold">89</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold">النشاط الأسبوعي</p>
                  <span className="text-teal-600 dark:text-teal-400 text-xs font-semibold">+12%</span>
                </div>
                <div className="flex items-end gap-2 h-24">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-teal-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs flex-1">إضافة مركبة جديدة</p>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">منذ دقيقتين</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs flex-1">عقد جديد #1234</p>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">منذ 5 دقائق</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-teal-300"></div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs flex-1">تم استلام الدفعة</p>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">منذ 8 دقائق</span>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-20 bg-teal-600 text-white px-4 py-2 rounded-xl shadow-sm text-sm font-bold">
              ✓ 99.9% مدة تشغيل
            </div>
            <div className="absolute -left-4 bottom-20 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-sm text-sm font-bold border border-slate-700">
              أسرع 10 مرات
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
