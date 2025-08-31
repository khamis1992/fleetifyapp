# Error Prevention Guide

## Overview
A comprehensive guide to preventing common TypeScript, React, and database errors in the application.

## TypeScript Error Prevention

### Type Safety Checklist
- [ ] Use generated Supabase types for database entities
- [ ] Define interfaces for all component props
- [ ] Handle null/undefined values explicitly
- [ ] Use type guards for runtime validation
- [ ] Avoid `any` types

### Common TypeScript Errors

#### 1. Property Does Not Exist on Type
```typescript
// ❌ Error-prone
const amount = obligation.paid_amount; // might not exist

// ✅ Safe approach
const amount = obligation.paid_amount ?? 0;
const hasNotes = 'notes' in obligation && obligation.notes;
```

#### 2. Type Assignment Errors
```typescript
// ❌ Mismatched types
type Status1 = 'pending' | 'paid' | 'cancelled';
type Status2 = 'pending' | 'completed' | 'cancelled';
let status: Status1 = 'completed'; // Error

// ✅ Aligned types
type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'partially_paid';
// Use this consistently across all files
```

#### 3. Deep Type Instantiation
```typescript
// ❌ Complex nested generics
type Complex<T> = T extends SomeType<U<V<W>>> ? ... : ...;

// ✅ Simplified types
type SimpleResult = {
  data: DatabaseEntity;
  status: 'success' | 'error';
  message?: string;
};
```

## React Error Prevention

### Component Best Practices
```typescript
// ✅ Well-typed component
interface Props {
  obligation: FinancialObligation;
  onUpdate?: (id: string) => void;
  className?: string;
}

export function ObligationCard({ obligation, onUpdate, className }: Props) {
  // Handle loading and error states
  if (!obligation) {
    return <div>Loading...</div>;
  }

  return (
    <div className={cn("p-4", className)}>
      {/* Component content */}
    </div>
  );
}
```

### Hook Error Prevention
```typescript
// ✅ Robust hook design
export function useObligations() {
  const [data, setData] = useState<FinancialObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('financial_obligations')
          .select('*');
          
        if (error) throw error;
        
        setData(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
```

## Database Error Prevention

### Query Safety
```typescript
// ✅ Safe database queries
const fetchCustomers = async (companyId: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      name,
      email,
      phone,
      customer_type
    `)
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to fetch customers');
  }

  return data || [];
};
```

### RLS Policy Testing
```sql
-- Test policies as different users
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-id", "role": "authenticated"}';

-- Test the query
SELECT * FROM financial_obligations WHERE company_id = 'test-company-id';
```

## Integration Error Prevention

### API Integration
```typescript
// ✅ Robust API calls
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
```

### State Management
```typescript
// ✅ Predictable state updates
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_DATA':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    default:
      return state;
  }
};
```

## Testing Strategy

### Unit Testing
```typescript
// ✅ Component testing
describe('ObligationCard', () => {
  it('renders obligation data correctly', () => {
    const mockObligation: FinancialObligation = {
      id: '1',
      amount: 1000,
      status: 'pending',
      due_date: '2024-01-01',
      // ... other required fields
    };

    render(<ObligationCard obligation={mockObligation} />);
    
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    render(<ObligationCard obligation={null as any} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Integration Testing
```typescript
// ✅ Hook testing
describe('useObligations', () => {
  it('fetches obligations successfully', async () => {
    const { result } = renderHook(() => useObligations());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toEqual(expect.any(Array));
    expect(result.current.error).toBeNull();
  });
});
```

## Error Monitoring

### Runtime Error Handling
```typescript
// ✅ Global error boundary
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Development Tools

#### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint && npm run test"
    }
  }
}
```

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error"
  }
}
```

## Deployment Safety

### Environment Validation
```typescript
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

function validateEnvironment() {
  const missing = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

### Build Validation
```bash
#!/bin/bash
# pre-deploy.sh

echo "Running pre-deployment checks..."

# Type checking
npm run type-check || exit 1

# Build test
npm run build || exit 1

# Run tests
npm run test || exit 1

echo "All checks passed!"
```

## Continuous Improvement

### Code Review Checklist
- [ ] Type safety maintained
- [ ] Error handling implemented
- [ ] Tests updated
- [ ] Documentation current
- [ ] Performance considered

### Metrics to Track
- TypeScript error rate
- Build failure frequency
- Test coverage percentage
- Runtime error occurrence
- Development velocity

### Regular Maintenance
- Weekly: Review error logs
- Monthly: Update dependencies
- Quarterly: Performance audit
- Annually: Architecture review
