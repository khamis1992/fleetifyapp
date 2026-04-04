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
    <section className="py-20 bg-slate-50 dark:bg-slate-900" dir="rtl">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex w-20 h-20 rounded-xl bg-teal-50 dark:bg-teal-500/10 items-center justify-center mb-8 border border-teal-200 dark:border-teal-500/20">
            <Sparkles className="w-10 h-10 text-teal-600 dark:text-teal-400" />
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            جاهز لنقل عملك للمستوى التالي؟
          </h2>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            انضم إلى مئات الشركات في قطر التي تستخدم فليتفاي لإدارة أسطولها بذكاء وفعالية
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate('/auth')}
              className="min-h-[44px] px-10 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-sm flex items-center justify-center gap-3"
            >
              ابدأ تجربتك المجانية
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="min-h-[44px] px-10 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-semibold text-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span className="text-slate-700 dark:text-slate-300 text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
