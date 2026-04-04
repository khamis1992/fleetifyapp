import { Play, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EnterpriseFeatures() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-white dark:bg-slate-900" dir="rtl">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-semibold mb-4 border border-teal-200 dark:border-teal-500/20">
            ابدأ الآن
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            جرب Fleetify الآن
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
            انضم إلى مئات الشركات التي تستخدم Fleetify لإدارة أساطيلها
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="min-h-[44px] group px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-lg transition-colors flex items-center gap-2"
            >
              ابدأ الفترة المجانية
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="min-h-[44px] px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold text-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition-colors flex items-center gap-2"
            >
              <Play className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              شاهد العرض
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
