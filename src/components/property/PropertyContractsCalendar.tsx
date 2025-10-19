import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CreditCard, 
  Wrench, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'contract_expiry' | 'contract_renewal' | 'payment_due' | 'maintenance';
  date: Date;
  property: string;
  details: any;
}

export const PropertyContractsCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Mock events data
  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'انتهاء عقد فيلا العارضية',
      type: 'contract_expiry',
      date: addDays(new Date(), 5),
      property: 'فيلا العارضية',
      details: {
        contractNumber: 'C-2024-001',
        tenant: 'أحمد محمد',
        amount: 1200
      }
    },
    {
      id: '2',
      title: 'استحقاق إيجار شقة الجابرية',
      type: 'payment_due',
      date: addDays(new Date(), 3),
      property: 'شقة الجابرية',
      details: {
        amount: 800,
        tenant: 'سارة أحمد',
        dueDate: addDays(new Date(), 3)
      }
    },
    {
      id: '3',
      title: 'صيانة دورية للمكتب',
      type: 'maintenance',
      date: addDays(new Date(), 7),
      property: 'مكتب السالمية',
      details: {
        type: 'صيانة دورية',
        description: 'صيانة أجهزة التكييف'
      }
    },
    {
      id: '4',
      title: 'تجديد عقد المستودع',
      type: 'contract_renewal',
      date: addDays(new Date(), 10),
      property: 'مستودع الفحيحيل',
      details: {
        contractNumber: 'C-2024-002',
        tenant: 'شركة التجارة',
        currentAmount: 2000,
        proposedAmount: 2200
      }
    }
  ];

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'contract_expiry': return <FileText className="h-4 w-4" />;
      case 'contract_renewal': return <RefreshCw className="h-4 w-4" />;
      case 'payment_due': return <CreditCard className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'contract_expiry': return 'bg-red-500 text-white';
      case 'contract_renewal': return 'bg-orange-500 text-white';
      case 'payment_due': return 'bg-blue-500 text-white';
      case 'maintenance': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'contract_expiry': return 'انتهاء عقد';
      case 'contract_renewal': return 'تجديد عقد';
      case 'payment_due': return 'استحقاق دفعة';
      case 'maintenance': return 'صيانة';
      default: return type;
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return mockEvents.filter(event => isSameDay(event.date, date));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">تقويم العقارات</h2>
          <p className="text-muted-foreground">
            تتبع مواعيد العقود والمدفوعات والصيانة
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: unknown) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">شهري</SelectItem>
              <SelectItem value="week">أسبوعي</SelectItem>
              <SelectItem value="day">يومي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentDate, 'MMMM yyyy', { locale: ar })}
            </CardTitle>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                اليوم
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Calendar Grid */}
          <div className="space-y-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
              {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                <div key={day} className="p-2">{day}</div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((date) => {
                const dayEvents = getEventsForDate(date);
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <motion.div
                    key={date.toISOString()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "min-h-[120px] p-2 border rounded-lg transition-colors cursor-pointer hover:bg-accent/50",
                      isToday && "ring-2 ring-primary",
                      !isCurrentMonth && "text-muted-foreground bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      )}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    
                    {/* Events for this day */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "text-xs p-1 rounded truncate cursor-pointer transition-opacity hover:opacity-80",
                            getEventTypeColor(event.type)
                          )}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex items-center gap-1">
                            {getEventTypeIcon(event.type)}
                            <span className="truncate">{event.title}</span>
                          </div>
                        </motion.div>
                      ))}
                      
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} المزيد
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            الأحداث القادمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockEvents
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 5)
              .map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    getEventTypeColor(event.type)
                  )}>
                    {getEventTypeIcon(event.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{event.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Home className="h-3 w-3" />
                      <span>{event.property}</span>
                      <span>•</span>
                      <span>{format(event.date, 'dd/MM/yyyy', { locale: ar })}</span>
                    </div>
                  </div>
                  
                  <Badge variant="secondary">
                    {getEventTypeLabel(event.type)}
                  </Badge>
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getEventTypeIcon(selectedEvent.type)}
                  تفاصيل الحدث
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">{selectedEvent.title}</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.property}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getEventTypeColor(selectedEvent.type)}>
                    {getEventTypeLabel(selectedEvent.type)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(selectedEvent.date, 'dd/MM/yyyy', { locale: ar })}
                  </span>
                </div>
                
                {/* Event-specific details */}
                <div className="space-y-2 text-sm">
                  {selectedEvent.type === 'contract_expiry' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم العقد:</span>
                        <span>{selectedEvent.details.contractNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المستأجر:</span>
                        <span>{selectedEvent.details.tenant}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ:</span>
                        <span>{selectedEvent.details.amount} د.ك</span>
                      </div>
                    </>
                  )}
                  
                  {selectedEvent.type === 'payment_due' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المستأجر:</span>
                        <span>{selectedEvent.details.tenant}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ المستحق:</span>
                        <span className="font-medium text-red-600">{selectedEvent.details.amount} د.ك</span>
                      </div>
                    </>
                  )}
                  
                  {selectedEvent.type === 'maintenance' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">نوع الصيانة:</span>
                        <span>{selectedEvent.details.type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الوصف:</span>
                        <p className="mt-1">{selectedEvent.details.description}</p>
                      </div>
                    </>
                  )}
                  
                  {selectedEvent.type === 'contract_renewal' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم العقد:</span>
                        <span>{selectedEvent.details.contractNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المستأجر:</span>
                        <span>{selectedEvent.details.tenant}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الإيجار الحالي:</span>
                        <span>{selectedEvent.details.currentAmount} د.ك</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الإيجار المقترح:</span>
                        <span className="font-medium text-green-600">{selectedEvent.details.proposedAmount} د.ك</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1">
                    عرض التفاصيل
                  </Button>
                  <Button variant="outline">
                    تذكير
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};