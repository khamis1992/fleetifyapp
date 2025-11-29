/**
 * صفحة إعدادات تقارير واتساب
 * WhatsApp Reports Settings Page
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
  DialogTrigger,
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
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Calendar,
  FileText,
  AlertTriangle,
  History,
  Phone,
  User,
  Shield,
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

// ألوان الأدوار
const roleColors = {
  manager: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  owner: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  accountant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  supervisor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
};

const roleLabels = {
  manager: 'مدير',
  owner: 'مالك',
  accountant: 'محاسب',
  supervisor: 'مشرف',
};

// Animated Background
const AnimatedBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className={cn(
        "absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-20",
        isDark ? "bg-emerald-600" : "bg-emerald-300"
      )}
      animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ top: '-5%', right: '-5%' }}
    />
    <motion.div
      className={cn(
        "absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-20",
        isDark ? "bg-violet-600" : "bg-violet-300"
      )}
      animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      style={{ bottom: '-5%', left: '-5%' }}
    />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
  </div>
);

// مكون إضافة/تعديل مستلم
const RecipientDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: WhatsAppRecipient;
  onSave: (data: Omit<WhatsAppRecipient, 'id'>) => void;
  isDark: boolean;
}> = ({ open, onOpenChange, recipient, onSave, isDark }) => {
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
      <DialogContent className={cn(
        "max-w-lg",
        isDark && "bg-gray-900 border-gray-800"
      )}>
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : ""}>
            {recipient ? 'تعديل مستلم' : 'إضافة مستلم جديد'}
          </DialogTitle>
          <DialogDescription>
            أضف معلومات المستلم وحدد نوع التقارير والتنبيهات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="أحمد محمد"
                className={isDark ? "bg-gray-800 border-gray-700" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+974 XXXX XXXX"
                dir="ltr"
                className={isDark ? "bg-gray-800 border-gray-700" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الدور</Label>
            <Select
              value={formData.role}
              onValueChange={(v) => setFormData(p => ({ ...p, role: v as any }))}
            >
              <SelectTrigger className={isDark ? "bg-gray-800 border-gray-700" : ""}>
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
            <Label>التقارير المطلوبة</Label>
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
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>التنبيهات المطلوبة</Label>
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
            />
            <Label>مفعّل</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit}>
            {recipient ? 'حفظ التغييرات' : 'إضافة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// الصفحة الرئيسية
const WhatsAppSettings: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('connection');
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<WhatsAppRecipient | undefined>();
  
  // Ultramsg credentials
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  
  // Hooks
  const { settings, isLoading, saveSettings, isSaving } = useWhatsAppSettings();
  const { recipients, addRecipient, updateRecipient, removeRecipient, toggleRecipient } = useWhatsAppRecipients();
  const { sendDailyReport, sendWeeklyReport, sendTestMessage, isSending } = useWhatsAppReports();
  const { logs } = useWhatsAppMessageLogs(20);
  const { connected, phone, checking, checkStatus } = useWhatsAppConnectionStatus();

  // تحميل الإعدادات المحفوظة
  useEffect(() => {
    if (settings) {
      // يمكن تحميل Instance ID و Token من settings إذا كانت محفوظة
    }
  }, [settings]);

  // تهيئة الخدمة
  const handleInitialize = () => {
    if (!instanceId || !token) {
      toast.error('يرجى إدخال Instance ID و Token');
      return;
    }
    
    whatsAppService.initialize({ instanceId, token });
    checkStatus();
    toast.success('تم تهيئة الخدمة');
  };

  // إرسال رسالة اختبار
  const handleTestMessage = async () => {
    const phone = prompt('أدخل رقم الهاتف للاختبار:');
    if (phone) {
      await sendTestMessage(phone);
    }
  };

  // حفظ إعدادات الجدولة
  const handleSaveSchedule = () => {
    saveSettings({
      dailyReportEnabled: settings?.dailyReportEnabled ?? true,
      dailyReportTime: settings?.dailyReportTime ?? '08:00',
      weeklyReportEnabled: settings?.weeklyReportEnabled ?? true,
      weeklyReportDay: settings?.weeklyReportDay ?? 0,
      weeklyReportTime: settings?.weeklyReportTime ?? '09:00',
      instantAlertsEnabled: settings?.instantAlertsEnabled ?? true,
      alertThreshold: settings?.alertThreshold ?? 10000,
    });
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
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      isDark ? "bg-gray-950" : "bg-gray-50"
    )}>
      <AnimatedBackground isDark={isDark} />
      
      <div className="relative z-10 container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full blur-lg opacity-50" />
              <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-emerald-500 to-green-500">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-gray-900"
              )}>
                إعدادات تقارير واتساب
              </h1>
              <p className={cn(
                "text-sm",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                إدارة التقارير والتنبيهات التلقائية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <Badge 
              variant="outline" 
              className={cn(
                "px-3 py-1",
                connected 
                  ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                  : "text-rose-500 border-rose-500/30 bg-rose-500/10"
              )}
            >
              {connected ? <Wifi className="w-3 h-3 ml-1" /> : <WifiOff className="w-3 h-3 ml-1" />}
              {connected ? 'متصل' : 'غير متصل'}
            </Badge>

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDark(!isDark)}
              className={cn(
                "p-3 rounded-xl",
                isDark ? "bg-gray-800 text-amber-400" : "bg-white text-gray-700 shadow-lg"
              )}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>
          </div>
        </motion.header>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={cn(
            "grid w-full grid-cols-4 mb-6",
            isDark && "bg-gray-800"
          )}>
            <TabsTrigger value="connection" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">الاتصال</span>
            </TabsTrigger>
            <TabsTrigger value="recipients" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">المستلمون</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">الجدولة</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
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
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <CardTitle className={isDark ? "text-white" : ""}>
                    إعدادات Ultramsg
                  </CardTitle>
                  <CardDescription>
                    أدخل بيانات حساب Ultramsg للاتصال بواتساب
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Instance ID</Label>
                      <Input
                        value={instanceId}
                        onChange={(e) => setInstanceId(e.target.value)}
                        placeholder="instance12345"
                        dir="ltr"
                        className={isDark ? "bg-gray-800 border-gray-700" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token</Label>
                      <Input
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        type="password"
                        placeholder="••••••••••"
                        dir="ltr"
                        className={isDark ? "bg-gray-800 border-gray-700" : ""}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleInitialize} className="bg-emerald-500 hover:bg-emerald-600">
                      <Wifi className="w-4 h-4 ml-2" />
                      اتصال
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => checkStatus()}
                      disabled={checking}
                      className={isDark ? "border-gray-700" : ""}
                    >
                      <RefreshCw className={cn("w-4 h-4 ml-2", checking && "animate-spin")} />
                      فحص الاتصال
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleTestMessage}
                      disabled={!connected || isSending}
                      className={isDark ? "border-gray-700" : ""}
                    >
                      <TestTube className="w-4 h-4 ml-2" />
                      رسالة اختبار
                    </Button>
                  </div>

                  {/* Connection Info */}
                  {connected && phone && (
                    <div className={cn(
                      "p-4 rounded-xl border",
                      isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
                    )}>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                            متصل بنجاح
                          </p>
                          <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                            الرقم: {phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <CardTitle className={isDark ? "text-white" : ""}>
                    إرسال يدوي
                  </CardTitle>
                  <CardDescription>
                    إرسال التقارير يدوياً الآن
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => sendDailyReport()}
                      disabled={!connected || isSending}
                      className="bg-violet-500 hover:bg-violet-600"
                    >
                      <Send className="w-4 h-4 ml-2" />
                      إرسال التقرير اليومي
                    </Button>
                    <Button
                      onClick={() => sendWeeklyReport()}
                      disabled={!connected || isSending}
                      variant="outline"
                      className={isDark ? "border-gray-700" : ""}
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
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={isDark ? "text-white" : ""}>
                        المستلمون
                      </CardTitle>
                      <CardDescription>
                        إدارة قائمة مستلمي التقارير والتنبيهات
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingRecipient(undefined);
                        setRecipientDialogOpen(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة مستلم
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recipients.length === 0 ? (
                      <div className={cn(
                        "text-center py-12",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}>
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا يوجد مستلمون</p>
                        <p className="text-sm">أضف مستلمين لبدء إرسال التقارير</p>
                      </div>
                    ) : (
                      recipients.map((recipient) => (
                        <motion.div
                          key={recipient.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border",
                            isDark 
                              ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800" 
                              : "bg-gray-50 border-gray-200 hover:bg-white"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              recipient.isActive ? "bg-emerald-500/20" : "bg-gray-500/20"
                            )}>
                              <User className={cn(
                                "w-5 h-5",
                                recipient.isActive ? "text-emerald-500" : "text-gray-500"
                              )} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "font-medium",
                                  isDark ? "text-white" : "text-gray-900"
                                )}>
                                  {recipient.name}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", roleColors[recipient.role])}
                                >
                                  {roleLabels[recipient.role]}
                                </Badge>
                              </div>
                              <p className={cn(
                                "text-sm",
                                isDark ? "text-gray-400" : "text-gray-500"
                              )} dir="ltr">
                                {recipient.phone}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={recipient.isActive}
                              onCheckedChange={() => toggleRecipient(recipient.id)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingRecipient(recipient);
                                setRecipientDialogOpen(true);
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-rose-500">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className={isDark ? "text-white" : ""}>
                                    حذف المستلم
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف {recipient.name}؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeRecipient(recipient.id)}
                                    className="bg-rose-500 hover:bg-rose-600"
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
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <CardTitle className={isDark ? "text-white" : ""}>
                          التقرير اليومي
                        </CardTitle>
                        <CardDescription>
                          ملخص يومي لحالة الأسطول والمالية
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.dailyReportEnabled ?? true}
                      onCheckedChange={(checked) => saveSettings({ dailyReportEnabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>وقت الإرسال</Label>
                      <Input
                        type="time"
                        value={settings?.dailyReportTime ?? '08:00'}
                        onChange={(e) => saveSettings({ dailyReportTime: e.target.value })}
                        className={isDark ? "bg-gray-800 border-gray-700" : ""}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Report */}
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div>
                        <CardTitle className={isDark ? "text-white" : ""}>
                          التقرير الأسبوعي
                        </CardTitle>
                        <CardDescription>
                          تحليل شامل للأداء الأسبوعي
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.weeklyReportEnabled ?? true}
                      onCheckedChange={(checked) => saveSettings({ weeklyReportEnabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>يوم الإرسال</Label>
                      <Select
                        value={String(settings?.weeklyReportDay ?? 0)}
                        onValueChange={(v) => saveSettings({ weeklyReportDay: parseInt(v) })}
                      >
                        <SelectTrigger className={isDark ? "bg-gray-800 border-gray-700" : ""}>
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
                      <Label>وقت الإرسال</Label>
                      <Input
                        type="time"
                        value={settings?.weeklyReportTime ?? '09:00'}
                        onChange={(e) => saveSettings({ weeklyReportTime: e.target.value })}
                        className={isDark ? "bg-gray-800 border-gray-700" : ""}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instant Alerts */}
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Bell className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className={isDark ? "text-white" : ""}>
                          التنبيهات الفورية
                        </CardTitle>
                        <CardDescription>
                          إشعارات فورية للأحداث المهمة
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.instantAlertsEnabled ?? true}
                      onCheckedChange={(checked) => saveSettings({ instantAlertsEnabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>الحد الأدنى للتنبيه بالمعاملات الكبيرة</Label>
                    <Input
                      type="number"
                      value={settings?.alertThreshold ?? 10000}
                      onChange={(e) => saveSettings({ alertThreshold: parseInt(e.target.value) })}
                      className={isDark ? "bg-gray-800 border-gray-700" : ""}
                    />
                    <p className={cn("text-xs", isDark ? "text-gray-500" : "text-gray-400")}>
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
              <Card className={cn(
                "backdrop-blur-xl border",
                isDark ? "bg-gray-900/60 border-gray-800" : "bg-white/80"
              )}>
                <CardHeader>
                  <CardTitle className={isDark ? "text-white" : ""}>
                    سجل الرسائل
                  </CardTitle>
                  <CardDescription>
                    آخر 20 رسالة تم إرسالها
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {logs.length === 0 ? (
                      <div className={cn(
                        "text-center py-12",
                        isDark ? "text-gray-400" : "text-gray-500"
                      )}>
                        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد رسائل في السجل</p>
                      </div>
                    ) : (
                      logs.map((log: any) => (
                        <div
                          key={log.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {log.status === 'sent' ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-500" />
                            )}
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                isDark ? "text-white" : "text-gray-900"
                              )}>
                                {log.message_type}
                              </p>
                              <p className={cn(
                                "text-xs",
                                isDark ? "text-gray-400" : "text-gray-500"
                              )}>
                                {new Date(log.created_at).toLocaleString('ar-QA')}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline"
                            className={cn(
                              log.status === 'sent'
                                ? "text-emerald-500 border-emerald-500/30"
                                : "text-rose-500 border-rose-500/30"
                            )}
                          >
                            {log.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                          </Badge>
                        </div>
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
          isDark={isDark}
        />

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "text-center mt-8 py-4",
            isDark ? "text-gray-500" : "text-gray-400"
          )}
        >
          <p className="text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            تقارير واتساب بواسطة Ultramsg
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;

