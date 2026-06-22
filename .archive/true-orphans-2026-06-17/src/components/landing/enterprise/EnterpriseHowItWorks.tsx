import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'سجّل حسابك',
    description: 'أنشئ حسابك في دقائق مع تأكيد البريد الإلكتروني الفوري',
    icon: CheckCircle,
  },
  {
    number: '02',
    title: 'أضف مركباتك',
    description: 'أدخل بيانات مركباتك أو استوردها من ملف Excel',
    icon: CheckCircle,
  },
  {
    number: '03',
    title: 'ابدأ الإدارة',
    description: 'أنشئ عقود، تتبع الصيانة، واستمتع بالتحليلات المتقدمة',
    icon: CheckCircle,
  },
];

export function EnterpriseHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-slate-50" dir="rtl">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mb-4">
            سهل وبسيط
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            كيف يعمل Fleetify؟
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            ابدأ في دقائق واجعل فريقك يعمل بكفاءة من اليوم الأول
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-0 w-full h-0.5 bg-gradient-to-l from-teal-200 to-transparent" style={{ left: '-50%', width: '100%' }} />
              )}

              {/* Step Card */}
              <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-slate-100">
                {/* Number Badge */}
                <div className="absolute -top-4 right-8 w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-xl bg-teal-100 flex items-center justify-center mb-6 mt-4">
                  <step.icon className="w-8 h-8 text-teal-600" />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 md:p-12 shadow-lg"
        >
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            كل ما تحتاجه في مكان واحد
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              'إعداد سهل بدون حاجة لبرمجة',
              'دعم فني 24/7',
              'تدريب مجاني لفريقك',
              'تحديثات مستمرة بدون تكلفة إضافية',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-teal-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
