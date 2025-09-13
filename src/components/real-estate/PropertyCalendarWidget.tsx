import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar,
  Clock,
  AlertTriangle,
  DollarSign,
  Home,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { usePropertyContractsCalendar } from '@/hooks/usePropertyContractsCalendar';

const PropertyCalendarWidget: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const { data: events, isLoading } = usePropertyContractsCalendar(startDate, endDate);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'contract_expiry': return AlertTriangle;
      case 'payment_due': return DollarSign;
      case 'maintenance': return Home;
      default: return Clock;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'contract_expiry': return 'bg-red-100 text-red-700 border-red-200';
      case 'payment_due': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'maintenance': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const monthName = new Intl.DateTimeFormat('ar-SA', {
    month: 'long',
    year: 'numeric'
  }).format(currentDate);

  // Get upcoming events (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = events?.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= today && eventDate <= nextWeek;
  }) || [];

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar size={16} />
            التقويم والأحداث القادمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar size={16} />
              التقويم والأحداث
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="h-7 w-7 p-0"
              >
                <ChevronRight size={14} />
              </Button>
              <span className="text-sm font-medium px-2">{monthName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextMonth}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft size={14} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Month Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium text-red-600">
                {events?.filter(e => e.type === 'contract_expiry').length || 0}
              </div>
              <div className="text-xs text-muted-foreground">عقود منتهية</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium text-yellow-600">
                {events?.filter(e => e.type === 'payment_due').length || 0}
              </div>
              <div className="text-xs text-muted-foreground">دفعات مستحقة</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium text-blue-600">
                {events?.filter(e => e.type === 'maintenance').length || 0}
              </div>
              <div className="text-xs text-muted-foreground">صيانة مجدولة</div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Clock size={12} />
              الأحداث القادمة (7 أيام)
            </h4>
            
            <ScrollArea className="h-64">
              <AnimatePresence mode="popLayout">
                {upcomingEvents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <Calendar size={24} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لا توجد أحداث قادمة</p>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event, index) => {
                      const EventIcon = getEventIcon(event.type);
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          layout
                        >
                          <Card className={`border transition-all duration-300 hover:shadow-sm ${getEventColor(event.type)}`}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-md bg-white/50">
                                  <EventIcon size={14} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-sm leading-tight">
                                        {event.title}
                                      </h5>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {event.property || 'غير محدد'}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {formatDate(new Date(event.date))}
                                    </Badge>
                                  </div>
                                  
                                  {event.details && (
                                    <p className="text-xs text-muted-foreground mt-2 truncate">
                                      {event.details}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyCalendarWidget;