import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  RefreshCw,
  Clock,
  Home,
  Wrench,
  TrendingUp,
  AlertCircle,
  XCircle,
  Bell,
  Filter
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PropertyAlert {
  id: string;
  type: 'contract_expiry' | 'payment_overdue' | 'maintenance_due' | 'vacant_property' | 'contract_renewal' | 'document_expiry';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  property: string;
  daysRemaining?: number;
  amount?: number;
  dueDate: Date;
  acknowledged: boolean;
  createdAt: Date;
}

export const AdvancedPropertyAlerts: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Mock alerts data
  const mockAlerts: PropertyAlert[] = [
    {
      id: '1',
      type: 'contract_expiry',
      priority: 'high',
      title: 'انتهاء عقد فيلا العارضية',
      description: 'عقد الإيجار ينتهي خلال 5 أيام',
      property: 'فيلا العارضية',
      daysRemaining: 5,
      dueDate: addDays(new Date(), 5),
      acknowledged: false,
      createdAt: new Date()
    },
    {
      id: '2',
      type: 'payment_overdue',
      priority: 'high',
      title: 'دفعة متأخرة - شقة الجابرية',
      description: 'دفعة إيجار متأخرة منذ 10 أيام',
      property: 'شقة الجابرية',
      amount: 800,
      daysRemaining: -10,
      dueDate: addDays(new Date(), -10),
      acknowledged: false,
      createdAt: addDays(new Date(), -10)
    },
    {
      id: '3',
      type: 'maintenance_due',
      priority: 'medium',
      title: 'صيانة دورية مستحقة',
      description: 'صيانة أجهزة التكييف في مكتب السالمية',
      property: 'مكتب السالمية',
      dueDate: addDays(new Date(), 2),
      acknowledged: false,
      createdAt: new Date()
    },
    {
      id: '4',
      type: 'vacant_property',
      priority: 'medium',
      title: 'عقار شاغر لفترة طويلة',
      description: 'مستودع الفحيحيل شاغر منذ 45 يوم',
      property: 'مستودع الفحيحيل',
      daysRemaining: 45,
      dueDate: addDays(new Date(), -45),
      acknowledged: false,
      createdAt: addDays(new Date(), -45)
    },
    {
      id: '5',
      type: 'contract_renewal',
      priority: 'medium',
      title: 'عقد مؤهل للتجديد',
      description: 'عقد شقة الفنطاس مؤهل للتجديد',
      property: 'شقة الفنطاس',
      daysRemaining: 30,
      dueDate: addDays(new Date(), 30),
      acknowledged: false,
      createdAt: new Date()
    },
    {
      id: '6',
      type: 'document_expiry',
      priority: 'low',
      title: 'انتهاء وثيقة ملكية',
      description: 'وثيقة ملكية بيت الشامية تنتهي قريباً',
      property: 'بيت الشامية',
      daysRemaining: 60,
      dueDate: addDays(new Date(), 60),
      acknowledged: false,
      createdAt: new Date()
    }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'contract_expiry': return <FileText className="h-4 w-4" />;
      case 'payment_overdue': return <CreditCard className="h-4 w-4" />;
      case 'maintenance_due': return <Wrench className="h-4 w-4" />;
      case 'vacant_property': return <Home className="h-4 w-4" />;
      case 'contract_renewal': return <RefreshCw className="h-4 w-4" />;
      case 'document_expiry': return <FileText className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'low': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      case 'low': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عاجل';
      case 'medium': return 'هام';
      case 'low': return 'عادي';
      default: return priority;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'contract_expiry': return 'انتهاء عقد';
      case 'payment_overdue': return 'دفعة متأخرة';
      case 'maintenance_due': return 'صيانة مستحقة';
      case 'vacant_property': return 'عقار شاغر';
      case 'contract_renewal': return 'تجديد عقد';
      case 'document_expiry': return 'انتهاء وثيقة';
      default: return type;
    }
  };

  const getDaysRemainingText = (alert: PropertyAlert) => {
    if (!alert.daysRemaining) return '';
    
    if (alert.daysRemaining < 0) {
      return `متأخر منذ ${Math.abs(alert.daysRemaining)} يوم`;
    } else if (alert.daysRemaining === 0) {
      return 'مستحق اليوم';
    } else {
      return `خلال ${alert.daysRemaining} يوم`;
    }
  };

  const filteredAlerts = mockAlerts.filter(alert => {
    if (filter !== 'all' && alert.type !== filter) return false;
    if (priorityFilter !== 'all' && alert.priority !== priorityFilter) return false;
    return true;
  });

  const alertsByPriority = {
    high: filteredAlerts.filter(alert => alert.priority === 'high'),
    medium: filteredAlerts.filter(alert => alert.priority === 'medium'),
    low: filteredAlerts.filter(alert => alert.priority === 'low')
  };

  const alertsByType = {
    contract_expiry: filteredAlerts.filter(alert => alert.type === 'contract_expiry'),
    payment_overdue: filteredAlerts.filter(alert => alert.type === 'payment_overdue'),
    maintenance_due: filteredAlerts.filter(alert => alert.type === 'maintenance_due'),
    vacant_property: filteredAlerts.filter(alert => alert.type === 'vacant_property'),
    contract_renewal: filteredAlerts.filter(alert => alert.type === 'contract_renewal'),
    document_expiry: filteredAlerts.filter(alert => alert.type === 'document_expiry')
  };

  const renderAlert = (alert: PropertyAlert, index: number) => (
    <motion.div
      key={alert.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-4 border rounded-lg transition-all hover:shadow-md",
        getPriorityColor(alert.priority)
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center gap-2">
            {getAlertIcon(alert.type)}
            {getPriorityIcon(alert.priority)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <Badge variant="secondary" className="text-xs">
                {getAlertTypeLabel(alert.type)}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {alert.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                <span>{alert.property}</span>
              </div>
              
              {alert.daysRemaining !== undefined && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className={cn(
                    alert.daysRemaining < 0 ? 'text-red-600 font-medium' :
                    alert.daysRemaining <= 7 ? 'text-orange-600 font-medium' :
                    'text-muted-foreground'
                  )}>
                    {getDaysRemainingText(alert)}
                  </span>
                </div>
              )}
              
              {alert.amount && (
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span className="font-medium">{alert.amount} د.ك</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(alert.dueDate, 'dd/MM/yyyy', { locale: ar })}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={alert.priority === 'high' ? 'destructive' : 'secondary'} 
            className="text-xs"
          >
            {getPriorityLabel(alert.priority)}
          </Badge>
          <Button size="sm" variant="outline">
            تأكيد
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const totalAlerts = filteredAlerts.length;
  const acknowledgedAlerts = filteredAlerts.filter(alert => alert.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-500" />
            تنبيهات العقارات
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalAlerts}
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            إدارة تنبيهات العقود والمدفوعات والصيانة
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            تحديث
          </Button>
          <Button variant="outline" size="sm">
            تأكيد الكل
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فلاتر التنبيهات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع التنبيه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="contract_expiry">انتهاء عقد</SelectItem>
                <SelectItem value="payment_overdue">دفعة متأخرة</SelectItem>
                <SelectItem value="maintenance_due">صيانة مستحقة</SelectItem>
                <SelectItem value="vacant_property">عقار شاغر</SelectItem>
                <SelectItem value="contract_renewal">تجديد عقد</SelectItem>
                <SelectItem value="document_expiry">انتهاء وثيقة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="مستوى الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                <SelectItem value="high">عاجل</SelectItem>
                <SelectItem value="medium">هام</SelectItem>
                <SelectItem value="low">عادي</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setFilter('all');
              setPriorityFilter('all');
            }}>
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عاجل</p>
                <p className="text-2xl font-bold text-red-600">{alertsByPriority.high.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">هام</p>
                <p className="text-2xl font-bold text-orange-600">{alertsByPriority.medium.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عادي</p>
                <p className="text-2xl font-bold text-yellow-600">{alertsByPriority.low.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مؤكد</p>
                <p className="text-2xl font-bold text-green-600">{acknowledgedAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Tabs */}
      <Tabs defaultValue="priority" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="priority">حسب الأولوية</TabsTrigger>
          <TabsTrigger value="type">حسب النوع</TabsTrigger>
        </TabsList>

        <TabsContent value="priority" className="space-y-4">
          {/* High Priority Alerts */}
          {alertsByPriority.high.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  تنبيهات عاجلة ({alertsByPriority.high.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsByPriority.high.map((alert, index) => renderAlert(alert, index))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medium Priority Alerts */}
          {alertsByPriority.medium.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  تنبيهات هامة ({alertsByPriority.medium.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsByPriority.medium.map((alert, index) => renderAlert(alert, index))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Priority Alerts */}
          {alertsByPriority.low.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Clock className="h-5 w-5" />
                  تنبيهات عادية ({alertsByPriority.low.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsByPriority.low.map((alert, index) => renderAlert(alert, index))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="type" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(alertsByType).map(([type, alerts]) => (
              alerts.length > 0 && (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getAlertIcon(type)}
                      {getAlertTypeLabel(type)} ({alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {alerts.map((alert, index) => renderAlert(alert, index))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {totalAlerts === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">لا توجد تنبيهات</h3>
              <p className="text-muted-foreground">
                جميع العقارات والعقود في حالة جيدة
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};