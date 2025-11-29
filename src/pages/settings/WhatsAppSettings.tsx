/**
 * صفحة إعدادات تقارير واتساب
 * WhatsApp Reports Settings Page
 * تصميم متوافق مع الداشبورد
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  MessageSquare,
  Settings,
  Users,
  Clock,
  Bell,
  Send,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  RefreshCw,
  TestTube,
  Sparkles,
  Wifi,
  WifiOff,
  Calendar,
  FileText,
  History,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useWhatsAppSettings,
  useWhatsAppRecipients,
  useWhatsAppReports,
  useWhatsAppMessageLogs,
  useWhatsAppConnectionStatus,
} from '@/hooks/useWhatsAppReports';
import { whatsAppService } from '@/services/whatsapp';
import type { WhatsAppRecipient, AlertType, ReportType } from '@/services/whatsapp/types';

// ألوان الأدوار - متوافقة مع الداشبورد
const roleColors = {
  manager: 'bg-coral-100 text-coral-600 border-coral-200',
  owner: 'bg-amber-100 text-amber-600 border-amber-200',
  accountant: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  supervisor: 'bg-blue-100 text-blue-600 border-blue-200',
};

const roleLabels = {
  manager: 'مدير',
  owner: 'مالك',
  accountant: 'محاسب',
  supervisor: 'مشرف',
};

// مكون إضافة/تعديل مستلم
const RecipientDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: WhatsAppRecipient;
  onSave: (data: Omit<WhatsAppRecipient, 'id'>) => void;
}> = ({ open, onOpenChange, recipient, onSave }) => {
  const [formData, setFormData] = useState({
    name: recipient?.name || '',
    phone: recipient?.phone || '',
    role: recipient?.role || 'manager' as const,
    isActive: recipient?.isActive ?? true,
    reportTypes: recipient?.reportTypes || ['daily', 'weekly'] as ReportType[],
    alertTypes: recipient?.alertTypes || ['new_contract', 'payment_received'] as AlertType[],
  });

  useEffect(() => {
    if (recipient) {
      setFormData({
        name: recipient.name,
        phone: recipient.phone,
        role: recipient.role,
        isActive: recipient.isActive,
        reportTypes: recipient.reportTypes,
        alertTypes: recipient.alertTypes,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        role: 'manager',
        isActive: true,
        reportTypes: ['daily', 'weekly'],
        alertTypes: ['new_contract', 'payment_received'],
      });
    }
  }, [recipient, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.phone) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  const toggleReportType = (type: ReportType) => {
    setFormData(prev => ({
      ...prev,
      reportTypes: prev.reportTypes.includes(type)
        ? prev.reportTypes.filter(t => t !== type)
        : [...prev.reportTypes, type],
    }));
  };

  const toggleAlertType = (type: AlertType) => {
    setFormData(prev => ({
      ...prev,
      alertTypes: prev.alertTypes.includes(type)
        ? prev.alertTypes.filter(t => t !== type)
        : [...prev.alertTypes, type],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-neutral-900">
            {recipient ? 'تعديل مستلم' : 'إضافة مستلم جديد'}
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            أضف معلومات المستلم وحدد نوع التقارير والتنبيهات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-700">الاسم *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="أحمد محمد"
                className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-700">رقم الهاتف *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+974 XXXX XXXX"
                dir="ltr"
                className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-700">الدور</Label>
            <Select
              value={formData.role}
              onValueChange={(v) => setFormData(p => ({ ...p, role: v as any }))}
            >
              <SelectTrigger className="border-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">مالك</SelectItem>
                <SelectItem value="manager">مدير</SelectItem>
                <SelectItem value="accountant">محاسب</SelectItem>
                <SelectItem value="supervisor">مشرف</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-700">التقارير المطلوبة</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'daily' as ReportType, label: 'يومي' },
                { type: 'weekly' as ReportType, label: 'أسبوعي' },
                { type: 'monthly' as ReportType, label: 'شهري' },
              ].map(({ type, label }) => (
                <Button
                  key={type}
                  variant={formData.reportTypes.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleReportType(type)}
                  className={formData.reportTypes.includes(type) 
                    ? 'bg-coral-500 hover:bg-coral-600 text-white' 
                    : 'border-neutral-200 hover:border-coral-500 hover:text-coral-600'
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-700">التنبيهات المطلوبة</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'new_contract' as AlertType, label: 'عقد جديد' },
                { type: 'payment_received' as AlertType, label: 'دفعة جديدة' },
                { type: 'payment_overdue' as AlertType, label: 'دفعة متأخرة' },
                { type: 'maintenance_required' as AlertType, label: 'صيانة' },
                { type: 'high_value_transaction' as AlertType, label: 'معاملة كبيرة' },
              ].map(({ type, label }) => (
                <Button
                  key={type}
                  variant={formData.alertTypes.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleAlertType(type)}
                  className={formData.alertTypes.includes(type) 
                    ? 'bg-coral-500 hover:bg-coral-600 text-white' 
                    : 'border-neutral-200 hover:border-coral-500 hover:text-coral-600'
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(p => ({ ...p, isActive: checked }))}
              className="data-[state=checked]:bg-coral-500"
            />
            <Label className="text-neutral-700">مفعّل</Label>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-neutral-200"
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-coral-500 hover:bg-coral-600 text-white"
          >
            {recipient ? 'حفظ التغييرات' : 'إضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// الصفحة الرئيسية
const WhatsAppSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('connection');
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<WhatsAppRecipient | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Ultramsg credentials - يتم تحميلها من الإعدادات
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  
  // Hooks
  const { settings, isLoading, saveSettings, isSaving } = useWhatsAppSettings();
  const { recipients, addRecipient, updateRecipient, removeRecipient, toggleRecipient } = useWhatsAppRecipients();
  const { sendDailyReport, sendWeeklyReport, sendTestMessage, isSending } = useWhatsAppReports();
  const { logs } = useWhatsAppMessageLogs(20);
  const { connected, phone, checking, checkStatus } = useWhatsAppConnectionStatus();

  // تحميل الإعدادات المحفوظة وتهيئة الخدمة تلقائياً
  useEffect(() => {
    if (settings && !isInitialized) {
      // تحميل بيانات Ultramsg من الإعدادات
      if (settings.ultramsgInstanceId) {
        setInstanceId(settings.ultramsgInstanceId);
      }
      if (settings.ultramsgToken) {
        setToken(settings.ultramsgToken);
      }
      
      // تهيئة الخدمة تلقائياً إذا كانت البيانات موجودة
      if (settings.ultramsgInstanceId && settings.ultramsgToken) {
        whatsAppService.initialize({ 
          instanceId: settings.ultramsgInstanceId, 
          token: settings.ultramsgToken 
        });
        setIsInitialized(true);
        checkStatus();
      }
    }
  }, [settings, isInitialized, checkStatus]);

  // تهيئة الخدمة يدوياً وحفظ الإعدادات
  const handleInitialize = async () => {
    if (!instanceId || !token) {
      toast.error('يرجى إدخال Instance ID و Token');
      return;
    }
    
    // حفظ الإعدادات في قاعدة البيانات
    try {
      await saveSettings({
        ultramsgInstanceId: instanceId,
        ultramsgToken: token,
      });
      
      whatsAppService.initialize({ instanceId, token });
      setIsInitialized(true);
      checkStatus();
      toast.success('تم تهيئة الخدمة وحفظ الإعدادات');
    } catch (error) {
      toast.error('فشل في حفظ الإعدادات');
    }
  };

  // إرسال رسالة اختبار
  const handleTestMessage = async () => {
    const phone = prompt('أدخل رقم الهاتف للاختبار:');
    if (phone) {
      await sendTestMessage(phone);
    }
  };

  // إضافة/تعديل مستلم
  const handleSaveRecipient = async (data: Omit<WhatsAppRecipient, 'id'>) => {
    try {
      if (editingRecipient) {
        await updateRecipient(editingRecipient.id, data);
        toast.success('تم تحديث المستلم بنجاح');
      } else {
        await addRecipient(data);
        toast.success('تم إضافة المستلم بنجاح');
      }
      setEditingRecipient(undefined);
    } catch (error: any) {
      console.error('Error saving recipient:', error);
      toast.error(`فشل في حفظ المستلم: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0efed]">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header - بنفس تصميم الداشبورد */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
              style={{ boxShadow: '0 4px 20px rgba(232, 90, 79, 0.3)' }}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                إعدادات تقارير واتساب
              </h1>
              <p className="text-sm text-neutral-500">
                إدارة التقارير والتنبيهات التلقائية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <Badge 
              variant="outline" 
              className={cn(
                "px-3 py-1.5 font-medium",
                connected 
                  ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                  : "text-rose-600 border-rose-200 bg-rose-50"
              )}
            >
              {connected ? <Wifi className="w-3.5 h-3.5 ml-1.5" /> : <WifiOff className="w-3.5 h-3.5 ml-1.5" />}
              {connected ? 'متصل' : 'غير متصل'}
            </Badge>
          </div>
        </motion.header>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white p-1 rounded-xl shadow-sm">
            <TabsTrigger 
              value="connection" 
              className="gap-2 data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">الاتصال</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recipients" 
              className="gap-2 data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">المستلمون</span>
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              className="gap-2 data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">الجدولة</span>
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="gap-2 data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">السجل</span>
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-coral-100 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-coral-600" />
                    </div>
                    <div>
                      <CardTitle className="text-neutral-900">إعدادات Ultramsg</CardTitle>
                      <CardDescription className="text-neutral-500">
                        أدخل بيانات حساب Ultramsg للاتصال بواتساب
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-700">Instance ID</Label>
                      <Input
                        value={instanceId}
                        onChange={(e) => setInstanceId(e.target.value)}
                        placeholder="instance12345"
                        dir="ltr"
                        className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-700">Token</Label>
                      <Input
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        type="password"
                        placeholder="••••••••••"
                        dir="ltr"
                        className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={handleInitialize} 
                      className="bg-coral-500 hover:bg-coral-600 text-white shadow-md"
                      style={{ boxShadow: '0 4px 14px rgba(232, 90, 79, 0.3)' }}
                    >
                      <Wifi className="w-4 h-4 ml-2" />
                      اتصال
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => checkStatus()}
                      disabled={checking}
                      className="border-neutral-200 hover:border-coral-500 hover:text-coral-600"
                    >
                      <RefreshCw className={cn("w-4 h-4 ml-2", checking && "animate-spin")} />
                      فحص الاتصال
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleTestMessage}
                      disabled={!connected || isSending}
                      className="border-neutral-200 hover:border-coral-500 hover:text-coral-600"
                    >
                      <TestTube className="w-4 h-4 ml-2" />
                      رسالة اختبار
                    </Button>
                  </div>

                  {/* Connection Info */}
                  {connected && phone && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl bg-emerald-50 border border-emerald-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">متصل بنجاح</p>
                          <p className="text-sm text-neutral-500">الرقم: {phone}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Send className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-neutral-900">إرسال يدوي</CardTitle>
                      <CardDescription className="text-neutral-500">
                        إرسال التقارير يدوياً الآن
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => sendDailyReport()}
                      disabled={!connected || isSending}
                      className="bg-coral-500 hover:bg-coral-600 text-white shadow-md"
                      style={{ boxShadow: '0 4px 14px rgba(232, 90, 79, 0.3)' }}
                    >
                      <Send className="w-4 h-4 ml-2" />
                      إرسال التقرير اليومي
                    </Button>
                    <Button
                      onClick={() => sendWeeklyReport()}
                      disabled={!connected || isSending}
                      variant="outline"
                      className="border-neutral-200 hover:border-coral-500 hover:text-coral-600"
                    >
                      <Send className="w-4 h-4 ml-2" />
                      إرسال التقرير الأسبوعي
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-neutral-900">المستلمون</CardTitle>
                        <CardDescription className="text-neutral-500">
                          إدارة قائمة مستلمي التقارير والتنبيهات
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingRecipient(undefined);
                        setRecipientDialogOpen(true);
                      }}
                      className="bg-coral-500 hover:bg-coral-600 text-white shadow-md"
                      style={{ boxShadow: '0 4px 14px rgba(232, 90, 79, 0.3)' }}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة مستلم
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recipients.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium text-neutral-500">لا يوجد مستلمون</p>
                        <p className="text-sm">أضف مستلمين لبدء إرسال التقارير</p>
                      </div>
                    ) : (
                      recipients.map((recipient, index) => (
                        <motion.div
                          key={recipient.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-white hover:shadow-md transition-all border border-neutral-100"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center",
                              recipient.isActive ? "bg-coral-100" : "bg-neutral-200"
                            )}>
                              <User className={cn(
                                "w-5 h-5",
                                recipient.isActive ? "text-coral-600" : "text-neutral-400"
                              )} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-neutral-900">
                                  {recipient.name}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs font-medium", roleColors[recipient.role])}
                                >
                                  {roleLabels[recipient.role]}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-500" dir="ltr">
                                {recipient.phone}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={recipient.isActive}
                              onCheckedChange={() => toggleRecipient(recipient.id)}
                              className="data-[state=checked]:bg-coral-500"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingRecipient(recipient);
                                setRecipientDialogOpen(true);
                              }}
                              className="hover:bg-coral-50 hover:text-coral-600"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-neutral-900">
                                    حذف المستلم
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-neutral-500">
                                    هل أنت متأكد من حذف {recipient.name}؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-neutral-200">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeRecipient(recipient.id)}
                                    className="bg-rose-500 hover:bg-rose-600 text-white"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Daily Report */}
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-neutral-900">التقرير اليومي</CardTitle>
                        <CardDescription className="text-neutral-500">
                          ملخص يومي لحالة الأسطول والمالية
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.dailyReportEnabled ?? true}
                      onCheckedChange={(checked) => saveSettings({ dailyReportEnabled: checked })}
                      className="data-[state=checked]:bg-coral-500"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-700">وقت الإرسال</Label>
                      <Input
                        type="time"
                        value={settings?.dailyReportTime ?? '08:00'}
                        onChange={(e) => saveSettings({ dailyReportTime: e.target.value })}
                        className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Report */}
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <CardTitle className="text-neutral-900">التقرير الأسبوعي</CardTitle>
                        <CardDescription className="text-neutral-500">
                          تحليل شامل للأداء الأسبوعي
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.weeklyReportEnabled ?? true}
                      onCheckedChange={(checked) => saveSettings({ weeklyReportEnabled: checked })}
                      className="data-[state=checked]:bg-coral-500"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-700">يوم الإرسال</Label>
                      <Select
                        value={String(settings?.weeklyReportDay ?? 0)}
                        onValueChange={(v) => saveSettings({ weeklyReportDay: parseInt(v) })}
                      >
                        <SelectTrigger className="border-neutral-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">الأحد</SelectItem>
                          <SelectItem value="1">الإثنين</SelectItem>
                          <SelectItem value="2">الثلاثاء</SelectItem>
                          <SelectItem value="3">الأربعاء</SelectItem>
                          <SelectItem value="4">الخميس</SelectItem>
                          <SelectItem value="5">الجمعة</SelectItem>
                          <SelectItem value="6">السبت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-700">وقت الإرسال</Label>
                      <Input
                        type="time"
                        value={settings?.weeklyReportTime ?? '09:00'}
                        onChange={(e) => saveSettings({ weeklyReportTime: e.target.value })}
                        className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instant Alerts */}
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-neutral-900">التنبيهات الفورية</CardTitle>
                        <CardDescription className="text-neutral-500">
                          إشعارات فورية للأحداث المهمة
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.instantAlertsEnabled ?? true}
                      onCheckedChange={(checked) => saveSettings({ instantAlertsEnabled: checked })}
                      className="data-[state=checked]:bg-coral-500"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-neutral-700">الحد الأدنى للتنبيه بالمعاملات الكبيرة</Label>
                    <Input
                      type="number"
                      value={settings?.alertThreshold ?? 10000}
                      onChange={(e) => saveSettings({ alertThreshold: parseInt(e.target.value) })}
                      className="border-neutral-200 focus:border-coral-500 focus:ring-coral-500"
                    />
                    <p className="text-xs text-neutral-400">
                      سيتم إرسال تنبيه للمعاملات التي تتجاوز هذا المبلغ
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white rounded-[1.25rem] shadow-sm border-0">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <History className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <CardTitle className="text-neutral-900">سجل الرسائل</CardTitle>
                      <CardDescription className="text-neutral-500">
                        آخر 20 رسالة تم إرسالها
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {logs.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400">
                        <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium text-neutral-500">لا توجد رسائل في السجل</p>
                      </div>
                    ) : (
                      logs.map((log: any, index: number) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center",
                              log.status === 'sent' ? "bg-emerald-100" : "bg-rose-100"
                            )}>
                              {log.status === 'sent' ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">
                                {log.message_type}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {new Date(log.created_at).toLocaleString('ar-QA')}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline"
                            className={cn(
                              "font-medium",
                              log.status === 'sent'
                                ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                                : "text-rose-600 border-rose-200 bg-rose-50"
                            )}
                          >
                            {log.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                          </Badge>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Recipient Dialog */}
        <RecipientDialog
          open={recipientDialogOpen}
          onOpenChange={setRecipientDialogOpen}
          recipient={editingRecipient}
          onSave={handleSaveRecipient}
        />

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 py-4"
        >
          <p className="text-sm text-neutral-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-coral-400" />
            تقارير واتساب بواسطة Ultramsg
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
