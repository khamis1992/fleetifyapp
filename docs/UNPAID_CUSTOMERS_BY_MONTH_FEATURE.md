# 📊 Unpaid Customers by Month Feature

## Overview

This feature allows you to **quickly identify which customers didn't pay their rent in a specific month** (like October/month 10). It provides a comprehensive view of all unpaid customers filtered by month and year.

---

## 🎯 How to Use

### Step 1: Navigate to Financial Tracking
1. Open the **sidebar** on the right
2. Expand the **"المالية" (Finance)** section
3. Click on **"تتبع المدفوعات" (Payment Tracking)**

### Step 2: Go to "Unpaid by Month" Tab
1. You'll see **3 tabs** at the top:
   - **مدفوعات العملاء** (Customer Payments)
   - **الإيرادات الشهرية** (Monthly Revenue)
   - **غير المدفوعة بالشهر** (Unpaid by Month) ⬅️ **Click this!**

### Step 3: Select the Month
1. **Select the Year**: Choose from current year or previous years
2. **Select the Month**: Click on the month (e.g., "أكتوبر" for October/month 10)
3. The system will automatically show all unpaid customers for that month

---

## 📋 What You'll See

### Summary Cards (Top)
1. **عدد العملاء غير المدفوعين** (Number of Unpaid Customers)
   - Shows total count of customers who didn't pay
   - Displays percentage of total customers

2. **إجمالي المبلغ غير المدفوع** (Total Unpaid Amount)
   - Total amount not collected for the selected month
   - Shown in QAR (Qatari Riyal)

3. **الدفعات الجزئية** (Partial Payments)
   - Number of customers who made partial payments
   - Helps identify customers who paid some but not all

### Unpaid Customers Table

| Column | Description |
|--------|-------------|
| **#** | Row number |
| **اسم العميل** | Customer name |
| **الإيجار الشهري** | Monthly rent amount |
| **المدفوع جزئياً** | Amount paid partially (if any) |
| **المتبقي** | Remaining amount due |
| **الحالة** | Status (Unpaid / Partial Payment) |
| **إجراءات** | Actions (Add Payment button) |

---

## 🔍 Example Use Cases

### Use Case 1: Find who didn't pay in October 2025
1. Go to "غير المدفوعة بالشهر" tab
2. Select Year: **2025**
3. Select Month: **أكتوبر** (October)
4. You'll see a list of all customers who didn't pay in October 2025

### Use Case 2: Monthly collection follow-up
1. At the beginning of each month, check the previous month
2. Example: On November 1st, check October unpaid customers
3. Contact each customer to collect payment
4. Click "إضافة دفعة" (Add Payment) to record when they pay

### Use Case 3: Identify chronic late payers
1. Check the same customer across multiple months
2. If a customer appears in multiple months, they're a chronic late payer
3. Consider taking action (reminders, penalties, legal notice)

---

## 🎨 Visual Indicators

### Status Badges
- 🔴 **غير مدفوع** (Red Badge): Customer hasn't paid anything
- 🟠 **دفع جزئي** (Orange Badge): Customer paid part of the rent

### Row Colors
- **Red background** (light): Completely unpaid
- **Orange background** (light): Partial payment made

---

## ⚡ Quick Actions

### Add Payment Button
- Click **"إضافة دفعة"** next to any customer
- Automatically navigates to the customer's payment page
- You can immediately record their payment

### Export Options
- **تصدير Excel**: Export the list to Excel for reporting
- **طباعة**: Print the list for offline reference

---

## 📊 Sample Report

### October 2025 - Unpaid Customers

**Summary:**
- Total Unpaid Customers: **15**
- Total Unpaid Amount: **75,000 QAR**
- Partial Payments: **3 customers**

**Top Unpaid Customers:**
1. Ahmed Khalil - 10,000 QAR (Unpaid)
2. Fatima Hassan - 8,500 QAR (Unpaid)
3. Mohamed Ali - 7,000 QAR (Partial: 3,000 QAR paid, 4,000 QAR remaining)

---

## 💡 Best Practices

### 1. Monthly Review
- Review unpaid customers at the start of each month
- This helps maintain cash flow and collections

### 2. Early Follow-up
- Contact customers as soon as they appear on the list
- Early follow-up increases collection rate

### 3. Track Patterns
- If a customer appears frequently, consider:
  - Adjusting payment terms
  - Sending automated reminders
  - Requiring security deposit increase

### 4. Use with Legal System
- For customers with 2-3 months unpaid:
  - Generate legal warnings (see Legal AI feature)
  - Document all communication
  - Consider escalation procedures

---

## 🔄 Integration with Other Features

### 1. Customer Payments Tab
- Click "إضافة دفعة" to jump directly to payment recording
- All data syncs automatically

### 2. Legal AI System
- Use this report to identify customers needing legal warnings
- Export list for bulk warning generation

### 3. Monthly Revenue Tab
- Cross-reference with revenue reports
- Understand impact of unpaid customers on monthly income

---

## 📈 Benefits

### For Management
✅ **Quick Overview**: See all unpaid customers at a glance
✅ **Financial Planning**: Understand cash flow shortfalls
✅ **Decision Making**: Data for collection strategies

### For Collections Team
✅ **Clear Targets**: Know exactly who to contact
✅ **Priority List**: Sorted by amount (highest first)
✅ **Action Items**: One-click to add payments

### For Accounting
✅ **Monthly Reports**: Easy export to Excel
✅ **Reconciliation**: Cross-check with bank statements
✅ **Audit Trail**: Complete payment history

---

## 🎯 Tips for Maximum Efficiency

### Tip 1: Set a Routine
- **Day 1 of Month**: Check previous month's unpaid
- **Day 3**: Contact top 5 unpaid customers
- **Day 7**: Follow up with partial payment customers
- **Day 15**: Escalate chronic late payers

### Tip 2: Use Filters Effectively
- Start with current month
- Work backwards for overdue months
- Focus on highest amounts first

### Tip 3: Document Everything
- Record when you contact customers
- Note their payment commitments
- Track follow-up dates

---

## 🚀 Advanced Features (Coming Soon)

- **Bulk SMS Reminders**: Send payment reminders to all unpaid customers
- **Auto-generated Reports**: Schedule monthly unpaid customer reports
- **Payment Predictions**: AI-based prediction of who will pay late
- **Custom Alerts**: Get notified when specific customers don't pay

---

## ❓ FAQ

### Q: How is the unpaid status calculated?
**A:** The system checks if a customer has a payment receipt marked as "paid" for the selected month. If not, they appear as unpaid.

### Q: What about customers with multiple contracts?
**A:** Each customer is shown once with their total monthly rent across all contracts.

### Q: Can I export the list?
**A:** Yes! Use the "تصدير Excel" or "طباعة" buttons at the bottom of the table.

### Q: What's the difference between "غير مدفوع" and "دفع جزئي"?
**A:**
- **غير مدفوع** (Unpaid): Customer paid 0 QAR
- **دفع جزئي** (Partial): Customer paid some amount but not the full rent

### Q: How do I add a payment for an unpaid customer?
**A:** Click the "إضافة دفعة" button next to the customer's name. This will take you to their payment page.

---

## 📱 Mobile Friendly

This feature is fully responsive and works on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones

---

## 🔒 Security & Permissions

- Requires **Admin** or **Finance** role to access
- All data is company-specific (RLS protected)
- Payment actions are logged for audit trail

---

## 📞 Support

If you need help with this feature:
1. Check this guide first
2. Contact system administrator
3. Refer to the Financial Tracking Help section (? icon)

---

**Last Updated**: 2025-10-25  
**Feature Version**: 1.0.0  
**Status**: ✅ Active and Ready to Use
