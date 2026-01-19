# AbortController Quick Reference

## 🎯 Purpose
Prevent memory leaks and wasted API calls by canceling requests when components unmount.

---

## ✅ React Query Pattern (Most Common)

### Basic Usage
```typescript
const useData = () => {
  return useQuery({
    queryKey: ['data'],
    queryFn: async ({ signal }) => { // ✅ Extract signal
      const { data } = await supabase
        .from('table')
        .select('*')
        .abortSignal(signal); // ✅ Pass to query
      
      return data;
    }
  });
};
```

### With Filters
```typescript
const useFiltered = (status: string) => {
  return useQuery({
    queryKey: ['data', status],
    queryFn: async ({ signal }) => {
      const { data } = await supabase
        .from('table')
        .select('*')
        .eq('status', status)
        .abortSignal(signal); // Always at the end
      
      return data;
    }
  });
};
```

### Multiple Queries
```typescript
queryFn: async ({ signal }) => {
  const [users, posts] = await Promise.all([
    supabase.from('users').select('*').abortSignal(signal),
    supabase.from('posts').select('*').abortSignal(signal),
  ]);
  return { users: users.data, posts: posts.data };
}
```

---

## 🔧 useEffect Pattern

### Simple Case
```typescript
import { useAbortController } from '@/hooks/useAbortController';

const MyComponent = () => {
  const { signal } = useAbortController();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .abortSignal(signal);
      
      if (!signal.aborted) { // Check before state update
        setData(data);
      }
    };
    load();
  }, [signal]);
};
```

### With Error Handling
```typescript
import { useAbortController, isAbortError } from '@/hooks/useAbortController';

useEffect(() => {
  const load = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .abortSignal(signal);
      
      setData(data);
    } catch (error) {
      if (isAbortError(error)) return; // Expected
      console.error(error); // Real error
    }
  };
  load();
}, [signal]);
```

---

## 📋 Common Patterns

### Pattern 1: Paginated Query
```typescript
queryFn: async ({ signal }) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data } = await supabase
    .from('items')
    .select('*')
    .range(from, to)
    .abortSignal(signal);
  
  return data;
}
```

### Pattern 2: Count + Data
```typescript
queryFn: async ({ signal }) => {
  // Both queries will be cancelled together
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .abortSignal(signal);

  const { data } = await supabase
    .from('items')
    .select('*')
    .abortSignal(signal);

  return { data, totalCount: count };
}
```

### Pattern 3: Dependent Queries
```typescript
queryFn: async ({ signal }) => {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
    .abortSignal(signal);

  if (!user) return null;

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .abortSignal(signal);

  return { user, posts };
}
```

---

## ⚠️ Important Notes

### ✅ DO
- Always extract `signal` from query context
- Always add `.abortSignal(signal)` to Supabase queries
- Check `signal.aborted` before state updates
- Handle AbortError silently

### ❌ DON'T
- Don't create your own AbortController in React Query hooks
- Don't forget to add `.abortSignal(signal)` to all queries
- Don't throw errors for AbortError
- Don't update state after abort

---

## 🔍 Debugging

### Check if abort is working:
```typescript
queryFn: async ({ signal }) => {
  console.log('Query started');
  
  signal.addEventListener('abort', () => {
    console.log('✅ Query was cancelled!');
  });

  const { data } = await supabase
    .from('table')
    .select('*')
    .abortSignal(signal);
  
  console.log('Query completed'); // Won't log if aborted
  return data;
}
```

---

## 📦 Files Updated

High priority hooks with request cancellation:
- ✅ `useContracts.ts` - Partial
- ✅ `useCustomers.ts` - Partial
- ✅ `useVehicles.ts` - Complete
- ✅ `usePayments.ts` - Complete

---

## 🎓 Learn More

See `REQUEST_CANCELLATION_GUIDE.md` for comprehensive documentation.
