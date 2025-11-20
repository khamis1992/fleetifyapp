# 📊 البنية الفعلية لقاعدة بيانات fleetifyapp-3
**Project ID:** `qwhunliohlkkahbspfiu`  
**تم التحقق:** 12 يناير 2025 ✅

---

## ✅ الفهم الكامل (200%)

### 1. **chart_of_accounts**
```
Columns:
- id (uuid)
- company_id (uuid) ✅ EXISTS!
- account_code (varchar) ← NOT account_number!
- account_name (text)
- account_name_ar (text)
- account_type (text) ← values: "assets", "liabilities", "revenue", "expenses"
- account_subtype (text)
- balance_type (text) ← "debit" or "credit"
- current_balance (numeric)
- parent_account_id (uuid)
- account_level (integer)
- is_active (boolean)
- is_system (boolean)
- is_header (boolean)
- sort_order (integer)
```

**Data Sample:**
- account_code: "1", "112", "11503"
- account_type: "assets" (lowercase, plural)

---

### 2. **invoices**
```
Columns:
- id (uuid)
- company_id (uuid) ✅ EXISTS!
- invoice_number (varchar)
- invoice_date (date) ← NOT issue_date!
- due_date (date)
- customer_id (uuid)
- vendor_id (uuid)
- invoice_type (text)
- subtotal (numeric)
- tax_amount (numeric)
- total_amount (numeric)
- paid_amount (numeric)
- balance_due (numeric)
- status (text) ← NOT enum! values: "draft", "sent", "paid", "cancelled"
- payment_status (text) ← "unpaid", "partial", "paid"
- contract_id (uuid)
- journal_entry_id (uuid)
```

---

### 3. **payments**
```
Columns:
- id (uuid)
- company_id (uuid) ✅ EXISTS!
- payment_number (varchar)
- payment_date (date)
- payment_type (text)
- payment_method (text) ← NOT enum! values: "cash", "bank_transfer", etc.
- customer_id (uuid)
- vendor_id (uuid)
- invoice_id (uuid)
- amount (numeric)
- payment_status (text) ← NOT "status"! values: "completed", "pending", "failed"
- reference_number (varchar)
- contract_id (uuid)
- journal_entry_id (uuid)
```

---

### 4. **journal_entries**
```
Columns:
- id (uuid)
- company_id (uuid) ✅ EXISTS!
- entry_number (text)
- entry_date (date)
- description (text)
- total_debit (numeric)
- total_credit (numeric)
- entry_type (text)
- status (text)
- source_document_type (text)
- source_document_id (uuid)
```

---

### 5. **journal_entry_lines**
```
Columns:
- id (uuid)
- journal_entry_id (uuid)
- account_id (uuid)
- debit_amount (numeric)
- credit_amount (numeric)
- description (text)
- line_order (integer)
```

---

### 6. **profiles**
```
Columns:
- id (uuid)
- user_id (uuid) ✅
- NO company_id! ← Must be linked through another mechanism
```

---

## 🎯 الفروقات الحرجة

| العنصر | كنت أظن | الواقع الفعلي |
|--------|---------|---------------|
| معرف الحساب | `account_number` | `account_code` ✅ |
| تاريخ الفاتورة | `issue_date` | `invoice_date` ✅ |
| حالة المدفوعة | `status` (enum) | `payment_status` (text) ✅ |
| company_id | غير موجود | **موجود في كل الجداول!** ✅ |
| account_type | "asset" | "assets" (plural) ✅ |
| profiles.company_id | موجود | **غير موجود!** ❌ |

---

## ✅ الحل الصحيح الآن

جميع migrations السابقة كانت خاطئة لأنها بُنيت على افتراضات خاطئة عن البنية!

الآن: ✅ تم إنشاء ملفات جديدة بناءً على الفهم الكامل للبنية الفعلية من Supabase MCP.

