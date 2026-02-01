/**
 * Mobile Notifications Page
 * صفحة الإشعارات
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  Trash2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeNotifications } from '@/hooks/useEmployeeNotifications';
import { MobileEmployeeLayout } from '@/components/mobile/employee/layout/MobileEmployeeLayout';
import { MobileEmployeeHeader } from '@/components/mobile/employee/layout/MobileEmployeeHeader';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { NotificationType } from '@/types/mobile-employee.types';

type TabType = 'all' | 'unread' | 'important';

export const MobileNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const {
    notifications,
    unreadNotifications,
    importantNotifications,
    stats,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useEmployeeNotifications();

  const getDisplayNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return unreadNotifications;
      case 'important':
        return importantNotifications;
      default:
        return notifications;
    }
  };

  const displayNotifications = getDisplayNotifications();

  const getNotificationIcon = (type: NotificationType) => {
    const icons = {
      payment_received: DollarSign,
      contract_expiring: AlertCircle,
      task_completed: CheckCircle,
      followup_reminder: Calendar,
      overdue_payment: AlertCircle,
      new_task_assigned: FileText,
    };
    return icons[type] || Bell;
  };

  const getNotificationStyle = (type: NotificationType) => {
    const styles = {
      payment_received: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      contract_expiring: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
      },
      task_completed: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      followup_reminder: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      overdue_payment: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
      },
      new_task_assigned: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
    };
    return styles[type] || styles.followup_reminder;
  };

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const tabs = [
    { id: 'all' as TabType, label: 'الكل', count: stats.total },
    { id: 'unread' as TabType, label: 'غير مقروءة', count: stats.unread },
    { id: 'important' as TabType, label: 'مهمة', count: stats.important },
  ];

  return (
    <MobileEmployeeLayout showFAB={false} showBottomNav={false}>
      <div className="space-y-4">
        {/* Header */}
        <div className="px-4 pt-4">
          <MobileEmployeeHeader
            title="الإشعارات"
            subtitle={`${stats.total} إشعار`}
            showBack
          />
        </div>

        {/* Tabs */}
        <div className="px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                  activeTab === tab.id
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                    : 'bg-white/80 text-slate-600 border border-slate-200/50 hover:bg-slate-100'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Mark All as Read */}
        {stats.unread > 0 && activeTab === 'unread' && (
          <div className="px-4">
            <button
              onClick={() => markAllAsRead()}
              className="w-full py-2 text-sm text-teal-600 font-medium hover:text-teal-700 transition-colors"
            >
              ✓ تحديد الكل كمقروء
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="px-4 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-teal-600">جاري التحميل...</p>
              </div>
            </div>
          ) : displayNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-8 text-center"
            >
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">لا توجد إشعارات</p>
              <p className="text-xs text-slate-500 mt-1">
                {activeTab === 'unread' && 'جميع الإشعارات مقروءة 🎉'}
                {activeTab === 'important' && 'لا توجد إشعارات مهمة'}
                {activeTab === 'all' && 'لم تتلق أي إشعارات بعد'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {displayNotifications.map((notification, index) => {
                  const Icon = getNotificationIcon(notification.type);
                  const style = getNotificationStyle(notification.type);

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                      className={cn(
                        'border rounded-2xl p-4 cursor-pointer transition-all',
                        notification.is_read
                          ? 'bg-white/60 border-slate-200/50'
                          : `${style.bg} ${style.border}`,
                        'hover:shadow-lg active:scale-[0.98]'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-xl', style.iconBg)}>
                          <Icon className={cn('w-5 h-5', style.iconColor)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={cn(
                              'text-sm font-semibold',
                              notification.is_read ? 'text-slate-600' : 'text-slate-900'
                            )}>
                              {notification.title_ar || notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="text-xs text-slate-600 mb-2">
                            {notification.message_ar || notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ar,
                              })}
                            </span>

                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </MobileEmployeeLayout>
  );
};

export default MobileNotifications;
