/**
 * Legal Overview Component
 * مكون النظرة العامة القانونية
 * 
 * Displays case overview with contract, customer, and vehicle details
 * along with financial summary and quick statistics.
 */


import { motion } from 'framer-motion';
import {
  FileText,
  User,
  Car,
  Calendar,
  Coins,
  AlertTriangle,
  Receipt,
  ShieldAlert,
  Gavel,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { useLawsuitPreparationContext } from '../store';

export function LegalOverview() {
  const { state } = useLawsuitPreparationContext();
  const { contract, customer, vehicle, overdueInvoices, calculations } = state;

  if (!contract || !calculations) {
    return (
      <div className="space-y-6">
        <Card className="bg-white border-teal-600/20">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName = formatCustomerName(customer);

  const vehicleInfo = vehicle
    ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
    : 'غير محدد';

  const plateNumber = vehicle?.plate_number || contract?.license_plate || 'غير محدد';

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US') + ' ر.ق';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
      dir="rtl"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-teal-600/10 rounded-lg border border-teal-600/20">
            <Gavel className="h-5 w-5 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">نظرة عامة على القضية</h2>
        </div>
        <p className="text-slate-600 text-sm mr-12">
          ملخص تفاصيل العقد والمستحقات المالية المطلوب تحصيلها
        </p>
      </motion.div>

      {/* Main Grid - Case Overview */}
      <motion.div variants={itemVariants}>
        <Card className="bg-slate-50 border-slate-200 overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-200 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              تفاصيل القضية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contract Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-teal-600 mb-3">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold text-sm">معلومات العقد</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">رقم العقد</span>
                    <Badge
                      variant="outline"
                      className="border-teal-600/30 text-teal-600 bg-teal-600/5"
                    >
                      {contract.contract_number}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">تاريخ البدء</span>
                    <span className="text-slate-800 text-sm">
                      {new Date(contract.start_date).toLocaleDateString('ar-QA')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">تاريخ الانتهاء</span>
                    <span className="text-slate-800 text-sm">
                      {contract.end_date
                        ? new Date(contract.end_date).toLocaleDateString('ar-QA')
                        : 'مفتوح'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">القيمة الشهرية</span>
                    <span className="text-slate-800 text-sm">
                      {contract.monthly_amount?.toLocaleString('en-US') || '0'} ر.ق
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="hidden md:block bg-slate-200" orientation="vertical" />

              {/* Customer Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-teal-600 mb-3">
                  <User className="h-4 w-4" />
                  <span className="font-semibold text-sm">معلومات العميل</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">الاسم</span>
                    <span className="text-slate-800 text-sm font-medium">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">رقم الهوية</span>
                    <span className="text-slate-800 text-sm">
                      {customer?.national_id || 'غير متوفر'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">الجنسية</span>
                    <span className="text-slate-800 text-sm">
                      {customer?.nationality || customer?.country || 'غير محدد'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">رقم الهاتف</span>
                    <span className="text-slate-800 text-sm" dir="ltr">
                      {customer?.phone || 'غير متوفر'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="hidden md:block bg-slate-200" orientation="vertical" />

              {/* Vehicle Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-teal-600 mb-3">
                  <Car className="h-4 w-4" />
                  <span className="font-semibold text-sm">معلومات المركبة</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">المركبة</span>
                    <span className="text-slate-800 text-sm font-medium">{vehicleInfo}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">رقم اللوحة</span>
                    <Badge
                      variant="outline"
                      className="border-slate-300 text-slate-600 bg-slate-100"
                    >
                      {plateNumber}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">اللون</span>
                    <span className="text-slate-800 text-sm">
                      {vehicle?.color || 'غير محدد'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">رقم الشاسيه</span>
                    <span className="text-slate-800 text-sm text-xs truncate max-w-[120px]">
                      {vehicle?.vin || 'غير متوفر'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Financial Summary Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-slate-50 border-teal-600/30 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-600/10 to-transparent border-b border-teal-600/20 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Coins className="h-5 w-5 text-teal-600" />
              الملخص المالي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Overdue Rent */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-rose-500" />
                  <span className="text-slate-600 text-xs">الإيجار المتأخر</span>
                </div>
                <p className="text-xl font-bold text-rose-500">
                  {formatCurrency(calculations.overdueRent)}
                </p>
              </div>

              {/* Late Fees */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="text-slate-600 text-xs">غرامات التأخير</span>
                </div>
                <p className="text-xl font-bold text-orange-500">
                  {formatCurrency(calculations.lateFees)}
                </p>
              </div>

              {/* Damages */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-yellow-500" />
                  <span className="text-slate-600 text-xs">رسوم الأضرار</span>
                </div>
                <p className="text-xl font-bold text-yellow-500">
                  {formatCurrency(calculations.damagesFee)}
                </p>
              </div>

              {/* Violations */}
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-slate-600 text-xs">المخالفات المرورية</span>
                </div>
                <p className="text-xl font-bold text-red-500">
                  {formatCurrency(calculations.violationsFines)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {calculations.violationsCount} مخالفة
                </p>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-br from-teal-600/20 to-teal-700/20 rounded-lg p-4 border border-teal-600/40">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-teal-600" />
                  <span className="text-teal-700 text-xs font-medium">إجمالي المطالبة</span>
                </div>
                <p className="text-2xl font-bold text-teal-600">
                  {formatCurrency(calculations.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Overdue Invoices Stat */}
          <Card className="bg-slate-50 border-slate-200 hover:border-rose-500/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <Receipt className="h-6 w-6 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">الفواتير المتأخرة</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {overdueInvoices.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      متوسط التأخير: {calculations.avgDaysOverdue} يوم
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-rose-500/30 text-rose-500 bg-rose-500/5"
                >
                  غير مسددة
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Violations Stat */}
          <Card className="bg-slate-50 border-slate-200 hover:border-red-500/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">المخالفات المرورية</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {calculations.violationsCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      بقيمة {formatCurrency(calculations.violationsFines)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-red-500/30 text-red-500 bg-red-500/5"
                >
                  {calculations.violationsCount > 0 ? 'غير مسددة' : 'لا توجد'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LegalOverview;
