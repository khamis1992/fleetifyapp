import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLegalMemos, CustomerSearchResult, LegalMemo } from '@/hooks/useLegalMemos';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { 
  FileText, 
  Search, 
  Send, 
  Eye, 
  Download, 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Building,
  Phone,
  Mail
} from 'lucide-react';

interface LegalMemoGeneratorProps {}

export const LegalMemoGenerator: React.FC<LegalMemoGeneratorProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [memoType, setMemoType] = useState<string>('payment_demand');
  const [customPrompt, setCustomPrompt] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [generatedMemos, setGeneratedMemos] = useState<LegalMemo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { 
    searchCustomers, 
    generateMemo, 
    getMemos, 
    updateMemoStatus, 
    isLoading 
  } = useLegalMemos();
  
  const { companyId } = useUnifiedCompanyAccess();

  const handleSearchCustomers = async () => {
    if (!searchTerm.trim()) {
      toast.error('يرجى إدخال اسم العميل أو معلومات البحث');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchCustomers(searchTerm);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast.info('لم يتم العثور على عملاء مطابقين للبحث');
      } else {
        toast.success(`تم العثور على ${results.length} عميل`);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setSearchResults([]);
    toast.success(`تم اختيار العميل: ${getCustomerDisplayName(customer)}`);
  };

  const handleGenerateMemo = async () => {
    if (!selectedCustomer) {
      toast.error('يرجى اختيار عميل أولاً');
      return;
    }

    try {
      const memo = await generateMemo(selectedCustomer.id, memoType, customPrompt);
      if (memo) {
        setGeneratedMemos(prev => [memo, ...prev]);
        toast.success('تم إنشاء المذكرة القانونية بنجاح');
        
        // Clear form
        setSelectedCustomer(null);
        setCustomPrompt('');
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error generating memo:', error);
    }
  };

  const handleMemoAction = async (memoId: string, action: 'approve' | 'send' | 'view') => {
    try {
      switch (action) {
        case 'approve':
          await updateMemoStatus(memoId, 'approved');
          setGeneratedMemos(prev => 
            prev.map(memo => 
              memo.id === memoId ? { ...memo, status: 'approved' } : memo
            )
          );
          break;
        case 'send':
          await updateMemoStatus(memoId, 'sent');
          setGeneratedMemos(prev => 
            prev.map(memo => 
              memo.id === memoId ? { ...memo, status: 'sent', sent_at: new Date().toISOString() } : memo
            )
          );
          break;
        case 'view':
          // Handle view action - could open a modal or navigate to detail view
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} on memo:`, error);
    }
  };

  const getCustomerDisplayName = (customer: CustomerSearchResult): string => {
    return customer.customer_type === 'individual' 
      ? `${customer.first_name} ${customer.last_name}`
      : customer.company_name || 'شركة غير محددة';
  };

  const getMemoTypeLabel = (type: string): string => {
    const labels = {
      payment_demand: 'مطالبة بالدفع',
      legal_notice: 'إنذار قانوني',
      compliance_warning: 'تحذير امتثال',
      contract_breach: 'انتهاك عقد'
    };
    return labels[type as keyof typeof labels] || 'مذكرة قانونية';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle>مولد المذكرات القانونية</CardTitle>
          </div>
          <p className="text-muted-foreground">
            إنشاء مذكرات قانونية تلقائية للعملاء باستخدام الذكاء الاصطناعي
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memo Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إنشاء مذكرة جديدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">البحث عن العميل</label>
              <div className="flex gap-2">
                <Input
                  placeholder="اسم العميل، رقم الهاتف، أو البطاقة الشخصية..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCustomers()}
                />
                <Button 
                  onClick={handleSearchCustomers}
                  disabled={isSearching || !searchTerm.trim()}
                  size="sm"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">نتائج البحث</label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {searchResults.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-muted rounded cursor-pointer border"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {customer.customer_type === 'individual' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Building className="h-4 w-4" />
                            )}
                            <span className="font-medium">{getCustomerDisplayName(customer)}</span>
                          </div>
                          {customer.is_blacklisted && (
                            <Badge variant="destructive" className="text-xs">محظور</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Selected Customer */}
            {selectedCustomer && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedCustomer.customer_type === 'individual' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Building className="h-4 w-4" />
                    )}
                    <span className="font-medium">{getCustomerDisplayName(selectedCustomer)}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setSelectedCustomer(null)}
                  >
                    ×
                  </Button>
                </div>
                {selectedCustomer.phone && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedCustomer.phone}
                  </div>
                )}
              </div>
            )}

            {/* Memo Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع المذكرة</label>
              <Select value={memoType} onValueChange={setMemoType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_demand">مطالبة بالدفع</SelectItem>
                  <SelectItem value="legal_notice">إنذار قانوني</SelectItem>
                  <SelectItem value="compliance_warning">تحذير امتثال</SelectItem>
                  <SelectItem value="contract_breach">انتهاك عقد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">تعليمات إضافية (اختياري)</label>
              <Textarea
                placeholder="أي تفاصيل إضافية أو متطلبات خاصة للمذكرة..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerateMemo}
              disabled={!selectedCustomer || isLoading}
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              إنشاء المذكرة القانونية
            </Button>
          </CardContent>
        </Card>

        {/* Generated Memos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المذكرات المُنشأة</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedMemos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لم يتم إنشاء مذكرات بعد</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {generatedMemos.map((memo) => (
                    <div key={memo.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">{memo.memo_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {getMemoTypeLabel(memo.memo_type)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(memo.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(memo.status)}
                              <span>
                                {memo.status === 'draft' ? 'مسودة' :
                                 memo.status === 'approved' ? 'معتمدة' :
                                 memo.status === 'sent' ? 'مُرسلة' : 'ملغية'}
                              </span>
                            </div>
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        {memo.title}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleMemoAction(memo.id, 'view')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          عرض
                        </Button>
                        {memo.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMemoAction(memo.id, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            اعتماد
                          </Button>
                        )}
                        {memo.status === 'approved' && (
                          <Button 
                            size="sm"
                            onClick={() => handleMemoAction(memo.id, 'send')}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            إرسال
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          تحميل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};