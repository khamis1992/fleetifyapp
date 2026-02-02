// @ts-nocheck
/**
 * مكون الفلاتر السريعة لجدول الدفعات
 * تصفية الدفعات حسب الحالة والتاريخ
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';

export type PaymentStatus = 'all' | 'completed' | 'pending' | 'overdue';

interface PaymentFiltersProps {
  onStatusChange: (status: PaymentStatus) => void;
  onSearchChange: (search: string) => void;
  totalCount?: number;
  filteredCount?: number;
}

export const PaymentFilters = ({
  onStatusChange,
  onSearchChange,
  totalCount = 0,
  filteredCount = 0,
}: PaymentFiltersProps) => {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [searchText, setSearchText] = useState('');

  const handleStatusChange = (status: PaymentStatus) => {
    setSelectedStatus(status);
    onStatusChange(status);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onSearchChange(text);
  };

  const handleClearFilters = () => {
    setSelectedStatus('all');
    setSearchText('');
    onStatusChange('all');
    onSearchChange('');
  };

  const isFiltered = selectedStatus !== 'all' || searchText.length > 0;

  const statusOptions: Array<{ value: PaymentStatus; label: string; color: string }> = [
    { value: 'all', label: 'الكل', color: 'bg-slate-100' },
    { value: 'completed', label: 'مدفوع', color: 'bg-green-100' },
    { value: 'pending', label: 'معلق', color: 'bg-yellow-100' },
    { value: 'overdue', label: 'متأخر', color: 'bg-red-100' },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* شريط الفلاتر الرئيسي */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedStatus === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange(option.value)}
            className={selectedStatus === option.value ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {option.label}
          </Button>
        ))}
        
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4 ml-1" />
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* شريط البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="ابحث برقم الدفعة أو الفاتورة..."
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* معلومات التصفية */}
      {isFiltered && (
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>
            يتم عرض <strong>{filteredCount}</strong> من <strong>{totalCount}</strong> دفعة
          </span>
        </div>
      )}
    </div>
  );
};
