# Improved Error Handling - Quick Start Guide

## 5-Minute Integration

### Step 1: Wrap Your Route (30 seconds)
```typescript
// src/App.tsx
import { ImprovedRouteErrorBoundary } from '@/components/error';

<Route path="/dashboard" element={
  <ImprovedRouteErrorBoundary routeName="Dashboard" fallbackPath="/login">
    <Dashboard />
  </ImprovedRouteErrorBoundary>
} />
```

### Step 2: Add Error Handler to Component (2 minutes)
```typescript
// src/pages/Dashboard.tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ImprovedErrorDisplay } from '@/components/error';

function Dashboard() {
  const {
    error,
    errorMessage,
    executeWithErrorHandling,
    clearError
  } = useErrorHandler({
    context: { component: 'Dashboard', action: 'loadData' }
  });

  useEffect(() => {
    const load = async () => {
      const data = await executeWithErrorHandling(async () => {
        const { data } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyId);
        if (!data) throw new Error('No data');
        return data;
      });
      if (data) setContracts(data);
    };
    load();
  }, []);

  if (error && errorMessage) {
    return (
      <ImprovedErrorDisplay
        error={error}
        errorMessage={errorMessage}
        onRetry={() => { /* reload */ }}
        onDismiss={clearError}
      />
    );
  }

  return <div>{/* Your component */}</div>;
}
```

### Step 3: Done! 🎉
Your component now has:
- ✅ Automatic error detection
- ✅ User-friendly messages
- ✅ Auto-retry (3 attempts)
- ✅ Support contact information
- ✅ Error tracking

---

## Common Use Cases

### Case 1: API Call with Error Handling
```typescript
const loadContracts = async () => {
  const contracts = await executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*');
    if (error) throw error;
    return data;
  });
  
  if (contracts) {
    setContracts(contracts);
    toast.success('تم التحميل بنجاح');
  }
};
```

### Case 2: Form Submission
```typescript
const handleSubmit = async (formData) => {
  const result = await executeWithErrorHandling(async () => {
    const { data, error } = await supabase
      .from('contracts')
      .insert([formData]);
    if (error) throw error;
    return data;
  });
  
  if (result) {
    toast.success('تم الحفظ بنجاح');
    navigate('/contracts');
  }
};
```

### Case 3: Manual Error Handling
```typescript
try {
  await someOperation();
} catch (error) {
  handleError(error, {
    component: 'Dashboard',
    action: 'criticalOperation',
    metadata: { userId: user.id }
  });
}
```

### Case 4: Custom Retry Configuration
```typescript
const { executeWithErrorHandling } = useErrorHandler({
  defaultRetryConfig: {
    maxAttempts: 5,
    delayMs: 500,
    backoffMultiplier: 1.5
  }
});
```

---

## What Gets Shown to Users

### Network Error
```
🔴 مشكلة في الاتصال
تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت أو انتظر قليلاً ثم حاول مجدداً.

اقتراحات:
• تحقق من اتصال الإنترنت
• حاول إغلاق وفتح التطبيق مجدداً
• قد تكون هناك مشاكل في الخادم، حاول لاحقاً

Error ID: ERR-1729070400000-a7f3b2c1 [📋]

[🔄 Retry] [Close] [📧 support@fleetify.app]
```

### Validation Error
```
🔵 بيانات غير صحيحة
تحقق من البيانات التي أدخلتها وحاول مجدداً.

اقتراحات:
• تحقق من صيغة البيانات المدخلة
• تأكد من ملء جميع الحقول المطلوبة
• راجع الأخطاء المعروضة وصححها

Error ID: ERR-1729070402456-c9y3d4e5 [📋]

[Close]
```

---

## API Quick Reference

### useErrorHandler Hook
```typescript
const {
  error,                          // Current error or null
  errorMessage,                   // User-friendly message object
  isLoading,                      // Loading state
  isRetrying,                     // Currently retrying
  retryCount,                     // Number of retry attempts
  maxRetries,                     // Max allowed retries
  clearError(),                   // Clear error state
  retry(),                        // Manually retry
  handleError(error, context),    // Manually handle error
  executeWithErrorHandling(fn)    // Execute with auto-retry
} = useErrorHandler(options);
```

### ErrorHandler Object
```typescript
// Categorize error
ErrorHandler.categorize(error) → ErrorCategory

// Get user-friendly message
ErrorHandler.getMessage(error) → ErrorMessage

// Retry with backoff
ErrorHandler.retry(fn, config) → Promise<T>

// Create error context
ErrorHandler.createContext(error, context) → ErrorContext

// Log error
ErrorHandler.log(error, context) → void

// Get support info
ErrorHandler.getSupportInfo() → { email, phone, chat, hours }

// Check if retryable
ErrorHandler.isRecoverable(error) → boolean

// Get severity
ErrorHandler.getSeverity(error) → 'low' | 'medium' | 'high' | 'critical'
```

### ImprovedErrorDisplay Component
```typescript
<ImprovedErrorDisplay
  error={error}                    // Error object or message
  errorMessage={errorMessage}      // Error message from getErrorMessage()
  onRetry={() => {}}              // Called when user clicks Retry
  onNavigate={(path) => {}}        // Called for navigation actions
  onDismiss={() => {}}            // Called when user closes
  isRetrying={false}              // Show retry loading state
  retryCount={0}                  // Current retry count
/>
```

---

## Error Categories (Quick Reference)

**Retryable (Auto-retry enabled)**:
- `network` - Internet connection issues (3x retry)
- `timeout` - Request took too long (2x retry)
- `rate_limit` - Too many requests (2x retry)
- `server` - 500 errors (3x retry)
- `database` - Database issues (3x retry)
- `chunk_load` - Module failed to load (1x retry)

**Not Retryable (Manual action needed)**:
- `authentication` - Invalid/expired session
- `authorization` - Insufficient permissions
- `validation` - Invalid input data
- `not_found` - Resource not found

---

## Debugging

### View Error History
```javascript
// In browser console
JSON.parse(localStorage.getItem('app_errors'))

// Returns array of last 20 errors with full context
[
  {
    timestamp: "2025-10-27T10:30:00Z",
    component: "Dashboard",
    action: "loadContracts",
    category: "network",
    severity: "high",
    message: "Failed to fetch",
    metadata: { ... }
  },
  // ... more errors
]
```

### Clear Error History
```javascript
localStorage.removeItem('app_errors')
```

### Enable Debug Logging
```javascript
// In browser console
window.__APP_DEBUG__ = true
```

---

## Troubleshooting

### Error not showing?
1. Check console for TypeScript errors
2. Ensure error is within try-catch
3. Verify error hook is initialized
4. Check if error state is being cleared

### Retry not working?
1. Check error category (must be retryable)
2. Verify maxRetries is > 0
3. Check network conditions
4. Look at browser network tab

### Wrong error message?
1. Check error categorization
2. Verify error message is correct
3. Test with known error types
4. Check error object structure

---

## Best Practices

✅ **DO**:
```typescript
// Use hook for automatic error handling
const { executeWithErrorHandling } = useErrorHandler();

// Provide context
useErrorHandler({ context: { component: 'Dashboard' } });

// Show error to user
if (error) return <ImprovedErrorDisplay ... />;

// Use appropriate action buttons
<ImprovedErrorDisplay onRetry={retry} onDismiss={clear} />;
```

❌ **DON'T**:
```typescript
// Don't ignore errors
const result = await executeWithErrorHandling(...);
// Missing: if (result) { ... }

// Don't forget context
useErrorHandler(); // Missing context

// Don't show raw errors
throw new Error('Something went wrong');
// Instead use: getErrorMessage(error)

// Don't retry everything
ErrorHandler.retry(fn, { maxAttempts: 100 }); // Too many!
```

---

## Support

If something isn't working:

1. **Check Documentation**: Read IMPROVED_ERROR_HANDLING_QUICK_REF.md
2. **Look at Examples**: See IMPROVED_ERROR_HANDLING_COMPLETE.md
3. **Debug**: Check localStorage['app_errors'] for error history
4. **Contact Support**: 
   - 📧 support@fleetify.app
   - 📞 +974 4481 5555
   - 💬 https://fleetify.app/support/chat

---

## Next Steps

1. ✅ Add error boundary to routes
2. ✅ Add error handler hook to components
3. ✅ Test with real API calls
4. ✅ Monitor error logs
5. ✅ Adjust retry configuration as needed

---

**Happy error handling! 🎉**

For detailed documentation, see:
- `IMPROVED_ERROR_HANDLING_COMPLETE.md` - Full reference
- `IMPROVED_ERROR_HANDLING_QUICK_REF.md` - Detailed examples
- `IMPROVED_ERROR_HANDLING_VISUAL.txt` - Architecture diagrams
