import { motion } from 'framer-motion';
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
    color: 'from-slate-700 to-slate-800',
    buttonColor: 'from-slate-700 to-slate-800',
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
    color: 'from-teal-500 to-teal-600',
    buttonColor: 'from-teal-600 to-teal-700',
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
    color: 'from-slate-700 to-slate-800',
    buttonColor: 'from-slate-700 to-slate-800',
  },
];

export function EnterprisePricing() {
  return (
    <section id="pricing" className="py-24 bg-white" dir="rtl">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
            أسعار مرنة
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            اختر الخطة المناسبة لعملك
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            خطط مرنة تنمو مع عملك. يمكنك التغيير أو الإلغاء في أي وقت.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl overflow-hidden ${
                plan.popular ? 'shadow-2xl shadow-teal-500/20 scale-105' : 'shadow-lg'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-center py-2 text-sm font-semibold">
                  الأكثر شيوعاً
                </div>
              )}

              {/* Card Content */}
              <div className={`p-8 ${plan.popular ? 'pt-14' : ''} bg-slate-50`}>
                {/* Icon */}
                <div className={`inline-flex w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} items-center justify-center mb-6`}>
                  <plan.icon className="w-7 h-7 text-white" />
                </div>

                {/* Name & Description */}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-slate-600 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-600 mr-2">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all bg-gradient-to-r ${plan.buttonColor} text-white shadow-lg`}
                >
                  {plan.price === 'مخصص' ? 'تواصل معنا' : 'ابدأ الآن'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-slate-600 mb-4">
            جميع الخطط تتضمن تجربة مجانية 14 يوم بدون حاجة لبطاقة ائتمانية
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
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
        </motion.div>
      </div>
    </section>
  );
}
