import { Car, FileText, BarChart3, Users, Activity, Zap, TrendingUp, MapPin } from 'lucide-react';

export function EnterpriseVideo() {
  const cityLocations = [
    { name: 'الدوحة', vehicles: 245 },
    { name: 'الوكرة', vehicles: 89 },
    { name: 'الخور', vehicles: 67 },
    { name: 'الريان', vehicles: 54 },
  ];

  const floatingData = [
    {
      icon: Car,
      label: 'مركبة نشطة',
      value: '524',
      subtext: 'مُدارة في الوقت الفعلي',
    },
    {
      icon: FileText,
      label: 'عقد نشط',
      value: '1,247',
      subtext: 'إجمالي العقود',
    },
    {
      icon: Users,
      label: 'شركة',
      value: '500+',
      subtext: 'عميل موثوق',
    },
    {
      icon: BarChart3,
      label: 'إيرادات',
      value: '2.4M',
      subtext: 'ريال قطري',
    },
  ];

  const features = [
    { icon: MapPin, title: 'تتبع فوري', desc: 'موقع كل مركبة مباشر', stat: '99.9%' },
    { icon: Zap, title: 'سرعة فائقة', desc: 'أداء متفوق', stat: '< 100ms' },
    { icon: TrendingUp, title: 'تحليلات ذكية', desc: 'تقارير مفصلة', stat: '24/7' },
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-950" dir="rtl">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-teal-50 dark:bg-teal-500/10 rounded-xl border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 text-sm font-semibold mb-8">
            <Activity className="w-5 h-5" />
            <span>نظام تحكم متطور</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            اكتشف قوة
            <span className="text-teal-600 dark:text-teal-400"> المنصة الذكية</span>
          </h2>

          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            واجهة تحكم متقدمة مع بيانات مباشرة وتحليلات فورية
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">المدن المغطاة</h3>
            <div className="space-y-4">
              {cityLocations.map((city) => (
                <div
                  key={city.name}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-500/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{city.name}</span>
                  </div>
                  <span className="text-teal-600 dark:text-teal-400 font-bold text-lg">{city.vehicles} مركبة</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {floatingData.map((data) => (
              <div
                key={data.label}
                className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center mb-4">
                  <data.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{data.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{data.value}</p>
                <p className="text-teal-600 dark:text-teal-400 text-xs">{data.subtext}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500 transition-colors"
            >
              <div className="absolute top-4 left-4 px-3 py-1 bg-teal-50 dark:bg-teal-500/10 rounded-full text-teal-600 dark:text-teal-400 text-xs font-semibold border border-teal-200 dark:border-teal-500/20">
                {feature.stat}
              </div>

              <div className="relative w-14 h-14 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center mb-4 border border-teal-200 dark:border-teal-500/20">
                <feature.icon className="w-7 h-7 text-teal-600 dark:text-teal-400" />
              </div>

              <h3 className="relative text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="relative text-slate-600 dark:text-slate-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}