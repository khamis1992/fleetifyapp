import { motion } from 'framer-motion';
import { Target, Eye, Users, Mail, Phone, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  const currentYear = new Date().getFullYear();

  const values = [
    {
      icon: Target,
      title: 'مهمتنا',
      description: 'تمكين شركات إدارة الأسطول في قطر من خلال توفير حلول تقنية متقدمة تساعد على تحسين الكفاءة التشغيلية وزيادة الأرباح.',
    },
    {
      icon: Eye,
      title: 'رؤيتنا',
      description: 'أن نكون الخيار الأول والأكثر ثقة لإدارة الأسطول في منطقة الخليج العربي من خلال الابتكار والتميز في الخدمة.',
    },
    {
      icon: Users,
      title: 'قيمنا',
      description: 'النزاهة، الابتكار، التميز، والشراكة الطويلة الأمد مع عملائنا.',
    },
  ];

  const stats = [
    { value: '34+', label: 'شركة تثق بنا' },
    { value: '500+', label: 'مركبة مدارة' },
    { value: '99.9%', label: 'مدة تشغيل' },
    { value: '24/7', label: 'دعم فني' },
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

      {/* Hero Section */}
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
              <Users className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
              من نحن
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed">
              Fleetify هي المنصة الرائدة في قطر لإدارة أسطول المركبات. نساعد شركات تأجير السيارات والشركات اللوجستية على تحسين كفاءتها التشغيلية من خلال حلول تقنية متقدمة وسهلة الاستخدام.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl lg:text-5xl font-bold text-teal-400 mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">قيمنا ومبادئنا</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              نحن نؤمن بأن النجاح يأتي من الالتزام بالقوة والعمل الدؤوب لتحقيق رؤية مشتركة
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8 hover:border-teal-500/30 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-6">
                  <value.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-slate-400 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8 lg:p-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 text-center">قصتنا</h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  تأسست Fleetify في قطر من قبل فريق من الخبراء في صناعة إدارة الأسطول وتقنية المعلومات. أدركنا أن شركات تأجير السيارات والشركات اللوجستية في المنطقة تواجه تحديات فريدة تتطلب حلولاً مخصصة.
                </p>
                <p>
                  بدأنا رحلتنا بسؤال بسيط: "كيف يمكننا تسهيل إدارة الأسطول باستخدام التكنولوجيا الحديثة؟" من هذا السؤال، بنينا منصة تجمع بين البساطة والقوة، مما يسمح للشركات من جميع الأحجام لإدارة أساطيلها بكفاءة غير مسبوقة.
                </p>
                <p>
                  اليوم، نفتخر بخدمة أكثر من 34 شركة في جميع أنحاء قطر، وإدارة أكثر من 500 مركبة. نسعى باستمرار لتطوير حلولنا وإضافة مميزات جديدة تلبي احتياجات عملائنا المتنامية.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-500/10 to-emerald-500/10">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">هل تريد معرفة المزيد؟</h2>
            <p className="text-xl text-slate-300 mb-8">
              تواصل معنا اليوم لمعرفة كيف يمكن لـ Fleetify تحسين أداء أسطولك
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:info@fleetify.qa"
                className="px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:shadow-teal-500/30 transition-all flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                تواصل معنا
              </a>
              <Link
                to="/onboarding"
                className="px-8 py-4 bg-slate-800 text-white rounded-xl font-bold text-lg border border-slate-700 hover:border-teal-500/50 transition-all"
              >
                ابدأ تجربتك المجانية
              </Link>
            </div>
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
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Linkedin].map((Icon, index) => (
                <a key={index} href="#" className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                  <Icon className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
