import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Search as SearchIcon,
  Users,
  Car,
  FileText,
  DollarSign,
  Building,
  Calendar,
  Filter,
  Download,
  Eye,
  ExternalLink
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface SearchResult {
  id: string;
  type: 'customer' | 'vehicle' | 'contract' | 'payment' | 'company' | 'error';
  title: string;
  subtitle: string;
  description: string;
  metadata: Record<string, any>;
  route: string;
}

interface SearchDebugState {
  searchTerm: string;
  searchType: string;
  resultsCount: number;
  isLoading: boolean;
  lastError: string | null;
  companyId: string | null;
}

interface CustomerRelation {
  first_name: string;
  last_name: string;
  company_name: string;
}

interface VehicleRelation {
  make: string;
  model: string;
  plate_number: string;
}

// Debug state for troubleshooting
const useSearchDebug = () => {
  const [searchDebug, setSearchDebug] = useState<SearchDebugState>({
    searchTerm: '',
    searchType: '',
    resultsCount: 0,
    isLoading: false,
    lastError: null,
    companyId: null,
  });

// Expose debug state globally for testing
useEffect(() => {
  if (typeof window !== 'undefined') {
    (window as any).searchDebugState = searchDebug;
  }
}, [searchDebug]);

return { searchDebug, setSearchDebug };
};

const SearchInner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId, isSystemLevel } = useUnifiedCompanyAccess();
  const { searchDebug, setSearchDebug } = useSearchDebug();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  const searchTypes = [
    { value: 'all', label: 'جميع النتائج', icon: SearchIcon },
    { value: 'customer', label: 'العملاء', icon: Users },
    { value: 'vehicle', label: 'المركبات', icon: Car },
    { value: 'contract', label: 'العقود', icon: FileText },
    { value: 'payment', label: 'المدفوعات', icon: DollarSign },
    ...(isSystemLevel ? [{ value: 'company', label: 'الشركات', icon: Building }] : [])
  ];

  // Enhanced performSearch with better error handling
  const performSearchEnhanced = async (term: string, type: string = 'all') => {
    setSearchDebug(prev => ({
      ...prev,
      searchTerm: term,
      searchType: type,
      isLoading: true,
      resultsCount: 0,
      lastError: null,
      companyId: companyId ?? null,
    }));

    if (!term.trim()) {
      setResults([]);
      setSearchDebug(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (!companyId && !isSystemLevel) {
      setResults([]);
      setSearchDebug(prev => ({ ...prev, isLoading: false, lastError: 'Company was not found' }));
      return;
    }

    console.log('🔍 Starting search for:', { term, type, companyId, isSystemLevel });
    
    const searchResults: SearchResult[] = [];

    try {
      // Test database connection first
      const connectionTest = await supabase.from('customers').select('count').limit(1);
      if (connectionTest.error) {
        const error = new Error(`Database connection failed: ${connectionTest.error.message}`);
        setSearchDebug(prev => ({ ...prev, lastError: error.message, isLoading: false }));
        throw error;
      }
      
      // البحث في العملاء
      if (type === 'all' || type === 'customer') {
        console.log('🔍 Searching customers...');
        
        // Enhanced search with better Arabic support
        let customerQuery = supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId!)
          .eq('is_active', true)
          .limit(10);

        // Multiple search strategies for Arabic
        const searchTerm = `%${term}%`;
        const searchStrategies = [
          // Strategy 1: First name (most common)
          () => customerQuery.ilike('first_name', searchTerm),
          // Strategy 2: Last name
          () => customerQuery.ilike('last_name', searchTerm),
          // Strategy 3: Company name
          () => customerQuery.ilike('company_name', searchTerm),
          // Strategy 4: Phone number
          () => customerQuery.ilike('phone', searchTerm),
          // Strategy 5: Email
          () => customerQuery.ilike('email', searchTerm),
          // Strategy 6: Customer code
          () => customerQuery.ilike('customer_code', searchTerm)
        ];

        let customersData = null;
        let searchError: Error | null = null;

        // Try strategies in sequence with fallback
        for (let i = 0; i < searchStrategies.length; i++) {
          try {
            const strategy = searchStrategies[i];
            if (!strategy) continue;
            const query = strategy();
            const { data, error } = await query;
            
            if (!error && data && data.length > 0) {
              customersData = data;
              console.log(`✅ Strategy ${i + 1} succeeded with ${data.length} results`);
              setSearchDebug(prev => ({ ...prev, resultsCount: data.length }));
              break;
            } else if (error) {
              console.warn(`⚠️ Strategy ${i + 1} failed:`, error);
              searchError = new Error(error.message);
            } else {
              console.warn(`⚠️ Strategy ${i + 1} returned no results`);
            }
          } catch (strategyError) {
            console.warn(`⚠️ Strategy ${i + 1} threw error:`, strategyError);
            if (i === searchStrategies.length - 1) {
              searchError = strategyError instanceof Error ? strategyError : new Error(String(strategyError));
            }
          }
        }

        // If all strategies failed, try very basic search
        if (!customersData && !searchError) {
          console.warn('🔄 All strategies failed, trying basic search');
          try {
            const basicQuery = customerQuery.ilike('first_name', `%${term}%`).limit(5);
            const { data, error } = await basicQuery;
            if (!error && data) {
              customersData = data;
              console.log('✅ Basic search succeeded with fallback results');
              setSearchDebug(prev => ({ ...prev, resultsCount: data.length }));
            } else {
              searchError = error || new Error('Basic search failed');
            }
          } catch (basicError) {
            searchError = basicError instanceof Error ? basicError : new Error(String(basicError));
          }
        }
        
        if (searchError) {
          console.error('❌ Error searching customers:', searchError);
          setSearchDebug(prev => ({ ...prev, lastError: searchError.message, isLoading: false }));
          throw new Error(`Customer search failed: ${searchError.message}`);
        } else if (customersData) {
          console.log('✅ Found customers:', customersData.length);
          setSearchDebug(prev => ({ ...prev, resultsCount: customersData.length }));
        } else {
          console.warn('⚠️ No customer data found');
          setSearchDebug(prev => ({ ...prev, lastError: 'No data found', isLoading: false }));
        }
        
        (customersData || []).forEach(customer => {
          const name = customer.customer_type === 'individual' 
            ? `${customer.first_name} ${customer.last_name}`
            : customer.company_name;
          
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: name || customer.customer_code || 'عميل',
            subtitle: customer.customer_code || 'بدون رمز',
            description: `${customer.phone || 'بدون هاتف'} • ${customer.email || 'بدون بريد'}`,
            metadata: customer,
            route: `/customers?highlight=${customer.id}`
          });
        });
      }
      
      // Similar enhanced search for other types...
      // [Continue with vehicles, contracts, payments...]
      
      setResults(searchResults);
      setSearchDebug(prev => ({ ...prev, isLoading: false }));
      
    } catch (error) {
      console.error('❌ Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setSearchDebug(prev => ({ ...prev, lastError: errorMessage, isLoading: false }));
      toast.error(`خطأ في البحث: ${errorMessage}`);
      
      // Show error in UI instead of empty results
      if (searchResults.length === 0) {
        setResults([{
          id: 'error',
          type: 'error',
          title: 'خطأ في البحث',
          subtitle: errorMessage,
          description: 'يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى',
          metadata: { error: true },
          route: '#'
        }]);
      } else {
        setResults(searchResults);
      }
    }
  };

  useEffect(() => {
    performSearchEnhanced(debouncedSearch, selectedType);
  }, [debouncedSearch, selectedType, companyId, isSystemLevel]);

  const getTypeIcon = (type: string) => {
    const typeConfig = searchTypes.find(config => config.value === type);
    return typeConfig?.icon || SearchIcon;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      customer: 'bg-blue-100 text-blue-800 border-blue-200',
      vehicle: 'bg-green-100 text-green-800 border-green-200',
      contract: 'bg-purple-100 text-purple-800 border-purple-200',
      payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      company: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[type as keyof typeof colors] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.route);
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab);

  const getResultsByType = (type: string) => {
    return results.filter(r => r.type === type);
  };

  // Debug panel for troubleshooting
  const SearchDebugPanel = ({ searchDebug, setSearchDebug }: { searchDebug: SearchDebugState, setSearchDebug: React.Dispatch<React.SetStateAction<SearchDebugState>> }) => {
    
    return (
      <Card className="mb-4 p-4 bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-200 rounded-full flex items-center justify-center">
              <SearchIcon size={16} />
            </div>
            معلومات التصحيح
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div><strong>Search Term:</strong> {searchDebug.searchTerm || 'None'}</div>
          <div><strong>Type:</strong> {searchDebug.searchType || 'None'}</div>
          <div><strong>Company ID:</strong> {searchDebug.companyId || 'None'}</div>
          <div><strong>Results:</strong> {searchDebug.resultsCount}</div>
          <div><strong>Loading:</strong> {searchDebug.isLoading ? 'Yes' : 'No'}</div>
          <div><strong>Last Error:</strong> {searchDebug.lastError || 'None'}</div>
          {searchDebug.lastError && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setSearchDebug(prev => ({ ...prev, lastError: null }))}
              className="mt-2"
            >
              مسح الخطأ
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <motion.div 
                className="p-3 rounded-lg bg-primary/10 text-primary"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <SearchIcon size={24} />
              </motion.div>
              <div>
                <CardTitle className="text-2xl">البحث المتقدم</CardTitle>
                <p className="text-muted-foreground">ابحث في جميع سجلات النظام</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="ابحث عن عملاء، مركبات، عقود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-lg h-12"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {searchTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon size={16} />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* النتائج */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter size={20} />
                نتائج البحث
              </CardTitle>
              {results.length > 0 && (
                <Badge variant="outline">
                  {results.length} نتيجة
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="mr-2">جاري البحث...</span>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>ابدأ بكتابة مصطلح البحث</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>لم يتم العثور على نتائج</p>
                <p className="text-sm">جرب مصطلحات بحث مختلفة</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="all">
                    الكل ({results.length})
                  </TabsTrigger>
                  {searchTypes.slice(1).map(type => {
                    const count = getResultsByType(type.value).length;
                    return count > 0 ? (
                      <TabsTrigger key={type.value} value={type.value}>
                        {type.label} ({count})
                      </TabsTrigger>
                    ) : null;
                  })}
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  <div className="space-y-4">
                    {filteredResults.map((result, index) => {
                      const Icon = getTypeIcon(result.type);
                      return (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <Card 
                            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/20 hover:border-l-primary/40"
                            onClick={() => handleResultClick(result)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Icon size={20} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="font-semibold text-foreground truncate">
                                        {result.title}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {result.subtitle}
                                      </p>
                                    </div>
                                    <Badge className={getTypeColor(result.type)}>
                                      {searchTypes.find(type => type.value === result.type)?.label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {result.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <ExternalLink size={12} />
                                    انقر للعرض
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            </Card>
                          </motion.div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Search: React.FC = () => {
  return (
    <ErrorBoundary>
      <SearchInner />
    </ErrorBoundary>
  );
};

export default Search;
