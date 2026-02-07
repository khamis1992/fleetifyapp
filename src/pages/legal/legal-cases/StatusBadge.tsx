import React from 'react';
import { cn } from '@/lib/utils';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (s: string) => {
    const statusLower = s?.toLowerCase() || '';

    if (statusLower.includes('حكم') || statusLower.includes('تنفيذ') || statusLower === 'closed' || statusLower === 'won' || statusLower === 'settled') {
      return { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'مغلقة' };
    } else if (statusLower.includes('جاري') || statusLower.includes('جلسة') || statusLower.includes('شرطة') || statusLower === 'active' || statusLower === 'in_progress') {
      return { style: 'bg-sky-50 text-sky-700 border-sky-200', label: 'نشطة' };
    } else if (statusLower.includes('خبير') || statusLower.includes('تحقيق') || statusLower === 'on_hold' || statusLower === 'suspended' || statusLower === 'pending') {
      return { style: 'bg-amber-50 text-amber-700 border-amber-200', label: 'معلقة' };
    } else if (statusLower === 'urgent' || statusLower === 'high') {
      return { style: 'bg-rose-50 text-rose-700 border-rose-200', label: 'عاجلة' };
    } else if (statusLower === 'new') {
      return { style: 'bg-violet-50 text-violet-700 border-violet-200', label: 'جديدة' };
    }
    return { style: 'bg-slate-50 text-slate-700 border-slate-200', label: s || 'غير محدد' };
  };

  const config = getStatusConfig(status);

  return (
    <span className={cn('px-2.5 py-1 rounded-md text-xs font-semibold border', config.style)}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
