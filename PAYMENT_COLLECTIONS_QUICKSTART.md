# Payment Collections System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you set up and start using the Payment Collections System immediately.

---

## Step 1: Apply Database Migration ⚡

### Option A: Using Supabase CLI

```bash
# Navigate to your project
cd fleetifyapp-3

# Apply the migration
supabase db push

# Or run the specific migration
supabase migration up
```

### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left menu
4. Click "New Query"
5. Copy contents of `supabase/migrations/20250126_payment_collections_tables.sql`
6. Paste and click "Run"
7. Wait for "Success" message

**Verify Migration:**
```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'payment_%';

-- Should return:
-- payment_promises
-- payment_plans
-- payment_installments
-- payment_attempts
-- payment_reminders
-- customer_payment_scores (note: no 'payment_' prefix)
-- payment_behavior_analytics
```

---

## Step 2: Add to Navigation 🧭

### Update your routing file:

```typescript
// src/App.tsx or routes.tsx
import Collections from '@/pages/Collections';

// Add to routes array
{
  path: '/collections',
  element: <Collections />,
}

// Add to sidebar menu
{
  name: 'Collections',
  path: '/collections',
  icon: DollarSign, // or CalendarClock
}
```

---

## Step 3: Create Test Data 📊

### Quick Test Data Setup:

```sql
-- 1. Add some test invoices with various due dates
INSERT INTO invoices (
  company_id,
  customer_id,
  invoice_number,
  due_date,
  total_amount,
  paid_amount,
  status
) VALUES
  -- Overdue invoice
  ('your-company-id', 'customer-1-id', 'INV-001', CURRENT_DATE - 10, 5000, 0, 'pending'),
  
  -- Due today
  ('your-company-id', 'customer-2-id', 'INV-002', CURRENT_DATE, 3000, 0, 'pending'),
  
  -- Upcoming
  ('your-company-id', 'customer-3-id', 'INV-003', CURRENT_DATE + 7, 2000, 0, 'pending'),
  
  -- Paid
  ('your-company-id', 'customer-4-id', 'INV-004', CURRENT_DATE - 5, 1000, 1000, 'paid');

-- 2. Add a payment promise
INSERT INTO payment_promises (
  company_id,
  customer_id,
  invoice_id,
  promise_date,
  promised_amount,
  contact_method,
  notes,
  status
) VALUES (
  'your-company-id',
  'customer-1-id',
  'invoice-1-id',
  CURRENT_DATE + 3,
  5000,
  'phone',
  'Customer committed to pay in 3 days',
  'pending'
);
```

---

## Step 4: Launch & Test 🎯

### Open the Collections Page:

```
http://localhost:5173/collections
```

### What You Should See:

#### **Dashboard Tab:**
- ✅ Total Overdue amount (red card)
- ✅ Overdue Customers count (yellow card)
- ✅ Average Days Overdue (blue card)
- ✅ Collection Success Rate (green card)
- ✅ Payment Health Score visualization
- ✅ Priority Collections Queue (top 10 customers)

#### **Calendar Tab:**
- ✅ Monthly calendar grid
- ✅ Color-coded days:
  - 🔴 Red = Overdue invoices
  - 🟠 Orange = Due today
  - 🟡 Yellow = Upcoming
  - 🟢 Green = Paid
- ✅ Click day to see invoice details
- ✅ "Record Promise" button on unpaid invoices

---

## Step 5: Common Tasks 📝

### Task 1: View Priority Customers

1. Go to Dashboard tab
2. Scroll to "Priority Collections Queue"
3. See top 10 customers ranked by urgency
4. Click any customer to see payment score detail
5. Use quick action buttons (Call/Email/SMS)

### Task 2: Schedule Payment Promise

1. Go to Calendar tab
2. Click a red day (overdue invoice)
3. Click "Record Promise" button
4. Fill in:
   - Promise date
   - Promised amount
   - Contact method
   - Notes
5. Click "Record Promise"
6. Promise saved! Calendar refreshes automatically

### Task 3: Monitor Today's Due Invoices

1. Go to Calendar tab
2. Click "Today" button
3. Click today's date (orange if has dues)
4. Review all invoices due today
5. Contact customers proactively

### Task 4: Check Customer Payment Score

1. Go to Dashboard tab
2. Find customer in Priority Queue
3. Click customer card
4. View detailed score breakdown:
   - Late payment deductions
   - Broken promise deductions
   - Early payment bonuses
   - Trend indicator

---

## 🎨 UI Tour

### Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│ Collections Command Center              [Refresh]│
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │Total     │ │Overdue   │ │Avg Days  │ │Rate  ││
│  │Overdue   │ │Customers │ │Overdue   │ │%     ││
│  │$XX,XXX   │ │ XX       │ │ XX days  │ │XX%   ││
│  └──────────┘ └──────────┘ └──────────┘ └──────┘│
├─────────────────────────────────────────────────┤
│ Payment Health Score                             │
│ ┌───────────────────────────────────────────────┐│
│ │ 85/100  [Healthy] ▓▓▓▓▓▓▓▓▓░ Progress Bar    ││
│ │ [45] On-Time  [12] Late  [3] Very Late  [0] ││
│ └───────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ Priority Collections Queue (Top 10)              │
│ ┌───────────────────────────────────────────────┐│
│ │ #1 Customer A  [Critical] [Poor]              ││
│ │    Overdue: $5,000 | 15 days | Risk: 85/100  ││
│ │    [Call] [Email] [SMS]                       ││
│ ├───────────────────────────────────────────────┤│
│ │ #2 Customer B  [High] [Fair]                  ││
│ │    Overdue: $3,200 | 8 days | Risk: 62/100   ││
│ └───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Calendar Layout

```
┌─────────────────────────────────────────────────┐
│ Payment Calendar                    January 2025 │
│ [←] [Today] [→]                                  │
├─────────────────────────────────────────────────┤
│ Legend: 🔴 Overdue 🟠 Today 🟡 Upcoming 🟢 Paid  │
├─────────────────────────────────────────────────┤
│ Sun   Mon   Tue   Wed   Thu   Fri   Sat        │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│ │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │     │
│ └───┘ └🔴─┘ └───┘ └🟡─┘ └───┘ └🟢─┘ └───┘     │
│       [3]         [1]         [2]               │
│       $2.4K       $1K         $500              │
├─────────────────────────────────────────────────┤
│ Invoices Due on January 2, 2025                 │
│ 3 invoices · Total: $2,400.00                   │
│ ┌───────────────────────────────────────────────┐│
│ │ Customer X          [15d Overdue]             ││
│ │ Invoice #INV-001                              ││
│ │ Due: $1,500  Total: $1,500                    ││
│ │ [Record Promise] [Call] [Email] [SMS]         ││
│ └───────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: "Table doesn't exist" error
**Solution:** Apply database migration (Step 1)

### Issue: Dashboard shows "0" for everything
**Solution:** Add test invoices (Step 3)

### Issue: Can't see any data
**Solution:** Check that you're logged in and have company_id set

### Issue: Promise dialog doesn't open
**Solution:** 
- Check that invoice is not already paid
- Verify `payment_promises` table exists
- Check browser console for errors

### Issue: Calendar is empty
**Solution:**
- Ensure invoices have `due_date` set
- Check that `status != 'cancelled'`
- Navigate to correct month

---

## 📱 Mobile Testing

### Test on Different Devices:

```bash
# Desktop (Chrome DevTools)
- Open DevTools (F12)
- Toggle device toolbar (Ctrl+Shift+M)
- Test: iPhone 14 Pro, iPad Pro, Desktop

# Key Checks:
✓ Cards stack vertically on mobile
✓ Calendar grid stays 7 columns
✓ Action buttons stack on small screens
✓ Dialog becomes full-screen on mobile
✓ Touch interactions work smoothly
```

---

## ⚡ Performance Tips

### For Best Performance:

1. **Index Verification**
   ```sql
   -- Verify indexes exist
   SELECT indexname FROM pg_indexes 
   WHERE tablename LIKE 'payment_%';
   ```

2. **Query Optimization**
   - Auto-refresh is set to 60 seconds
   - Can adjust in component: `refetchInterval: 60000`

3. **Cache Management**
   - React Query automatically caches data
   - Manual refresh button available
   - Cache shared between Dashboard & Calendar

---

## 🎓 Learning Path

### Day 1: Basic Usage
1. ✅ Apply migration
2. ✅ Add test data
3. ✅ Explore dashboard
4. ✅ Try calendar view
5. ✅ Record a promise

### Day 2: Advanced Features
1. ✅ Understand payment scoring
2. ✅ Use priority queue
3. ✅ Analyze payment health
4. ✅ Navigate months in calendar
5. ✅ Test quick actions

### Day 3: Real Data
1. ✅ Import actual invoices
2. ✅ Calculate real scores
3. ✅ Set up real promises
4. ✅ Monitor collections daily
5. ✅ Track success metrics

---

## 📚 Next Steps

After completing this quick start:

1. **Read Full Guides:**
   - `COLLECTIONS_DASHBOARD_GUIDE.md` - Dashboard details
   - `PAYMENT_CALENDAR_GUIDE.md` - Calendar details
   - `PAYMENT_COLLECTIONS_COMPLETE_SUMMARY.md` - Full overview

2. **Customize:**
   - Adjust auto-refresh intervals
   - Customize color schemes
   - Add company branding

3. **Integrate:**
   - Connect reminder sending (Email/SMS)
   - Add reporting features
   - Build analytics dashboard

4. **Train Team:**
   - Collections staff training
   - Customer service integration
   - Management reporting

---

## ✅ Success Checklist

- [ ] Database migration applied
- [ ] Test data created
- [ ] Navigation added
- [ ] Dashboard displays correctly
- [ ] Calendar shows invoices
- [ ] Can record promises
- [ ] Quick actions work
- [ ] Mobile responsive
- [ ] Team trained
- [ ] Ready for production!

---

## 🆘 Need Help?

1. **Check Documentation:**
   - Dashboard Guide
   - Calendar Guide
   - Complete Summary

2. **Review Code:**
   - `src/lib/paymentCollections.ts` - Business logic
   - `src/components/payments/` - UI components
   - `supabase/migrations/` - Database schema

3. **Test with Sample Data:**
   - Start small (5-10 invoices)
   - Test all scenarios (overdue, today, upcoming, paid)
   - Try recording promises

---

**🎉 You're Ready to Go!**

The Payment Collections System is now fully operational. Start tracking payments, monitoring customer behavior, and improving your collection success rate today!

**Happy Collecting! 💰**
