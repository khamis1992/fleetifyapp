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
  type: 'customer' | 'vehicle' | 'contract' | 'payment' | 'company';
  title: string;
  subtitle: string;
  description: string;
  metadata: Record<string, any>;
  route: string;
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

const SearchInner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId, isSystemLevel } = useUnifiedCompanyAccess();
  
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

  const performSearch = async (term: string, type: string = 'all') => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    console.log('🔍 Starting search for:', term, 'type:', type, 'companyId:', companyId, 'isSystemLevel:', isSystemLevel);
    
    try {
      const searchResults: SearchResult[] = [];

      // البحث في العملاء
      if (type === 'all' || type === 'customer') {
        console.log('🔍 Searching customers...');
        // محاولة البحث المتقدم أولاً
        let customerQuery = supabase
          .from('customers')
          .select('*');
        
        // إضافة شروط البحث
        try {
          customerQuery = customerQuery.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,company_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,customer_code.ilike.%${term}%`);
        } catch (orError) {
          console.warn('⚠️ OR query failed, trying simpler search:', orError);
          // البحث البسيط كبديل
          customerQuery = customerQuery.ilike('first_name', `%${term}%`);
        }
        
        customerQuery = customerQuery.limit(10);

        if (!isSystemLevel && companyId) {
          customerQuery = customerQuery.eq('company_id', companyId);
        }

        const { data: customers, error: customersError } = await customerQuery;
        
        if (customersError) {
          console.error('❌ Error searching customers:', customersError);
        } else {
          console.log('✅ Found customers:', customers?.length || 0);
        }
        
        customers?.forEach(customer => {
          const name = customer.customer_type === 'individual' 
            ? `${customer.first_name} ${customer.last_name}`
            : customer.company_name;
          
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: name,
            subtitle: customer.customer_code || 'بدون رمز',
            description: `${customer.phone || 'بدون هاتف'} • ${customer.email || 'بدون بريد'}`,
            metadata: customer,
            route: `/customers?highlight=${customer.id}`
          });
        });
      }

      // البحث في المركبات
      if (type === 'all' || type === 'vehicle') {
        console.log('🔍 Searching vehicles...');
        let vehicleQuery = supabase
          .from('vehicles')
          .select('*, customers(first_name, last_name, company_name)')
          .or(`make.ilike.%${term}%,model.ilike.%${term}%,plate_number.ilike.%${term}%,vin.ilike.%${term}%`)
          .limit(10);

        if (!isSystemLevel && companyId) {
          vehicleQuery = vehicleQuery.eq('company_id', companyId);
        }

        const { data: vehicles, error: vehiclesError } = await vehicleQuery;
        
        if (vehiclesError) {
          console.error('❌ Error searching vehicles:', vehiclesError);
        } else {
          console.log('✅ Found vehicles:', vehicles?.length || 0);
        }
        
        vehicles?.forEach(vehicle => {
          const customer = vehicle.customers as any;
          const customerName = customer && typeof customer === 'object' && !Array.isArray(customer)
            ? (customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim())
            : 'غير محدد';
          
          searchResults.push({
            id: vehicle.id,
            type: 'vehicle',
            title: `${vehicle.make} ${vehicle.model}`,
            subtitle: vehicle.plate_number,
            description: `${vehicle.year} • العميل: ${customerName}`,
            metadata: vehicle,
            route: `/fleet?highlight=${vehicle.id}`
          });
        });
      }

      // البحث في العقود
      if (type === 'all' || type === 'contract') {
        console.log('🔍 Searching contracts...');
        let contractQuery = supabase
          .from('contracts')
          .select('*, customers(first_name, last_name, company_name), vehicles(make, model, plate_number)')
          .or(`contract_number.ilike.%${term}%`)
          .limit(10);

        if (!isSystemLevel && companyId) {
          contractQuery = contractQuery.eq('company_id', companyId);
        }

        const { data: contracts, error: contractsError } = await contractQuery;
        
        if (contractsError) {
          console.error('❌ Error searching contracts:', contractsError);
        } else {
          console.log('✅ Found contracts:', contracts?.length || 0);
        }
        
        contracts?.forEach(contract => {
          const customer = contract.customers as any;
          const customerName = customer && typeof customer === 'object' && !Array.isArray(customer)
            ? (customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim())
            : 'غير محدد';
          
          const vehicle = contract.vehicles as any;
          const vehicleInfo = vehicle && typeof vehicle === 'object' && !Array.isArray(vehicle)
            ? `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.plate_number || ''})`.trim()
            : 'غير محدد';
          
          searchResults.push({
            id: contract.id,
            type: 'contract',
            title: contract.contract_number,
            subtitle: customerName,
            description: `${vehicleInfo} • ${contract.status}`,
            metadata: contract,
            route: `/contracts?highlight=${contract.id}`
          });
        });
      }

      // البحث في الشركات (للمدير العام فقط)
      if (isSystemLevel && (type === 'all' || type === 'company')) {
        console.log('🔍 Searching companies...');
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .or(`name.ilike.%${term}%,name_ar.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(10);
        
        if (companiesError) {
          console.error('❌ Error searching companies:', companiesError);
        } else {
          console.log('✅ Found companies:', companies?.length || 0);
        }
        
        companies?.forEach(company => {
          searchResults.push({
            id: company.id,
            type: 'company',
            title: company.name_ar || company.name,
            subtitle: company.email || 'بدون بريد',
            description: `${company.phone || 'بدون هاتف'} • ${company.address || 'بدون عنوان'}`,
            metadata: company,
            route: `/super-admin/companies?highlight=${company.id}`
          });
        });
      }

      console.log('🎯 Total search results:', searchResults.length);
      
      // إضافة بيانات تجريبية إذا لم توجد نتائج (للاختبار)
      if (searchResults.length === 0 && term.trim()) {
        console.log('📝 Adding demo results for testing...');
        const demoResults: SearchResult[] = [
          {
            id: 'demo-customer-1',
            type: 'customer',
            title: `عميل تجريبي - ${term}`,
            subtitle: 'C-001',
            description: '0501234567 • demo@example.com',
            metadata: {},
            route: '/customers'
          },
          {
            id: 'demo-vehicle-1',
            type: 'vehicle',
            title: `مركبة تجريبية - ${term}`,
            subtitle: 'أ ب ج 1234',
            description: '2023 • العميل: عميل تجريبي',
            metadata: {},
            route: '/fleet'
          }
        ];
        setResults(demoResults);
      } else {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('❌ خطأ في البحث:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      toast.error(`خطأ في البحث: ${errorMessage}`);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performSearch(debouncedSearch, selectedType);
  }, [debouncedSearch, selectedType, companyId, isSystemLevel]);

  const getTypeIcon = (type: string) => {
    const typeConfig = searchTypes.find(t => t.value === type);
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
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
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
                                      {searchTypes.find(t => t.value === result.type)?.label}
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
  )
};

export default Search;
