import { motion } from 'framer-motion';
import { Search, BookOpen, Video, FileText, MessageCircle, Mail, Phone, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function HelpCenter() {
  const currentYear = new Date().getFullYear();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'getting-started',
      title: 'البدء مع Fleetify',
      icon: BookOpen,
      articles: [
        {
          question: 'كيف أسجل حساب جديد؟',
          answer: 'انقر على "ابدأ الآن" في الصفحة الرئيسية واملأ المعلومات المطلوبة في نموذج التسجيل. ستتلقى رسالة تأكيد على بريدك الإلكتروني لتفعيل حسابك.',
        },
        {
          question: 'كيف أضيف مركبة جديدة؟',
          answer: 'اذهب إلى صفحة الأسطول، ثم انقر على "إضافة مركبة". املأ بيانات المركبة مثل الماركة والموديل وسنة الصنع ورقم اللوحة، ثم احفظ.',
        },
        {
          question: 'كيف أنشئ عقد جديد؟',
          answer: 'من صفحة العقود، انقر على "عقد جديد". اختر العميل والمركبة وتواريخ البداية والنهاية، ثم احفظ العقد.',
        },
      ],
    },
    {
      id: 'fleet-management',
      title: 'إدارة الأسطول',
      icon: FileText,
      articles: [
        {
          question: 'كيف أتتبع صيانة المركبات؟',
          answer: 'اذهب إلى صفحة الصيانة في قسم الأسطول. يمكنك عرض جميع سجلات الصيانة وإضافة مواعيد صيانة جديدة وتعيين تنبيهات.',
        },
        {
          question: 'كيف أعرض تقارير الأسطول؟',
          answer: 'من صفحة التقارير، اختر نوع التقرير المطلوب (استخدام المركبات، تكاليف الصيانة، أداء السائقين، إلخ) وحدد الفترة الزمنية.',
        },
        {
          question: 'كيف أضيف سائق جديد؟',
          answer: 'اذهب إلى قسم الموارد البشرية، ثم "إدارة السائقين". انقر على "إضافة سائق" واملأ المعلومات الشخصية وبيانات رخصة القيادة.',
        },
      ],
    },
    {
      id: 'contracts',
      title: 'إدارة العقود',
      icon: BookOpen,
      articles: [
        {
          question: 'كيف أعدل عقد موجود؟',
          answer: 'ابحث عن العقد في صفحة العقود، انقر عليه لفتح التفاصيل، ثم انقر على "تعديل". قم بتغيير المعلومات المطلوبة واحفظ التعديلات.',
        },
        {
          question: 'كيف أنهي عقد؟',
          answer: 'من صفحة تفاصيل العقد، انقر على "إنهاء العقد". سيتم حساب المبالغ المستحقة وإغلاق العقد.',
        },
        {
          question: 'كيف أطيل عقد؟',
          answer: 'اختر العقد وافتح تفاصيله، ثم انقر على "تمديد العقد" وحدد تاريخ الانتهاء الجديد.',
        },
      ],
    },
    {
      id: 'billing',
      title: 'الفواتير والمدفوعات',
      icon: FileText,
      articles: [
        {
          question: 'كيف أنشئ فاتورة جديدة؟',
          answer: 'من قسم المالية، اختر "الفواتير" ثم "إنشاء فاتورة". اختر العميل وأضف البنود وحفظ الفاتورة.',
        },
        {
          question: 'كيف أتتبع المدفوعات؟',
          answer: 'اذهب إلى "تتبع المدفوعات" في قسم المالية. يمكنك عرض جميع المدفوعات وحالتها وتاريخ الاستحقاق.',
        },
        {
          question: 'طرق الدفع المتاحة؟',
          answer: 'ندفع البطاقات الائتمانية، التحويلات البنكية، والشيكات. يمكن إضافة طرق دفع مخصصة حسب طلبك.',
        },
      ],
    },
    {
      id: 'technical',
      title: 'الدعم الفني',
      icon: MessageCircle,
      articles: [
        {
          question: 'كيف أتصل بالدعم الفني؟',
          answer: 'يمكنك التواصل معنا عبر البريد الإلكتروني support@fleetify.qa أو الاتصال على +974 4444 4444. متاحون من الأحد إلى الخميس، 8 صباحاً - 6 مساءً.',
        },
        {
          question: 'ماذا أفعل إذا نسيت كلمة المرور؟',
          answer: 'انقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول. أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.',
        },
        {
          question: 'هل يمكنني تصدير البيانات؟',
          answer: 'نعم، يمكنك تصدير البيانات كملفات Excel أو PDF من معظم الصفحات. ابحث عن أيقونة التصدير في الزاوية العلوية من كل جدول.',
        },
      ],
    },
  ];

  const filteredArticles = searchQuery
    ? categories.flatMap(cat =>
        cat.articles.filter(article =>
          article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(article => ({ ...article, category: cat.title }))
      )
    : [];

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
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
              مركز المساعدة
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              ابحث عن إجابات لأسئلتك الشائعة أو تواصل مع فريق الدعم لدينا
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن موضوع أو سؤال..."
                className="w-full pr-12 pl-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search Results */}
      {searchQuery && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              {filteredArticles.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    نتائج البحث ({filteredArticles.length})
                  </h2>
                  {filteredArticles.map((article, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 hover:border-teal-500/30 transition-all"
                    >
                      <p className="text-teal-400 text-sm mb-2">{article.category}</p>
                      <h3 className="text-lg font-bold text-white mb-3">{article.question}</h3>
                      <p className="text-slate-400 leading-relaxed">{article.answer}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-lg">لم يتم العثور على نتائج. جرب كلمات مختلفة.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {!searchQuery && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">تصفح حسب الموضوع</h2>
              <p className="text-slate-400">
                اختر فئة لعرض الأسئلة الشائعة المتعلقة بها
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto space-y-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className="w-full p-6 flex items-center gap-4 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-lg font-bold text-white">{category.title}</h3>
                      <p className="text-slate-400 text-sm">{category.articles.length} مقالات</p>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedCategory === category.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {expandedCategory === category.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-800 p-6 space-y-6"
                    >
                      {category.articles.map((article, articleIndex) => (
                        <div key={articleIndex} className="last:pb-0">
                          <h4 className="text-white font-semibold mb-2 flex items-start gap-2">
                            <span className="text-teal-400 mt-1">•</span>
                            <span>{article.question}</span>
                          </h4>
                          <p className="text-slate-400 leading-relaxed mr-6">{article.answer}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Video Tutorials */}
      {!searchQuery && (
        <section className="py-20 bg-slate-900/50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">دروس فيديو</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                تعلم كيفية استخدام Fleetify بفعالية من خلال دروس الفيديو الخاصة بنا
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { title: 'البدء مع Fleetify', duration: '5 دقائق', level: 'مبتدئ' },
                { title: 'إدارة الأسطول بكفاءة', duration: '8 دقائق', level: 'متوسط' },
                { title: 'التقارير والتحليلات', duration: '10 دقائق', level: 'متقدم' },
              ].map((video, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden hover:border-purple-500/30 transition-all cursor-pointer group"
                >
                  <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white mr-[-2px]" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold mb-2">{video.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{video.duration}</span>
                      <span>•</span>
                      <span>{video.level}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Support */}
      {!searchQuery && (
        <section className="py-20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-2xl border border-teal-500/30 p-8 lg:p-12 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">لم تجد إجابة؟</h2>
                <p className="text-slate-300 mb-8">
                  فريق الدعم لدينا جاهز لمساعدتك. تواصل معنا وسنرد عليك في أسرع وقت ممكن.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-900/50 rounded-xl p-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-teal-400" />
                    </div>
                    <h3 className="text-white font-bold mb-1">البريد الإلكتروني</h3>
                    <a href="mailto:support@fleetify.qa" className="text-teal-400 hover:text-teal-300">
                      support@fleetify.qa
                    </a>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <Phone className="w-6 h-6 text-teal-400" />
                    </div>
                    <h3 className="text-white font-bold mb-1">الهاتف</h3>
                    <p dir="ltr" className="text-teal-400">+974 4444 4444</p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-teal-400" />
                    </div>
                    <h3 className="text-white font-bold mb-1">ساعات العمل</h3>
                    <p className="text-slate-400 text-sm">أحد - خميس</p>
                    <p className="text-slate-400 text-sm">8 ص - 6 م</p>
                  </div>
                </div>

                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:shadow-teal-500/30 transition-all"
                >
                  ابدأ محادثة مع الدعم
                  <ExternalLink className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

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
