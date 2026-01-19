import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Database, UserX, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              سياسة الخصوصية
            </h1>
            <p className="text-xl text-slate-400">
              آخر تحديث: يناير {currentYear}
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Introduction */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">مقدمة</h2>
              <p className="text-slate-300 leading-relaxed">
                نحن في Fleetify نلتزم بحماية خصوصية معلوماتك. توضح هذه السياسة كيف نقوم بجمع واستخدام وحماية بياناتك عند استخدامك لمنصتنا لإدارة الأسطول.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Database className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">المعلومات التي نجمعها</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">المعلومات الشخصية</h3>
                  <p className="text-slate-400">
                    الاسم، عنوان البريد الإلكتروني، رقم الهاتف، ومعلومات الشركة عند التسجيل في الخدمة.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">معلومات الأسطول</h3>
                  <p className="text-slate-400">
                    بيانات المركبات، معلومات السائقين، تفاصيل العقود، وسجل الصيانة.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-2">بيانات الاستخدام</h3>
                  <p className="text-slate-400">
                    سجل النشاط، إحصائيات الاستخدام، وتفضيلات المستخدم لتحسين الخدمة.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">كيف نستخدم معلوماتك</h2>
              </div>

              <ul className="space-y-3">
                {[
                  'توفير وإدارة خدمات إدارة الأسطول',
                  'معالجة وتنفيذ العقود والحجوزات',
                  'إرسال الإشعارات والتنبيهات المهمة',
                  'تحسين وتطوير الخدمات والمميزات',
                  'تحليلات البيانات لفهم احتياجاتك',
                  'منع الاحتيال وإsecurity الحسابات',
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Data Security */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">أمان البيانات</h2>
              </div>

              <div className="space-y-4 text-slate-300">
                <p>نحن نستخدم أحدث تقنيات الأمان لحماية بياناتك:</p>
                <ul className="space-y-2 mr-6">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>تشفير SSL/TLS لجميع عمليات نقل البيانات</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>تشفير قاعدة البيانات بتقنية AES-256</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>جدار حماية متقدم وحماية من DDoS</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span>نسخ احتياطية يومية مشفرة</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Your Rights */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <UserX className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">حقوقك</h2>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'الوصول إلى بياناتك', desc: 'يمكنك طلب نسخة من بياناتك الشخصية في أي وقت' },
                  { title: 'تصحيح المعلومات', desc: 'يمكنك تحديث أو تصحيح معلوماتك الشخصية' },
                  { title: 'حذف البيانات', desc: 'يمكنك طلب حذف بياناتك، مع بعض الاستثناءات القانونية' },
                  { title: 'إلغاء الاشتراك', desc: 'يمكنك إلغاء اشتراكك في خدماتنا في أي وقت' },
                  { title: 'الاعتراض', desc: 'يمكنك الاعتراض على معالجة بياناتك لأغراض معينة' },
                ].map((right, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-white mb-1">{right.title}</h3>
                    <p className="text-slate-400 text-sm">{right.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Cookies */}
            <section className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">ملفات تعريف الارتباط (Cookies)</h2>
              </div>

              <div className="space-y-4 text-slate-300">
                <p>نحن نستخدم ملفات تعريف الارتباط لتحسين تجربتك:</p>
                <ul className="space-y-2 mr-6">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span><strong className="text-white">ملفات ضرورية:</strong> لضمان عمل الموقع بشكل صحيح</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span><strong className="text-white">ملفات الأداء:</strong> لتحليل أداء الموقع وتحسينه</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                    <span><strong className="text-white">ملفات الوظيفية:</strong> لتذكر تفضيلاتك وإعداداتك</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-500/30 p-8">
              <h2 className="text-2xl font-bold text-white mb-4">تواصل معنا</h2>
              <p className="text-slate-300 mb-4">
                إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يرجى التواصل معنا:
              </p>
              <div className="space-y-2">
                <p className="text-slate-300">
                  <span className="text-teal-400">البريد الإلكتروني:</span>{' '}
                  <a href="mailto:privacy@fleetify.qa" className="hover:text-teal-400 transition-colors">
                    privacy@fleetify.qa
                  </a>
                </p>
                <p className="text-slate-300">
                  <span className="text-teal-400">الهاتف:</span>{' '}
                  <span dir="ltr" className="hover:text-teal-400 transition-colors">+974 4444 4444</span>
                </p>
              </div>
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
