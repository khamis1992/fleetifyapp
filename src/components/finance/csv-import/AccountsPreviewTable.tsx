import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AccountData {
  [key: string]: any;
  _rowNumber?: number;
  _hasError?: boolean;
  _errorMessage?: string;
  _parentFound?: boolean;
}

interface AccountsPreviewTableProps {
  data: AccountData[];
  onDataChange?: (data: AccountData[]) => void;
  hierarchyErrors?: Array<{ accountCode: string; message: string; rowNumber: number }>;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export const AccountsPreviewTable: React.FC<AccountsPreviewTableProps> = ({
  data,
  onDataChange,
  hierarchyErrors = []
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'error'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Get column headers from data
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => 
      !key.startsWith('_') && 
      firstRow[key] !== null && 
      firstRow[key] !== undefined
    );
  }, [data]);

  // Create error map for quick lookup
  const errorMap = useMemo(() => {
    const map = new Map<string, string>();
    hierarchyErrors.forEach(error => {
      map.set(error.accountCode, error.message);
    });
    return map;
  }, [hierarchyErrors]);

  // Enhanced data with error information
  const enhancedData = useMemo(() => {
    return data.map(row => {
      const accountCode = row['رقم الحساب'] || row['account_code'] || '';
      const hasError = errorMap.has(accountCode);
      
      return {
        ...row,
        _hasError: hasError,
        _errorMessage: errorMap.get(accountCode) || '',
        _parentFound: !hasError
      };
    });
  }, [data, errorMap]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = enhancedData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row => {
        return Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(row => {
        if (filterStatus === 'error') return row._hasError;
        if (filterStatus === 'valid') return !row._hasError;
        return true;
      });
    }

    return filtered;
  }, [enhancedData, searchTerm, filterStatus]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle numeric sorting for account codes and levels
      if (sortConfig.key.includes('رقم') || sortConfig.key.includes('مستوى') || 
          sortConfig.key.includes('code') || sortConfig.key.includes('level')) {
        const aNum = parseFloat(aValue) || 0;
        const bNum = parseFloat(bValue) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String sorting
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Cycle through: asc -> desc -> null
        const newDirection: SortDirection = 
          prevConfig.direction === 'asc' ? 'desc' : 
          prevConfig.direction === 'desc' ? null : 'asc';
        return { key: newDirection ? key : '', direction: newDirection };
      } else {
        return { key, direction: 'asc' };
      }
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-4 w-4" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const getColumnDisplayName = (column: string) => {
    const columnMap: Record<string, string> = {
      'المستوى': 'المستوى',
      'رقم الحساب': 'رقم الحساب',
      'الوصف': 'الوصف',
      'الوصف بالإنجليزي': 'الوصف بالإنجليزي',
      'account_level': 'المستوى',
      'account_code': 'رقم الحساب',
      'account_name': 'الوصف بالإنجليزي',
      'account_name_ar': 'الوصف',
      'description': 'الوصف',
      'description_en': 'الوصف بالإنجليزي'
    };
    return columnMap[column] || column;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Eye className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-600">لا توجد بيانات للمعاينة</p>
          <p className="text-sm text-slate-500">قم برفع ملف CSV لمعاينة البيانات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          معاينة البيانات
        </CardTitle>
        <CardDescription>
          عرض البيانات المستوردة مع التحقق من صحة التسلسل الهرمي
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="البحث في البيانات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={(value: unknown) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع السجلات</SelectItem>
                <SelectItem value="valid">السجلات الصحيحة</SelectItem>
                <SelectItem value="error">السجلات بها أخطاء</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics */}
        <div className="flex flex-wrap gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            إجمالي: {data.length}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            صحيح: {data.length - hierarchyErrors.length}
          </Badge>
          {hierarchyErrors.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              أخطاء: {hierarchyErrors.length}
            </Badge>
          )}
          <Badge variant="secondary">
            معروض: {paginatedData.length} من {sortedData.length}
          </Badge>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-16">الصف</TableHead>
                  <TableHead className="w-16">الحالة</TableHead>
                  {columns.map((column) => (
                    <TableHead key={column} className="min-w-32">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(column)}
                        className="h-auto p-1 font-medium justify-start gap-1"
                      >
                        {getColumnDisplayName(column)}
                        {getSortIcon(column)}
                      </Button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow 
                    key={index}
                    className={row._hasError ? 'bg-red-50 border-red-200' : ''}
                  >
                    <TableCell className="font-mono text-sm">
                      {row._rowNumber || ((currentPage - 1) * itemsPerPage + index + 1)}
                    </TableCell>
                    <TableCell>
                      {row._hasError ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600" title={row._errorMessage}>
                            خطأ
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600">صحيح</span>
                        </div>
                      )}
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={column} className="max-w-48 truncate">
                        {String(row[column] || '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              صفحة {currentPage} من {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                التالي
              </Button>
            </div>
          </div>
        )}

        {/* Error Details */}
        {hierarchyErrors.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              تفاصيل الأخطاء ({hierarchyErrors.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {hierarchyErrors.slice(0, 10).map((error, index) => (
                <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                  <strong>صف {error.rowNumber}:</strong> حساب {error.accountCode} - {error.message}
                </div>
              ))}
              {hierarchyErrors.length > 10 && (
                <p className="text-sm text-slate-600 p-2">
                  و {hierarchyErrors.length - 10} أخطاء أخرى...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
