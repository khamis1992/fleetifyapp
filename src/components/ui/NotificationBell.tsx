import { useState } from 'react';
import { Bell } from 'lucide-react';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notificationCount = 3;

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="relative p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
      title="الإشعارات"
    >
      <Bell className="w-5 h-5" />
      {notificationCount > 0 && (
        <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {notificationCount > 9 ? '9+' : notificationCount}
        </span>
      )}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-xl border border-neutral-200 shadow-lg z-50">
          <div className="p-3 border-b border-neutral-100">
            <h3 className="font-semibold text-sm">الإشعارات</h3>
          </div>
          <div className="p-3">
            <p className="text-xs text-neutral-400 text-center py-4">لا توجد إشعارات جديدة</p>
          </div>
        </div>
      )}
    </button>
  );
};