# Integration Patterns Guide

## Overview
This guide covers integration patterns for connecting React components with Supabase, external APIs, and maintaining consistency across the application.

## Supabase Integration Patterns

### Database Query Patterns

#### Basic CRUD Operations
```typescript
// hooks/useCustomers.ts
export function useCustomers(companyId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          customer_type,
          created_at
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createCustomer = useCallback(async (customerData: CustomerInsert) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;

      setCustomers(prev => [data, ...prev]);
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create customer');
    }
  }, [companyId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    error,
    createCustomer,
    refetch: fetchCustomers,
  };
}
```

#### Complex Queries with Joins
```typescript
// hooks/useFinancialObligations.ts
export function useFinancialObligations(customerId?: string) {
  const [obligations, setObligations] = useState<FinancialObligation[]>([]);

  const fetchObligations = useCallback(async () => {
    try {
      let query = supabase
        .from('financial_obligations')
        .select(`
          id,
          amount,
          due_date,
          status,
          obligation_type,
          customers!inner (
            id,
            first_name,
            last_name,
            company_name
          ),
          contracts (
            id,
            contract_number,
            contract_type
          )
        `);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query
        .order('due_date', { ascending: true });

      if (error) throw error;

      setObligations(data || []);
    } catch (err) {
      console.error('Failed to fetch obligations:', err);
    }
  }, [customerId]);

  useEffect(() => {
    fetchObligations();
  }, [fetchObligations]);

  return { obligations, refetch: fetchObligations };
}
```

### Real-time Subscriptions
```typescript
// hooks/useRealtimeUpdates.ts
export function useRealtimeUpdates<T>(
  table: string,
  filter?: string,
  onUpdate?: (payload: any) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          onUpdate?.(payload);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [table, filter, onUpdate]);
}

// Usage in component
export function CustomerList() {
  const { customers, refetch } = useCustomers();

  useRealtimeUpdates(
    'customers',
    'company_id=eq.user-company-id',
    () => {
      refetch();
    }
  );

  return <div>{/* Customer list */}</div>;
}
```

## API Integration Patterns

### External API Calls
```typescript
// lib/api-client.ts
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient('/api');
```

### Edge Function Integration
```typescript
// hooks/useEdgeFunction.ts
export function useEdgeFunction<TInput, TOutput>(
  functionName: string
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: TInput): Promise<TOutput | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: input,
      });

      if (error) throw error;

      return data as TOutput;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Function execution failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [functionName]);

  return { execute, loading, error };
}

// Usage
function PaymentProcessor() {
  const { execute: processPayment, loading } = useEdgeFunction<
    PaymentData,
    PaymentResult
  >('process-payment');

  const handlePayment = async (paymentData: PaymentData) => {
    try {
      const result = await processPayment(paymentData);
      console.log('Payment processed:', result);
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  return (
    <button onClick={() => handlePayment(data)} disabled={loading}>
      {loading ? 'Processing...' : 'Process Payment'}
    </button>
  );
}
```

## State Management Patterns

### Context-Based State Management
```typescript
// contexts/CompanyContext.tsx
interface CompanyContextType {
  currentCompany: Company | null;
  employees: Employee[];
  updateCompany: (updates: Partial<Company>) => Promise<void>;
  addEmployee: (employee: CreateEmployeeData) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const updateCompany = useCallback(async (updates: Partial<Company>) => {
    if (!currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', currentCompany.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentCompany(data);
    } catch (err) {
      console.error('Failed to update company:', err);
      throw err;
    }
  }, [currentCompany]);

  const contextValue: CompanyContextType = {
    currentCompany,
    employees,
    updateCompany,
    addEmployee: async (employee) => {
      // Implementation
    },
  };

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
}
```

### Reducer Pattern for Complex State
```typescript
// hooks/useDataManager.ts
interface DataState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  selectedItems: Set<string>;
}

type DataAction<T> =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: T[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'ADD_ITEM'; payload: T }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<T> } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'CLEAR_SELECTION' };

function createDataReducer<T extends { id: string }>() {
  return (state: DataState<T>, action: DataAction<T>): DataState<T> => {
    switch (action.type) {
      case 'SET_LOADING':
        return { ...state, loading: action.payload };

      case 'SET_DATA':
        return {
          ...state,
          items: action.payload,
          loading: false,
          error: null,
        };

      case 'SET_ERROR':
        return {
          ...state,
          error: action.payload,
          loading: false,
        };

      case 'ADD_ITEM':
        return {
          ...state,
          items: [action.payload, ...state.items],
        };

      case 'UPDATE_ITEM':
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, ...action.payload.updates }
              : item
          ),
        };

      case 'DELETE_ITEM':
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload),
          selectedItems: new Set([...state.selectedItems].filter(id => id !== action.payload)),
        };

      case 'SELECT_ITEM':
        const newSelection = new Set(state.selectedItems);
        if (newSelection.has(action.payload)) {
          newSelection.delete(action.payload);
        } else {
          newSelection.add(action.payload);
        }
        return { ...state, selectedItems: newSelection };

      case 'CLEAR_SELECTION':
        return { ...state, selectedItems: new Set() };

      default:
        return state;
    }
  };
}

export function useDataManager<T extends { id: string }>(
  initialData: T[] = []
) {
  const reducer = useMemo(() => createDataReducer<T>(), []);
  
  const [state, dispatch] = useReducer(reducer, {
    items: initialData,
    loading: false,
    error: null,
    selectedItems: new Set<string>(),
  });

  const actions = useMemo(() => ({
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setData: (data: T[]) => dispatch({ type: 'SET_DATA', payload: data }),
    setError: (error: string) => dispatch({ type: 'SET_ERROR', payload: error }),
    addItem: (item: T) => dispatch({ type: 'ADD_ITEM', payload: item }),
    updateItem: (id: string, updates: Partial<T>) => 
      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } }),
    deleteItem: (id: string) => dispatch({ type: 'DELETE_ITEM', payload: id }),
    selectItem: (id: string) => dispatch({ type: 'SELECT_ITEM', payload: id }),
    clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),
  }), []);

  return { state, actions };
}
```

## Form Integration Patterns

### React Hook Form with Validation
```typescript
// hooks/useFormWithValidation.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customerSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  customer_type: z.enum(['individual', 'company']),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export function useCustomerForm(
  defaultValues?: Partial<CustomerFormData>,
  onSubmit?: (data: CustomerFormData) => Promise<void>
) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit?.(data);
      form.reset();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Submission failed',
      });
    }
  });

  return { form, handleSubmit };
}

// Component usage
function CustomerForm() {
  const { createCustomer } = useCustomers();
  const { form, handleSubmit } = useCustomerForm(undefined, createCustomer);

  return (
    <form onSubmit={handleSubmit}>
      <Input {...form.register('first_name')} />
      {form.formState.errors.first_name && (
        <span>{form.formState.errors.first_name.message}</span>
      )}
      
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Creating...' : 'Create Customer'}
      </Button>
    </form>
  );
}
```

## Error Handling Patterns

### Global Error Boundary
```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to monitoring service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Async Error Handling
```typescript
// hooks/useAsyncError.ts
export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);

  const catchError = useCallback((error: Error) => {
    setError(error);
    console.error('Async error caught:', error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFunction: () => Promise<T>
  ): Promise<T | null> => {
    try {
      clearError();
      return await asyncFunction();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      catchError(error);
      return null;
    }
  }, [catchError, clearError]);

  return { error, executeAsync, clearError };
}
```

## Performance Optimization Patterns

### Memoization Strategies
```typescript
// hooks/useOptimizedData.ts
export function useOptimizedCustomers(searchTerm: string, filters: CustomerFilters) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Memoize expensive computations
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.last_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = !filters.type || customer.customer_type === filters.type;
      const matchesStatus = !filters.status || customer.status === filters.status;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, searchTerm, filters]);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      // Perform search API call
    }, 300),
    []
  );

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
  }, [searchTerm, debouncedSearch]);

  return { customers: filteredCustomers };
}
```

### Virtual Scrolling for Large Lists
```typescript
// components/VirtualizedList.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
}

export function VirtualizedList<T>({ 
  items, 
  itemHeight, 
  renderItem 
}: VirtualizedListProps<T>) {
  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
    >
      {renderItem}
    </List>
  );
}

// Usage
function CustomerList() {
  const { customers } = useCustomers();

  const renderCustomerItem = ({ index, style, data }: any) => (
    <div style={style}>
      <CustomerCard customer={data[index]} />
    </div>
  );

  return (
    <VirtualizedList
      items={customers}
      itemHeight={80}
      renderItem={renderCustomerItem}
    />
  );
}
```

This guide provides comprehensive patterns for integrating React components with Supabase and external services while maintaining type safety and performance.