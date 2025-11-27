# Legal System & Customer Blacklist Integration Guide

## 📋 Overview

This document explains how the Legal System is integrated with Contracts and the Customer Blacklist functionality in Fleetify ERP.

---

## 🔗 Legal System Integration with Contracts

### ✅ **Status: FULLY INTEGRATED** 

The Legal AI System is **completely integrated** with the contract management system and provides intelligent legal advisory services.

### **How It Works:**

#### 1. **Access Legal AI from Anywhere**
- **URL**: `/legal`
- **Navigation**: Sidebar → القانوني (Legal)

#### 2. **Legal AI Features for Contracts**

**🤖 Natural Language Queries:**
```
User Query: "اكتب إنذار قانوني للعميل أحمد محمد"
(Write a legal warning for customer Ahmed Mohamed)

System Actions:
✅ Searches customer in database
✅ Fetches all customer data (contracts, payments, violations)
✅ Calculates risk score
✅ Extracts legal grounds automatically
✅ Generates custom legal warning
✅ Response in < 1 second
```

**📄 Legal Documents Generated:**
1. **Legal Warnings (إنذارات قانونية)**
   - For late payments
   - For contract violations
   - For traffic violations

2. **Payment Claims (مطالبات مالية)**
   - Detailed with legal references
   - Country-specific laws applied

3. **Contract Termination Notices (إنهاء عقود)**
   - Legally justified
   - With proper documentation

**📊 Risk Analysis:**
```
User Query: "تحليل مخاطر العميل سارة أحمد"
(Analyze risk for customer Sarah Ahmed)

Result:
📊 Risk Score: 53.8/100 (High)
⚠️ Risk Factors:
   - Payment delay: 60 days
   - Unpaid amount: 2,300 KWD
   - Traffic violations: 3
   - Contract history: 5 contracts
   - Legal cases: 1 active
💡 Recommendations:
   - Strict monitoring
   - Issue legal warning
   - Do not extend new credit
⏱️ Analysis time: 0.003 seconds
```

#### 3. **Risk Scoring Algorithm**

The system uses a **5-factor weighted algorithm**:

```typescript
Risk Factors:
1. Payment Delay (35% weight)
   - Days overdue from payment date
   - Normalized to 0-100 scale

2. Unpaid Amount (30% weight)
   - Total outstanding balance
   - Normalized based on credit limit

3. Traffic Violations (20% weight)
   - Number of unpaid violations
   - Normalized to penalty count

4. Contract History (10% weight)
   - Total number of contracts
   - Higher = more experienced

5. Litigation History (5% weight)
   - Active legal cases
   - Past legal issues

Final Score: Weighted sum (0-100)
- 0-30: Low Risk (Green)
- 31-60: Medium Risk (Orange)
- 61-100: High Risk (Red)
```

#### 4. **Multi-Country Legal Framework**

Supports different legal systems:
- 🇰🇼 **Kuwait**: Commercial Law 68/1980, Civil Law
- 🇸🇦 **Saudi Arabia**: Commercial Transactions Law, Labor Law
- 🇶🇦 **Qatar**: Civil Law, Commercial Law

**Templates adapt automatically** based on country selection.

---

## 🚫 Customer Blacklist System

### **What is the Blacklist?**

The blacklist is a security feature to flag problematic customers and prevent them from:
- Creating new contracts
- Receiving vehicles
- Getting credit extensions

### **When & How is a Customer Blacklisted?**

#### **Manual Blacklisting (User Action):**

**From Customer List Page:**
```
1. Navigate to Customers page (/customers)
2. Find the customer row
3. Click the 3-dots menu (⋮)
4. Select "إضافة للحظر" (Add to Blacklist)
5. System updates:
   - is_blacklisted = true
   - blacklist_reason = "Manual blacklist"
   - blacklisted_at = current timestamp
   - blacklisted_by = current user ID
```

**From Customer Details:**
```
1. Open customer profile (eye icon 👁️)
2. Click "Actions" button
3. Select "Block Customer"
4. Confirm action
```

#### **Automatic Blacklisting (System Rules):**

The system can automatically blacklist customers based on:

**1. High Risk Score:**
```typescript
if (riskScore >= 70) {
  recommendation: "Consider blacklisting"
  autoBlacklist: true (if enabled in settings)
}
```

**2. Payment Delays:**
```typescript
if (paymentDelay >= 90 days && unpaidAmount > creditLimit) {
  autoBlacklist: true
  reason: "Severe payment default"
}
```

**3. Multiple Contract Violations:**
```typescript
if (contractViolations >= 3 && activeContracts > 0) {
  autoBlacklist: true
  reason: "Multiple contract breaches"
}
```

**4. Legal Cases:**
```typescript
if (activeLegalCases > 0 && caseType === 'fraud') {
  autoBlacklist: true
  reason: "Legal proceedings - fraud"
}
```

### **Blacklist Database Schema:**

```sql
-- Customer Table Fields
customers {
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  blacklisted_at TIMESTAMP,
  blacklisted_by UUID REFERENCES profiles(id)
}

-- Separate Blacklist Table (for history)
blacklisted_customers {
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  reason TEXT NOT NULL,
  blacklisted_by UUID REFERENCES profiles(id),
  blacklisted_at TIMESTAMP DEFAULT NOW(),
  removed_at TIMESTAMP,
  removed_by UUID REFERENCES profiles(id),
  removal_reason TEXT
}
```

### **How to Remove from Blacklist:**

**Manual Removal:**
```
1. Navigate to Customers page
2. Filter by "Blacklisted" (القائمة السوداء)
3. Find customer
4. Click 3-dots menu (⋮)
5. Select "إلغاء الحظر" (Remove from Blacklist)
6. Optionally add removal reason
```

**Code Implementation:**
```typescript
const toggleBlacklist = async (customerId: string, isBlacklisted: boolean, reason?: string) => {
  await supabase
    .from('customers')
    .update({
      is_blacklisted: isBlacklisted,
      blacklist_reason: reason,
      blacklisted_at: isBlacklisted ? new Date().toISOString() : null,
      blacklisted_by: isBlacklisted ? currentUser.id : null,
    })
    .eq('id', customerId);
};
```

### **Blacklist Impact on System:**

#### **1. Contract Creation:**
```typescript
// Contract validation checks blacklist
if (customer.is_blacklisted) {
  throw new Error(`العميل محظور: ${customer.blacklist_reason}`);
  // Customer is blocked: [reason]
}
```

#### **2. Vehicle Dispatch:**
```typescript
// Before vehicle dispatch
const { data: customer } = await supabase
  .from('customers')
  .select('is_blacklisted, blacklist_reason')
  .eq('id', customerId)
  .single();

if (customer.is_blacklisted) {
  return {
    success: false,
    message: `Cannot dispatch vehicle. Customer is blacklisted: ${customer.blacklist_reason}`
  };
}
```

#### **3. Payment Processing:**
```typescript
// Warning displayed but payment allowed
if (customer.is_blacklisted) {
  showWarning(`⚠️ تحذير: هذا العميل محظور - ${customer.blacklist_reason}`);
  // Still allow payment to reduce debt
}
```

#### **4. Credit Extension:**
```typescript
// Strictly blocked
if (customer.is_blacklisted) {
  return {
    canExtendCredit: false,
    reason: 'Customer is blacklisted'
  };
}
```

---

## 🔍 Legal System Data Flow

### **Data Sources for Legal AI:**

```typescript
// Customer Context Fetching
const fetchCustomerContext = async (customerId: string) => {
  const { data } = await supabase
    .from('customers')
    .select(`
      *,
      contracts(*),           // All contract history
      payments(*),            // Payment records
      traffic_violations(*),  // Traffic fines
      legal_cases(*)          // Legal proceedings
    `)
    .eq('id', customerId)
    .single();
  
  return data;
};
```

### **Integration Points:**

```
┌─────────────────────────────────────────────┐
│           LEGAL AI SYSTEM                   │
├─────────────────────────────────────────────┤
│                                             │
│  1. Query Processing                        │
│     ↓                                       │
│  2. Customer Identification                 │
│     ↓                                       │
│  3. Data Fetching:                          │
│     • Customers Table                       │
│     • Contracts Table ←──────────┐          │
│     • Payments Table             │          │
│     • Traffic Violations         │          │
│     • Legal Cases                │          │
│     ↓                            │          │
│  4. Risk Analysis                │          │
│     ↓                            │          │
│  5. Document Generation          │          │
│     ↓                            │          │
│  6. Recommendation Engine        │          │
│                                  │          │
└──────────────────────────────────┼──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │   CONTRACT MANAGEMENT       │
                    ├─────────────────────────────┤
                    │ • Create Contract           │
                    │ • Check Blacklist Status    │
                    │ • Validate Customer Credit  │
                    │ • Link to Legal Cases       │
                    └─────────────────────────────┘
```

---

## 📊 Statistics & Monitoring

### **Legal AI Dashboard:**

Located in Legal AI interface, tracks:
- Total consultations
- Documents generated
- Average response time
- Cost savings
- Most common queries

### **Customer Blacklist Dashboard:**

Located in Customers page, displays:
- Total blacklisted customers
- Blacklist reasons breakdown
- Recent blacklist changes
- Auto vs Manual blacklists

---

## 🛡️ Security & Permissions

### **Who Can Blacklist Customers:**

```typescript
Permissions Required:
- Role: Admin or Manager
- Permission: "customers.manage"
- Or: "customers.blacklist"

Code Check:
if (!hasPermission('customers.manage') && !hasPermission('customers.blacklist')) {
  throw new Error('Insufficient permissions');
}
```

### **Audit Trail:**

All blacklist actions are logged:
```sql
INSERT INTO audit_logs (
  action,
  table_name,
  record_id,
  user_id,
  changes,
  reason,
  timestamp
) VALUES (
  'blacklist_customer',
  'customers',
  customer_id,
  current_user_id,
  jsonb_build_object(
    'is_blacklisted', true,
    'reason', blacklist_reason
  ),
  'High risk score + payment default',
  NOW()
);
```

---

## 🔧 Technical Implementation

### **Files Involved:**

**Legal AI System:**
1. `/src/components/legal/EnhancedLegalAIInterface_v2.tsx` (473 lines)
2. `/src/hooks/useLegalAI.ts` (493 lines)
3. `/src/components/legal/RiskAnalyzer.tsx` (386 lines)
4. `/src/components/legal/LegalDocumentGenerator.tsx` (314 lines)

**Blacklist Functionality:**
1. `/src/hooks/useCustomers.ts` (toggleBlacklist function)
2. `/src/pages/Customers.tsx` (UI implementation)
3. `/src/hooks/business/useCustomerOperations.ts` (business logic)

### **Database Functions:**

```sql
-- Calculate customer risk score
CREATE OR REPLACE FUNCTION calculate_customer_risk_score(
  p_customer_id UUID
) RETURNS DECIMAL(5,2);

-- Check if customer can create contract
CREATE OR REPLACE FUNCTION can_create_contract(
  p_customer_id UUID
) RETURNS BOOLEAN;

-- Get blacklist history
CREATE OR REPLACE FUNCTION get_blacklist_history(
  p_customer_id UUID
) RETURNS TABLE (...);
```

---

## 🎯 Best Practices

### **When to Blacklist:**

✅ **DO Blacklist:**
- Fraud or identity theft
- Severe payment defaults (>90 days + high amount)
- Multiple contract breaches
- Criminal activity
- Damage to company property

❌ **DON'T Blacklist:**
- Single late payment
- Minor traffic violations
- Payment under negotiation
- First-time customer errors

### **Blacklist Workflow:**

```
1. Identify Issue
   ↓
2. Review Customer History
   ↓
3. Check Risk Score (Legal AI)
   ↓
4. Contact Customer (if applicable)
   ↓
5. Document Reason Clearly
   ↓
6. Apply Blacklist
   ↓
7. Monitor for Resolution
   ↓
8. Remove if Issue Resolved
```

---

## 📞 Support & Further Information

For more details on:
- **Legal AI System**: See `/README_LEGAL_AI_V2.md`
- **Implementation**: See `/IMPLEMENTATION_COMPLETION_SUMMARY.md`
- **Technical Specs**: See `/ACTIONABLE_IMPLEMENTATION_PLAN.md`

---

**Last Updated**: 2025-10-25
**Status**: ✅ Fully Operational
**Version**: 2.0.0
