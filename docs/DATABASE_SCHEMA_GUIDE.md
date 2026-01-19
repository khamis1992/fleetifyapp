# Database Schema Guide

## Overview
This guide covers database schema management, Supabase integration, and maintaining consistency between database structure and TypeScript types.

## Schema Management

### Supabase Migration Workflow
1. Use the migration tool for all database changes
2. Test migrations in development first
3. Ensure RLS policies are properly configured
4. Update TypeScript types after migrations

### Table Design Principles
- Use UUID primary keys
- Include `created_at` and `updated_at` timestamps
- Follow consistent naming conventions (snake_case)
- Design for Arabic language support

### Naming Conventions
```sql
-- ✅ Good: Descriptive, consistent names
CREATE TABLE financial_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  obligation_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS)

### Standard RLS Patterns
```sql
-- Company-based access control
CREATE POLICY "Users can view their company data" 
ON table_name FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Role-based management
CREATE POLICY "Admins can manage data in their company" 
ON table_name FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)
    )
  )
);
```

### RLS Best Practices
- Always enable RLS on new tables
- Use helper functions for common checks
- Test policies with different user roles
- Document policy logic clearly

## Type Generation

### Supabase Type Integration
```typescript
// Auto-generated from database schema
import { Database } from '@/integrations/supabase/types';

// Extract specific table types
type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
```

### Custom Type Extensions
```typescript
// Extend generated types for application logic
interface EnhancedCustomer extends Customer {
  outstanding_balance?: number;
  days_overdue?: number;
  credit_available?: number;
}
```

## Common Table Patterns

### Financial Entities
```sql
-- Standard financial table structure
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  customer_id UUID,
  contract_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Audit and Logging
```sql
-- Audit trail table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Database Functions

### Common Function Patterns
```sql
-- Helper function for company access
CREATE OR REPLACE FUNCTION get_user_company(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM profiles 
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Financial calculation function
CREATE OR REPLACE FUNCTION calculate_outstanding_balance(
  customer_id_param UUID,
  company_id_param UUID
)
RETURNS TABLE(
  current_balance NUMERIC,
  overdue_amount NUMERIC,
  days_overdue INTEGER
) AS $$
BEGIN
  -- Implementation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migration Guidelines

### Creating Migrations
```sql
-- 1. Create tables
CREATE TABLE new_table (
  -- columns
);

-- 2. Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "policy_name" ON new_table
FOR operation USING (condition);

-- 4. Create indexes
CREATE INDEX idx_new_table_company_id ON new_table(company_id);

-- 5. Create triggers if needed
CREATE TRIGGER trigger_name
  BEFORE UPDATE ON new_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Migration Best Practices
- Always backup before migrations
- Test with sample data
- Consider performance impact
- Update RLS policies appropriately
- Document breaking changes

## Schema Validation

### Automated Checks
- Verify all tables have RLS enabled
- Check for missing indexes on foreign keys
- Validate naming conventions
- Ensure proper column types

### Manual Review Checklist
- [ ] All new tables have company_id
- [ ] RLS policies are restrictive enough
- [ ] Indexes on frequently queried columns
- [ ] Proper foreign key constraints
- [ ] Arabic text support where needed

## Troubleshooting

### Common Issues
1. **RLS Policy Too Restrictive**: Data not showing
2. **Missing Indexes**: Slow query performance
3. **Type Mismatches**: Generated types don't match usage
4. **Migration Failures**: Schema conflicts

### Debugging Tools
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM table_name WHERE condition;

-- Check table structure
\d+ table_name
```

## Security Considerations

### Data Protection
- Use RLS for all user data
- Encrypt sensitive information
- Audit data access
- Regular security reviews

### API Security
- Validate all inputs
- Use parameterized queries
- Limit API access by role
- Monitor for suspicious activity

## Performance Optimization

### Query Optimization
- Use appropriate indexes
- Optimize RLS policies
- Consider materialized views
- Monitor query performance

### Database Maintenance
- Regular VACUUM and ANALYZE
- Monitor connection usage
- Archive old data
- Update statistics regularly