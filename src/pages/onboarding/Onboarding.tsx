import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Building2,
  Truck,
  Users,
  MapPin,
  Wrench,
  Gauge,
  BarChart3,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  Sparkles,
  ChevronRight,
  Car,
  Shield,
  Bell,
  Star,
  FileText
} from 'lucide-react';

interface OnboardingData {
  companyName: string;
  industry: string;
  phoneNumber: string;
  fleetSize: string;
  vehicleTypes: string[];
  features: string[];
}

const FEATURES = [
  { id: 'gps', icon: MapPin, label: 'تتبع GPS', description: 'تتبع مباشر للمركبات' },
  { id: 'maintenance', icon: Wrench, label: 'صيانة ذكية', description: 'جدولة الصيانة التنبؤية' },
  { id: 'drivers', icon: Users, label: 'إدارة السائقين', description: 'معلومات وتقييمات السائقين' },
  { id: 'fuel', icon: Gauge, label: 'مراقبة الوقود', description: 'تتبع استهلاك الوقود' },
  { id: 'reports', icon: BarChart3, label: 'تقارير متقدمة', description: 'تحليلات شاملة ومفصلة' },
  { id: 'alerts', icon: Bell, label: 'تنبيهات فورية', description: 'إشعارات فورية للأحداث' },
];

const FLEET_SIZES = [
  { id: '1-10', label: '1-10', icon: Car, description: 'أسطول صغير' },
  { id: '11-50', label: '11-50', icon: Car, description: 'أسطول متوسط' },
  { id: '51-100', label: '51-100', icon: Car, description: 'أسطول كبير' },
  { id: '100+', label: '100+', icon: Truck, description: 'أسطول ضخم' },
];

const VEHICLE_TYPES = [
  { id: 'cars', label: 'سيارات', icon: Car },
  { id: 'suvs', label: 'سيارات دفع رباعي', icon: Car },
  { id: 'trucks', label: 'شاحنات', icon: Truck },
  { id: 'vans', label: 'شاحنات صغيرة', icon: Truck },
];

const INDUSTRIES = [
  { id: 'rental', label: 'تأجير سيارات' },
  { id: 'logistics', label: 'الخدمات اللوجستية' },
  { id: 'corporate', label: 'الشركات' },
  { id: 'construction', label: 'البناء والتشييد' },
  { id: 'delivery', label: 'خدمات التوصيل' },
  { id: 'other', label: 'أخرى' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    companyName: '',
    industry: '',
    phoneNumber: '',
    fleetSize: '',
    vehicleTypes: [],
    features: [],
  });

  const totalSteps = 5;

  useEffect(() => {
    const saved = localStorage.getItem('fleetify_onboarding');
    if (saved) {
      const data = JSON.parse(saved);
      setOnboardingData(data);
    }
  }, []);

  const saveData = (newData: Partial<OnboardingData>) => {
    const updated = { ...onboardingData, ...newData };
    setOnboardingData(updated);
    localStorage.setItem('fleetify_onboarding', JSON.stringify(updated));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const skipToRegister = () => {
    navigate('/auth/register');
  };

  const toggleVehicleType = (type: string) => {
    const updated = onboardingData.vehicleTypes.includes(type)
      ? onboardingData.vehicleTypes.filter(t => t !== type)
      : [...onboardingData.vehicleTypes, type];
    saveData({ vehicleTypes: updated });
  };

  const toggleFeature = (feature: string) => {
    const updated = onboardingData.features.includes(feature)
      ? onboardingData.features.filter(f => f !== feature)
      : [...onboardingData.features, feature];
    saveData({ features: updated });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden" dir="rtl">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-teal-500/20 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Skip Button */}
      {currentStep < totalSteps && (
        <button
          onClick={skipToRegister}
          className="fixed top-6 left-6 z-50 px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <span>تخطي</span>
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-white font-bold">Fleetify</span>
            </div>
            <span className="text-slate-400 text-sm">
              الخطوة {currentStep} من {totalSteps}
            </span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
              initial={{ width: `${((currentStep - 1) / totalSteps) * 100}%` }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center pt-24 pb-12 px-6">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
              className="w-full"
            >
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/30"
                  >
                    <Rocket className="w-12 h-12 text-white" />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl font-bold text-white mb-4"
                  >
                    مرحباً بك في Fleetify
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed"
                  >
                    المنصة الرائدة لإدارة أساطيل المركبات في قطر.
                    <br />
                    دعنا نقوم بإعداد حسابك في دقائق
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap justify-center gap-4 mb-12"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                      <Shield className="w-5 h-5 text-teal-400" />
                      <span className="text-slate-300 text-sm">آمن ومشفر</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                      <Star className="w-5 h-5 text-teal-400" />
                      <span className="text-slate-300 text-sm">34+ شركة تثق بنا</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                      <Car className="w-5 h-5 text-teal-400" />
                      <span className="text-slate-300 text-sm">500+ مركبة مدارة</span>
                    </div>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    onClick={nextStep}
                    className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-teal-500/30 transition-all flex items-center gap-3 mx-auto"
                  >
                    ابدأ الإعداد
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              )}

              {/* Step 2: Company Info */}
              {currentStep === 2 && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-800 p-8 lg:p-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">معلومات الشركة</h2>
                    <p className="text-slate-400">ساعدنا في تخصيص تجربتك</p>
                  </motion.div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-2">اسم الشركة</label>
                      <input
                        type="text"
                        value={onboardingData.companyName}
                        onChange={(e) => saveData({ companyName: e.target.value })}
                        placeholder="أدخل اسم شركتك"
                        className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-2">القطاع</label>
                      <select
                        value={onboardingData.industry}
                        onChange={(e) => saveData({ industry: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      >
                        <option value="">اختر القطاع</option>
                        {INDUSTRIES.map((industry) => (
                          <option key={industry.id} value={industry.id}>
                            {industry.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-2">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={onboardingData.phoneNumber}
                        onChange={(e) => saveData({ phoneNumber: e.target.value })}
                        placeholder="+974 XXXX XXXX"
                        className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-10">
                    <button
                      onClick={prevStep}
                      className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-5 h-5" />
                      <span>رجوع</span>
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                    >
                      <span>التالي</span>
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Fleet Details */}
              {currentStep === 3 && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-800 p-8 lg:p-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <Truck className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">تفاصيل الأسطول</h2>
                    <p className="text-slate-400">أخبرنا عن حجم وتنوع أسطولك</p>
                  </motion.div>

                  <div className="mb-8">
                    <label className="block text-slate-300 font-semibold mb-4">حجم الأسطول</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {FLEET_SIZES.map((size) => (
                        <motion.button
                          key={size.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => saveData({ fleetSize: size.id })}
                          className={`relative p-6 rounded-2xl border-2 transition-all ${
                            onboardingData.fleetSize === size.id
                              ? 'bg-teal-500/10 border-teal-500'
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <size.icon className={`w-10 h-10 mx-auto mb-3 ${onboardingData.fleetSize === size.id ? 'text-teal-500' : 'text-slate-400'}`} />
                          <p className={`text-2xl font-bold mb-1 ${onboardingData.fleetSize === size.id ? 'text-teal-500' : 'text-white'}`}>
                            {size.label}
                          </p>
                          <p className="text-sm text-slate-400">{size.description}</p>
                          {onboardingData.fleetSize === size.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 left-3 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-4">أنواع المركبات</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {VEHICLE_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <motion.button
                            key={type.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleVehicleType(type.id)}
                            className={`relative p-5 rounded-2xl border-2 transition-all ${
                              onboardingData.vehicleTypes.includes(type.id)
                                ? 'bg-teal-500/10 border-teal-500'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <Icon className={`w-8 h-8 mx-auto mb-2 ${onboardingData.vehicleTypes.includes(type.id) ? 'text-teal-500' : 'text-slate-400'}`} />
                            <p className={`text-sm font-semibold ${onboardingData.vehicleTypes.includes(type.id) ? 'text-teal-500' : 'text-white'}`}>
                              {type.label}
                            </p>
                            {onboardingData.vehicleTypes.includes(type.id) && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 left-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-10">
                    <button
                      onClick={prevStep}
                      className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-5 h-5" />
                      <span>رجوع</span>
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                    >
                      <span>التالي</span>
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Features */}
              {currentStep === 4 && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-800 p-8 lg:p-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">المميزات المفضلة</h2>
                    <p className="text-slate-400">اختر المميزات التي تهمك أكثر</p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {FEATURES.map((feature) => {
                      const Icon = feature.icon;
                      const isSelected = onboardingData.features.includes(feature.id);
                      return (
                        <motion.button
                          key={feature.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleFeature(feature.id)}
                          className={`relative p-5 rounded-2xl border-2 text-right transition-all ${
                            isSelected
                              ? 'bg-teal-500/10 border-teal-500 shadow-lg shadow-teal-500/20'
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-teal-500' : 'bg-slate-700'}`}>
                              <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-bold mb-1 ${isSelected ? 'text-teal-500' : 'text-white'}`}>
                                {feature.label}
                              </p>
                              <p className="text-sm text-slate-400">{feature.description}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 left-3 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={prevStep}
                      className="flex-1 px-6 py-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-5 h-5" />
                      <span>رجوع</span>
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                    >
                      <span>إكمال</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Success */}
              {currentStep === 5 && (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/30"
                  >
                    <Check className="w-16 h-16 text-white" />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl font-bold text-white mb-4"
                  >
                    شكراً لك!
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed"
                  >
                    استلمنا معلوماتك بنجاح.
                    <br />
                    فريقنا سيتواصل معك قريباً لعرض تجربة حية للنظام
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto mb-8"
                  >
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-teal-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">ماذا بعد؟</h3>
                    </div>

                    <div className="space-y-4 text-right">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white font-bold text-sm">1</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold mb-1">مراجعة المعلومات</p>
                          <p className="text-slate-400 text-sm">سيقوم فريقنا بمراجعة احتياجاتك</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white font-bold text-sm">2</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold mb-1">التواصل معك</p>
                          <p className="text-slate-400 text-sm">سنتواصل معك خلال 24 ساعة</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white font-bold text-sm">3</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold mb-1">عرض تجريبي حي</p>
                          <p className="text-slate-400 text-sm">سنقوم بعرض النظام لك بشكل مباشر</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate('/enterprise')}
                    className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-teal-500/30 transition-all flex items-center gap-3 mx-auto"
                  >
                    العودة للصفحة الرئيسية
                    <ArrowLeft className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    onClick={prevStep}
                    className="block mx-auto mt-4 text-slate-400 hover:text-white transition-colors font-semibold flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>تعديل المعلومات</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <button
            key={step}
            onClick={() => {
              if (step <= currentStep) {
                setDirection(step > currentStep ? 1 : -1);
                setCurrentStep(step);
              }
            }}
            className={`w-3 h-3 rounded-full transition-all ${
              step === currentStep
                ? 'bg-teal-500 w-8'
                : step < currentStep
                ? 'bg-teal-500/50'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
