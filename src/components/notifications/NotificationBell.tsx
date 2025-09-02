import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useNotificationThrottling } from "@/hooks/useNotificationThrottling";
import { NotificationsList } from "./NotificationsList";
import { NotificationControlCenter } from "./NotificationControlCenter";

export const NotificationBell = () => {
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { notificationCount } = useNotificationThrottling();
  
  // Combine regular notifications with throttled notifications
  const totalCount = unreadCount + notificationCount;

  return (
    <div className="flex items-center gap-2">
      {/* Notification Control Center */}
      <NotificationControlCenter />
      
      {/* Notification Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {totalCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {totalCount > 99 ? "99+" : totalCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <NotificationsList />
        </PopoverContent>
      </Popover>
    </div>
  );
};