import React, { useState, useCallback, useEffect } from 'react';
import { Search, FileText, Receipt, Calculator, Users, TrendingUp, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'invoice' | 'payment' | 'journal_entry' | 'customer' | 'account';
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  status?: string;
  icon: React.ElementType;
  action: () => void;
}

export const UniversalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const { user } = useAuth();

  const suggestions = [
    'آخر فاتورة',
    'مدفوعات اليوم',
    'قيود معلقة',
    'ميزان المراجعة',
    'عملاء متأخرين',
  ];

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || !user?.id) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Get company_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profileData?.company_id) return;

      const searchResults: SearchResult[] = [];

      // Search invoices by number or customer name
      if (searchQuery.match(/INV|فاتورة|\d+/i)) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, amount, status, created_at, customers(name)')
          .eq('company_id', profileData.company_id)
          .or(`invoice_number.ilike.%${searchQuery}%`)
          .limit(5);

        invoices?.forEach(invoice => {
          searchResults.push({
            id: invoice.id,
            type: 'invoice',
            title: `فاتورة ${invoice.invoice_number}`,
            subtitle: invoice.customers?.name || 'عميل',
            amount: invoice.amount,
            date: invoice.created_at,
            status: invoice.status,
            icon: FileText,
            action: () => navigate(`/invoices/${invoice.id}`),
          });
        });
      }

      // Search payments
      if (searchQuery.match(/دفعة|payment|PAY/i) || !isNaN(Number(searchQuery))) {
        const { data: payments } = await supabase
          .from('payments')
          .select('id, payment_number, amount, payment_date, payment_method, customers(name)')
          .eq('company_id', profileData.company_id)
          .limit(5);

        payments?.forEach(payment => {
          searchResults.push({
            id: payment.id,
            type: 'payment',
            title: `دفعة ${payment.payment_number}`,
            subtitle: payment.customers?.name || 'دفعة',
            amount: payment.amount,
            date: payment.payment_date,
            icon: Receipt,
            action: () => navigate(`/finance/payments`),
          });
        });
      }

      // Search journal entries
      if (searchQuery.match(/قيد|journal|JE/i)) {
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('id, journal_entry_number, description, total_amount, entry_date, status')
          .eq('company_id', profileData.company_id)
          .or(`journal_entry_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(5);

        entries?.forEach(entry => {
          searchResults.push({
            id: entry.id,
            type: 'journal_entry',
            title: `قيد ${entry.journal_entry_number}`,
            subtitle: entry.description,
            amount: entry.total_amount,
            date: entry.entry_date,
            status: entry.status,
            icon: Calculator,
            action: () => navigate(`/finance/journal-entries`),
          });
        });
      }

      // Search customers
      if (searchQuery.match(/عميل|customer/i) || searchQuery.length > 2) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('company_id', profileData.company_id)
          .ilike('name', `%${searchQuery}%`)
          .limit(5);

        customers?.forEach(customer => {
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: customer.name,
            subtitle: customer.phone || customer.email || 'عميل',
            icon: Users,
            action: () => navigate(`/customers/${customer.id}`),
          });
        });
      }

      // Quick actions based on keywords
      if (searchQuery.match(/ميزان|trial/i)) {
        searchResults.push({
          id: 'trial-balance',
          type: 'account',
          title: 'ميزان المراجعة',
          subtitle: 'عرض ميزان المراجعة الحالي',
          icon: TrendingUp,
          action: () => navigate('/finance/reports?tab=trial-balance'),
        });
      }

      if (searchQuery.match(/تقرير|report/i)) {
        searchResults.push({
          id: 'reports',
          type: 'account',
          title: 'التقارير المالية',
          subtitle: 'جميع التقارير والتحليلات',
          icon: TrendingUp,
          action: () => navigate('/finance/reports'),
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, performSearch]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowResults(true);
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="ابحث: فاتورة #1234، عميل أحمد، قيد 500 ريال..."
          className="pr-12 h-12 text-lg"
        />
        {isSearching && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      {!query && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs"
            >
              <Clock className="w-3 h-3 mr-2" />
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto shadow-lg">
          <div className="p-2">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  result.action();
                  setShowResults(false);
                  setQuery('');
                }}
                className="w-full p-3 hover:bg-muted rounded-lg transition-colors text-right flex items-start gap-3"
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  result.type === 'invoice' && 'bg-blue-100 text-blue-600',
                  result.type === 'payment' && 'bg-green-100 text-green-600',
                  result.type === 'journal_entry' && 'bg-orange-100 text-orange-600',
                  result.type === 'customer' && 'bg-purple-100 text-purple-600',
                  result.type === 'account' && 'bg-gray-100 text-gray-600',
                )}>
                  <result.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-semibold">{result.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {result.subtitle}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {result.amount && (
                      <span className="text-sm font-medium">
                        {result.amount.toLocaleString()} QAR
                      </span>
                    )}
                    {result.status && (
                      <Badge variant={result.status === 'paid' ? 'default' : 'secondary'}>
                        {result.status}
                      </Badge>
                    )}
                    {result.date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.date).toLocaleDateString('ar-QA')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* No Results */}
      {showResults && query && !isSearching && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 p-6 text-center shadow-lg">
          <p className="text-muted-foreground">لا توجد نتائج للبحث</p>
          <p className="text-sm text-muted-foreground mt-1">
            جرب كلمات مفتاحية أخرى
          </p>
        </Card>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

