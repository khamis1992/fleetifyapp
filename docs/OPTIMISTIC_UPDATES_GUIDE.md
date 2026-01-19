# Optimistic Updates with Rollback Guide

## Problem Fixed
**Issue**: Optimistic Updates Without Rollback
- UI updates before server confirms
- No rollback mechanism on error
- Data inconsistencies when mutations fail
- User sees incorrect state after errors

## Solution Implemented
Comprehensive optimistic update system with automatic rollback:
- Snapshots before mutations
- Instant UI updates
- Automatic rollback on error
- Type-safe contexts
- Support for multiple query keys

---

## Components Created

### **useOptimisticUpdates.ts** 🆕
**Location**: `src/hooks/useOptimisticUpdates.ts`

**Core Utilities**:
- `useOptimisticUpdate()` - Main hook for optimistic updates
- `useOptimisticList()` - Specialized for list operations
- `useOptimisticPaginated()` - For paginated data
- Helper functions for common patterns

---

## Usage Patterns

### Pattern 1: Create with Optimistic Update

```typescript
import { useOptimisticUpdate, createOptimisticAdd } from '@/hooks/useOptimisticUpdates';

const useCreateCustomer = () => {
  const { optimisticUpdate, rollback } = useOptimisticUpdate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      return customer;
    },
    onMutate: async (variables) => {
      // ✅ Create temp customer with optimistic update
      const tempCustomer = {
        id: `temp-${Date.now()}`,
        ...variables,
        created_at: new Date().toISOString(),
      };

      const context = await optimisticUpdate({
        queryKeys: [['customers']],
        updateFn: createOptimisticAdd(tempCustomer),
      }, tempCustomer);

      console.log('✅ Optimistic create applied');
      return context;
    },
    onSuccess: (data, _, context) => {
      // Replace temp with real data
      queryClient.setQueryData(['customers'], (old: any[]) => {
        const withoutTemp = old.filter(c => !c.id.startsWith('temp-'));
        return [data, ...withoutTemp];
      });
    },
    onError: (error, _, context) => {
      // ✅ Rollback on error
      rollback(context);
      console.log('🔄 Rolled back failed create');
      toast.error('Failed to create customer');
    }
  });
};
```

### Pattern 2: Update with Optimistic Update

```typescript
import { useOptimisticUpdate, createOptimisticUpdate } from '@/hooks/useOptimisticUpdates';

const useUpdateCustomer = () => {
  const { optimisticUpdate, rollback } = useOptimisticUpdate();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return customer;
    },
    onMutate: async (variables) => {
      // ✅ Optimistically update customer
      const updatedCustomer = {
        id: variables.id,
        ...variables.data,
      };

      const context = await optimisticUpdate({
        queryKeys: [['customers'], ['customer', variables.id]],
        updateFn: createOptimisticUpdate(updatedCustomer),
      }, updatedCustomer);

      console.log('✅ Optimistic update applied');
      return context;
    },
    onSuccess: (data) => {
      console.log('✅ Update confirmed by server');
      toast.success('Customer updated');
    },
    onError: (error, _, context) => {
      // ✅ Rollback on error
      rollback(context);
      console.log('🔄 Rolled back failed update');
      toast.error('Failed to update customer');
    }
  });
};
```

### Pattern 3: Delete with Optimistic Update

```typescript
import { useOptimisticUpdate, createOptimisticRemove } from '@/hooks/useOptimisticUpdates';

const useDeleteCustomer = () => {
  const { optimisticUpdate, rollback } = useOptimisticUpdate();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onMutate: async (customerId) => {
      // ✅ Optimistically remove customer
      const context = await optimisticUpdate({
        queryKeys: [['customers']],
        updateFn: createOptimisticRemove(customerId),
      }, customerId);

      console.log('✅ Optimistic delete applied');
      return context;
    },
    onSuccess: () => {
      toast.success('Customer deleted');
    },
    onError: (error, _, context) => {
      // ✅ Rollback on error
      rollback(context);
      console.log('🔄 Rolled back failed delete');
      toast.error('Failed to delete customer');
    }
  });
};
```

---

## Helper Functions

### createOptimisticAdd
Add item to list optimistically:

```typescript
const tempItem = { id: 'temp-123', ...data };
const updateFn = createOptimisticAdd(tempItem);
// Adds item to beginning of list, prevents duplicates
```

### createOptimisticUpdate
Update item in list optimistically:

```typescript
const updatedItem = { id: '123', name: 'New Name' };
const updateFn = createOptimisticUpdate(updatedItem);
// Updates matching item, merges with existing data
```

### createOptimisticRemove
Remove item from list optimistically:

```typescript
const updateFn = createOptimisticRemove('123');
// Filters out item with matching ID
```

### createOptimisticSingle
Update single item (non-list):

```typescript
const updatedData = { name: 'New Name' };
const updateFn = createOptimisticSingle(updatedData);
// Merges with existing single item
```

---

## Advanced Patterns

### Pattern 4: List Operations Hook

```typescript
import { useOptimisticList } from '@/hooks/useOptimisticUpdates';

const MyComponent = () => {
  const { add, update, remove, rollback } = useOptimisticList<Customer>();

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onMutate: (data) => add(['customers'], tempCustomer),
    onError: (_, __, context) => rollback(context),
  });

  const updateMutation = useMutation({
    mutationFn: updateCustomer,
    onMutate: (data) => update(['customers'], data),
    onError: (_, __, context) => rollback(context),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onMutate: (id) => remove(['customers'], id),
    onError: (_, __, context) => rollback(context),
  });
};
```

### Pattern 5: Paginated Updates

```typescript
import { useOptimisticPaginated } from '@/hooks/useOptimisticUpdates';

const MyComponent = () => {
  const { updateAcrossPages, rollback } = useOptimisticPaginated<Customer>();

  const updateMutation = useMutation({
    mutationFn: updateCustomer,
    onMutate: (data) => {
      // Updates customer across all loaded pages
      return updateAcrossPages(['customers'], data);
    },
    onError: (_, __, context) => rollback(context),
  });
};
```

---

## Best Practices

### ✅ DO

1. **Always use onMutate for optimistic updates**
   ```typescript
   onMutate: async (variables) => {
     return optimisticUpdate(...);
   }
   ```

2. **Always rollback on error**
   ```typescript
   onError: (error, variables, context) => {
     rollback(context);
   }
   ```

3. **Use temp IDs for creates**
   ```typescript
   const tempId = `temp-${Date.now()}`;
   ```

4. **Update multiple query keys**
   ```typescript
   queryKeys: [['customers'], ['customer', id]]
   ```

5. **Replace temp data in onSuccess**
   ```typescript
   onSuccess: (data) => {
     // Remove temp, add real
   }
   ```

### ❌ DON'T

1. **Don't skip rollback**
   ```typescript
   onError: (error) => {
     // ❌ Missing rollback!
     toast.error(error.message);
   }
   ```

2. **Don't update in onSuccess only**
   ```typescript
   // ❌ Not optimistic!
   onSuccess: (data) => {
     queryClient.setQueryData(['customers'], data);
   }
   ```

3. **Don't forget to cancel queries**
   - Handled automatically by useOptimisticUpdate

4. **Don't mutate old data directly**
   ```typescript
   // ❌ Wrong
   updateFn: (old) => {
     old.push(newItem); // Mutation!
     return old;
   }

   // ✅ Correct
   updateFn: (old) => [...old, newItem]
   ```

---

## Migration Checklist

### For Each Mutation:

- [ ] Import `useOptimisticUpdate` or specialized hook
- [ ] Add `onMutate` handler
- [ ] Create optimistic update with snapshot
- [ ] Add `onError` handler with rollback
- [ ] Update `onSuccess` to replace temp data
- [ ] Test error scenarios
- [ ] Test success scenarios
- [ ] Verify rollback works

---

## Testing

### Test Optimistic Create
```typescript
test('creates customer optimistically', async () => {
  const { result } = renderHook(() => useCreateCustomer());
  
  // Execute mutation
  await act(async () => {
    result.current.mutate(customerData);
  });
  
  // Verify optimistic update
  const customers = queryClient.getQueryData(['customers']);
  expect(customers).toHaveLength(1);
  expect(customers[0].id).toMatch(/^temp-/);
});
```

### Test Rollback
```typescript
test('rolls back on error', async () => {
  // Mock error
  vi.spyOn(supabase.from('customers'), 'insert').mockRejectedValue(new Error());
  
  const { result } = renderHook(() => useCreateCustomer());
  
  await act(async () => {
    try {
      await result.current.mutateAsync(customerData);
    } catch {}
  });
  
  // Verify rollback
  const customers = queryClient.getQueryData(['customers']);
  expect(customers).toEqual([]); // Back to original
});
```

---

## Files Updated

### ✅ Completed:
- `src/hooks/useOptimisticUpdates.ts` - Core implementation

### ⚠️ Need Updates:
- `src/hooks/useCustomers.ts` - Add proper rollback
- `src/hooks/useContracts.ts` - Add optimistic updates
- `src/hooks/useVehicles.ts` - Add optimistic updates  
- `src/hooks/usePayments.ts` - Add optimistic updates

---

## Impact

### Before:
- ❌ UI updated in `onSuccess` only
- ❌ No rollback on error
- ❌ User sees stale data during mutation
- ❌ Data inconsistencies after errors

### After:
- ✅ Instant UI feedback
- ✅ Automatic rollback on error
- ✅ Consistent data state
- ✅ Better user experience

---

**Created**: 2025-10-26  
**Status**: ✅ Core implementation complete  
**Impact**: Critical - Prevents data inconsistencies
