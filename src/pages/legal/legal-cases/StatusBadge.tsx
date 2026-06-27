import React from 'react';
import { cn } from '@/lib/utils';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (value: string) => {
    const statusLower = value?.toLowerCase() || '';

    if (
      statusLower.includes('حكم') ||
      statusLower.includes('تنفيذ') ||
      statusLower === 'closed' ||
      statusLower === 'won' ||
      statusLower === 'settled'
    ) {
      return {
        style: 'border-[#22C7A1]/25 bg-[#22C7A1]/10 text-[#0F9F7F]',
        label: 'مغلقة',
      };
    }

    if (
      statusLower.includes('جاري') ||
      statusLower.includes('جلسة') ||
      statusLower.includes('شرطة') ||
      statusLower === 'active' ||
      statusLower === 'in_progress'
    ) {
      return {
        style: 'border-[#38BDF8]/25 bg-[#38BDF8]/10 text-[#0284C7]',
        label: 'نشطة',
      };
    }

    if (
      statusLower.includes('خبير') ||
      statusLower.includes('تحقيق') ||
      statusLower === 'on_hold' ||
      statusLower === 'suspended' ||
      statusLower === 'pending'
    ) {
      return {
        style: 'border-[#7C83F6]/25 bg-[#7C83F6]/10 text-[#5B61D6]',
        label: 'معلقة',
      };
    }

    if (statusLower === 'urgent' || statusLower === 'high') {
      return {
        style: 'border-[#FB6B7A]/25 bg-[#FB6B7A]/10 text-[#E11D48]',
        label: 'عاجلة',
      };
    }

    if (statusLower === 'new') {
      return {
        style: 'border-[#7C83F6]/25 bg-[#7C83F6]/10 text-[#5B61D6]',
        label: 'جديدة',
      };
    }

    return {
      style: 'border-[#E5EAF1] bg-[#F6F8FB] text-[#64748B]',
      label: value || 'غير محدد',
    };
  };

  const config = getStatusConfig(status);

  return (
    <span className={cn('rounded-lg border px-2.5 py-1 text-xs font-semibold', config.style)}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
