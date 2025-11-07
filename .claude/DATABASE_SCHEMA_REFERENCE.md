# 📊 مرجع شامل لقاعدة بيانات FleetifyApp

**تاريخ التحديث:** 5 نوفمبر 2025  
**المشروع:** saas (Supabase Project ID: qwhunliohlkkahbspfiu)  
**قاعدة البيانات:** PostgreSQL 17.6

---

## 🎯 قواعد عامة مهمة

### 1. بنية الجداول
- **company_id** موجود في معظم الجداول (للتمييز بين الشركات)
- **created_at, updated_at** موجودة في جميع الجداول
- **id** هو UUID في جميع الجداول

### 2. جداول المستخدمين
- **profiles** - الجدول الرئيسي للمستخدمين
  - Columns: `id`, `user_id`, `company_id`, `email`, `first_name`, `last_name`, `first_name_ar`, `last_name_ar`
  - **مهم:** المستخدم يرتبط بشركة واحدة عبر `company_id`
  
- **user_roles** - صلاحيات المستخدمين
  - Columns: `id`, `user_id`, `company_id`, `role`, `granted_at`
  - Roles: super_admin, company_admin, manager, accountant, fleet_manager, sales_agent, employee

### 3. النظام المالي (الأهم!)

#### chart_of_accounts - دليل الحسابات
```sql
Columns:
- id, company_id, account_code, account_name, account_name_ar
- account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
- account_level: 1-6 (المستوى 3+ فقط يقبل قيود)
- balance_type: 'debit' | 'credit'
- is_header: boolean (Headers لا تقبل قيود!)
- is_system: boolean
- current_balance: numeric
- parent_account_id, parent_account_code
```

**القيود المهمة:**
- ❌ لا يمكن القيود على حسابات is_header = true
- ❌ لا يمكن القيود على حسابات account_level < 3
- ✅ يمكن القيود فقط على حسابات detail (is_header = false, level >= 3)

#### journal_entries - القيود المحاسبية
```sql
Columns:
- id, company_id, entry_number, entry_date
- description, total_debit, total_credit
- status: 'draft' | 'posted' | 'reversed'
- reference_type: 'contract' | 'payment' | 'rental_payment' | etc
- reference_id: UUID
- created_by, posted_by, accounting_period_id
```

#### journal_entry_lines - سطور القيود
```sql
Columns:
- id, journal_entry_id, account_id
- line_description (ليس description!)
- debit_amount, credit_amount
- line_number (مطلوب!)
- cost_center_id, asset_id, employee_id
```

**القاعدة الذهبية:**
```
INSERT INTO journal_entry_lines (
    journal_entry_id,
    account_id,
    line_description,  ← ليس description
    debit_amount,
    credit_amount,
    line_number,       ← إلزامي!
    created_at
)
```

### 4. العقود والعملاء

#### contracts - العقود
```sql
Columns:
- id, company_id, customer_id, vehicle_id
- contract_number, contract_date
- start_date, end_date
- contract_amount, monthly_amount
- status: 'draft' | 'active' | 'completed' | 'cancelled' | 'overdue'
- payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
- journal_entry_id, cost_center_id, account_id
```

#### customers - العملاء
```sql
Columns:
- id, company_id, customer_code
- customer_type: 'individual' | 'corporate'
- first_name, last_name, first_name_ar, last_name_ar
- company_name, company_name_ar
- email, phone, alternative_phone
- national_id, passport_number, license_number
- is_blacklisted, blacklist_reason
```

### 5. المركبات

#### vehicles - المركبات
```sql
Columns:
- id, company_id, plate_number
- make, model, year, color, color_ar
- status: 'available' | 'rented' | 'maintenance' | 'out_of_service' | etc
- daily_rate, weekly_rate, monthly_rate
- vin, engine_number, registration_number
- category_id, cost_center_id, fixed_asset_id
```

### 6. الفواتير والمدفوعات

#### invoices - الفواتير
```sql
Columns:
- id, company_id, customer_id, contract_id
- invoice_number, invoice_date, due_date
- invoice_type: 'sales' | 'purchase' | 'service'
- status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
- payment_status: 'unpaid' | 'partial' | 'paid'
- total_amount, paid_amount, balance_due
- journal_entry_id, cost_center_id
```

#### payments - المدفوعات
```sql
Columns:
- id, company_id, customer_id, contract_id, invoice_id
- payment_number, payment_date
- payment_type: 'cash' | 'check' | 'bank_transfer' | etc
- payment_method: 'received' | 'made'
- payment_status: 'pending' | 'completed' | 'cleared' | etc
- amount, currency
- transaction_type: 'payment' | 'receipt'
- journal_entry_id, account_id, cost_center_id
```

#### rental_payment_receipts - إيصالات الدفع
```sql
Columns:
- id, company_id, customer_id, contract_id, vehicle_id
- receipt_number, customer_name
- month, month_number, fiscal_year
- rent_amount, fine, total_paid
- payment_date, payment_method, payment_status
- invoice_id
```

---

## 🔑 الجداول الأساسية (Core Tables)

| الجدول | الصفوف | الوصف |
|--------|--------|-------|
| companies | 4 | الشركات |
| profiles | 9 | مستخدمي النظام |
| user_roles | 9 | صلاحيات المستخدمين |
| chart_of_accounts | 828 | دليل الحسابات |
| journal_entries | 277 | القيود المحاسبية |
| journal_entry_lines | 454 | سطور القيود |
| contracts | 588 | العقود |
| customers | 781 | العملاء |
| vehicles | 510 | المركبات |
| invoices | 1,250 | الفواتير |
| payments | 6,568 | المدفوعات |
| rental_payment_receipts | 388 | إيصالات الدفع |
| cost_centers | 60 | مراكز التكلفة |

---

## 📋 معلومات شركة العراف (Company: Al-Araf)

```
Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
Name: العراف لتاجير السيارات
Currency: QAR
Business Type: car_rental

Accounts: 383
Contracts: 517
Customers: 709
Vehicles: 510
Invoices: 1,250
Payments: 6,568
Journal Entries: 227 (454 lines)
```

---

## 🔍 استعلامات شائعة

### الحصول على company_id للمستخدم:
```sql
SELECT company_id FROM profiles 
WHERE user_id = auth.uid()
-- أو
WHERE email = 'user@example.com'
```

### الحصول على دليل الحسابات:
```sql
SELECT * FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
ORDER BY account_code;
```

### الحصول على القيود المحاسبية:
```sql
SELECT * FROM journal_entries
WHERE company_id = '...'
AND status = 'posted'
ORDER BY entry_date DESC;
```

---

## ⚠️ مشاكل شائعة وحلولها

### 1. خطأ: "relation does not exist"
```
السبب: الجدول غير موجود أو الاسم خطأ
الحل: تحقق من الاسم في src/integrations/supabase/types.ts
```

### 2. خطأ: "column does not exist"
```
الأمثلة الشائعة:
❌ description → ✅ line_description (في journal_entry_lines)
❌ level → ✅ account_level (في chart_of_accounts)
❌ parent_code → ✅ parent_account_code
❌ account_name_en → ✅ account_name
❌ created_at → ✅ granted_at (في user_roles)
```

### 3. خطأ: "لا يمكن إجراء قيود على الحسابات الرئيسية"
```
السبب: محاولة القيد على حساب is_header = true أو level < 3
الحل: استخدم حسابات detail (is_header = false, level >= 3)
```

### 4. auth.uid() لا يعمل في SQL Editor
```
السبب: SQL Editor يعمل كـ Admin
الحل: استخدم emails أو UUIDs مباشرة بدلاً من auth.uid()
```

---

## 🎯 الحسابات المالية الأساسية لشركة العراف

### الحسابات المستخدمة حالياً:
```
11151 - البنك التجاري (حساب الجاري)    [Assets, Level 5] ✅
41101 - إيرادات تأجير سيارات شهري        [Revenue, Level 5] ✅
```

---

## 📚 ملف التعريفات الكامل

**للاطلاع على جميع التفاصيل:**
- `src/integrations/supabase/types.ts` - TypeScript types الكاملة

---

## 🔐 RLS Policies

جميع الجداول المالية تستخدم:
```sql
company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid()
)
```

---

**ملاحظة:** هذا الملف يتم تحديثه تلقائياً. لا تعدل يدوياً!



