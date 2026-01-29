/**
 * Employee Detailed Report Page
 * صفحة تقرير الأداء المفصل للموظف
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmployeeDetails } from '@/hooks/useEmployeeDetails';
import { useEmployeeDetailedReport } from '@/hooks/useEmployeeDetailedReport';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import {
  ArrowRight,
  FileText,
  AlertCircle,
  Clock,
  DollarSign,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Lightbulb,
  Download,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Shared Components
const GlassCard = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, type: 'spring', bounce: 0.4 }}
    className={cn(
      'bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-3xl overflow-hidden',
      className
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, delay }: any) => (
  <GlassCard className="p-6" delay={delay}>
    <div className="flex items-start justify-between mb-3">
      <div className={cn('p-3 rounded-2xl', color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full',
          trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <h3 className="text-2xl font-black text-neutral-800 mb-1">{value}</h3>
    <p className="text-xs font-medium text-neutral-500">{title}</p>
    {subtitle && (
      <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
    )}
  </GlassCard>
);

export const EmployeeDetailedReport: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const { employee, performance } = useEmployeeDetails(employeeId || '');
  const { 
    unpaidInvoices, 
    overdueTasks, 
    communicationStats,
    collectionAnalysis,
    recommendations,
    isLoading,
    stats 
  } = useEmployeeDetailedReport(employeeId || '', selectedPeriod);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  const getCustomerName = (customer: any) => {
    if (!customer) return 'غير محدد';
    return customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير محدد';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">جاري تحميل التقرير...</p>
        </div>
      </div>
    );
  }

  const employeeName = employee?.first_name_ar && employee?.last_name_ar
    ? `${employee.first_name_ar} ${employee.last_name_ar}`
    : employee?.email || 'موظف';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 p-6 font-sans" dir="rtl">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/employee/${employeeId}`)}
            className="mb-3 -mr-2"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى التفاصيل
          </Button>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {employeeName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-neutral-900">تقرير أداء مفصل</h1>
              </div>
              <p className="text-sm text-neutral-500 font-medium">{employeeName}</p>
              <p className="text-xs text-neutral-400">آخر 30 يوم</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/50 border-neutral-200 rounded-xl"
          >
            <Download className="ml-2 h-4 w-4" />
            تصدير PDF
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="الفواتير غير المحصّلة"
          value={stats.totalUnpaid}
          subtitle={formatCurrency(stats.totalUnpaidAmount)}
          icon={DollarSign}
          color="bg-red-500"
          delay={0.1}
        />
        <StatCard
          title="المهام المتأخرة"
          value={stats.totalOverdueTasks}
          icon={Clock}
          color="bg-orange-500"
          delay={0.2}
        />
        <StatCard
          title="نسبة التحصيل"
          value={`${Math.round(collectionAnalysis?.collection_rate || 0)}%`}
          subtitle="الهدف: 85%"
          icon={TrendingUp}
          color="bg-emerald-500"
          delay={0.3}
        />
        <StatCard
          title="القضايا الحرجة"
          value={stats.criticalIssues}
          subtitle="تحتاج اهتمام فوري"
          icon={AlertCircle}
          color="bg-amber-500"
          delay={0.4}
        />
      </div>

      {/* Main Content */}
      <GlassCard className="p-6" delay={0.5}>
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="invoices" className="gap-2">
              <DollarSign className="w-4 h-4" />
              الفواتير غير المحصّلة
              {stats.totalUnpaid > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.totalUnpaid}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <Clock className="w-4 h-4" />
              المهام المتأخرة
              {stats.totalOverdueTasks > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.totalOverdueTasks}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              التوصيات
              {recommendations.length > 0 && (
                <Badge className="ml-2 bg-purple-500">{recommendations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Unpaid Invoices Tab */}
          <TabsContent value="invoices">
            <ScrollArea className="h-[600px]">
              {unpaidInvoices && unpaidInvoices.length > 0 ? (
                <div className="space-y-3">
                  {unpaidInvoices.map((invoice: any, index) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-4 rounded-xl border-r-4 transition-all',
                        invoice.priority === 'critical' ? 'bg-red-50 border-red-500' :
                        invoice.priority === 'high' ? 'bg-orange-50 border-orange-500' :
                        invoice.priority === 'medium' ? 'bg-amber-50 border-amber-500' :
                        'bg-blue-50 border-blue-500'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{getPriorityIcon(invoice.priority)}</span>
                            <h4 className="text-sm font-bold text-neutral-900">
                              عقد #{invoice.contract_number}
                            </h4>
                            <Badge variant="outline" className={cn('text-xs', getPriorityColor(invoice.priority))}>
                              {invoice.priority === 'critical' ? 'حرج' : 
                               invoice.priority === 'high' ? 'عالي' :
                               invoice.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-700 mb-2">
                            {getCustomerName(invoice.customers)}
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-1 text-neutral-600">
                              <DollarSign className="w-3 h-3" />
                              <span className="font-bold text-red-600">{formatCurrency(invoice.balance_due)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-neutral-600">
                              <Clock className="w-3 h-3" />
                              متأخر {invoice.days_overdue} يوم
                            </div>
                            <div className="flex items-center gap-1 text-neutral-600">
                              <Calendar className="w-3 h-3" />
                              آخر دفعة: {invoice.last_payment_date ? new Date(invoice.last_payment_date).toLocaleDateString('ar-EG') : 'لا يوجد'}
                            </div>
                            {invoice.customers?.phone && (
                              <div className="flex items-center gap-1 text-neutral-600">
                                <Phone className="w-3 h-3" />
                                {invoice.customers.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-neutral-200">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (invoice.customers?.phone) {
                              window.location.href = `tel:${invoice.customers.phone}`;
                            } else {
                              alert('لا يوجد رقم هاتف للعميل');
                            }
                          }}
                        >
                          <Phone className="ml-1 h-3 w-3" />
                          اتصال
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to employee workspace to schedule followup
                            navigate(`/employee-workspace`);
                          }}
                        >
                          <Calendar className="ml-1 h-3 w-3" />
                          جدولة
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/contracts/${invoice.id}`);
                          }}
                        >
                          <FileText className="ml-1 h-3 w-3" />
                          التفاصيل
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-bold text-neutral-700">ممتاز!</p>
                  <p className="text-sm text-neutral-500">لا توجد فواتير متأخرة</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Overdue Tasks Tab */}
          <TabsContent value="tasks">
            <ScrollArea className="h-[600px]">
              {overdueTasks && overdueTasks.length > 0 ? (
                <div className="space-y-3">
                  {overdueTasks.map((task: any, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-white rounded-xl border border-neutral-200 hover:border-orange-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-neutral-900 mb-2">
                            {task.title}
                          </h4>
                          <p className="text-xs text-neutral-600 mb-2">
                            {task.contracts?.customers ? getCustomerName(task.contracts.customers) : 'غير محدد'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              كان مجدول: {new Date(task.scheduled_date).toLocaleDateString('ar-EG')}
                            </span>
                            <span className="flex items-center gap-1 text-red-600 font-bold">
                              <Clock className="w-3 h-3" />
                              متأخر {task.days_overdue} يوم
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          متأخر
                        </Badge>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-neutral-100">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to employee workspace to complete task
                            navigate(`/employee-workspace`);
                          }}
                        >
                          <CheckCircle className="ml-1 h-3 w-3" />
                          إكمال
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to employee workspace to reschedule
                            navigate(`/employee-workspace`);
                          }}
                        >
                          <Calendar className="ml-1 h-3 w-3" />
                          إعادة جدولة
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-bold text-neutral-700">ممتاز!</p>
                  <p className="text-sm text-neutral-500">لا توجد مهام متأخرة</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <div className="space-y-4">
              {/* Critical Issues */}
              {stats.criticalIssues > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-red-900 mb-2">
                        ⚠️ قضايا حرجة تحتاج اهتمام فوري
                      </h3>
                      <p className="text-xs text-red-700">
                        يوجد {stats.criticalIssues} قضية حرجة تحتاج متابعة فورية
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations List */}
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((rec: any, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        'p-4 rounded-xl border',
                        rec.priority === 'critical' ? 'bg-red-50 border-red-200' :
                        rec.priority === 'high' ? 'bg-orange-50 border-orange-200' :
                        'bg-blue-50 border-blue-200'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Lightbulb className={cn(
                          'w-5 h-5 flex-shrink-0',
                          rec.priority === 'critical' ? 'text-red-600' :
                          rec.priority === 'high' ? 'text-orange-600' :
                          'text-blue-600'
                        )} />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-neutral-900 mb-1">
                            {rec.text}
                          </p>
                          <p className="text-xs text-neutral-600">
                            الإجراء المقترح: {
                              rec.action === 'focus_collection' ? 'التركيز على التحصيل' :
                              rec.action === 'complete_tasks' ? 'إكمال المهام' :
                              rec.action === 'improve_collection' ? 'تحسين نسبة التحصيل' :
                              'متابعة'
                            }
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-bold text-neutral-700">أداء ممتاز!</p>
                  <p className="text-sm text-neutral-500">لا توجد توصيات حالياً</p>
                </div>
              )}

              {/* Action Plan */}
              {recommendations.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl mt-6">
                  <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    خطة العمل المقترحة
                  </h3>
                  <div className="space-y-2 text-xs text-purple-800">
                    <p>✅ الأسبوع القادم:</p>
                    <ul className="mr-4 space-y-1">
                      {unpaidInvoices && unpaidInvoices.length > 0 && (
                        <li>• تحصيل {Math.min(3, unpaidInvoices.length)} فواتير متأخرة</li>
                      )}
                      {overdueTasks && overdueTasks.length > 0 && (
                        <li>• إكمال {Math.min(5, overdueTasks.length)} مهام متأخرة</li>
                      )}
                      <li>• التواصل مع جميع العملاء المتأخرين</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  );
};

export default EmployeeDetailedReport;
