import { motion } from 'framer-motion';
import { FileText, User, AlertCircle, Shield, CreditCard, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-6 py-4">
          <Link
            to="/enterprise"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>العودة</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Title */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              الشروط والأحكام
            </h1>
            <p className="text-xl text-slate-400">
              آخر تحديث: يناير {currentYear}
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Introduction */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">قبول الشروط</h2>
              <p className="text-slate-300 leading-relaxed">
                باستخدامك لمنصة Fleetify، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام المنصة.
              </p>
            </section>

            {/* Services Description */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">وصف الخدمة</h2>
              </div>

              <div className="space-y-4 text-slate-300">
                <p>Fleetify هي منصة إدارة أسطول توفر:</p>
                <ul className="space-y-2 mr-6">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>إدارة شاملة للمركبات والأسطول</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>تتبع GPS والموقع الجغرافي للمركبات</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>إدارة العقود والحجوزات</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>تقارير وإحصائيات متقدمة</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>إدارة الصيانة والخدمات</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* User Responsibilities */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">مسؤوليات المستخدم</h2>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'دقة المعلومات', desc: 'تزويدنا بمعلومات دقيقة وكاملة وحديثة' },
                  { title: 'حماية الحساب', desc: 'الحفاظ على سرية كلمة المرور وبيانات الدخول' },
                  { title: 'الاستخدام القانوني', desc: 'استخدام الخدمة للأغراض القانونية فقط' },
                  { title: 'الامتثال', desc: 'الامتثال لجميع القوانين واللوائح المعمول بها' },
                  { title: 'عدم التدخل', desc: 'عدم محاولة التدخل أو الإضرار بالمنصة' },
                ].map((responsibility, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-white mb-1">{responsibility.title}</h3>
                    <p className="text-slate-400 text-sm">{responsibility.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Prohibited Activities */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Ban className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">الأنشطة المحظورة</h2>
              </div>

              <div className="space-y-4 text-slate-300">
                <p className="font-semibold text-white mb-3">يمنع القيام بالأنشطة التالية:</p>
                <ul className="space-y-2 mr-6">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                    <span>الوصول غير المصرح به إلى الخدمة أو الحسابات الأخرى</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                    <span>استخدام الخدمة لأي غرض غير قانوني أو غير مصرح به</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                    <span>نسخ أو تعديل أو توزيع المنصة أو أي جزء منها</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                    <span>إرسال بريد عشوائي أو رسائل غير مرغوب فيها</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                    <span>محاولة اختراق أو تعطيل أمان الخدمة</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                    <span>استخدام البرمجيات الضارة أو الفيروسات</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Payment Terms */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">الشروط المالية</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-white mb-2">رسوم الاشتراك</h3>
                  <p className="text-slate-400">
                    توافق على دفع جميع الرسوم المطبقة وفق خطة الاشتراك الخاصة بك. جميع الأسعار بالريال القطري.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-white mb-2">المدفوعات</h3>
                  <p className="text-slate-400">
                    يجب سداد المدفوعات في الوقت المحدد. نحتفظ بالحق في تعليق أو إيقاف الخدمة في حالة عدم السداد.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-white mb-2">الاسترداد</h3>
                  <p className="text-slate-400">
                    يتم منح استرداد كامل خلال أول 14 يوم من الاشتراك. بعد هذه الفترة، لا يتم منح استرداد إلا في ظروف استثنائية.
                  </p>
                </div>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">تحديد المسؤولية</h2>
              </div>

              <div className="space-y-4 text-slate-300">
                <p className="font-semibold text-white mb-3">إلى الحد الأقصى المسموح به بموجب القانون:</p>
                <ul className="space-y-2 mr-6">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
                    <span>لا نكون مسؤولين عن أي أضراء غير مباشرة أو عرضية أو تابعة</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
                    <span>لا تتجاوز مسؤوليتنا الإجمالية المبلغ المدفوع خلال الـ 12 شهراً الماضية</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
                    <span>لا نضمن عدم انقطاع الخدمة أو خلوها من الأخطاء</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Protection */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">حماية البيانات</h2>
              </div>

              <div className="space-y-4 text-slate-300">
                <p>
                  نلتزم بحماية خصوصية بياناتك وفقاً لسياسة الخصوصية الخاصة بنا وقانون حماية البيانات في دولة قطر.
                </p>
                <p className="mr-6">
                  <span className="text-teal-400">للمزيد من المعلومات:</span>{' '}
                  <Link to="/privacy-policy" className="text-teal-400 hover:text-teal-300 transition-colors underline">
                    سياسة الخصوصية
                  </Link>
                </p>
              </div>
            </section>

            {/* Termination */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">إنهاء الخدمة</h2>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-white mb-2">من قبل المستخدم</h3>
                  <p className="text-slate-400">
                    يمكنك إلغاء اشتراكك في أي وقت بإشعار مسبق 30 يوم. لن يتم منح استرداد عن الفترة المتبقية.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-5">
                  <h3 className="text-lg font-bold text-white mb-2">من قبل Fleetify</h3>
                  <p className="text-slate-400">
                    نحتفظ بالحق في إنهاء أو تعليق الخدمة فوراً في حالة انتهاكك لهذه الشروط.
                  </p>
                </div>
              </div>
            </section>

            {/* Changes to Terms */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">تغييرات على الشروط</h2>
              <p className="text-slate-300 leading-relaxed">
                قد نقوم بتحديث هذه الشروط والأحكام من وقت لآخر. سنقوم بإشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال المنصة. استمرارك في استخدام الخدمة بعد التغييرات يعتبر قبولاً لها.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-500/30 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">تواصل معنا</h2>
              <p className="text-slate-300 mb-4">
                إذا كان لديك أي أسئلة حول هذه الشروط والأحكام، يرجى التواصل معنا:
              </p>
              <div className="space-y-2">
                <p className="text-slate-300">
                  <span className="text-teal-400">البريد الإلكتروني:</span>{' '}
                  <a href="mailto:legal@fleetify.qa" className="hover:text-teal-400 transition-colors">
                    legal@fleetify.qa
                  </a>
                </p>
                <p className="text-slate-300">
                  <span className="text-teal-400">الهاتف:</span>{' '}
                  <span dir="ltr" className="hover:text-teal-400 transition-colors">+974 4444 4444</span>
                </p>
              </div>
            </section>

            {/* Acceptance */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-teal-500/30 p-8 text-center">
              <p className="text-slate-300 mb-4">
                باستخدامك لمنصة Fleetify، تقر بأنك قد قرأت وفهمت وقبلت هذه الشروط والأحكام.
              </p>
              <p className="text-teal-400 font-semibold">
                آخر تحديث: يناير {currentYear}
              </p>
            </section>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-white font-bold">Fleetify</span>
            </div>
            <p className="text-slate-500 text-sm">
              © {currentYear} Fleetify. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
