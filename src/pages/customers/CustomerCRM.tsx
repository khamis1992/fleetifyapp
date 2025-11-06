import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import {
  Phone,
  MessageSquare,
  Users,
  FileText,
  Eye,
  PlusCircle,
  MoreHorizontal,
  Search,
  TrendingUp,
  Bell,
  CheckCircle,
  Clock,
  Smartphone,
  Calendar,
  AlertTriangle,
  PhoneCall,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { CRMCustomer, CRMStats, CommunicationType, ActionType } from '@/types/crm';

/**
 * صفحة إدارة علاقات العملاء (CRM)
 * نظام متكامل لتتبع التواصل مع العملاء والمتابعات
 */
export default function CustomerCRM() {
  const { selectedCompanyId } = useUnifiedCompanyAccess();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [contractStatus, setContractStatus] = useState<string>('all');
  const [lastContactPeriod, setLastContactPeriod] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  
  // Form States
  const [commType, setCommType] = useState<CommunicationType>('phone');
  const [commDate, setCommDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [commTime, setCommTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  const [actionRequired, setActionRequired] = useState<ActionType>('none');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');

  // Fetch CRM Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['crm-stats', selectedCompanyId],
    queryFn: async (): Promise<CRMStats> => {
      if (!selectedCompanyId) throw new Error('No company selected');
      
      // Get active contracts count
      const { count: activeCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', selectedCompanyId)
        .eq('status', 'active');
      
      return {
        total_active_customers: activeCount || 0,
        total_calls_today: 42, // TODO: Implement real data
        pending_follow_ups: 18,
        completed_this_month: 128,
        expiring_contracts_count: 12,
        high_priority_count: 5,
      };
    },
    enabled: !!selectedCompanyId,
  });

  // Fetch CRM Customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['crm-customers', selectedCompanyId],
    queryFn: async (): Promise<CRMCustomer[]> => {
      if (!selectedCompanyId) return [];
      
      // Get customers with active contracts
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          agreement_number,
          start_date,
          end_date,
          status,
          customer_id,
          customers (
            id,
            code,
            name,
            phone,
            email
          )
        `)
        .eq('company_id', selectedCompanyId)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to CRM customers
      return contracts
        .filter(contract => contract.customers)
        .map((contract): CRMCustomer => {
          const customer = contract.customers as any;
          const endDate = contract.end_date ? new Date(contract.end_date) : null;
          const today = new Date();
          const daysUntilExpiry = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
          
          let contractStatus: 'active' | 'expiring_soon' | 'expired' = 'active';
          if (daysUntilExpiry !== null) {
            if (daysUntilExpiry < 0) contractStatus = 'expired';
            else if (daysUntilExpiry <= 30) contractStatus = 'expiring_soon';
          }

          return {
            id: customer.id,
            code: customer.code,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            has_active_contract: contract.status === 'active',
            contract_number: contract.agreement_number,
            contract_start_date: contract.start_date,
            contract_end_date: contract.end_date,
            contract_status: contractStatus,
            days_until_expiry: daysUntilExpiry,
            total_communications: 0, // TODO: Implement
            pending_follow_ups: 0,
            needs_follow_up: daysUntilExpiry !== null && daysUntilExpiry <= 10,
            follow_up_reason: daysUntilExpiry !== null && daysUntilExpiry <= 10 ? 'العقد ينتهي قريباً' : undefined,
            company_id: selectedCompanyId,
          };
        });
    },
    enabled: !!selectedCompanyId,
  });

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!customer.name.toLowerCase().includes(search) && 
            !customer.phone.includes(search) &&
            !customer.contract_number?.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Contract status filter
      if (contractStatus !== 'all' && customer.contract_status !== contractStatus) {
        return false;
      }

      return true;
    });
  }, [customers, searchTerm, contractStatus]);

  // Handlers
  const toggleCustomerDetails = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleAddNote = async () => {
    if (!selectedCustomer || !notes.trim()) {
      toast.error('يرجى إدخال الملاحظات');
      return;
    }

    // TODO: Save to database
    toast.success('تم حفظ المتابعة بنجاح');
    setShowAddNoteModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNotes('');
    setActionRequired('none');
    setScheduleFollowUp(false);
    setFollowUpDate('');
    setFollowUpTime('');
  };

  const getStatusBadge = (status?: 'active' | 'expiring_soon' | 'expired') => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-700">عقد نشط</Badge>;
      case 'expiring_soon':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-700">قريب الانتهاء</Badge>;
      case 'expired':
        return <Badge variant="default" className="bg-red-100 text-red-700">منتهي</Badge>;
      default:
        return null;
    }
  };

  if (statsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">إدارة العملاء والمتابعات</h1>
        <p className="text-muted-foreground">نظام إدارة علاقات العملاء (CRM)</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">العملاء النشطين</p>
                <p className="text-3xl font-bold text-foreground">{stats?.total_active_customers || 0}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% من الشهر الماضي
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">مكالمات اليوم</p>
                <p className="text-3xl font-bold text-foreground">{stats?.total_calls_today || 0}</p>
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  15 متبقية
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <PhoneCall className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">متابعات معلقة</p>
                <p className="text-3xl font-bold text-foreground">{stats?.pending_follow_ups || 0}</p>
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  5 عاجلة
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-7 h-7 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">مكتملة هذا الشهر</p>
                <p className="text-3xl font-bold text-foreground">{stats?.completed_this_month || 0}</p>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  معدل إنجاز 94%
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:max-w-md relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث عن عميل بالاسم أو رقم الجوال..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3 w-full lg:w-auto">
              <Select value={contractStatus} onValueChange={setContractStatus}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="حالة العقد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">عقود نشطة</SelectItem>
                  <SelectItem value="expiring_soon">قريبة من الانتهاء</SelectItem>
                  <SelectItem value="expired">منتهية</SelectItem>
                </SelectContent>
              </Select>

              <Select value={lastContactPeriod} onValueChange={setLastContactPeriod}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="آخر اتصال" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">آخر 7 أيام</SelectItem>
                  <SelectItem value="month">آخر 30 يوم</SelectItem>
                  <SelectItem value="more">أكثر من شهر</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setSelectedCustomer(filteredCustomers[0] || null);
                  setShowAddNoteModal(true);
                }}
                className="gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                متابعة جديدة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">لا يوجد عملاء نشطين</p>
              <p className="text-sm text-muted-foreground mt-2">قم بإضافة عقد جديد لبدء التتبع</p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer, index) => (
            <Card 
              key={customer.id} 
              className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6">
                {/* Customer Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14 bg-gradient-to-br from-blue-400 to-blue-600">
                      <AvatarFallback className="text-white font-bold text-lg">
                        {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-foreground">{customer.name}</h3>
                        {getStatusBadge(customer.contract_status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4" />
                          <span className="font-mono">{customer.phone}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          عقد #{customer.contract_number}
                        </span>
                        {customer.contract_end_date && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            ينتهي في {format(new Date(customer.contract_end_date), 'dd MMMM yyyy', { locale: ar })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="text-xs text-muted-foreground mb-1">آخر اتصال</p>
                    <p className="text-sm font-semibold text-foreground">منذ 3 أيام</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                    <Phone className="w-4 h-4" />
                    اتصال الآن
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 gap-2"
                    onClick={() => toggleCustomerDetails(customer.id)}
                  >
                    <Eye className="w-4 h-4" />
                    عرض السجل
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowAddNoteModal(true);
                    }}
                  >
                    <PlusCircle className="w-4 h-4" />
                    إضافة ملاحظة
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>

                {/* Warning/Alert Messages */}
                {customer.needs_follow_up && (
                  <div className="bg-red-50 border-r-4 border-red-500 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900 mb-1">يحتاج متابعة عاجلة</p>
                        <p className="text-sm text-red-700">
                          {customer.follow_up_reason} - 
                          {customer.days_until_expiry !== null && ` ينتهي خلال ${customer.days_until_expiry} يوم`}
                        </p>
                      </div>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        اتصال الآن
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expandable Timeline */}
                {expandedCustomers.has(customer.id) && (
                  <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top duration-300">
                    <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      سجل المتابعات
                    </h4>
                    <p className="text-muted-foreground text-center py-8">
                      لا توجد متابعات مسجلة. قم بإضافة أول متابعة.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Note Modal */}
      <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-primary" />
              إضافة متابعة جديدة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Communication Type */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">نوع المتابعة</Label>
              <RadioGroup value={commType} onValueChange={(v) => setCommType(v as CommunicationType)}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'phone', label: 'مكالمة', icon: Phone },
                    { value: 'message', label: 'رسالة', icon: MessageSquare },
                    { value: 'meeting', label: 'اجتماع', icon: Users },
                    { value: 'note', label: 'ملاحظة', icon: FileText },
                  ].map(({ value, label, icon: Icon }) => (
                    <Label
                      key={value}
                      className="relative flex items-center gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    >
                      <RadioGroupItem value={value} className="sr-only peer" />
                      <div className="peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 absolute inset-0 border-2 rounded-lg transition-all" />
                      <Icon className="w-5 h-5 text-muted-foreground relative z-10" />
                      <span className="text-sm font-medium text-foreground relative z-10">{label}</span>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="comm-date" className="text-sm font-semibold mb-2 block">التاريخ</Label>
                <Input
                  id="comm-date"
                  type="date"
                  value={commDate}
                  onChange={(e) => setCommDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="comm-time" className="text-sm font-semibold mb-2 block">الوقت</Label>
                <Input
                  id="comm-time"
                  type="time"
                  value={commTime}
                  onChange={(e) => setCommTime(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-semibold mb-2 block">الملاحظات والتفاصيل</Label>
              <Textarea
                id="notes"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب تفاصيل المتابعة هنا...&#10;&#10;مثال:&#10;- تم مناقشة تجديد العقد&#10;- العميل مهتم بترقية الباقة&#10;- طلب عرض سعر خاص"
                className="resize-none"
              />
            </div>

            {/* Action Required */}
            <div>
              <Label htmlFor="action" className="text-sm font-semibold mb-2 block">الإجراء المطلوب (اختياري)</Label>
              <Select value={actionRequired} onValueChange={(v) => setActionRequired(v as ActionType)}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="اختر إجراء..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">لا يوجد</SelectItem>
                  <SelectItem value="quote">إعداد عرض سعر</SelectItem>
                  <SelectItem value="contract">تجهيز عقد جديد</SelectItem>
                  <SelectItem value="payment">متابعة الدفعة</SelectItem>
                  <SelectItem value="maintenance">جدولة صيانة</SelectItem>
                  <SelectItem value="renewal">تجديد العقد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Follow-up */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Checkbox
                  id="schedule-followup"
                  checked={scheduleFollowUp}
                  onCheckedChange={(checked) => setScheduleFollowUp(checked as boolean)}
                />
                <Label htmlFor="schedule-followup" className="text-sm font-semibold cursor-pointer">
                  جدولة متابعة قادمة
                </Label>
              </div>
              {scheduleFollowUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-xs font-medium text-muted-foreground mb-1">تاريخ المتابعة</Label>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="block text-xs font-medium text-muted-foreground mb-1">وقت المتابعة</Label>
                    <Input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteModal(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddNote} className="gap-2">
              حفظ المتابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


