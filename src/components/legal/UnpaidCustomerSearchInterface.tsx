import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  Phone, 
  Mail,
  FileText,
  TrendingDown,
  Clock,
  User,
  Building
} from 'lucide-react';
import { useUnpaidCustomerSearch, UnpaidCustomerResult, PaymentStatusFilters } from '@/hooks/useUnpaidCustomerSearch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';

interface UnpaidCustomerSearchInterfaceProps {
  onCustomerSelect?: (customer: UnpaidCustomerResult) => void;
  onGenerateLegalNotice?: (customerId: string) => void;
}

export const UnpaidCustomerSearchInterface: React.FC<UnpaidCustomerSearchInterfaceProps> = ({
  onCustomerSelect,
  onGenerateLegalNotice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PaymentStatusFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<UnpaidCustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<UnpaidCustomerResult | null>(null);

  const { searchUnpaidCustomers, isLoading, error } = useUnpaidCustomerSearch();

  const handleSearch = useCallback(async () => {
    try {
      const results = await searchUnpaidCustomers(searchTerm, filters);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [searchTerm, filters, searchUnpaidCustomers]);

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(3)} د.ك`;
  };

  const getPaymentScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPaymentScoreLabel = (score: number) => {
    if (score >= 80) return 'جيد';
    if (score >= 50) return 'متوسط';
    return 'ضعيف';
  };

  const getOverdueSeverity = (days: number) => {
    if (days >= 90) return { color: 'bg-red-500', label: 'حرج' };
    if (days >= 60) return { color: 'bg-orange-500', label: 'عاجل' };
    if (days >= 30) return { color: 'bg-yellow-500', label: 'متأخر' };
    return { color: 'bg-blue-500', label: 'حديث' };
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            البحث عن العملاء المتأخرين في السداد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'جاري البحث...' : 'بحث'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              فلترة
            </Button>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">نوع العميل</label>
                  <Select
                    value={filters.customerType || ''}
                    onValueChange={(value) => setFilters(prev => ({
                      ...prev,
                      customerType: value as 'individual' | 'corporate' | undefined
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الأنواع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">جميع الأنواع</SelectItem>
                      <SelectItem value="individual">أفراد</SelectItem>
                      <SelectItem value="corporate">شركات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">الحد الأدنى للمبلغ المتأخر</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minOverdueAmount || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minOverdueAmount: e.target.value ? Number(e.target.value) : undefined
                    }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">الحد الأدنى لأيام التأخير</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minOverdueDays || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minOverdueDays: e.target.value ? Number(e.target.value) : undefined
                    }))}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Search Results Summary */}
      {searchResults.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                تم العثور على {searchResults.length} عميل متأخر في السداد
              </span>
              <span className="text-sm font-medium">
                إجمالي المبالغ المتأخرة: {formatCurrency(searchResults.reduce((sum, c) => sum + c.overdue_amount, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="space-y-3">
        {searchResults.map((customer) => (
          <Card key={customer.customer_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {customer.customer_type === 'individual' ? (
                      <User className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Building className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <h3 className="font-semibold">{customer.customer_name || customer.customer_name_ar}</h3>
                      <p className="text-sm text-muted-foreground">
                        {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-red-600">
                          {formatCurrency(customer.overdue_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">مبلغ متأخر</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">{customer.overdue_days} يوم</p>
                        <p className="text-xs text-muted-foreground">مدة التأخير</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{customer.invoice_count}</p>
                        <p className="text-xs text-muted-foreground">إجمالي الفواتير</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className={`text-sm font-medium ${getPaymentScoreColor(customer.payment_history_score)}`}>
                          {getPaymentScoreLabel(customer.payment_history_score)}
                        </span>
                      </div>
                      <Progress value={customer.payment_history_score} className="h-2" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {customer.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Badge 
                    variant="secondary" 
                    className={`${getOverdueSeverity(customer.overdue_days).color} text-white`}
                  >
                    {getOverdueSeverity(customer.overdue_days).label}
                  </Badge>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        onCustomerSelect?.(customer);
                      }}
                    >
                      عرض التفاصيل
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => onGenerateLegalNotice?.(customer.customer_id)}
                    >
                      إشعار قانوني
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {searchResults.length === 0 && searchTerm && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">
              لم يتم العثور على عملاء متأخرين في السداد بناءً على معايير البحث المحددة
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};