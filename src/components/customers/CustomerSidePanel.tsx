/**
 * لوحة جانبية لعرض تفاصيل العميل الشاملة
 * تعرض جميع المعلومات المتعلقة بالعميل في مكان واحد
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageCircle,
  Car,
  Scale,
  AlertCircle,
  Banknote,
  History,
  ChevronRight,
  ExternalLink,
  Copy,
  Loader2,
  Shield,
  Heart,
  Target,
  Star,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerDetails, CustomerHealthScore } from '@/hooks/useCustomerDetails';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface CustomerSidePanelProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCall?: (phone: string) => void;
  onWhatsApp?: (phone: string) => void;
  onAddNote?: (customerId: string) => void;
}

// مكون عرض نقاط صحة العميل
function HealthScoreDisplay({ score }: { score: CustomerHealthScore }) {
  const getScoreColor = (value: number) => {
    if (value >= 70) return 'text-emerald-600';
    if (value >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (value: number) => {
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTrendIcon = () => {
    switch (score.trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/10 rounded-lg">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-semibold">صحة العميل</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-full text-xs">
          {getTrendIcon()}
          <span>{score.trend === 'up' ? 'تحسن' : score.trend === 'down' ? 'تراجع' : 'مستقر'}</span>
        </div>
      </div>

      {/* النتيجة الإجمالية */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={score.overall >= 70 ? '#10b981' : score.overall >= 40 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score.overall / 100) * 226} 226`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{score.overall}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">مالي</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreBg(score.financial)} rounded-full`} style={{ width: `${score.financial}%` }} />
              </div>
              <span className={getScoreColor(score.financial)}>{score.financial}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">تفاعل</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreBg(score.engagement)} rounded-full`} style={{ width: `${score.engagement}%` }} />
              </div>
              <span className={getScoreColor(score.engagement)}>{score.engagement}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">مخاطر</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreBg(score.risk)} rounded-full`} style={{ width: `${score.risk}%` }} />
              </div>
              <span className={getScoreColor(score.risk)}>{score.risk}</span>
            </div>
          </div>
        </div>
      </div>

      {/* العوامل */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {score.factors.positive.length > 0 && (
          <div className="bg-emerald-500/10 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-emerald-400 font-medium mb-1.5">
              <Sparkles className="w-3 h-3" />
              نقاط قوة
            </div>
            <ul className="space-y-1 text-white/70">
              {score.factors.positive.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-start gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {score.factors.negative.length > 0 && (
          <div className="bg-red-500/10 rounded-lg p-2.5">
            <div className="flex items-center gap-1 text-red-400 font-medium mb-1.5">
              <AlertTriangle className="w-3 h-3" />
              تحتاج تحسين
            </div>
            <ul className="space-y-1 text-white/70">
              {score.factors.negative.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// مكون بطاقة معلومات
function InfoCard({ icon: Icon, label, value, copyable }: {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  copyable?: boolean;
}) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(String(value));
      toast({ title: 'تم النسخ', description: 'تم نسخ القيمة إلى الحافظة' });
    }
  };

  if (!value) return null;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 group">
      <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
      {copyable && (
        <button
          onClick={handleCopy}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// مكون بطاقة إحصائية
function StatCard({ label, value, subValue, type }: {
  label: string;
  value: string | number;
  subValue?: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    warning: 'bg-amber-50 border-amber-100 text-amber-700',
    danger: 'bg-red-50 border-red-100 text-red-700',
    info: 'bg-blue-50 border-blue-100 text-blue-700',
  };

  return (
    <div className={cn('p-3 rounded-xl border', styles[type])}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {subValue && <p className="text-[10px] mt-0.5 opacity-60">{subValue}</p>}
    </div>
  );
}

export function CustomerSidePanel({
  customerId,
  isOpen,
  onClose,
  onCall,
  onWhatsApp,
  onAddNote,
}: CustomerSidePanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: customer, isLoading, error } = useCustomerDetails(customerId);

  const getFullName = () => {
    if (!customer?.basic) return 'عميل';
    const arName = `${customer.basic.first_name_ar || ''} ${customer.basic.last_name_ar || ''}`.trim();
    const enName = `${customer.basic.first_name || ''} ${customer.basic.last_name || ''}`.trim();
    return arName || enName || customer.basic.customer_code || 'عميل';
  };

  const getInitials = () => {
    if (!customer?.basic) return 'ع';
    if (customer.basic.first_name_ar) return customer.basic.first_name_ar.substring(0, 2);
    if (customer.basic.first_name) return customer.basic.first_name.substring(0, 2).toUpperCase();
    return 'ع';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b bg-gray-50/80 backdrop-blur">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  {customer?.basic?.phone && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCall?.(customer.basic!.phone)}
                        className="gap-1.5"
                      >
                        <Phone className="w-4 h-4" />
                        اتصال
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onWhatsApp?.(customer.basic!.phone)}
                        className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      >
                        <MessageCircle className="w-4 h-4" />
                        واتساب
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Info Header */}
              {!isLoading && customer?.basic && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg",
                      customer.basic.is_blacklisted 
                        ? "bg-red-100 text-red-600 border-2 border-red-200" 
                        : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    )}>
                      {getInitials()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">{getFullName()}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {customer.basic.customer_code}
                        </Badge>
                        {customer.basic.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">نشط</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">غير نشط</Badge>
                        )}
                        {customer.basic.is_blacklisted && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">قائمة سوداء</Badge>
                        )}
                        {customer.contracts.filter(c => c.status === 'active').length > 0 && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                            {customer.contracts.filter(c => c.status === 'active').length} عقد نشط
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600">حدث خطأ في تحميل البيانات</p>
                </div>
              ) : customer ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
                  <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-gray-100 rounded-xl">
                    <TabsTrigger value="overview" className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">نظرة عامة</TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">مالي</TabsTrigger>
                    <TabsTrigger value="contracts" className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">عقود</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">تاريخ</TabsTrigger>
                    <TabsTrigger value="legal" className="text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">قانوني</TabsTrigger>
                  </TabsList>

                  {/* نظرة عامة */}
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    {/* Health Score */}
                    <HealthScoreDisplay score={customer.healthScore} />

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard
                        label="إجمالي المستحق"
                        value={`${(customer.financial?.total_outstanding || 0).toLocaleString()} ر.ق`}
                        type={(customer.financial?.total_outstanding || 0) > 0 ? 'danger' : 'success'}
                      />
                      <StatCard
                        label="أيام التأخير"
                        value={customer.balance?.days_overdue || 0}
                        type={(customer.balance?.days_overdue || 0) > 0 ? 'warning' : 'success'}
                      />
                      <StatCard
                        label="نقاط الدفع"
                        value={customer.paymentScore?.score || '-'}
                        subValue={customer.paymentScore?.category}
                        type={
                          (customer.paymentScore?.score || 0) >= 70 ? 'success' :
                          (customer.paymentScore?.score || 0) >= 40 ? 'warning' : 'danger'
                        }
                      />
                      <StatCard
                        label="العقود النشطة"
                        value={customer.contracts.filter(c => c.status === 'active').length}
                        type="info"
                      />
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        معلومات الاتصال
                      </h3>
                      <InfoCard icon={Phone} label="الهاتف" value={customer.basic?.phone} copyable />
                      <InfoCard icon={Phone} label="هاتف بديل" value={customer.basic?.alternative_phone} copyable />
                      <InfoCard icon={Mail} label="البريد الإلكتروني" value={customer.basic?.email} copyable />
                      <InfoCard icon={MapPin} label="العنوان" value={customer.basic?.address_ar || customer.basic?.address} />
                      <InfoCard icon={MapPin} label="المدينة" value={customer.basic?.city} />
                    </div>

                    {/* Documents Status */}
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        حالة الوثائق
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-600">الهوية الوطنية</span>
                          {customer.basic?.national_id ? (
                            <Badge className="bg-emerald-50 text-emerald-700">متوفرة</Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-600">مطلوبة</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-gray-600">رخصة القيادة</span>
                          {customer.basic?.license_number ? (
                            customer.basic.license_expiry && new Date(customer.basic.license_expiry) < new Date() ? (
                              <Badge className="bg-amber-50 text-amber-700">منتهية</Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700">صالحة</Badge>
                            )
                          ) : (
                            <Badge className="bg-red-50 text-red-600">مطلوبة</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Followups */}
                    {customer.followups.filter(f => f.status === 'pending' || f.status === 'scheduled').length > 0 && (
                      <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          متابعات قادمة
                        </h3>
                        <div className="space-y-2">
                          {customer.followups
                            .filter(f => f.status === 'pending' || f.status === 'scheduled')
                            .slice(0, 3)
                            .map(followup => (
                              <div key={followup.id} className="flex items-center gap-3 bg-white p-2.5 rounded-lg">
                                <div className="p-1.5 bg-amber-100 rounded text-amber-600">
                                  <Clock className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{followup.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(followup.scheduled_date), 'dd/MM/yyyy', { locale: ar })}
                                    {followup.scheduled_time && ` - ${followup.scheduled_time}`}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-[10px]">
                                  {followup.priority === 'high' ? 'عاجل' : followup.priority === 'medium' ? 'متوسط' : 'عادي'}
                                </Badge>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* المالي */}
                  <TabsContent value="financial" className="mt-4 space-y-4">
                    {/* Financial Summary */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <Banknote className="w-5 h-5" />
                        <span className="font-semibold">الملخص المالي</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-blue-100 text-xs mb-1">إجمالي الفواتير</p>
                          <p className="text-2xl font-bold">
                            {(customer.financial?.total_invoiced || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-100 text-xs mb-1">إجمالي المدفوع</p>
                          <p className="text-2xl font-bold text-emerald-300">
                            {(customer.financial?.total_paid || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-100 text-xs mb-1">المتبقي</p>
                          <p className="text-2xl font-bold text-amber-300">
                            {(customer.financial?.total_outstanding || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-100 text-xs mb-1">متوسط أيام السداد</p>
                          <p className="text-2xl font-bold">
                            {customer.financial?.average_days_to_pay || 0} يوم
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Behavior */}
                    {customer.behavior && (
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          سلوك الدفع
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">معدل الالتزام</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${customer.behavior.on_time_payment_rate || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{customer.behavior.on_time_payment_rate || 0}%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">معدل الاستجابة</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${customer.behavior.response_rate || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{customer.behavior.response_rate || 0}%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">الالتزام بالوعود</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{ width: `${customer.behavior.promise_keeping_rate || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{customer.behavior.promise_keeping_rate || 0}%</span>
                            </div>
                          </div>
                          {customer.behavior.best_day_to_contact && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-600 font-medium">💡 أفضل وقت للتواصل</p>
                              <p className="text-sm text-blue-800 mt-1">
                                {customer.behavior.best_day_to_contact}
                                {customer.behavior.best_time_to_contact && ` - ${customer.behavior.best_time_to_contact}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent Invoices */}
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        آخر الفواتير
                      </h3>
                      <div className="space-y-2">
                        {customer.invoices.slice(0, 5).map(invoice => (
                          <div key={invoice.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {invoice.invoice_number || '#' + invoice.id.substring(0, 8)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(invoice.created_at), 'dd/MM/yyyy')}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-gray-800">
                                {invoice.total_amount.toLocaleString()} ر.ق
                              </p>
                              <Badge
                                className={cn(
                                  'text-[10px]',
                                  invoice.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                                  invoice.payment_status === 'partial' ? 'bg-amber-50 text-amber-700' :
                                  'bg-red-50 text-red-700'
                                )}
                              >
                                {invoice.payment_status === 'paid' ? 'مسدد' :
                                 invoice.payment_status === 'partial' ? 'جزئي' : 'غير مسدد'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Promises */}
                    {customer.promises.length > 0 && (
                      <div className="bg-white rounded-xl border p-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          وعود الدفع
                        </h3>
                        <div className="space-y-2">
                          {customer.promises.slice(0, 3).map(promise => (
                            <div key={promise.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {promise.promised_amount.toLocaleString()} ر.ق
                                </p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(promise.promise_date), 'dd/MM/yyyy')}
                                </p>
                              </div>
                              <Badge
                                className={cn(
                                  'text-[10px]',
                                  promise.status === 'kept' ? 'bg-emerald-50 text-emerald-700' :
                                  promise.status === 'broken' ? 'bg-red-50 text-red-700' :
                                  'bg-amber-50 text-amber-700'
                                )}
                              >
                                {promise.status === 'kept' ? 'تم الوفاء' :
                                 promise.status === 'broken' ? 'لم يتم' : 'قيد الانتظار'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* العقود */}
                  <TabsContent value="contracts" className="mt-4 space-y-4">
                    {customer.contracts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>لا توجد عقود لهذا العميل</p>
                      </div>
                    ) : (
                      customer.contracts.map(contract => {
                        const isActive = contract.status === 'active';
                        const endDate = new Date(contract.end_date);
                        const daysRemaining = differenceInDays(endDate, new Date());
                        const isExpiringSoon = isActive && daysRemaining <= 30 && daysRemaining > 0;

                        return (
                          <div
                            key={contract.id}
                            className={cn(
                              'rounded-xl border p-4 transition',
                              isActive ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'p-2 rounded-lg',
                                  isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                                )}>
                                  <Car className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{contract.contract_number}</p>
                                  <Badge
                                    className={cn(
                                      'text-[10px] mt-1',
                                      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                    )}
                                  >
                                    {isActive ? 'نشط' : contract.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-lg font-bold text-gray-800">
                                  {contract.monthly_amount.toLocaleString()} ر.ق
                                </p>
                                <p className="text-xs text-gray-500">شهرياً</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{format(new Date(contract.start_date), 'dd/MM/yyyy')}</span>
                                <span className="mx-1">←</span>
                                <span>{format(endDate, 'dd/MM/yyyy')}</span>
                              </div>
                              {isExpiringSoon && (
                                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                  ⏰ متبقي {daysRemaining} يوم
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Penalties */}
                    {customer.penalties.length > 0 && (
                      <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                        <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          المخالفات المرورية ({customer.penalties.length})
                        </h3>
                        <div className="space-y-2">
                          {customer.penalties.slice(0, 3).map(penalty => (
                            <div key={penalty.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{penalty.violation_type || 'مخالفة مرورية'}</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(penalty.penalty_date), 'dd/MM/yyyy')}
                                  {penalty.vehicle_plate && ` - ${penalty.vehicle_plate}`}
                                </p>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-red-600">{penalty.amount.toLocaleString()} ر.ق</p>
                                <Badge
                                  className={cn(
                                    'text-[10px]',
                                    penalty.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                  )}
                                >
                                  {penalty.payment_status === 'paid' ? 'مسدد' : 'غير مسدد'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* التاريخ */}
                  <TabsContent value="history" className="mt-4 space-y-4">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute top-0 bottom-0 right-4 w-0.5 bg-gray-200" />

                      <div className="space-y-4">
                        {customer.notes.map((note, index) => (
                          <div key={note.id} className="relative pr-10">
                            {/* Timeline dot */}
                            <div className={cn(
                              'absolute right-2 w-4 h-4 rounded-full border-2 bg-white',
                              note.note_type === 'phone' ? 'border-blue-500' :
                              note.note_type === 'message' ? 'border-emerald-500' :
                              'border-gray-400'
                            )} />

                            <div className={cn(
                              'p-4 rounded-xl border',
                              note.is_important ? 'bg-amber-50 border-amber-200' : 'bg-white'
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {note.note_type === 'phone' && <Phone className="w-4 h-4 text-blue-500" />}
                                  {note.note_type === 'message' && <MessageCircle className="w-4 h-4 text-emerald-500" />}
                                  <span className="text-sm font-medium text-gray-800">{note.title}</span>
                                  {note.is_important && (
                                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">مهم</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                            </div>
                          </div>
                        ))}

                        {customer.notes.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>لا يوجد سجل تفاعلات</p>
                            <Button
                              variant="link"
                              className="mt-2"
                              onClick={() => onAddNote?.(customer.basic!.id)}
                            >
                              إضافة ملاحظة جديدة
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* القانوني */}
                  <TabsContent value="legal" className="mt-4 space-y-4">
                    {customer.legalCases.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>لا توجد قضايا قانونية</p>
                      </div>
                    ) : (
                      customer.legalCases.map(legalCase => (
                        <div
                          key={legalCase.id}
                          className={cn(
                            'rounded-xl border p-4',
                            legalCase.case_status === 'closed' || legalCase.case_status === 'resolved'
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-white border-red-200'
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'p-2 rounded-lg',
                                legalCase.priority === 'high' ? 'bg-red-50 text-red-600' :
                                legalCase.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                                'bg-gray-100 text-gray-600'
                              )}>
                                <Scale className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{legalCase.case_number}</p>
                                <p className="text-xs text-gray-500">{legalCase.case_title}</p>
                              </div>
                            </div>
                            <Badge
                              className={cn(
                                legalCase.case_status === 'closed' || legalCase.case_status === 'resolved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : legalCase.case_status === 'active'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-700'
                              )}
                            >
                              {legalCase.case_status === 'closed' ? 'مغلقة' :
                               legalCase.case_status === 'resolved' ? 'تمت التسوية' :
                               legalCase.case_status === 'active' ? 'نشطة' : legalCase.case_status}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>النوع: {legalCase.case_type}</span>
                            {legalCase.case_value && (
                              <span className="font-bold">{legalCase.case_value.toLocaleString()} ر.ق</span>
                            )}
                          </div>

                          {legalCase.hearing_date && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                              <Calendar className="w-3 h-3" />
                              جلسة قادمة: {format(new Date(legalCase.hearing_date), 'dd/MM/yyyy HH:mm')}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              ) : null}
            </div>

            {/* Footer Actions */}
            {customer?.basic && (
              <div className="flex-shrink-0 border-t bg-gray-50 p-4">
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-[#F15555] hover:bg-[#d64545]"
                    onClick={() => onAddNote?.(customer.basic!.id)}
                  >
                    إضافة ملاحظة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/customers/${customer.basic!.id}`, '_blank')}
                    className="gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح الصفحة
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

