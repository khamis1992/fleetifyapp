import { motion } from 'framer-motion';
import { AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { NavigateFunction } from 'react-router-dom';

const ViolationsTab = ({ violations, navigate, isLoading }: { violations: any[], navigate: NavigateFunction, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center py-12"
      >
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        <span className="mr-2 text-neutral-500">جاري تحميل المخالفات...</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">المخالفات المرورية</h4>
          <p className="text-xs text-neutral-500">{violations.length} مخالفة مسجلة</p>
        </div>
      </div>

      {violations.length > 0 ? (
        <div className="space-y-4">
          {violations.map((violation: any, index: number) => (
            <motion.div
              key={violation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-red-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    violation.status === 'paid' 
                      ? "bg-green-100" 
                      : violation.status === 'pending' 
                        ? "bg-amber-100" 
                        : "bg-red-100"
                  )}>
                    <AlertTriangle className={cn(
                      "w-6 h-6",
                      violation.status === 'paid' 
                        ? "text-green-600" 
                        : violation.status === 'pending' 
                          ? "text-amber-600" 
                          : "text-red-600"
                    )} />
                  </div>
                  <div>
                    <h5 className="font-bold text-neutral-900">{violation.violation_type}</h5>
                    <p className="text-xs text-neutral-500 mt-1">
                      رقم المخالفة: {violation.violation_number}
                    </p>
                    {violation.vehicle && (
                      <p className="text-xs text-neutral-500">
                        المركبة: {violation.vehicle.make} {violation.vehicle.model} - {violation.vehicle.plate_number}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={cn(
                  "text-xs px-3",
                  violation.status === 'paid' 
                    ? "bg-green-100 text-green-700" 
                    : violation.status === 'pending' 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-red-100 text-red-700"
                )}>
                  {violation.status === 'paid' ? 'مدفوعة' : violation.status === 'pending' ? 'قيد السداد' : 'غير مدفوعة'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">تاريخ المخالفة</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {violation.violation_date 
                      ? format(new Date(violation.violation_date), 'dd/MM/yyyy', { locale: ar }) 
                      : '-'}
                  </p>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">الموقع</p>
                  <p className="text-sm font-semibold text-neutral-900">{violation.location || '-'}</p>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">المبلغ</p>
                  <p className="text-sm font-bold text-red-600">{violation.fine_amount?.toLocaleString()} ر.ق</p>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">الجهة المصدرة</p>
                  <p className="text-sm font-semibold text-neutral-900">{violation.issuing_authority || '-'}</p>
                </div>
              </div>

              {violation.violation_description && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-1">الوصف</p>
                  <p className="text-sm text-neutral-700">{violation.violation_description}</p>
                </div>
              )}

              {violation.contract && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/contracts/${violation.contract.contract_number}`)}
                  >
                    <FileText className="w-4 h-4" />
                    عرض العقد #{violation.contract.contract_number}
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">لا توجد مخالفات مرورية مسجلة</p>
          <p className="text-neutral-400 text-sm mt-1">لم يتم تسجيل أي مخالفات على عقود هذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

export default ViolationsTab;
