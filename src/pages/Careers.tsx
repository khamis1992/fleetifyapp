import { motion } from 'framer-motion';
import { Briefcase, MapPin, Calendar, DollarSign, Users, Heart, Zap, Building2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Careers() {
  const currentYear = new Date().getFullYear();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const benefits = [
    { icon: DollarSign, title: 'راتب تنافسي', description: 'رواتب جذابة تتناسب مع الخبرة والمهارات' },
    { icon: Calendar, title: 'إجازات سنوية', description: '30 يوم إجازة سنوية مدفوعة' },
    { icon: Heart, title: 'تأمين صحي', description: 'تأمين صحي شامل لك ولعائلتك' },
    { icon: Zap, title: 'بيئة عمل محفزة', description: 'فرص للتطوير والنمو المهني المستمر' },
    { icon: Users, title: 'فريق رائع', description: 'العمل مع محترفين talented ومتحمسين' },
    { icon: Building2, title: 'مكتب حديث', description: 'بيئة عمل عصرية في الدوحة' },
  ];

  const jobs = [
    {
      id: 1,
      title: 'مهندس برمجيات أول',
      department: 'التقنية',
      location: 'الدوحة، قطر',
      type: 'دوام كامل',
      experience: '3-5 سنوات',
      description: 'نبحث عن مهندس برمجيات شغوف للانضمام إلى فريقنا التقني. ستعمل على تطوير وتحسين منصة Fleetify باستخدام أحدث التقنيات.',
      requirements: [
        'خبرة في React و TypeScript',
        'إتقان البرمجة كائنية التوجه',
        'خبرة في العمل مع قواعد البيانات',
        'القدرة على حل المشكلات بشكل إبداعي',
        'إتقان اللغة الإنجليزية',
      ],
      niceToHave: [
        'خبرة في Node.js',
        'معرفة بـ Next.js',
        'خبرة في تطوير تطبيقات الجوال',
      ],
    },
    {
      id: 2,
      title: 'مدير المنتج',
      department: 'الإنتاج',
      location: 'الدوحة، قطر',
      type: 'دوام كامل',
      experience: '5+ سنوات',
      description: 'نبحث عن مدير منتج ذو خبرة لقيادة استراتيجية منتجنا والعمل مع فرق متعددة التخصصات لتقديم حلول مبتكرة لإدارة الأسطول.',
      requirements: [
        'خبرة 5+ سنوات في إدارة المنتجات',
        'خبرة في شركات SaaS B2B',
        'مهارات تحليل قوية',
        'خبرة في Agile و Scrum',
        'إتقان اللغة الإنجليزية والعربية',
      ],
      niceToHave: [
        'خلفية في صناعة السيارات أو اللوجستيات',
        'شهادة MBA',
        'خبرة في إطلاق منتجات جديدة',
      ],
    },
    {
      id: 3,
      title: 'مطور واجهات أمامية',
      department: 'التقنية',
      location: 'الدوحة، قطر',
      type: 'دوام كامل',
      experience: '2-4 سنوات',
      description: 'انضم إلى فريق الواجهات الأمامية لبناء واجهات مستخدم جميلة وسهلة الاستخدام لمنصة Fleetify.',
      requirements: [
        'خبرة قوية في React و TypeScript',
        'إتقان HTML و CSS و JavaScript',
        'معرفة بـ Tailwind CSS',
        'اهتمام كبير بتجربة المستخدم',
        'القدرة على العمل بشكل مستقل وفي فريق',
      ],
      niceToHave: [
        'خبرة في Framer Motion',
        'معرفة بـ Next.js',
        'معرفة بتصميم UI/UX',
      ],
    },
    {
      id: 4,
      title: 'مدير مبيعات',
      department: 'المبيعات',
      location: 'الدوحة، قطر',
      type: 'دوام كامل',
      experience: '3+ سنوات',
      description: 'نبحث عن مدير مبيعات ديناميكي لتوسيع قاعدة عملائنا وبناء علاقات طويلة الأمد مع الشركات في قطر.',
      requirements: [
        'خبرة 3+ سنوات في المبيعات B2B',
        'مهارات تواصل واستعراض ممتازة',
        'سجل حافل في تحقيق أهداف المبيعات',
        'القدرة على السفر داخل قطر',
        'إتقان اللغة الإنجليزية والعربية',
      ],
      niceToHave: [
        'خبرة في صناعة SaaS',
        'شبكة علاقات قوية في قطر',
        'خبرة في Salesforce أو CRM مشابه',
      ],
    },
  ];

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

      {/* Hero */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-2xl">
              <Briefcase className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
              انضم إلى فريقنا
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed">
              نبني منصة المستقبل لإدارة الأسطول. انضم إلى فريق من المبدعين والمحترفين وشكل معنا مستخدم التكنولوجيا في قطر.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">لماذا Fleetify؟</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              نحن نؤمن بأن موظفينا هم أهم أصولنا. نقدم بيئة عمل محفزة ومميزات تنافسية
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 hover:border-teal-500/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-slate-400 text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">الوظائف الشاغرة</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              اكتشف الفرص المتاحة وانضم إلى فريقنا المتنامي
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-4">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                  className="w-full p-6 text-right hover:bg-slate-800/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{job.title}</h3>
                        <span className="px-3 py-1 bg-teal-500/20 text-teal-400 text-sm rounded-full">
                          {job.department}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.experience}
                        </span>
                      </div>
                    </div>
                    <div className="text-teal-400">
                      {selectedJob === job.id ? '−' : '+'}
                    </div>
                  </div>
                </button>

                {selectedJob === job.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-slate-800 p-6 space-y-6"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">عن الوظيفة</h4>
                      <p className="text-slate-400 leading-relaxed">{job.description}</p>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-white mb-3">المتطلبات</h4>
                      <ul className="space-y-2">
                        {job.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0"></div>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {job.niceToHave.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-white mb-3">يفضل</h4>
                        <ul className="space-y-2">
                          {job.niceToHave.map((req, index) => (
                            <li key={index} className="flex items-start gap-2 text-slate-400">
                              <div className="w-2 h-2 rounded-full bg-teal-500/50 mt-2 flex-shrink-0"></div>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <a
                        href={`mailto:careers@fleetify.qa?subject=التقديم على وظيفة: ${job.title}`}
                        className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        التقديم الآن
                      </a>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* No Suitable Position */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-500/30 p-8 lg:p-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">لا تجد وظيفة مناسبة؟</h2>
            <p className="text-slate-300 mb-6">
              نحن ديناً نبحث عن المواهب الاستثنائية. إذا كنت تظن أنك يمكن أن تضيف قيمة لفريقنا، أرسل لنا سيرتك الذاتية وسنتواصل معك عند ظهور فرصة مناسبة.
            </p>
            <a
              href="mailto:careers@fleetify.qa?subject=طلب توظيف عام"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:shadow-teal-500/30 transition-all"
            >
              <Mail className="w-5 h-5" />
              أرسل سيرتك الذاتية
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800">
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
