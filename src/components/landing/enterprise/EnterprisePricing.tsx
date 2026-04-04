import { Check, Crown, Zap, Building2 } from 'lucide-react';

const plans = [
  {
    name: 'الأساسي',
    icon: Zap,
    price: '299',
    period: 'ريال قطري/شهرياً',
    description: 'للشركات الصغيرة والمتوسعة',
    features: [
      '50 مركبة',
      '3 مستخدمين',
      'تقارير أساسية',
      'دعم عبر البريد',
      'تحديثات مجانية',
      'تخزين سحابي 10GB',
    ],
    popular: false,
  },
  {
    name: 'المحترف',
    icon: Crown,
    price: '699',
    period: 'ريال قطري/شهرياً',
    description: 'للشركات المتنامية',
    features: [
      '200 مركبة',
      '10 مستخدمين',
      'تحليلات متقدمة',
      'دعم أولوية',
      'API مفتوح',
      'تخزين سحابي 50GB',
      'تدريب مخصص',
      'إعداد مجاني',
    ],
    popular: true,
  },
  {
    name: 'المؤسسي',
    icon: Building2,
    price: 'مخصص',
    period: 'حسب احتياجاتك',
    description: 'للشركات الكبيرة',
    features: [
      'مركبات غير محدودة',
      'مستخدمين غير محدودين',
      'جميع المميزات',
      'مدير حساب خاص',
      'تطوير مخصص',
      'دعم 24/7',
      'SLA مضمون',
      'استضافة خاصة',
    ],
    popular: false,
  },
];

export function EnterprisePricing() {
  return (
    <section id="pricing" className="py-20 bg-white dark:bg-slate-900" dir="rtl">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-semibold mb-4 border border-teal-200 dark:border-teal-500/20">
            أسعار مرنة
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            اختر الخطة المناسبة لعملك
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            خطط مرنة تنمو مع عملك. يمكنك التغيير أو الإلغاء في أي وقت.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl overflow-hidden border ${
                plan.popular 
                  ? 'border-teal-500 shadow-sm' 
                  : 'border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="bg-teal-500 text-white text-center py-2 text-sm font-semibold">
                  الأكثر شيوعاً
                </div>
              )}

              <div className={`p-8 bg-white dark:bg-slate-900 ${plan.popular ? 'pt-12' : ''}`}>
                <div className={`inline-flex w-14 h-14 rounded-xl items-center justify-center mb-6 border ${
                  plan.popular 
                    ? 'bg-teal-500 border-teal-500' 
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}>
                  <plan.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-slate-600 dark:text-slate-400 mr-2">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full min-h-[44px] py-4 rounded-xl font-semibold text-lg transition-colors border ${
                    plan.popular 
                      ? 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500' 
                      : 'bg-slate-700 hover:bg-slate-800 text-white border-slate-700'
                  }`}
                >
                  {plan.price === 'مخصص' ? 'تواصل معنا' : 'ابدأ الآن'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            جميع الخطط تتضمن تجربة مجانية 14 يوم بدون حاجة لبطاقة ائتمانية
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-500" />
              بدون رسوم خفية
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-500" />
              إلغاء في أي وقت
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-500" />
              دعم فني 24/7
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
