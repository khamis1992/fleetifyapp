# Monthly Rent Tracking Feature

## 🎯 Overview
A comprehensive system to track which customers have paid their monthly rent and which haven't, with detailed financial analytics and payment status monitoring.

## ✨ Key Features

### 1. **Real-time Payment Status**
- ✅ **Paid**: Customers who paid full monthly rent
- ⚠️ **Partial**: Customers who paid partially
- ❌ **Unpaid**: Customers who haven't paid yet

### 2. **Smart Calculations**
- Monthly rent amount per customer
- Total amount collected vs expected
- Outstanding balance tracking
- Days overdue calculation (after 5th of month)
- Collection rate percentage

### 3. **Comprehensive Dashboard**

#### Summary Cards:
1. **Total Customers**: Active customers count
2. **Paid Customers**: Count and percentage
3. **Unpaid Customers**: Count (includes partial payments)
4. **Collection Rate**: Percentage with progress bar

#### Financial Summary:
- **Expected Rent**: Total monthly rent from all contracts
- **Collected Amount**: Total payments received
- **Outstanding Amount**: Remaining balance

### 4. **Advanced Features**
- 📅 **Month/Year Selector**: View any month's data
- 🔍 **Smart Search**: Search by customer name, code, or vehicle plate
- 🎯 **Status Filter**: Filter by paid/unpaid/partial status
- 📊 **Detailed Table**: Complete payment information
- 📥 **CSV Export**: Download reports for external use
- 🔄 **Auto-refresh**: Real-time data updates

## 📊 Data Table Columns

| Column | Description |
|--------|-------------|
| Customer Code | Unique customer identifier |
| Customer Name | Full name with overdue days alert |
| Vehicle Plate | Associated vehicle registration |
| Monthly Rent | Contract monthly rent amount |
| Amount Paid | Total paid for selected month |
| Amount Due | Remaining balance |
| Payment Status | Badge showing paid/unpaid/partial |
| Last Payment | Date of most recent payment |
| Contact Info | Phone and email for follow-up |

## 🎨 Visual Indicators

### Row Colors:
- 🟢 **Green**: Fully paid
- 🟡 **Orange**: Partially paid
- 🔴 **Red**: Unpaid

### Status Badges:
- ✅ **Paid** (Green)
- ⚠️ **Partial** (Orange)
- ❌ **Unpaid** (Red)

## 🔗 Access Path

**URL**: `/finance/monthly-rent-tracking`

**Navigation**:
1. Click "المالية" (Finance) in sidebar
2. Select "متابعة الإيجارات الشهرية" (Monthly Rent Tracking)

## 💡 Use Cases

### 1. Monthly Collection Review
**Scenario**: End of month - check who paid and who didn't

**Steps**:
1. Open Monthly Rent Tracking
2. Current month is selected by default
3. Review summary cards for quick overview
4. Check unpaid customers list
5. Export report for accounting

### 2. Follow-up on Late Payments
**Scenario**: Need to contact customers with overdue payments

**Steps**:
1. Filter by "غير مدفوع" (Unpaid)
2. Sort by days overdue
3. Use contact information (phone/email) to reach out
4. Track which customers have partial payments

### 3. Historical Analysis
**Scenario**: Review past months' collection performance

**Steps**:
1. Select month and year from dropdowns
2. Compare collection rates across months
3. Identify patterns in payment behavior
4. Export data for trend analysis

### 4. Customer-specific Inquiry
**Scenario**: Customer calls asking about their payment

**Steps**:
1. Use search box to find customer
2. View their payment status instantly
3. See exact amount paid and remaining
4. Check last payment date

## 📈 Business Intelligence

### Key Metrics Tracked:
- **Collection Efficiency**: Percentage of rent collected
- **Payment Timeliness**: Days overdue tracking
- **Customer Behavior**: Payment patterns and trends
- **Cash Flow**: Expected vs actual collections

### Automated Calculations:
- ✅ Total rent from all active contracts
- ✅ Sum of all payments for selected month
- ✅ Outstanding balances per customer
- ✅ Overdue days (starting from 6th of month)
- ✅ Collection rate percentage
- ✅ Partial payment tracking

## 🔧 Technical Details

### Files Created:

1. **Hook**: `src/hooks/useMonthlyRentTracking.ts`
   - `useMonthlyRentTracking`: Fetches payment data
   - `useRentPaymentSummary`: Calculates summary statistics

2. **Component**: `src/components/finance/MonthlyRentTracker.tsx`
   - Main UI component
   - Handles filtering, search, export

3. **Page**: `src/pages/finance/MonthlyRentTracking.tsx`
   - Route wrapper
   - Protected access control

4. **Route**: Added to `src/pages/Finance.tsx`
   - Path: `/finance/monthly-rent-tracking`
   - Permission: `finance.payments.view`

### Data Sources:
- `contracts` table: Active contracts and monthly rent
- `payments` table: Customer payments
- `customers` table: Customer information
- `vehicles` table: Vehicle plate numbers

### Query Logic:
```typescript
// Get active contracts with monthly rent
contracts WHERE status = 'active'

// Get payments for target month
payments WHERE 
  payment_date BETWEEN start_of_month AND end_of_month
  AND payment_status IN ('completed', 'paid', 'approved')

// Calculate status:
- paid: amount_paid >= monthly_rent
- partial: amount_paid > 0 AND amount_paid < monthly_rent
- unpaid: amount_paid = 0

// Days overdue (if today > 5th of month):
days_overdue = today - 5th_of_month
```

## 🚀 Example Output

### October 2024 Summary:
```
Total Customers: 50
Paid: 35 (70%)
Unpaid: 10 (20%) + 5 partial
Collection Rate: 85.5%

Expected Rent: 250,000 QAR
Collected: 213,750 QAR
Outstanding: 36,250 QAR
```

### Sample Table Row (Unpaid):
```
Code: IND-25-0312
Name: Ahmed Mohamed (متأخر 12 يوم)
Vehicle: ABC-1234
Monthly Rent: 5,000.000 QAR
Paid: 0.000 QAR
Due: 5,000.000 QAR
Status: ❌ غير مدفوع
Last Payment: -
Phone: +974 1234 5678
```

## ⚠️ Important Notes

1. **Payment Due Date**: System considers rent overdue after the 5th of the month
2. **Active Contracts Only**: Only displays customers with active contracts
3. **Currency**: Uses company's configured currency (QAR default)
4. **Real-time**: Data refreshes every 2 minutes automatically
5. **Export**: CSV export includes all filtered data

## 🎯 Benefits

### For Management:
- Quick overview of monthly collections
- Identify late-paying customers
- Track collection trends
- Make informed credit decisions

### For Accounting:
- Accurate payment tracking
- Easy reconciliation
- Export for reporting
- Historical data access

### For Customer Service:
- Quick customer inquiry response
- Payment status verification
- Contact information readily available
- Payment history at a glance

---

**Created**: 2025-10-25
**Status**: ✅ Fully Implemented
**Access**: Finance Module → Monthly Rent Tracking
**Permission Required**: `finance.payments.view`
