/**
 * Notification Bell Component
 * جرس التنبيهات مع قائمة منسدلة
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_overdue':
      case 'payment_due_today':
      case 'payment_due_tomorrow':
        return <DollarSign className="w-4 h-4" />;
      case 'contract_expiring_30':
      case 'contract_expiring_7':
      case 'contract_expired':
      case 'contract_assigned':
      case 'contract_unassigned':
        return <FileText className="w-4 h-4" />;
      case 'followup_scheduled':
      case 'followup_due_today':
      case 'followup_overdue':
        return <Calendar className="w-4 h-4" />;
      case 'performance_alert':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'bg-red-50 border-red-200 text-red-700';
    if (priority === 'high') return 'bg-orange-50 border-orange-200 text-orange-700';
    
    switch (type) {
      case 'payment_overdue':
      case 'followup_overdue':
      case 'contract_expired':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'payment_due_today':
      case 'followup_due_today':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'contract_assigned':
      case 'task_completed':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate to link if exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-neutral-100"
        >
          <Bell className="w-5 h-5 text-neutral-600" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[400px] p-0">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900">التنبيهات</h3>
            <p className="text-xs text-neutral-500">
              {unreadCount > 0 ? `${unreadCount} غير مقروء` : 'لا توجد تنبيهات جديدة'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs"
            >
              <CheckCheck className="ml-1 h-3 w-3" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {notifications.map((notification: any, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'group relative p-3 rounded-lg mb-2 cursor-pointer transition-all border',
                    notification.isRead
                      ? 'bg-white hover:bg-neutral-50 border-neutral-100'
                      : getNotificationColor(notification.type, notification.priority || 'normal')
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      notification.isRead ? 'bg-neutral-100 text-neutral-600' : 'bg-white/50'
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-bold mb-1',
                        notification.isRead ? 'text-neutral-600' : 'text-neutral-900'
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-neutral-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 px-4">
            <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm text-neutral-500 font-medium">لا توجد تنبيهات</p>
            <p className="text-xs text-neutral-400 mt-1">ستظهر التنبيهات هنا عند حدوث أحداث مهمة</p>
          </div>
        )}

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/notifications')}
              >
                عرض جميع التنبيهات
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
