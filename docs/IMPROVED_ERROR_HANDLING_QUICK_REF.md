# Improved Error Handling - Quick Reference & Examples

## 🚀 Quick Start

### Option 1: Using the Error Handler Hook (Recommended)
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ImprovedErrorDisplay } from '@/components/error';

function MyComponent() {
  const {
    error,
    errorMessage,
    isRetrying,
    clearError,
    executeWithErrorHandling
  } = useErrorHandler({
    context: { component: 'MyComponent', action: 'loadData' }
  });

  const loadData = async () => {
    const data = await executeWithErrorHandling(async () => {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to load data');
      return res.json();
    });
    if (data) {
      // Handle success
    }
  };

  if (error && errorMessage) {
    return (
      <ImprovedErrorDisplay
        error={error}
        errorMessage={errorMessage}
        onRetry={loadData}
        onDismiss={clearError}
        isRetrying={isRetrying}
      />
    );
  }

  return <div>Your component</div>;
}
```

### Option 2: Using Error Handler Directly
```typescript
import { ErrorHandler, getErrorMessage } from '@/lib/errorHandler';

try {
  await someAsyncOperation();
} catch (error) {
  // Log error with context
  ErrorHandler.log(error, {
    component: 'MyComponent',
    action: 'criticalOperation'
  });
  
  // Get user-friendly message
  const errorMsg = getErrorMessage(error);
  
  // Display to user
  displayError(errorMsg);
}
```

### Option 3: Using Route Error Boundary
```typescript
import { ImprovedRouteErrorBoundary } from '@/components/error';

function App() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ImprovedRouteErrorBoundary routeName="Dashboard" fallbackPath="/login">
            <Dashboard />
          </ImprovedRouteErrorBoundary>
        }
      />
    </Routes>
  );
}
```

---

## 🎯 Common Use Cases

### Use Case 1: API Data Loading
```typescript
function ContractsList() {
  const { executeWithErrorHandling, error, errorMessage, clearError } = useErrorHandler({
    context: { component: 'ContractsList', action: 'loadContracts' }
  });

  useEffect(() => {
    const load = async () => {
      const data = await executeWithErrorHandling(async () => {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyId);
        
        if (error) throw error;
        return data;
      });
      
      if (data) {
        setContracts(data);
      }
    };
    
    load();
  }, [companyId]);

  if (error && errorMessage) {
    return <ImprovedErrorDisplay {...} />;
  }

  return <div>{/* List contracts */}</div>;
}
```

### Use Case 2: Form Submission
```typescript
function ContractForm() {
  const { executeWithErrorHandling, error, errorMessage, clearError, isRetrying } = 
    useErrorHandler({
      context: { component: 'ContractForm', action: 'submitForm' }
    });

  const handleSubmit = async (formData) => {
    const result = await executeWithErrorHandling(async () => {
      const { data, error } = await supabase
        .from('contracts')
        .insert([{
          ...formData,
          company_id: companyId
        }]);
      
      if (error) throw error;
      return data;
    });

    if (result) {
      toast.success('تم الحفظ بنجاح');
      navigate('/contracts');
    }
  };

  if (error && errorMessage) {
    return <ImprovedErrorDisplay {...} />;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Use Case 3: Multiple Sequential Operations
```typescript
function ComplexOperation() {
  const { executeWithErrorHandling, error, errorMessage, clearError } = 
    useErrorHandler({
      context: { component: 'ComplexOperation' }
    });

  const execute = async () => {
    // Step 1: Load data
    const data = await executeWithErrorHandling(async () => {
      return await fetch('/api/data1').then(r => r.json());
    });
    if (!data) return; // Error occurred, stop

    // Step 2: Process data
    const processed = await executeWithErrorHandling(async () => {
      return await fetch('/api/process', {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(r => r.json());
    });
    if (!processed) return; // Error occurred, stop

    // Step 3: Save result
    const result = await executeWithErrorHandling(async () => {
      return await fetch('/api/save', {
        method: 'POST',
        body: JSON.stringify(processed)
      }).then(r => r.json());
    });
    
    if (result) {
      // Success
    }
  };

  if (error && errorMessage) {
    return (
      <ImprovedErrorDisplay
        error={error}
        errorMessage={errorMessage}
        onRetry={execute}
        onDismiss={clearError}
      />
    );
  }

  return <button onClick={execute}>Execute</button>;
}
```

### Use Case 4: File Upload with Progress
```typescript
function FileUpload() {
  const { executeWithErrorHandling, error, errorMessage, clearError } = 
    useErrorHandler({
      context: { component: 'FileUpload', action: 'uploadFile' }
    });

  const handleFileUpload = async (file: File) => {
    const result = await executeWithErrorHandling(async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', companyId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    });

    if (result) {
      toast.success('تم رفع الملف بنجاح');
    }
  };

  if (error && errorMessage) {
    return <ImprovedErrorDisplay {...} />;
  }

  return (
    <input
      type="file"
      onChange={(e) => handleFileUpload(e.target.files?.[0]!)}
    />
  );
}
```

### Use Case 5: React Query Integration
```typescript
import { useQuery } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/useErrorHandler';

function ContractsList() {
  const { handleError } = useErrorHandler({
    context: { component: 'ContractsList', action: 'loadContracts' }
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contracts', companyId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyId);
        
        if (error) throw error;
        return data;
      } catch (err) {
        handleError(err as Error);
        throw err;
      }
    }
  });

  if (error) {
    return (
      <ImprovedErrorDisplay
        error={error instanceof Error ? error.message : String(error)}
        errorMessage={getErrorMessage(error)}
        onRetry={refetch}
      />
    );
  }

  return <div>{/* Display contracts */}</div>;
}
```

---

## 🔧 Advanced Patterns

### Pattern 1: Custom Error Callback
```typescript
const handleCustomError = (error: Error | string, context?: any) => {
  // Log to analytics
  analytics.trackError({
    message: typeof error === 'string' ? error : error.message,
    component: context?.component,
    action: context?.action
  });
};

const { executeWithErrorHandling } = useErrorHandler({
  onError: handleCustomError,
  context: { component: 'Dashboard' }
});
```

### Pattern 2: Custom Retry Configuration
```typescript
const { executeWithErrorHandling } = useErrorHandler({
  defaultRetryConfig: {
    maxAttempts: 5,        // Retry up to 5 times
    delayMs: 500,          // Start with 500ms
    backoffMultiplier: 1.5, // 500ms → 750ms → 1125ms...
    maxDelayMs: 60000      // Max 60 seconds
  }
});
```

### Pattern 3: Conditional Retry
```typescript
const { error, errorMessage, retry } = useErrorHandler();

const handleAction = async () => {
  const result = await executeWithErrorHandling(async () => {
    // Some operation
  });

  if (error && errorMessage?.retryable) {
    // Only show retry button for retryable errors
    showRetryButton(() => retry());
  }
};
```

### Pattern 4: Error Fallback UI
```typescript
function MyComponent() {
  const { error, errorMessage, clearError } = useErrorHandler();

  return (
    <>
      {error && errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>{errorMessage.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ImprovedErrorDisplay
                error={error}
                errorMessage={errorMessage}
                onDismiss={clearError}
              />
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Normal component content */}
    </>
  );
}
```

### Pattern 5: Retry with Backoff Directly
```typescript
import { retryWithBackoff } from '@/lib/errorHandler';

const fetchData = async () => {
  try {
    const data = await retryWithBackoff(
      async () => {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('API error');
        return res.json();
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2
      }
    );
    return data;
  } catch (error) {
    console.error('Failed after retries:', error);
  }
};
```

---

## 📋 API Reference

### ErrorHandler Object
```typescript
ErrorHandler.categorize(error)           // Get error category
ErrorHandler.getMessage(error)           // Get error message
ErrorHandler.retry(fn, config)           // Retry with backoff
ErrorHandler.createContext(error)        // Create error context
ErrorHandler.log(error, context)         // Log error
ErrorHandler.getSupportInfo()            // Get support contact info
ErrorHandler.isRecoverable(error)        // Check if retryable
ErrorHandler.getSeverity(error)          // Get error severity
```

### useErrorHandler Hook
```typescript
useErrorHandler(options) // Returns:
  .error                  // Current error
  .errorMessage          // User-friendly message
  .isLoading             // Loading state
  .isRetrying            // Retrying state
  .retryCount            // Current retry count
  .maxRetries            // Max retries
  .clearError()          // Clear error
  .retry()               // Retry operation
  .handleError()         // Handle error
  .executeWithErrorHandling()  // Execute with auto-retry
```

### ImprovedErrorDisplay Component
```typescript
<ImprovedErrorDisplay
  error={error}                    // Error object or message
  errorMessage={errorMessage}      // Error message object
  onRetry={() => {}}              // Retry callback
  onNavigate={(path) => {}}        // Navigation callback
  onDismiss={() => {}}            // Dismiss callback
  isRetrying={false}              // Retrying state
  retryCount={0}                  // Retry count
/>
```

---

## 🧪 Testing

### Test Error Display
```typescript
import { render, screen } from '@testing-library/react';
import { getErrorMessage } from '@/lib/errorHandler';

test('displays network error message', () => {
  const error = new Error('Failed to fetch');
  const message = getErrorMessage(error);
  
  expect(message.title).toContain('اتصال');
  expect(message.suggestions).toHaveLength(3);
  expect(message.retryable).toBe(true);
});
```

### Test Retry Logic
```typescript
test('retries with exponential backoff', async () => {
  let attempts = 0;
  const fn = jest.fn(async () => {
    attempts++;
    if (attempts < 3) throw new Error('Network error');
    return 'success';
  });

  const result = await retryWithBackoff(fn, {
    maxAttempts: 3,
    delayMs: 100,
    backoffMultiplier: 2
  });

  expect(result).toBe('success');
  expect(fn).toHaveBeenCalledTimes(3);
});
```

---

## 📊 Error Categories Quick Guide

| Category | Example | Retryable | Message |
|----------|---------|-----------|---------|
| **network** | No internet | ✅ Yes | Check connection |
| **timeout** | Request too slow | ✅ Yes | Try again |
| **server** | 500 error | ✅ Yes | Server issue |
| **auth** | Invalid token | ❌ No | Re-login |
| **permission** | 403 Forbidden | ❌ No | Contact admin |
| **validation** | Bad data | ❌ No | Fix data |
| **rate_limit** | Too many requests | ✅ Yes | Wait & retry |
| **chunk_load** | Module error | ✅ Yes | Reload page |
| **database** | DB error | ✅ Yes | Try again |
| **not_found** | 404 | ❌ No | Not available |

---

## 🎨 Styling

### Custom Error Colors
```css
/* Low severity - Blue */
.error-low {
  @apply border-blue-200 bg-blue-50;
}

/* Medium severity - Orange */
.error-medium {
  @apply border-yellow-200 bg-yellow-50;
}

/* High severity - Orange-Red */
.error-high {
  @apply border-orange-200 bg-orange-50;
}

/* Critical - Red */
.error-critical {
  @apply border-red-200 bg-red-50;
}
```

---

## ⚡ Performance Tips

1. **Use executeWithErrorHandling** for automatic retry
2. **Debounce** rapid error handling
3. **Cache** error messages to avoid recomputation
4. **Lazy load** error components
5. **Batch** multiple errors

---

## 📱 Mobile Optimization

Error display is fully responsive:
- Full width on mobile
- Stacked buttons
- Readable fonts (16px+)
- Touch-friendly buttons (44px+ height)
- Accessible color contrast

---

## ♿ Accessibility

- ✅ WCAG AA compliant
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Color not only indicator
- ✅ Screen reader friendly

---

## 🚨 Common Mistakes to Avoid

❌ **Don't**:
```typescript
// Bad: Ignoring error
await executeWithErrorHandling(async () => someOp());

// Bad: Not showing error to user
const { error } = useErrorHandler();
if (error) { /* do nothing */ }

// Bad: Not handling retry
const result = await executeWithErrorHandling(...);
// User can't retry manually
```

✅ **Do**:
```typescript
// Good: Check result
const result = await executeWithErrorHandling(async () => someOp());
if (result) { /* success */ }

// Good: Show error with retry
if (error && errorMessage) {
  return <ImprovedErrorDisplay onRetry={retry} />;
}

// Good: Provide manual retry option
<Button onClick={retry} disabled={!error?.retryable}>
  Retry
</Button>
```

---

## 💡 Pro Tips

1. **Always provide context** - Component name and action help debugging
2. **Use executeWithErrorHandling** - Automatic retry without boilerplate
3. **Handle errors gracefully** - Don't crash, show user-friendly message
4. **Log important errors** - Help support team diagnose issues
5. **Test error scenarios** - Don't just test happy path
6. **Keep retries reasonable** - Don't retry forever
7. **Show progress** - Display retry count to user
8. **Support interruption** - Let user cancel retries

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
**Status**: Production Ready ✅
