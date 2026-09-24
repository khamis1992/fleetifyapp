import React, { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Users,
  Car,
  FileText,
  DollarSign,
  Building,
  ArrowUpLeft,
  SearchX,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageEmpty, PageLoading, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

interface SearchResult {
  id: string;
  type: 'customer' | 'vehicle' | 'contract' | 'payment' | 'company' | 'error';
  title: string;
  subtitle: string;
  description: string;
  metadata: Record<string, any>;
  route: string;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ElementType; badge: string }
> = {
  customer: { label: 'عميل', icon: Users, badge: 'is-info' },
  vehicle: { label: 'مركبة', icon: Car, badge: 'is-ok' },
  contract: { label: 'عقد', icon: FileText, badge: 'is-neutral' },
  payment: { label: 'دفعة', icon: DollarSign, badge: 'is-warn' },
  company: { label: 'شركة', icon: Building, badge: 'is-risk' },
  error: { label: 'خطأ', icon: SearchX, badge: 'is-risk' },
};

const SearchInner: React.FC = () => {
  const navigate = useNavigate();
  const { companyId, isSystemLevel } = useUnifiedCompanyAccess();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const performSearch = async (term: string, type: string = 'all') => {
      if (!term.trim() || (!companyId && !isSystemLevel)) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        if (type === 'all' || type === 'customer') {
          const customerFields = 'id, customer_code, customer_type, first_name, last_name, company_name, phone, email';
          let customerQuery = supabase
            .from('customers')
            .select(customerFields)
            .eq('company_id', companyId!)
            .eq('is_active', true)
            .limit(10);

          const termWild = `%${term}%`;
          const strategies = [
            () => customerQuery.ilike('first_name', termWild),
            () => customerQuery.ilike('last_name', termWild),
            () => customerQuery.ilike('company_name', termWild),
            () => customerQuery.ilike('phone', termWild),
            () => customerQuery.ilike('email', termWild),
            () => customerQuery.ilike('customer_code', termWild),
          ];

          let customersData: any[] | null = null;
          let lastError: Error | null = null;
          for (const strategy of strategies) {
            try {
              const { data, error } = await strategy();
              if (!error && data && data.length > 0) {
                customersData = data;
                break;
              }
              if (error) lastError = new Error(error.message);
            } catch (strategyError) {
              lastError = strategyError instanceof Error ? strategyError : new Error(String(strategyError));
            }
          }
          if (lastError && !customersData) throw lastError;

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
              route: `/customers?highlight=${customer.id}`,
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
        toast.error(`خطأ في البحث: ${errorMessage}`);
        setResults([{
          id: 'error',
          type: 'error',
          title: 'خطأ في البحث',
          subtitle: errorMessage,
          description: 'يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى',
          metadata: { error: true },
          route: '#',
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch(debouncedSearch, selectedType);
  }, [debouncedSearch, selectedType, companyId, isSystemLevel]);

  const handleResultClick = (result: SearchResult) => {
    if (result.route !== '#') navigate(result.route);
  };

  const visibleResults = selectedType === 'all'
    ? results
    : results.filter(r => r.type === selectedType);

  const counts = Object.entries(typeConfig)
    .filter(([key]) => key !== 'error')
    .map(([key, config]) => ({
      key,
      label: config.label,
      count: results.filter(r => r.type === key).length,
    }))
    .filter(entry => entry.count > 0);

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> مساحة العمل <span>/</span> البحث
            </div>
            <h1>البحث المتقدم</h1>
            <p>ابحث في عملاء النظام ومركباته وسجلاته من مكان واحد.</p>
          </div>
        </header>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="نتائج البحث"
            subtitle="ابدأ بالكتابة، وتظهر النتائج مباشرة من قاعدة البيانات"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 280 }}
                    placeholder="ابحث باسم العميل، رقم الهاتف، الرمز…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    aria-label="مصطلح البحث"
                    autoFocus
                  />
                </div>
                {counts.length > 0 && (
                  <div className="wk-badges" role="group" aria-label="تصفية النتائج">
                    <button
                      type="button"
                      className="wk-badge is-neutral"
                      aria-pressed={selectedType === 'all'}
                      onClick={() => setSelectedType('all')}
                      style={{ cursor: 'pointer' }}
                    >
                      الكل ({results.length})
                    </button>
                    {counts.map(entry => (
                      <button
                        key={entry.key}
                        type="button"
                        className={`wk-badge ${selectedType === entry.key ? 'is-ok' : 'is-neutral'}`}
                        aria-pressed={selectedType === entry.key}
                        onClick={() => setSelectedType(entry.key)}
                        style={{ cursor: 'pointer' }}
                      >
                        {entry.label} ({entry.count})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          >
            {isLoading ? (
              <PageLoading label="جاري البحث…" />
            ) : !searchTerm.trim() ? (
              <PageEmpty icon={SearchIcon} message="ابدأ بكتابة مصطلح البحث لعرض النتائج" />
            ) : visibleResults.length === 0 ? (
              <PageEmpty icon={SearchX} message="لم يتم العثور على نتائج — جرب مصطلحات بحث مختلفة" />
            ) : (
              <div className="dw-priority-list" aria-live="polite">
                {visibleResults.map((result, index) => {
                  const config = typeConfig[result.type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={`${result.id}-${index}`}
                      type="button"
                      className="dw-priority-row"
                      style={{ width: '100%', textAlign: 'start', background: 'inherit', border: 0, cursor: 'pointer' }}
                      onClick={() => handleResultClick(result)}
                    >
                      <span className={`dw-priority-icon ${result.type === 'error' ? 'is-urgent' : ''}`}>
                        <Icon size={19} />
                      </span>
                      <div className="dw-priority-copy">
                        <h3><bdi>{result.title}</bdi></h3>
                        <p>{result.description}</p>
                      </div>
                      <span className={`wk-badge ${config.badge}`}>{config.label}</span>
                      <ArrowUpLeft className="dw-row-arrow" size={16} />
                    </button>
                  );
                })}
              </div>
            )}
            <div className="dw-panel-foot">
              <SearchIcon size={14} />
              <span>يبحث حالياً في العملاء — ستضاف المركبات والعقود والمدفوعات تدريجياً.</span>
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
};

const Search: React.FC = () => {
  return <SearchInner />;
};

export default Search;