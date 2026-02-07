import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { isValidQatarQID, isValidQatarPhone } from './helpers';

const MissingDataWarnings = ({ customer }: { customer: any }) => {
  const { missingFields, invalidFields } = useMemo(() => {
    const missing: { label: string; priority: 'high' | 'medium' | 'low' }[] = [];
    const invalid: { label: string; value: string }[] = [];
    
    if (!customer.national_id && !customer.qid) {
      missing.push({ label: 'الهوية الوطنية / QID', priority: 'high' });
    } else {
      const qid = customer.qid || customer.national_id;
      if (qid && !isValidQatarQID(qid)) {
        invalid.push({ label: 'QID غير صحيح', value: qid });
      }
    }
    if (!customer.driver_license) {
      missing.push({ label: 'رخصة القيادة', priority: 'high' });
    }
    
    if (customer.phone && !isValidQatarPhone(customer.phone)) {
      invalid.push({ label: 'رقم الهاتف غير قياسي', value: customer.phone });
    }
    
    if (!customer.address) {
      missing.push({ label: 'العنوان', priority: 'medium' });
    }
    if (!customer.email) {
      missing.push({ label: 'البريد الإلكتروني', priority: 'medium' });
    }
    if (!customer.date_of_birth) {
      missing.push({ label: 'تاريخ الميلاد', priority: 'low' });
    }
    
    return { missingFields: missing, invalidFields: invalid };
  }, [customer]);

  if (missingFields.length === 0 && invalidFields.length === 0) return null;

  const highPriorityCount = missingFields.filter(f => f.priority === 'high').length;
  const hasIssues = highPriorityCount > 0 || invalidFields.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-6 p-5 rounded-2xl border flex items-start gap-4 backdrop-blur-sm shadow-sm",
        hasIssues
          ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-amber-500/10"
          : "bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200 shadow-teal-500/10"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        hasIssues ? "bg-amber-100" : "bg-teal-100"
      )}>
        <AlertTriangle className={cn(
          "w-5 h-5",
          hasIssues ? "text-amber-600" : "text-teal-600"
        )} />
      </div>
      <div className="flex-1">
        {missingFields.length > 0 && (
          <>
            <h4 className={cn(
              "text-sm font-bold mb-3",
              hasIssues ? "text-amber-900" : "text-teal-900"
            )}>
              بيانات ناقصة ({missingFields.length})
            </h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {missingFields.map((field, idx) => (
                <Badge
                  key={idx}
                  className={cn(
                    "text-xs px-3 py-1 rounded-lg border font-medium",
                    field.priority === 'high'
                      ? "bg-red-50 text-red-700 border-red-200"
                      : field.priority === 'medium'
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  )}
                >
                  {field.label}
                </Badge>
              ))}
            </div>
          </>
        )}
        {invalidFields.length > 0 && (
          <>
            <h4 className="text-sm font-bold mb-3 text-orange-900">
              بيانات غير صحيحة ({invalidFields.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {invalidFields.map((field, idx) => (
                <Badge
                  key={idx}
                  className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-lg font-medium"
                >
                  {field.label}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default MissingDataWarnings;
