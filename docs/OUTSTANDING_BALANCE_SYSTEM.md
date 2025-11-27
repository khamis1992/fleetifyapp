# Outstanding Balance Tracking System - Implementation Complete

## ✅ Overview

The Outstanding Balance Tracking System has been successfully implemented for the Financial Tracking module. This system tracks expected payments based on contract duration and calculates unpaid months with automatic balance calculation.

---

## 🗄️ Database Changes

### Migration Applied
**File:** `20251014100000_outstanding_balance_tracking.sql`
**Status:** ✅ Applied Successfully

### New Database Fields

Added to `rental_payment_receipts` table:
```sql
- contract_id UUID              -- Links payment to contract
- month_number INTEGER          -- Sequential month in contract (1, 2, 3...)
- is_late BOOLEAN              -- Auto-marked if paid after 1st
```

### New Database Functions

#### 1. `get_customer_outstanding_balance(customer_id, company_id)`
Calculates complete outstanding balance for a customer:
- Expected total based on contract duration
- Actual total paid
- Outstanding balance
- Months expected vs months paid
- Unpaid month count
- Contract start/end dates

#### 2. `get_customer_unpaid_months(customer_id, company_id)`
Returns list of unpaid months with:
- Month number in contract
- Month name (Arabic)
- Expected payment date
- Overdue status
- Days overdue

#### 3. `get_all_customers_outstanding_balance(company_id)`
Company-wide summary showing:
- All customers with active contracts
- Outstanding balance for each
- Payment status (current/late/overdue)
- Sorted by urgency (overdue first)

---

## 🎯 New React Hooks

### File: `src/hooks/useRentalPayments.ts`

All hooks use React Query for caching and automatic refetching.

### 1. `useCustomerOutstandingBalance(customerId)`
```typescript
const { data: balance } = useCustomerOutstandingBalance(customerId);

// Returns:
interface CustomerOutstandingBalance {
  expected_total: number;           // Total expected based on contract
  total_paid: number;               // Actual paid amount
  outstanding_balance: number;      // Remaining balance
  months_expected: number;          // Total months expected
  months_paid: number;              // Months actually paid
  unpaid_month_count: number;       // Count of unpaid months
  last_payment_date: string | null; // Last payment date
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_rent: number;
}
```

### 2. `useCustomerUnpaidMonths(customerId)`
```typescript
const { data: unpaidMonths = [] } = useCustomerUnpaidMonths(customerId);

// Returns array of:
interface UnpaidMonth {
  month_number: number;        // Sequential month (1, 2, 3...)
  month_name: string;          // "January 2025" etc
  expected_date: string;       // Expected payment date
  is_overdue: boolean;         // Is this month overdue?
  days_overdue: number;        // How many days overdue
}
```

### 3. `useAllCustomersOutstandingBalance()`
```typescript
const { data: allBalances = [] } = useAllCustomersOutstandingBalance();

// Returns array of:
interface CustomerBalanceSummary {
  customer_id: string;
  customer_name: string;
  expected_total: number;
  total_paid: number;
  outstanding_balance: number;
  months_expected: number;
  months_paid: number;
  unpaid_month_count: number;
  last_payment_date: string | null;
  monthly_rent: number;
  payment_status: 'current' | 'late' | 'overdue';
}
```

---

## 📊 Features Implemented

### ✅ 1. Outstanding Balance Calculation
- Automatically calculated based on contract start/end dates
- Compares expected vs actual payments
- Shows clear balance owed

### ✅ 2. Unpaid Month Detection
- Identifies all unpaid months since contract start
- Marks overdue months (past current date)
- Calculates days overdue for each month

### ✅ 3. Payment Status Classification
- **Current**: All payments up to date (0 unpaid months)
- **Late**: 1 unpaid month
- **Overdue**: 2+ unpaid months

### ✅ 4. Automatic Late Payment Marking
- Trigger automatically marks payments made after 1st of month
- `is_late` field set to true automatically
- No manual intervention needed

### ✅ 5. Contract Integration
- Links each payment to its contract
- Tracks month number in contract sequence
- Uses contract dates for expected payment schedule

---

## 🎨 UI Integration Guide

### Display Outstanding Balance for Customer

```typescript
import { useCustomerOutstandingBalance } from '@/hooks/useRentalPayments';

const CustomerBalance = ({ customerId }) => {
  const { data: balance, isLoading } = useCustomerOutstandingBalance(customerId);

  if (isLoading) return <div>جاري التحميل...</div>;
  if (!balance) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>الرصيد المستحق</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">المتوقع</p>
            <p className="text-2xl font-bold">
              {balance.expected_total.toLocaleString('ar-QA')} ريال
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">المدفوع</p>
            <p className="text-2xl font-bold text-green-600">
              {balance.total_paid.toLocaleString('ar-QA')} ريال
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">المتبقي</p>
            <p className="text-2xl font-bold text-destructive">
              {balance.outstanding_balance.toLocaleString('ar-QA')} ريال
            </p>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm">الأشهر المتوقعة: {balance.months_expected}</p>
            <p className="text-sm">الأشهر المدفوعة: {balance.months_paid}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">
              أشهر غير مدفوعة: {balance.unpaid_month_count}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### Display Unpaid Months with Red Highlighting

```typescript
import { useCustomerUnpaidMonths } from '@/hooks/useRentalPayments';

const UnpaidMonthsList = ({ customerId }) => {
  const { data: unpaidMonths = [] } = useCustomerUnpaidMonths(customerId);

  if (unpaidMonths.length === 0) {
    return <Badge variant="secondary">جميع الأشهر مدفوعة ✓</Badge>;
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">
          ⚠️ أشهر غير مدفوعة ({unpaidMonths.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشهر</TableHead>
              <TableHead>تاريخ الاستحقاق</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>أيام التأخير</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unpaidMonths.map((month) => (
              <TableRow 
                key={month.month_number}
                className={month.is_overdue ? 'bg-destructive/10' : ''}
              >
                <TableCell className="font-semibold">
                  {month.month_name}
                </TableCell>
                <TableCell>
                  {format(new Date(month.expected_date), 'dd/MM/yyyy', { locale: ar })}
                </TableCell>
                <TableCell>
                  {month.is_overdue ? (
                    <Badge variant="destructive">متأخر</Badge>
                  ) : (
                    <Badge variant="warning">قادم</Badge>
                  )}
                </TableCell>
                <TableCell className="text-destructive font-bold">
                  {month.days_overdue > 0 ? `${month.days_overdue} يوم` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

### Display All Customers Summary

```typescript
import { useAllCustomersOutstandingBalance } from '@/hooks/useRentalPayments';

const AllCustomersBalanceReport = () => {
  const { data: customers = [], isLoading } = useAllCustomersOutstandingBalance();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ملخص أرصدة جميع العملاء</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>المتوقع</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>أشهر غير مدفوعة</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.customer_id}>
                <TableCell className="font-semibold">
                  {customer.customer_name}
                </TableCell>
                <TableCell>
                  {customer.expected_total.toLocaleString('ar-QA')} ريال
                </TableCell>
                <TableCell className="text-green-600">
                  {customer.total_paid.toLocaleString('ar-QA')} ريال
                </TableCell>
                <TableCell className="font-bold text-destructive">
                  {customer.outstanding_balance.toLocaleString('ar-QA')} ريال
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {customer.unpaid_month_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(customer.payment_status)}>
                    {customer.payment_status === 'current' && 'محدث'}
                    {customer.payment_status === 'late' && 'متأخر'}
                    {customer.payment_status === 'overdue' && 'متأخر جداً'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

---

## 🔄 Automatic Updates

All outstanding balance calculations update automatically when:
- New payment is added
- Payment is deleted
- Payment is updated
- Contract is modified

React Query cache invalidation ensures data stays synchronized.

---

## 📝 Usage Examples

### Example 1: Show balance when customer is selected
```typescript
const { data: selectedCustomer } = useCustomer(customerId);
const { data: balance } = useCustomerOutstandingBalance(customerId);
const { data: unpaidMonths } = useCustomerUnpaidMonths(customerId);

// Display balance cards
// Display unpaid months with red highlighting
// Show payment suggestion based on unpaid months
```

### Example 2: Dashboard summary widget
```typescript
const { data: allBalances } = useAllCustomersOutstandingBalance();

const overdueCustomers = allBalances.filter(c => c.payment_status === 'overdue');
const totalOutstanding = allBalances.reduce((sum, c) => sum + c.outstanding_balance, 0);

// Show dashboard cards with totals
// Highlight customers needing attention
```

### Example 3: Payment form pre-fill
```typescript
const { data: unpaidMonths } = useCustomerUnpaidMonths(customerId);

// Suggest oldest unpaid month for next payment
const nextMonth = unpaidMonths[0];
// Pre-fill form with suggested month
```

---

## ⚙️ Configuration

### Fine Calculation Rules
Defined in database function `calculate_rental_delay_fine`:
- **Due Date**: 1st of each month
- **Fine Rate**: 120 QAR per day late
- **Maximum**: 3000 QAR per month

### Payment Status Thresholds
- **Current**: 0 unpaid months
- **Late**: 1 unpaid month
- **Overdue**: 2+ unpaid months

---

## 🚨 Important Notes

### TypeScript Errors (Expected)
You may see TypeScript errors about unknown table/function names. These are expected because:
1. Generated types don't include new tables/functions yet
2. Code works perfectly at runtime
3. Supabase types need regeneration (optional)

To fix (optional):
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Contract Requirements
Outstanding balance tracking requires:
- Active contract with `status = 'active'`
- Contract must have `start_date` and `monthly_payment`
- `end_date` is optional (assumes ongoing if null)

### Query Performance
All database functions are optimized:
- Proper indexes on foreign keys
- STABLE functions for better caching
- Efficient queries with early returns

---

## ✅ Testing Checklist

- [x] Database migration applied successfully
- [x] Functions created and working
- [x] Hooks created with proper TypeScript interfaces
- [x] Auto-invalidation on mutations
- [x] Late payment trigger working
- [ ] UI components implemented (next step)
- [ ] Red highlighting for unpaid months (next step)
- [ ] Balance cards displayed (next step)
- [ ] All customers summary table (next step)

---

## 📈 Next Steps

1. **Update FinancialTracking.tsx** to display:
   - Outstanding balance cards for selected customer
   - Unpaid months with red highlighting
   - Payment suggestions based on unpaid months

2. **Add "Outstanding Balance" tab** to show:
   - All customers with outstanding balances
   - Sorted by urgency (overdue first)
   - Filter and search capabilities

3. **Add Payment Suggestions**:
   - Auto-suggest next unpaid month
   - Calculate expected amount (rent + potential fine)
   - One-click payment for suggested month

4. **Add Dashboard Widgets**:
   - Total outstanding across all customers
   - Count of overdue customers
   - Revenue at risk metric

---

## 🎉 Status: BACKEND COMPLETE ✅

The outstanding balance tracking system is fully implemented in the database and hooks layer. All calculations are automatic and update in real-time. The system is ready for UI integration!
