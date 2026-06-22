import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info, XCircle, Check, CheckCheck, Bell, ClipboardCheck, ExternalLink } from "lucide-react";
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getNotificationVariant = (type: string) => {
  switch (type) {
    case 'success':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const NotificationsList = () => {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const hasUnread = unreadNotifications.length > 0;

  // التحقق مما إذا كان التنبيه من نوع مهمة تدقيق (لا يمكن وضع علامة مقروء عليه يدوياً)
  const isVerificationTaskNotification = (notification: any) => {
    return notification.related_type === 'verification_task';
  };

  const handleMarkAsRead = (notificationId: string, notification: any) => {
    // لا نسمح بوضع علامة مقروء على تنبيهات مهام التدقيق يدوياً
    if (isVerificationTaskNotification(notification)) {
      return;
    }
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  // فتح مهمة التدقيق
  const handleOpenVerificationTask = (notification: any) => {
    if (notification.related_id) {
      navigate(`/legal/verify/${notification.related_id}`);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-96">
        <div className="space-y-1 p-2">
          {notifications.map((notification) => {
            const isVerificationTask = isVerificationTaskNotification(notification);
            
            return (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'bg-primary/5 border-primary/20' : 'bg-background'
                } ${isVerificationTask && !notification.is_read ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}`}
                onClick={() => {
                  if (isVerificationTask) {
                    handleOpenVerificationTask(notification);
                  } else if (!notification.is_read) {
                    handleMarkAsRead(notification.id, notification);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {isVerificationTask ? (
                    <ClipboardCheck className="h-4 w-4 text-orange-500" />
                  ) : (
                    getNotificationIcon(notification.notification_type)
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      {isVerificationTask && !notification.is_read ? (
                        <Badge className="text-xs bg-orange-500 hover:bg-orange-600">
                          مهمة معلقة
                        </Badge>
                      ) : !notification.is_read ? (
                        <Badge variant={getNotificationVariant(notification.notification_type)} className="text-xs">
                          New
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                      {isVerificationTask && !notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVerificationTask(notification);
                          }}
                          className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100 gap-1 px-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          فتح المهمة
                        </Button>
                      )}
                    </div>
                  </div>
                  {!notification.is_read && !isVerificationTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id, notification);
                      }}
                      disabled={markAsRead.isPending}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};