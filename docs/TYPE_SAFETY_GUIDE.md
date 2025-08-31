# TypeScript Type Safety Guide

## Overview
This guide provides comprehensive rules and patterns for maintaining type safety across the application to prevent common TypeScript errors.

## Core Principles

### 1. Interface Consistency
- Always define interfaces in a single source of truth
- Avoid duplicate interface definitions across files
- Use barrel exports for type definitions

### 2. Database Schema Alignment
- Keep TypeScript interfaces synchronized with Supabase schema
- Use the generated types from `src/integrations/supabase/types.ts`
- Never manually duplicate database types

### 3. Component Type Safety
- Define prop interfaces for all components
- Use generic types for reusable components
- Prefer type unions over any types

## Common Type Patterns

### Database Entity Types
```typescript
// ✅ Good: Use generated types
import { Database } from '@/integrations/supabase/types';
type Customer = Database['public']['Tables']['customers']['Row'];

// ❌ Bad: Manual type definition
interface Customer {
  id: string;
  name: string;
  // ... other fields
}
```

### Status Enums
```typescript
// ✅ Good: Union types for status
type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

// ❌ Bad: String type
type PaymentStatus = string;
```

### Hook Return Types
```typescript
// ✅ Good: Explicit return type
interface UseCustomerReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  createCustomer: (data: CreateCustomerData) => Promise<void>;
}

export function useCustomers(): UseCustomerReturn {
  // implementation
}
```

## Error Prevention Patterns

### 1. Null Safety
```typescript
// ✅ Good: Handle null/undefined
const displayAmount = obligation.paid_amount ?? 0;
const notes = obligation.notes || 'لا توجد ملاحظات';

// ❌ Bad: Direct access
const displayAmount = obligation.paid_amount;
```

### 2. Type Guards
```typescript
// ✅ Good: Type guard
function isValidObligation(obj: any): obj is FinancialObligation {
  return obj && typeof obj.id === 'string' && typeof obj.amount === 'number';
}
```

### 3. Generic Constraints
```typescript
// ✅ Good: Constrained generics
interface ApiResponse<T extends Record<string, any>> {
  data: T;
  success: boolean;
  error?: string;
}
```

## File Organization

### Type Definition Files
- `/src/types/` - Custom business logic types
- `/src/integrations/supabase/types.ts` - Auto-generated database types
- Component files - Component-specific prop types only

### Import Patterns
```typescript
// ✅ Good: Organized imports
import type { Database } from '@/integrations/supabase/types';
import type { FinancialObligation } from '@/types/financial-obligations';
import { supabase } from '@/integrations/supabase/client';
```

## Validation Rules

### Pre-commit Checks
1. No duplicate type definitions
2. All database queries use generated types
3. Component props are properly typed
4. No `any` types without justification

### Runtime Validation
1. Validate API responses against expected types
2. Use type guards for user inputs
3. Sanitize data before database operations

## Tools and Scripts

### Type Checking Script
```bash
npm run type-check
```

### Schema Validation
```bash
npm run validate-schema
```

### Fix Common Issues
```bash
npm run fix-types
```

## Common Errors and Solutions

### Error: Property does not exist on type
**Cause**: Using properties that don't exist on the interface
**Solution**: Update interface or use optional chaining

### Error: Type is not assignable
**Cause**: Mismatched types between interfaces
**Solution**: Align interfaces or use type assertions with validation

### Error: Excessively deep type instantiation
**Cause**: Complex generic types or circular references
**Solution**: Simplify type definitions or use type aliases

## Best Practices Checklist

- [ ] Use generated Supabase types
- [ ] Define interfaces in dedicated type files
- [ ] Handle null/undefined values explicitly
- [ ] Use type guards for validation
- [ ] Avoid any types
- [ ] Keep interfaces synchronized
- [ ] Use meaningful type names
- [ ] Document complex types

## Integration with Development Workflow

### IDE Configuration
- Enable strict TypeScript checking
- Configure ESLint for type safety
- Use Prettier with TypeScript support

### Team Guidelines
- Review type definitions in pull requests
- Maintain type documentation
- Share common patterns and solutions
