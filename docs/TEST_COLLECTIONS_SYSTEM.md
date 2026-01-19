# 🧪 Payment Collections System - Testing Guide

## Quick Test Script

Follow this checklist to ensure all features work correctly after deployment.

---

## ✅ Pre-Test Setup

### 1. **Verify Environment**
```bash
# Check Supabase connection
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Start development server
npm run dev
```

### 2. **Verify Database Tables**
Run this SQL query in Supabase Dashboard:
```sql
SELECT 
  COUNT(*) FILTER (WHERE table_name LIKE 'payment_%') as payment_tables,
  COUNT(*) FILTER (WHERE table_name LIKE 'reminder_%') as reminder_tables
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected: 7 payment_* tables, 3 reminder_* tables

---

## 📊 Test 1: Collections Dashboard

### **Navigate:** Collections → Dashboard Tab

**Verify:**
- [ ] Page loads without errors
- [ ] Summary cards display (4 cards)
- [ ] Payment health score shows a number (0-100)
- [ ] Health category badge appears (Healthy/Warning/Critical)
- [ ] Priority customers queue populates (or shows empty state)
- [ ] Quick action buttons visible (Phone, Email, SMS icons)

**Test Actions:**
1. Click a customer in priority queue
2. Verify customer detail dialog opens
3. Check payment score breakdown displays

**Expected SQL Queries:**
```sql
-- Should fetch collections summary
SELECT * FROM collections_summary_view WHERE company_id = ?;

-- Should calculate health score
SELECT * FROM payment_health_score_view WHERE company_id = ?;
```

---

## 📅 Test 2: Payment Calendar

### **Navigate:** Collections → Calendar Tab

**Verify:**
- [ ] Calendar displays current month
- [ ] Days are color-coded correctly:
  - Red background = Overdue invoices
  - Orange background = Due today
  - Yellow background = Upcoming
  - Green background = Fully paid
- [ ] Invoice count badges show on days with invoices
- [ ] Amount totals display per day

**Test Actions:**
1. Click **previous month** arrow
2. Verify calendar updates
3. Click **next month** arrow twice
4. Return to current month
5. Click a day with invoices
6. Verify invoice details panel opens
7. Click "Record Promise" button
8. Fill promise form:
   - Promise Date: Tomorrow's date
   - Amount: $500
   - Method: Phone
   - Notes: "Customer called, promised payment"
9. Click "Save Promise"
10. Verify toast notification appears
11. Check promise saved in database:
    ```sql
    SELECT * FROM payment_promises 
    WHERE company_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1;
    ```

**Expected Results:**
- Calendar navigation smooth
- Color coding accurate
- Promise saves successfully
- Data refreshes automatically

---

## 📧 Test 3: Reminder Templates

### **Navigate:** Collections → Templates Tab

**Test 3A: Create Default Templates**

**Actions:**
1. Click "Create Defaults" button
2. Wait for toast notification
3. Verify 5 templates appear:
   - Initial Payment Reminder
   - First Overdue Reminder
   - Second Overdue Notice
   - Final Notice Before Legal Action
   - Legal Notice

**Verify Each Template Shows:**
- [ ] Template name
- [ ] Stage badge (Initial, First, Second, Final, Legal)
- [ ] Channel icon (Email/SMS/Phone/Letter)
- [ ] Tone badge (Friendly/Professional/Firm/Urgent)
- [ ] Subject line
- [ ] Body preview (first 3 lines)
- [ ] Settings (Send time, Skip weekends, Skip holidays)

**Database Check:**
```sql
SELECT name, stage, channel, status 
FROM reminder_templates 
WHERE company_id = ? 
ORDER BY stage;
```

Expected: 5 rows returned

**Test 3B: Edit Template**

**Actions:**
1. Click edit icon on "Initial Payment Reminder"
2. Change subject to: "Friendly Payment Reminder: Invoice {invoice.number}"
3. Modify body (add custom company message)
4. Change send time to "10:00"
5. Toggle "Skip weekends" off
6. Click "Save Template"
7. Verify changes reflected in template card

**Test 3C: Variables Panel**

**Actions:**
1. Click "Variables" button
2. Verify panel opens with variable list
3. Search for "customer"
4. Verify filtered list shows only customer variables
5. Click a variable to copy
6. Verify "Copied" alert appears

**Test 3D: Schedule Reminders**

**Actions:**
1. Click "Schedule Now" button
2. Wait for processing
3. Check toast message: "X reminders scheduled, Y skipped"
4. Verify scheduled reminders in database:
   ```sql
   SELECT COUNT(*) as pending_reminders
   FROM reminder_schedules 
   WHERE company_id = ? 
   AND status = 'pending';
   ```

---

## 🎯 Test 4: Customer Intelligence

### **Navigate:** Collections → Intelligence Tab

**Test 4A: Customer Selection**

**Actions:**
1. Open customer dropdown
2. Verify customers list populates
3. Select a customer with payment history

**Test 4B: Overview Tab**

**Verify:**
- [ ] Payment score displays (0-100)
- [ ] Score category badge shows (Excellent/Good/Fair/Poor/Very Poor)
- [ ] Trend icon appears (Improving/Declining/Stable)
- [ ] Score breakdown lists deductions and bonuses
- [ ] 3 overview cards display:
  - Payment Success Rate (with progress bar)
  - Average Days to Pay
  - Total Revenue

**Database Query:**
```sql
-- Should calculate payment score
SELECT * FROM customer_payment_scores 
WHERE customer_id = ? 
ORDER BY calculated_at DESC 
LIMIT 1;
```

**Test 4C: Timeline Tab**

**Verify:**
- [ ] Payment history timeline displays
- [ ] Events show chronologically (newest first)
- [ ] Each event shows:
  - Invoice number
  - Date created
  - Status badge
  - Amount
  - Due date
  - Payment info (if paid)
- [ ] Color-coded timeline icons:
  - Green checkmark = Paid
  - Red warning = Overdue
  - Yellow clock = Pending
- [ ] "On time" indicator shows for early/on-time payments

**Test 4D: Patterns Tab**

**Verify:**
- [ ] Monthly invoice volume chart displays (6 months)
- [ ] Progress bars show relative volumes
- [ ] Preferred payment method card shows
- [ ] Payment consistency percentage displays

**Test 4E: Risks Tab**

**Verify:**
- [ ] Risk level card shows (LOW/MEDIUM/HIGH)
- [ ] Score badge displays
- [ ] Critical flags count shows (red)
- [ ] Warnings count shows (yellow)
- [ ] Risk indicators list displays OR "No Risk Indicators" message

**Test Risk Detection:**
If customer has issues, verify indicators show:
- [ ] Multiple broken promises (if 3+ broken)
- [ ] Very poor payment score (if score < 30)
- [ ] Declining payment behavior (if trend declining)
- [ ] Consistently late payments (if avg > 15 days late)
- [ ] Improving behavior (if trend improving)

---

## 🤝 Test 5: Payment Plans & Promises

### **Navigate:** Collections → Plans Tab

**Test 5A: Promises Tab**

**Verify Stats Cards:**
- [ ] Total Promises count
- [ ] Kept count (green) with progress bar
- [ ] Broken count (red)
- [ ] Pending count (yellow)

**Verify Promise Lists:**
- [ ] Overdue Promises section (red alert) - if any exist
- [ ] Upcoming Promises section (next 5)
- [ ] Recent History section (last 10)

**Test Promise Actions:**
1. Find a pending promise
2. Click checkmark button (Mark as Kept)
3. Verify status updates to "kept"
4. Refresh page
5. Verify promise moved to Recent History
6. Database check:
   ```sql
   SELECT status, updated_at 
   FROM payment_promises 
   WHERE id = ?;
   ```

**Test 5B: Payment Plans Tab**

**Verify Stats Cards:**
- [ ] Total Plans count
- [ ] Active plans count (blue)
- [ ] Completion rate with progress bar
- [ ] Total amount with "paid" amount shown

**Verify Plan Lists:**
- [ ] Active Plans section displays
- [ ] Completed Plans section (last 5)
- [ ] Each plan shows:
  - Customer name
  - Status badge
  - Invoice reference
  - Total amount
  - Progress bar (installments paid vs total)
  - Amount paid vs total

**Click a Plan:**
1. Click any payment plan
2. Verify detail dialog opens (placeholder)
3. Close dialog

---

## 🔄 Test 6: Data Refresh & Real-Time Updates

**Test Auto-Refresh:**
1. Open Collections Dashboard
2. In another tab, add a new invoice to database:
   ```sql
   -- Add test overdue invoice
   INSERT INTO invoices (company_id, customer_id, invoice_number, due_date, total_amount, status)
   VALUES (?, ?, 'TEST-001', CURRENT_DATE - INTERVAL '10 days', 1000, 'unpaid');
   ```
3. Wait 60 seconds (React Query refresh interval)
4. Verify new invoice appears in dashboard
5. Verify overdue amount increased

**Test Manual Refresh:**
1. Make a database change
2. Click browser refresh (F5)
3. Verify data updates immediately

---

## 🚨 Test 7: Error Handling

**Test Missing Company ID:**
1. Logout from application
2. Navigate to Collections page
3. Verify "Authentication Required" message appears
4. Verify redirect to login

**Test Empty States:**
1. Create test company with no data
2. Navigate each tab
3. Verify friendly empty states show:
   - "No invoices yet"
   - "No payment promises"
   - "No payment plans"
   - "No customer selected"

**Test Network Errors:**
1. Open DevTools → Network tab
2. Set offline mode
3. Try to load Collections page
4. Verify error handling (loading spinner doesn't hang)
5. Re-enable network
6. Verify data loads

---

## 📱 Test 8: Responsive Design

**Desktop (1920x1080):**
- [ ] All 5 tabs visible
- [ ] Cards display in grid (3-4 columns)
- [ ] Calendar shows full width
- [ ] No horizontal scrolling

**Tablet (768x1024):**
- [ ] Tabs scroll horizontally
- [ ] Cards stack to 2 columns
- [ ] Calendar remains functional
- [ ] Touch-friendly buttons

**Mobile (375x667):**
- [ ] Single column layout
- [ ] Cards stack vertically
- [ ] Calendar adapts (smaller day cells)
- [ ] Dialogs fill screen

---

## ⚡ Test 9: Performance

**Load Time Test:**
1. Open DevTools → Performance
2. Start recording
3. Navigate to Collections Dashboard
4. Stop recording after page loads
5. Verify:
   - [ ] Page loads in < 3 seconds
   - [ ] No console errors
   - [ ] No memory leaks

**Query Performance:**
```sql
-- Check query execution time
EXPLAIN ANALYZE
SELECT * FROM collections_summary_view 
WHERE company_id = ?;
```

Expected: < 100ms execution time

**Data Volume Test:**
1. Test with 1,000+ invoices
2. Verify pagination works
3. Check calendar performance
4. Verify no UI freezing

---

## 🔐 Test 10: Security (RLS)

**Test Company Isolation:**

1. Login as User A (Company 1)
2. Note a payment promise ID from Company 1
3. Logout
4. Login as User B (Company 2)
5. Try to access Company 1's data:
   ```sql
   SELECT * FROM payment_promises WHERE id = '<company-1-promise-id>';
   ```
6. Verify: **No rows returned** (RLS blocks access)

**Test Read-Only Access:**
1. Create user with SELECT-only permissions
2. Login as that user
3. Try to create/update promises
4. Verify: Operations fail with proper error

---

## ✅ Final Validation

### **Complete Checklist:**

**Database:**
- [ ] All 10 tables exist
- [ ] RLS policies enabled on all tables
- [ ] Triggers working (test with INSERT)
- [ ] Views return correct data
- [ ] Functions execute without errors

**UI Components:**
- [ ] All 5 tabs load
- [ ] No TypeScript errors in console
- [ ] No React warnings
- [ ] Proper loading states
- [ ] Error boundaries work

**Features:**
- [ ] Payment scoring algorithm calculates correctly
- [ ] Priority queue sorts correctly
- [ ] Calendar color-coding accurate
- [ ] Template variables replace properly
- [ ] Promise tracking works
- [ ] Plan progress updates

**Performance:**
- [ ] Page loads < 3 seconds
- [ ] Queries execute < 100ms
- [ ] No memory leaks
- [ ] Smooth navigation

**Security:**
- [ ] RLS enforced
- [ ] Company data isolated
- [ ] No SQL injection vulnerabilities
- [ ] Proper authentication required

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

**Tester:** [Your Name]
**Environment:** Development / Production
**Browser:** Chrome / Firefox / Safari / Edge

### Dashboard Tab
- Collections Summary: ✅ / ❌
- Payment Health: ✅ / ❌
- Priority Queue: ✅ / ❌

### Calendar Tab
- Display: ✅ / ❌
- Color Coding: ✅ / ❌
- Promise Scheduling: ✅ / ❌

### Templates Tab
- Create Defaults: ✅ / ❌
- Edit Template: ✅ / ❌
- Schedule Reminders: ✅ / ❌

### Intelligence Tab
- Payment Score: ✅ / ❌
- Timeline: ✅ / ❌
- Patterns: ✅ / ❌
- Risk Indicators: ✅ / ❌

### Plans Tab
- Promises Tracking: ✅ / ❌
- Payment Plans: ✅ / ❌
- Status Updates: ✅ / ❌

### Issues Found:
1. [Issue description]
2. [Issue description]

### Overall Status: PASS / FAIL
```

---

## 🐛 Common Issues & Solutions

### **Issue: Templates not displaying**
**Solution:** Run "Create Defaults" button first

### **Issue: No data in dashboard**
**Solution:** Ensure company has invoices with due dates

### **Issue: Calendar shows wrong colors**
**Solution:** Check invoice status field (must be 'paid', 'unpaid', 'partial')

### **Issue: TypeScript errors**
**Solution:** Apply database migrations first, then restart dev server

### **Issue: RLS blocking queries**
**Solution:** Verify user has company_id in profiles table

---

**Testing Complete?** ✅

If all tests pass, you're ready for production deployment! 🚀

*Last updated: January 2025*
