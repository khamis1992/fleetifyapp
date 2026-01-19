# Collections Dashboard - Complete Guide

## 📊 Overview

The **Collections Dashboard** is a comprehensive payment tracking and collections management system for the Fleetify application. It provides real-time insights into overdue payments, customer payment behavior, and automated collections workflows.

---

## 🎯 Features Implemented

### ✅ Phase 1: Core Service (COMPLETE)
- Payment Score Calculation (0-100 algorithm)
- Collections Summary Dashboard
- Payment Health Score
- Priority Collections Queue
- Reminder Stage Determination
- Customer Behavior Analytics
- Risk Indicators System

### ✅ Phase 2: Database Tables (COMPLETE)
- 7 new tables with RLS policies
- Automated triggers and functions
- 3 useful database views
- Auto-pay tracking support

### ✅ Phase 3: Collections Dashboard UI (COMPLETE)
- Collections Command Center
- Real-time summary cards
- Payment Health Score visualization
- Priority Customers Queue with smart sorting
- Customer Payment Score Detail viewer
- One-click contact actions (Call, Email, SMS)

---

## 🗂️ File Structure

```
src/
├── lib/
│   └── paymentCollections.ts          # Core business logic (731 lines)
├── components/
│   └── payments/
│       ├── CollectionsDashboard.tsx   # Main dashboard component (528 lines)
│       └── index.ts                   # Module exports
└── pages/
    └── Collections.tsx                # Collections page wrapper

supabase/
└── migrations/
    └── 20250126_payment_collections_tables.sql  # Database schema (588 lines)
```

---

## 🚀 Usage

### Basic Implementation

```typescript
import { CollectionsDashboard } from '@/components/payments';

function MyPage() {
  const companyId = "your-company-id";
  
  return <CollectionsDashboard companyId={companyId} />;
}
```

### Full Page Example

```typescript
// src/pages/Collections.tsx
import { CollectionsDashboard } from '@/components/payments';

const Collections = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Get company ID from authenticated user
    getCompanyId().then(setCompanyId);
  }, []);

  if (!companyId) return <LoadingSpinner />;

  return <CollectionsDashboard companyId={companyId} />;
};
```

---

## 📊 Dashboard Components

### 1. Collections Summary Cards

**Four key metrics displayed at the top:**

```typescript
// Summary Cards
1. Total Overdue       - Total $ amount overdue (RED - Critical)
2. Overdue Customers   - Number of customers with overdue invoices (YELLOW - Warning)
3. Avg Days Overdue    - Average days past due (BLUE - Info)
4. Collection Rate     - Success rate % (GREEN - Success)
```

**Features:**
- Real-time data updates (every 60 seconds)
- Trend indicators (improving/stable/worsening)
- Color-coded by severity
- Loading states with skeleton UI

### 2. Payment Health Score

**Visual breakdown of payment health:**

```typescript
// Payment Health Score Components
- Overall Score: 0-100 (last 90 days)
- Category Badge: Healthy | Warning | Critical
- Progress Bar visualization
- Breakdown Grid:
  - On Time payments (green)
  - Late 1-15 days (yellow)
  - Very Late 16-30 days (orange)
  - Defaulted 30+ days (red)
```

**Health Categories:**
- **Healthy** (80-100): Green badge, good payment discipline
- **Warning** (50-79): Yellow badge, attention needed
- **Critical** (0-49): Red badge, immediate action required

### 3. Priority Collections Queue

**Top 10 customers requiring immediate attention:**

**Smart Sorting Algorithm:**
```typescript
priority = (totalOverdue × 0.4) + 
           (daysOverdue × 100 × 0.3) + 
           (riskScore × 10 × 0.3)
```

**Display for Each Customer:**
- Ranking number (#1, #2, etc.)
- Customer name
- Risk badge (Low/Medium/High/Critical)
- Payment score badge (Excellent/Good/Fair/Poor/Very Poor)
- Total overdue amount
- Days overdue
- Risk score (0-100)
- Payment score (0-100)
- Quick action buttons (Call, Email, SMS)

**Risk Score Badges:**
- 🔴 **Critical** (75-100): Immediate action required
- 🟠 **High** (50-74): High priority
- 🟡 **Medium** (25-49): Monitor closely
- 🔵 **Low** (0-24): Standard follow-up

**Payment Score Badges:**
- 🟢 **Excellent** (90-100): 90+ score
- 🔵 **Good** (70-89): Reliable customer
- 🟡 **Fair** (50-69): Occasional delays
- 🟠 **Poor** (30-49): Frequent issues
- 🔴 **Very Poor** (0-29): High risk

### 4. Customer Payment Score Detail

**Appears when customer is selected from queue:**

**Displays:**
- Large score display (0-100)
- Category badge
- Trend indicator (Improving/Stable/Declining)
- Score breakdown with point values:
  - ❌ Late Payments deduction
  - ❌ Broken Promises deduction
  - ❌ Disputes deduction
  - ❌ Failed Payments deduction
  - ✅ Early Payments bonus
  - ✅ Other Bonuses
- Last updated timestamp

**Interaction:**
- Click any customer in Priority Queue to view details
- Automatically fetches and calculates score
- Shows only non-zero breakdown items

---

## 🎨 UI/UX Features

### Color Coding System

```typescript
// Severity Colors
Critical:  Red (#EF4444)    - High urgency
Warning:   Yellow (#F59E0B) - Medium urgency
Success:   Green (#10B981)  - Positive status
Info:      Blue (#3B82F6)   - Informational
```

### Responsive Design

- **Desktop**: Full grid layout with 4 columns
- **Tablet**: 2-column grid, stacked sections
- **Mobile**: Single column, optimized spacing

### Interactive Elements

- **Hover Effects**: Cards brighten on hover
- **Click Interactions**: Select customers for detail view
- **Refresh Button**: Manual data refresh
- **Auto-refresh**: Every 60 seconds
- **Loading States**: Skeleton UI and spinners
- **Empty States**: Friendly "No overdue customers" message

---

## 🔧 Core Functions

### From `paymentCollections.ts`

#### `calculatePaymentScore(customerId, companyId)`
Calculates customer payment score (0-100).

**Algorithm:**
```typescript
Starting Score: 100

Deductions:
- Late 1-7 days:    -5 points per invoice
- Late 8-15 days:   -10 points per invoice
- Late 16-30 days:  -20 points per invoice
- Late 30+ days:    -40 points per invoice
- Broken promise:   -15 points each
- Disputed invoice: -10 points each
- Failed payment:   -25 points each

Bonuses:
- Early payment:    +5 points each
- Auto-pay enabled: +10 points
- Perfect 12+ months: +20 points

Final Score: Clamped to 0-100
```

#### `getCollectionsSummary(companyId)`
Returns real-time collections overview.

**Returns:**
```typescript
{
  totalOverdue: number,
  overdueCustomersCount: number,
  averageDaysOverdue: number,
  collectionSuccessRate: number,  // 0-100%
  trend: 'improving' | 'stable' | 'worsening'
}
```

#### `getPaymentHealthScore(companyId)`
Calculates overall payment health (last 90 days).

**Returns:**
```typescript
{
  score: number,  // 0-100
  category: 'healthy' | 'warning' | 'critical',
  breakdown: {
    onTime: number,
    late: number,        // 1-15 days
    veryLate: number,    // 16-30 days
    defaulted: number    // 30+ days
  }
}
```

#### `getPriorityCustomers(companyId)`
Gets top 10 customers for collections.

**Returns:** Array of:
```typescript
{
  customerId: string,
  customerName: string,
  totalOverdue: number,
  daysOverdue: number,
  riskScore: number,      // 0-100
  paymentScore: number,   // 0-100
  priority: number        // Calculated priority
}
```

---

## 🗄️ Database Tables

### 1. `payment_promises`
Tracks customer payment promises.

**Key Fields:**
- `promise_date`: When customer promised to pay
- `promised_amount`: Amount promised
- `actual_paid_amount`: What was actually paid
- `status`: pending | kept | broken | partially_kept
- `contact_method`: phone | email | whatsapp | sms | in_person

### 2. `payment_plans`
Manages installment payment plans.

**Key Fields:**
- `total_amount`: Total plan amount
- `number_of_payments`: 1-24 installments
- `frequency`: weekly | bi-weekly | monthly
- `status`: active | completed | defaulted | cancelled

### 3. `payment_installments`
Individual installments within plans.

**Key Fields:**
- `installment_number`: Sequential number
- `due_date`: When due
- `amount`: Installment amount
- `paid_amount`: Actual paid amount
- `status`: pending | paid | overdue | missed

### 4. `payment_attempts`
Failed payment tracking.

**Key Fields:**
- `attempt_date`: When attempted
- `payment_method`: credit_card | debit_card | bank_transfer | check | cash
- `status`: success | failed | pending
- `failure_reason`: Why it failed
- `gateway_response`: JSONB with full response

### 5. `payment_reminders`
Reminder history and tracking.

**Key Fields:**
- `reminder_stage`: initial | first_reminder | second_reminder | final_notice | legal_notice
- `send_method`: email | sms | whatsapp | phone | letter
- `opened_at`: When opened (email tracking)
- `clicked_at`: When clicked (link tracking)
- `response_type`: paid | promised | disputed | ignored

### 6. `customer_payment_scores`
Historical score tracking.

**Key Fields:**
- `score`: 0-100
- `category`: excellent | good | fair | poor | very_poor
- `late_payments_deduction`: Points lost
- `early_payments_bonus`: Points gained
- `calculated_at`: When calculated

### 7. `payment_behavior_analytics`
Customer behavior patterns.

**Key Fields:**
- `average_days_to_pay`: Average payment delay
- `preferred_payment_method`: Most used method
- `best_day_to_contact`: Optimal contact day
- `response_rate`: 0-100%
- `promise_keeping_rate`: 0-100%
- `on_time_payment_rate`: 0-100%

---

## 📈 Performance Optimizations

### React Query Integration
```typescript
// Auto-refresh every 60 seconds
useQuery({
  queryKey: ['collections-summary', companyId],
  queryFn: () => getCollectionsSummary(companyId),
  refetchInterval: 60000,
});
```

### Database Indexes
All tables have indexes on:
- `company_id` (RLS filtering)
- `customer_id` (customer lookups)
- `status` (status filtering)
- Date fields (date range queries)

### RLS Policies
Every table has Row Level Security:
```sql
-- Users only see their company's data
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
))
```

---

## 🎯 Next Steps / Future Enhancements

### Phase 4: Payment Calendar View
- [ ] Monthly calendar grid
- [ ] Color-coded due dates
- [ ] Drag-and-drop promise scheduling
- [ ] Multi-month view

### Phase 5: Automated Reminder System
- [ ] Reminder templates with variables
- [ ] A/B testing capability
- [ ] Email/SMS integration
- [ ] Scheduled sending (avoid weekends/holidays)
- [ ] Response tracking

### Phase 6: Promise Tracking & Payment Plans
- [ ] Promise to Pay form
- [ ] Automated follow-up on promises
- [ ] Payment plan creation wizard
- [ ] Installment progress tracking
- [ ] Auto-escalation on missed installments

### Phase 7: Advanced Analytics
- [ ] Payment trend charts (Chart.js/Recharts)
- [ ] Customer segmentation
- [ ] Predictive analytics (ML-based)
- [ ] Collection performance metrics
- [ ] Export reports (PDF/Excel)

---

## 🐛 Troubleshooting

### Issue: Dashboard shows "No data"
**Solution:** Ensure you have invoices with past due dates in the database.

### Issue: Payment score shows 100 for all customers
**Solution:** Check that payment history exists in the `payments` table.

### Issue: Priority queue is empty
**Solution:** Create some overdue invoices (due_date < today, status != 'paid').

### Issue: Real-time updates not working
**Solution:** Check React Query is configured properly and browser has network access.

---

## 💡 Tips & Best Practices

1. **Regular Score Calculation**: Run score calculation weekly to track trends
2. **Contact Timing**: Use `best_day_to_contact` from analytics
3. **Escalation**: Follow reminder stages (initial → first → second → final → legal)
4. **Promise Tracking**: Always record payment promises
5. **Payment Plans**: Offer plans to customers with fair/poor scores
6. **Auto-pay**: Encourage auto-pay enrollment for +10 score bonus

---

## 📞 Support

For questions or issues:
- Review this guide first
- Check the code comments in `paymentCollections.ts`
- Examine the database migration file for schema details
- Test with sample data to understand behavior

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-26  
**Status:** ✅ Production Ready
