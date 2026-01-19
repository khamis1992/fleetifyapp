import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MapPin, Car, CheckCircle, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

const notifications = [
  { company: 'شركة المقتطف', action: 'انضم إلينا', time: 'منذ دقيقة', city: 'الدوحة' },
  { company: 'القابضة للسيارات', action: 'أضاف 15 مركبة', time: 'منذ 3 دقائق', city: 'الريان' },
  { company: 'مؤسسة الخور', action: 'سجل عقد جديد', time: 'منذ 5 دقائق', city: 'الخور' },
  { company: 'الوكرة للنقل', action: 'تجديد الاشتراك', time: 'منذ 8 دقائق', city: 'الوكرة' },
  { company: 'شمال السياحة', action: 'انضم إلينا', time: 'منذ 12 دقيقة', city: 'الشمال' },
  { company: 'الدوحة ليموزين', action: 'أضاف 8 مركبات', time: 'منذ 15 دقيقة', city: 'الدوحة' },
  { company: 'ريان للrental', action: 'مدحنا بخمسة نجوم', time: 'منذ 18 دقيقة', city: 'الريان' },
  { company: 'قطر للسيارات', action: 'سجل 10 عقود', time: 'منذ 22 دقيقة', city: 'الدوحة' },
];

const statsUpdates = [
  { label: 'مركبة مضافة', value: '+5', icon: Car },
  { label: 'عقد جديد', value: '+1', icon: CheckCircle },
  { label: 'تقييم 5 نجوم', value: '⭐⭐⭐⭐⭐', icon: Star },
];

export function EnterpriseFloatingElements() {
  const [currentNotification, setCurrentNotification] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [statUpdate, setStatUpdate] = useState(0);

  // Cycle through notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setShowNotification(false);
      setTimeout(() => {
        setCurrentNotification((prev) => (prev + 1) % notifications.length);
        setShowNotification(true);
      }, 300);
    }, 6000);

    // Show first notification immediately
    setTimeout(() => setShowNotification(true), 1000);

    return () => clearInterval(interval);
  }, []);

  // Cycle through stat updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStatUpdate((prev) => (prev + 1) % statsUpdates.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const notification = notifications[currentNotification];
  const stat = statsUpdates[statUpdate];

  return (
    <>
      {/* Floating Notification Bubble */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-6 bottom-6 z-50 max-w-sm"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 shadow-2xl border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bell className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base mb-1">{notification.company}</p>
                  <p className="text-blue-300 text-sm mb-2">{notification.action}</p>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>{notification.city}</span>
                    <span>•</span>
                    <span>{notification.time}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6, ease: 'linear' }}
                className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Stat Update */}
      <motion.div
        key={statUpdate}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed right-6 bottom-6 z-50"
      >
        <div className="bg-white rounded-2xl p-4 shadow-2xl border-2 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-green-600 font-bold text-lg">{stat.value}</p>
              <p className="text-slate-600 text-xs">{stat.label}</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
          </div>
        </div>
      </motion.div>

      {/* Top Stats Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold">نظام مباشر - {Math.floor(Math.random() * 50 + 100)} نشط الآن</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span className="text-sm font-bold">479+ مركبة</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-bold">5 مدن</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">4.9 تقييم</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
