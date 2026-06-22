/**
 * Cases Filters Component
 * مكون فلاتر القضايا
 * 
 * Features:
 * - Quick filters (urgent, today, this week, active)
 * - Saved filters with localStorage
 * - Advanced search dialog
 * - Filter presets
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  Save,
  X,
  Flame,
  Calendar,
  CheckCircle2,
  Star,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CaseFilters {
  search: string;
  priority?: string;
  status?: string;
  caseType?: string;
  dateFrom?: string;
  dateTo?: string;
  minCost?: number;
  maxCost?: number;
  lawyerName?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: CaseFilters;
  createdAt: string;
}

interface CasesFiltersProps {
  filters: CaseFilters;
  onFiltersChange: (filters: CaseFilters) => void;
  totalCases: number;
  filteredCases: number;
}

const STORAGE_KEY = 'legal_cases_saved_filters';

const CasesFilters: React.FC<CasesFiltersProps> = ({
  filters,
  onFiltersChange,
  totalCases,
  filteredCases,
}) => {
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);

  // Save filters to localStorage
  const saveFiltersToStorage = (filters: SavedFilter[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    setSavedFilters(filters);
  };

  // Quick filter presets
  const quickFilters = [
    {
      id: 'urgent',
      label: 'عاجلة',
      icon: Flame,
      filters: { priority: 'urgent' },
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      id: 'today',
      label: 'اليوم',
      icon: Calendar,
      filters: { dateFrom: new Date().toISOString().split('T')[0] },
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'active',
      label: 'نشطة',
      icon: CheckCircle2,
      filters: { status: 'active' },
      color: 'bg-green-500 hover:bg-green-600',
    },
  ];

  const applyQuickFilter = (preset: typeof quickFilters[0]) => {
    setActivePreset(preset.id);
    onFiltersChange({ ...filters, ...preset.filters });
  };

  const applySavedFilter = (saved: SavedFilter) => {
    setActivePreset(saved.id);
    onFiltersChange(saved.filters);
    toast.success(`تم تطبيق الفلتر: ${saved.name}`);
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) {
      toast.error('الرجاء إدخال اسم للفلتر');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    saveFiltersToStorage(updated);
    setFilterName('');
    setShowSaveDialog(false);
    toast.success(`تم حفظ الفلتر: ${filterName}`);
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    saveFiltersToStorage(updated);
    if (activePreset === id) {
      setActivePreset(null);
    }
    toast.success('تم حذف الفلتر');
  };

  const clearAllFilters = () => {
    onFiltersChange({ search: '' });
    setActivePreset(null);
    toast.success('تم مسح جميع الفلاتر');
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== 'search' && filters[key as keyof CaseFilters]
  );

  return (
    <div className="space-y-4">
      {/* Search Bar + Quick Actions */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في القضايا (رقم القضية، العميل، الوصف...)"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pr-10"
          />
        </div>

        {/* Advanced Search */}
        <Dialog open={showAdvancedDialog} onOpenChange={setShowAdvancedDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              بحث متقدم
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {Object.keys(filters).filter((k) => k !== 'search' && filters[k as keyof CaseFilters]).length}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>بحث متقدم</DialogTitle>
              <DialogDescription>
                استخدم الفلاتر التالية للبحث المتقدم في القضايا
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {/* Priority */}
              <div>
                <Label>الأولوية</Label>
                <Select
                  value={filters.priority || ''}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, priority: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الأولويات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الأولويات</SelectItem>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label>الحالة</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, status: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="pending">معلقة</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Case Type */}
              <div>
                <Label>نوع القضية</Label>
                <Select
                  value={filters.caseType || ''}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, caseType: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">جميع الأنواع</SelectItem>
                    <SelectItem value="commercial">تجاري</SelectItem>
                    <SelectItem value="civil">مدني</SelectItem>
                    <SelectItem value="labor">عمالي</SelectItem>
                    <SelectItem value="rental">إيجارات</SelectItem>
                    <SelectItem value="payment_collection">تحصيل مدفوعات</SelectItem>
                    <SelectItem value="contract_dispute">نزاع عقد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lawyer */}
              <div>
                <Label>المحامي</Label>
                <Input
                  placeholder="اسم المحامي"
                  value={filters.lawyerName || ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, lawyerName: e.target.value || undefined })
                  }
                />
              </div>

              {/* Date From */}
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })
                  }
                />
              </div>

              {/* Date To */}
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, dateTo: e.target.value || undefined })
                  }
                />
              </div>

              {/* Min Cost */}
              <div>
                <Label>الحد الأدنى للتكلفة</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minCost || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minCost: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              {/* Max Cost */}
              <div>
                <Label>الحد الأقصى للتكلفة</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.maxCost || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxCost: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdvancedDialog(false)}>
                إغلاق
              </Button>
              <Button onClick={() => setShowSaveDialog(true)}>
                <Save className="h-4 w-4 mr-2" />
                حفظ كفلتر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearAllFilters} className="gap-2">
            <X className="h-4 w-4" />
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((preset) => {
          const Icon = preset.icon;
          const isActive = activePreset === preset.id;
          return (
            <Button
              key={preset.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyQuickFilter(preset)}
              className={isActive ? preset.color : ''}
            >
              <Icon className="h-4 w-4 mr-1" />
              {preset.label}
            </Button>
          );
        })}
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="h-4 w-4" />
            الفلاتر المحفوظة:
          </span>
          {savedFilters.map((saved) => (
            <Badge
              key={saved.id}
              variant={activePreset === saved.id ? 'default' : 'outline'}
              className="cursor-pointer gap-1 px-3 py-1"
            >
              <span onClick={() => applySavedFilter(saved)}>{saved.name}</span>
              <X
                className="h-3 w-3 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSavedFilter(saved.id);
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        عرض {filteredCases} من {totalCases} قضية
        {hasActiveFilters && ' (مفلترة)'}
      </div>

      {/* Save Filter Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ الفلتر</DialogTitle>
            <DialogDescription>
              احفظ الفلتر الحالي لاستخدامه لاحقاً
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="filter-name">اسم الفلتر</Label>
            <Input
              id="filter-name"
              placeholder="مثال: قضاياي العاجلة"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={saveCurrentFilter}>
              <Save className="h-4 w-4 mr-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasesFilters;
