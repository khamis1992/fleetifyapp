# تقرير شامل لتحليل النظام المالي والتكامل المحاسبي في Fleetify ERP

> **تاريخ التقرير:** 4 يوليو 2026  
> **النطاق:** قاعدة بيانات Supabase، التوجيه (Routes)، خطافات التكامل (Integration Hooks)، تدفق البيانات المالية  
> **المنهجية:** قراءة الكود المصدري مباشرةً من `src/integrations/supabase/types.ts`، `src/routes/index.ts`، وكل خطافات التكامل — بدون أي تعديلات.

---

## جدول المحتويات

1. [أ. جداول قاعدة البيانات المالية ومخططاتها](#أ-جداول-قاعدة-البيانات-المالية-ومخططاتها)
2. [ب. جميع المسارات/الصفحات المالية](#ب-جميع-المساراتالصفحات-المالية)
3. [ج. نقاط التكامل بين المالية والوحدات الأخرى](#ج-نقاط-التكامل-بين-المالية-والوحدات-الأخرى)
4. [د. مخططات تدفق البيانات](#د-مخططات-تدفق-البيانات-نصية)
5. [هـ. الفجوات والمخاطر في التكامل](#هـ-الفجوات-والمخاطر-في-التكامل)

---

## أ. جداول قاعدة البيانات المالية ومخططاتها

### 1. جدول القيود المحاسبية — `journal_entries`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة (إلزامي) |
| `entry_number` | string | رقم القيد (إلزامي، فريد ضمن الشركة) |
| `entry_date` | string | تاريخ القيد (إلزامي) |
| `accounting_period_id` | string \| null | الفترة المحاسبية المرتبطة |
| `reference_type` | string \| null | نوع المرجع: `payment`, `traffic_violation`, `maintenance`, `vehicle_installment`, `vehicle_purchase`, `payroll`, `payroll_payment`, `rental_payment`, `payment_reversal` |
| `reference_id` | string \| null | معرّف السجل المرتبط في الوحدة الأصلية |
| `description` | string | وصف القيد (إلزامي) |
| `total_debit` | number | إجمالي المدين |
| `total_credit` | number | إجمالي الدائن |
| `status` | string | `draft` \| `posted` \| `reversed` |
| `created_by` | string \| null | المستخدم الذي أنشأ القيد |
| `posted_by` | string \| null | المستخدم الذي رحّل القيد |
| `posted_at` | string \| null | وقت الترحيل |
| `reversed_by` | string \| null | المستخدم الذي عكس القيد |
| `reversed_at` | string \| null | وقت العكس |
| `reversal_entry_id` | string \| null | معرّف قيد العكس (علاقة ذاتية) |
| `reviewed_by` | string \| null | المراجع |
| `reviewed_at` | string \| null | وقت المراجعة |
| `rejection_reason` | string \| null | سبب الرفض |
| `workflow_notes` | string \| null | ملاحظات سير العمل |
| `updated_by` | string \| null | آخر محدّث |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `accounting_period_id` → `accounting_periods.id`
- `created_by` → `profiles.user_id`
- `posted_by` → `profiles.user_id`
- `reversal_entry_id` → `journal_entries.id` (علاقة ذاتية لقيد العكس)

---

### 2. جدول بنود القيود — `journal_entry_lines`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `journal_entry_id` | string | معرّف القيد الأب (إلزامي) |
| `account_id` | string | معرّف الحساب من دليل الحسابات (إلزامي) |
| `cost_center_id` | string \| null | مركز التكلفة المرتبط |
| `asset_id` | string \| null | الأصل الثابت المرتبط |
| `employee_id` | string \| null | الموظف المرتبط (للرواتب) |
| `line_description` | string \| null | وصف البند |
| `debit_amount` | number \| null | مبلغ المدين |
| `credit_amount` | number \| null | مبلغ الدائن |
| `line_number` | number | رقم البند (إلزامي) |
| `created_at` | string | طابع زمني |

**العلاقات:**
- `account_id` → `chart_of_accounts.id`
- `asset_id` → `fixed_assets.id`
- `cost_center_id` → `cost_centers.id`
- `employee_id` → `employees.id`
- `journal_entry_id` → `journal_entries.id`

> ⚠️ **ملاحظة:** لا يوجد حقل `company_id` على بنود القيود — العزل يتم عبر القيد الأب.

---

### 3. جدول دليل الحسابات — `chart_of_accounts`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `account_code` | string | كود الحساب (إلزامي) |
| `account_name` | string | اسم الحساب |
| `account_name_ar` | string \| null | الاسم بالعربية |
| `account_type` | string | النوع: `asset`, `liability`, `equity`, `revenue`, `expenses` |
| `account_subtype` | string \| null | النوع الفرعي |
| `balance_type` | string | نوع الرصيد: `debit` \| `credit` |
| `account_level` | number \| null | مستوى الحساب في التسلسل الهرمي |
| `parent_account_id` | string \| null | الحساب الأب |
| `parent_account_code` | string \| null | كود الحساب الأب |
| `is_header` | boolean \| null | هل هو حساب رأسي (لا يُرحّل عليه) |
| `is_active` | boolean \| null | هل هو نشط |
| `is_system` | boolean \| null | حساب نظامي (لا يُحذف) |
| `is_default` | boolean \| null | حساب افتراضي |
| `current_balance` | number \| null | الرصيد الحالي |
| `sort_order` | number \| null | ترتيب العرض |
| `can_link_customers` | boolean \| null | يمكن ربطه بالعملاء |
| `can_link_vendors` | boolean \| null | يمكن ربطه بالموردين |
| `can_link_employees` | boolean \| null | يمكن ربطه بالموظفين |
| `description` | string \| null | وصف |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `parent_account_id` → `chart_of_accounts.id` (تسلسل هرمي ذاتي)

---

### 4. جدول الفواتير — `invoices`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `invoice_number` | string | رقم الفاتورة (إلزامي) |
| `invoice_date` | string | تاريخ الفاتورة |
| `due_date` | string \| null | تاريخ الاستحقاق |
| `invoice_type` | string | `sales` \| `purchase` \| `service` |
| `customer_id` | string \| null | معرّف العميل |
| `vendor_id` | string \| null | معرّف المورد |
| `contract_id` | string \| null | معرّف العقد |
| `cost_center_id` | string \| null | مركز التكلفة |
| `fixed_asset_id` | string \| null | الأصل الثابت |
| `subtotal` | number | المجموع قبل الضريبة |
| `tax_amount` | number \| null | ضريبة القيمة المضافة |
| `discount_amount` | number \| null | الخصم |
| `total_amount` | number | الإجمالي |
| `paid_amount` | number \| null | المدفوع |
| `balance_due` | number \| null | الرصيد المتبقي |
| `currency` | string \| null | العملة |
| `status` | string | `draft` \| `sent` \| `paid` \| `overdue` \| `cancelled` |
| `payment_status` | string | `unpaid` \| `partial` \| `paid` \| `cancelled` |
| `journal_entry_id` | string \| null | القيد المحاسبي المرتبط |
| `is_legacy` | boolean \| null | فاتورة قديمة مستوردة |
| `ocr_confidence` | number \| null | دقة القراءة الآلية |
| `ocr_data` | Json \| null | بيانات OCR |
| `scanned_image_url` | string \| null | صورة الفاتورة الممسوحة |
| `manual_review_required` | boolean \| null | يتطلب مراجعة يدوية |
| `notes` / `terms` | string \| null | ملاحظات / شروط |
| `created_by` | string \| null | المنشئ |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `contract_id` → `contracts.id`
- `customer_id` → `customers.id`
- `vendor_id` → `vendors.id`
- `cost_center_id` → `cost_centers.id`
- `fixed_asset_id` → `fixed_assets.id`
- `journal_entry_id` → `journal_entries.id`

---

### 5. جدول الدفعات — `payments`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `payment_number` | string | رقم الدفعة (إلزامي) |
| `payment_date` | string | تاريخ الدفعة |
| `amount` | number | المبلغ (إلزامي) |
| `payment_method` | string | `cash` \| `bank_transfer` \| `check` \| `credit_card` |
| `payment_type` | string | `cash` \| `bank_transfer` \| `check` \| `credit_card` |
| `transaction_type` | enum `transaction_type` | `receipt` \| `payment` |
| `payment_status` | string | `pending` \| `completed` \| `cancelled` |
| `currency` | string \| null | العملة |
| `customer_id` | string \| null | معرّف العميل |
| `vendor_id` | string \| null | معرّف المورد |
| `contract_id` | string \| null | معرّف العقد |
| `invoice_id` | string \| null | معرّف الفاتورة |
| `cost_center_id` | string \| null | مركز التكلفة |
| `bank_id` | string \| null | معرّف البنك |
| `account_id` | string \| null | معرّف الحساب المحاسبي |
| `journal_entry_id` | string \| null | القيد المحاسبي المرتبط |
| `check_number` | string \| null | رقم الشيك |
| `reference_number` | string \| null | رقم المرجع (يُستخدم للخصم/المنع التكراري) |
| `due_date` | string \| null | تاريخ الاستحقاق |
| `original_due_date` | string \| null | تاريخ الاستحقاق الأصلي |
| `payment_month` | string \| null | الشهر المغطّى |
| `monthly_amount` | number \| null | المبلغ الشهري |
| `amount_paid` | number \| null | المبلغ المدفوع جزئياً |
| `remaining_amount` | number \| null | المبلغ المتبقي |
| `late_fee_amount` / `late_fee_days` | number \| null | رسوم التأخير |
| `late_fine_amount` / `late_fine_days_overdue` | number \| null | غرامة التأخير |
| `late_fine_type` / `late_fine_status` | string \| null | نوع/حالة الغرامة |
| `late_fine_waiver_reason` | string \| null | سبب التنازل عن الغرامة |
| `days_overdue` | number \| null | أيام التأخير |
| `agreement_number` | string \| null | رقم الاتفاقية |
| `allocation_status` | string \| null | حالة التخصيص |
| `linking_confidence` | number \| null | دقة الربط الآلي |
| `reconciliation_status` | string \| null | حالة التسوية |
| `payment_completion_status` | string \| null | حالة اكتمال الدفعة |
| `processing_status` / `processing_notes` | string \| null | حالة/ملاحظات المعالجة |
| `description_type` | string \| null | نوع الوصف |
| `notes` | string \| null | ملاحظات |
| `bank_account` | string \| null | حساب البنك |
| `created_by` | string \| null | المنشئ |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `contract_id` → `contracts.id`
- `customer_id` → `customers.id`
- `vendor_id` → `vendors.id`
- `invoice_id` → `invoices.id`
- `account_id` → `chart_of_accounts.id`
- `bank_id` → `banks.id`
- `cost_center_id` → `cost_centers.id`
- `journal_entry_id` → `journal_entries.id`

> ⚠️ **ملاحظة:** لا يوجد حقل `approved_by` / `approved_at` في تعريف الأنواع (رغم أن `usePaymentOperations` يحاول كتابتهما عند الموافقة).

---

### 6. جدول الموردين — `vendors`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `vendor_code` | string | كود المورد (إلزامي) |
| `vendor_name` | string | اسم المورد |
| `vendor_name_ar` | string \| null | الاسم بالعربية |
| `category_id` | string \| null | فئة المورد |
| `contact_person` | string \| null | جهة الاتصال |
| `phone` / `email` / `address` | string \| null | بيانات الاتصال |
| `address_ar` | string \| null | العنوان بالعربية |
| `tax_number` | string \| null | الرقم الضريبي |
| `credit_limit` | number \| null | حد الائتمان |
| `current_balance` | number \| null | الرصيد الحالي |
| `payment_terms` | number \| null | شروط السداد (بالأيام) |
| `is_active` | boolean \| null | نشط |
| `notes` | string \| null | ملاحظات |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `category_id` → `vendor_categories.id`

---

### 7. جدول أوامر الشراء — `purchase_orders`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `order_number` | string | رقم الأمر (إلزامي) |
| `order_date` | string | تاريخ الأمر |
| `vendor_id` | string | معرّف المورد (إلزامي) |
| `status` | string | حالة الأمر |
| `subtotal` | number | المجموع الفرعي |
| `tax_amount` | number | الضريبة |
| `total_amount` | number | الإجمالي |
| `currency` | string | العملة |
| `expected_delivery_date` / `delivery_date` | string \| null | تواريخ التسليم |
| `delivery_address` | string \| null | عنوان التسليم |
| `contact_person` / `phone` / `email` | string \| null | بيانات الاتصال |
| `approved_at` / `approved_by` | string \| null | بيانات الاعتماد |
| `terms_and_conditions` | string \| null | الشروط |
| `notes` | string \| null | ملاحظات |
| `created_by` | string | المنشئ (إلزامي) |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `vendor_id` → `vendors.id`

---

### 8. جدول مراكز التكلفة — `cost_centers`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `center_code` | string | كود المركز (إلزامي) |
| `center_name` | string | اسم المركز |
| `center_name_ar` | string \| null | الاسم بالعربية |
| `parent_center_id` | string \| null | المركز الأب |
| `manager_id` | string \| null | مدير المركز |
| `budget_amount` | number \| null | الميزانية |
| `actual_amount` | number \| null | المبلغ الفعلي |
| `is_active` / `is_default` | boolean \| null | نشط / افتراضي |
| `description` | string \| null | وصف |
| `created_by` | string \| null | المنشئ |
| `created_at` / `updated_at` | string | طوابع زمنية |

---

### 9. جدول الأصول الثابتة — `fixed_assets`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `asset_code` | string | كود الأصل (إلزامي) |
| `asset_name` / `asset_name_ar` | string | الاسم |
| `category` | string | الفئة |
| `purchase_cost` | number | تكلفة الشراء |
| `purchase_date` | string | تاريخ الشراء |
| `useful_life_years` | number | العمر الإنتاجي |
| `salvage_value` | number \| null | القيمة المتبقية |
| `accumulated_depreciation` | number \| null | الإهلاك المتراكم |
| `book_value` | number | القيمة الدفترية |
| `depreciation_method` | string | طريقة الإهلاك |
| `asset_account_id` | string \| null | حساب الأصل في دليل الحسابات |
| `depreciation_account_id` | string \| null | حساب الإهلاك |
| `disposal_date` / `disposal_amount` | string \| null / number \| null | بيانات التخلص |
| `condition_status` | string \| null | الحالة |
| `location` | string \| null | الموقع |
| `serial_number` | string \| null | الرقم التسلسلي |
| `is_active` | boolean \| null | نشط |
| `notes` | string \| null | ملاحظات |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `asset_account_id` → `chart_of_accounts.id`
- `depreciation_account_id` → `chart_of_accounts.id`

---

### 10. جدول الميزانيات — `budgets`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `budget_name` | string | اسم الميزانية |
| `budget_year` | number | السنة المالية |
| `accounting_period_id` | string \| null | الفترة المحاسبية |
| `status` | string | الحالة |
| `total_revenue` / `total_expenses` / `net_income` | number \| null | الإجماليات |
| `approved_at` / `approved_by` | string \| null | بيانات الاعتماد |
| `created_by` | string \| null | المنشئ |
| `notes` | string \| null | ملاحظات |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `accounting_period_id` → `accounting_periods.id`

---

### 11. جدول بنود الميزانية — `budget_items`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `budget_id` | string | معرّف الميزانية |
| `account_id` | string | معرّف الحساب |
| `budgeted_amount` | number | المبلغ المخصص |
| `actual_amount` | number \| null | المبلغ الفعلي |
| `variance_amount` / `variance_percentage` | number \| null | الانحراف |
| `notes` | string \| null | ملاحظات |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `account_id` → `chart_of_accounts.id`
- `budget_id` → `budgets.id`

---

### 12. جدول الفترات المحاسبية — `accounting_periods`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `period_name` | string | اسم الفترة |
| `start_date` / `end_date` | string | تواريخ الفترة |
| `status` | string | `open` \| `closed` \| `locked` |
| `is_adjustment_period` | boolean \| null | فترة تسوية |
| `created_at` / `updated_at` | string | طوابع زمنية |

---

### 13. جدول تعيينات الحسابات — `account_mappings`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `default_account_type_id` | string | نوع الحساب الافتراضي |
| `chart_of_accounts_id` | string | الحساب المعيّن |
| `is_active` | boolean \| null | نشط |
| `mapped_by` | string \| null | المستخدم الذي قام بالتعيين |
| `created_at` / `updated_at` | string | طوابع زمنية |

**العلاقات:**
- `chart_of_accounts_id` → `chart_of_accounts.id`
- `default_account_type_id` → `default_account_types.id`
- `company_id` → `companies.id`

---

### 14. جدول البنوك — `banks`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `bank_name` / `bank_name_ar` | string | اسم البنك |
| `account_number` | string | رقم الحساب (إلزامي) |
| `account_type` | string | نوع الحساب |
| `currency` | string | العملة |
| `current_balance` / `opening_balance` | number \| null | الأرصدة |
| `opening_date` | string \| null | تاريخ الافتتاح |
| `iban` / `swift_code` | string \| null | بيانات دولية |
| `is_primary` / `is_active` | boolean \| null | رئيسي / نشط |
| `branch_name` / `branch_name_ar` | string \| null | اسم الفرع |
| `contact_person` / `phone` / `email` / `address` | string \| null | بيانات الاتصال |
| `notes` | string \| null | ملاحظات |
| `created_at` / `updated_at` | string | طوابع زمنية |

---

### 15. جدول الحركات البنكية — `bank_transactions`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `bank_id` | string | معرّف البنك |
| `transaction_number` | string | رقم الحركة (إلزامي) |
| `transaction_type` | string | نوع الحركة |
| `transaction_date` | string | التاريخ |
| `amount` | number | المبلغ |
| `balance_after` | number | الرصيد بعد الحركة |
| `description` | string | الوصف |
| `journal_entry_id` | string \| null | القيد المرتبط |
| `counterpart_bank_id` | string \| null | البنك المقابل (للتحويلات) |
| `check_number` / `reference_number` | string \| null | أرقام مرجعية |
| `reconciled` / `reconciled_at` | boolean \| null / string \| null | التسوية |
| `status` | string | الحالة |
| `created_by` | string \| null | المنشئ |
| `created_at` / `updated_at` | string | طوابع زمنية |

---

### 16. جدول قوالب المحاسبة — `accounting_templates`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `name` | string | اسم القالب |
| `template_type` | string | نوع القالب |
| `entries` | Json | بنود القالب |
| `conditions` | Json | شروط التطبيق |
| `priority` | number | الأولوية |
| `enabled` | boolean | مفعّل |
| `description` | string \| null | وصف |
| `created_at` / `updated_at` | string | طوابع زمنية |

---

### 17. جدول تنبيهات الميزانية — `budget_alerts`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `budget_id` | string | معرّف الميزانية |
| `budget_item_id` | string \| null | بند الميزانية |
| `alert_type` | string | نوع التنبيه |
| `threshold_percentage` | number | نسبة الحد |
| `current_percentage` | number | النسبة الحالية |
| `amount_exceeded` | number | المبلغ المتجاوز |
| `message` / `message_ar` | string | الرسالة |
| `is_acknowledged` | boolean \| null | تم الإقرار |
| `acknowledged_by` / `acknowledged_at` | string \| null | بيانات الإقرار |
| `created_at` / `updated_at` | string | طوابع زمنية |

---

### 18. جدول إعدادات حركة الحسابات — `account_movement_settings`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `auto_create_movements` | boolean \| null | إنشاء تلقائي |
| `require_approval` | boolean \| null | يتطلب موافقة |
| `approval_threshold` | number \| null | حد الموافقة |
| `default_movement_type` | string \| null | النوع الافتراضي |
| `is_active` | boolean \| null | نشط |
| `created_at` / `updated_at` | string \| null | طوابع زمنية |

---

### 19. جدول سجل حذف الحسابات — `account_deletion_log`

| العمود | النوع | الوصف |
|--------|------|-------|
| `id` | string (UUID) | المفتاح الأساسي |
| `company_id` | string | معرّف الشركة |
| `deletion_type` | string | نوع الحذف |
| `deleted_account_id` / `deleted_account_code` / `deleted_account_name` | string \| null | بيانات الحساب المحذوف |
| `transfer_to_account_id` | string \| null | حساب التحويل |
| `affected_records` | Json \| null | السجلات المتأثرة |
| `deleted_by` | string \| null | المستخدم |
| `deletion_reason` | string \| null | السبب |
| `created_at` | string | طابع زمني |

---

## ب. جميع المسارات/الصفحات المالية

تم استخراج جميع المسارات من `src/routes/index.ts`. المسارات المالية تنقسم لمجموعتين: المسار العام `/finance/*` (يحمّل مكون `Finance` الذي يدير مسارات فرعية داخلية) والمسارات المباشرة.

### المسارات المالية المباشرة

| # | المسار | المكون | الوصف |
|---|--------|--------|-------|
| 1 | `/finance/*` | `Finance` | الصفحة الرئيسية المالية — تدير مسارات فرعية داخلية (44 صفحة) |
| 2 | `/finance/invoice-scanner` | `InvoiceScannerPage` | ماسح الفواتير بالـ OCR |
| 3 | `/finance/tracking` | `FinancialTracking` | تتبع مالي |
| 4 | `/finance/sync-payments` | `SyncPaymentsToLedger` | مزامنة الدفعات مع الأستاذ العام |
| 5 | `/finance/payments/register` | `PaymentRegistration` | تسجيل الدفعات |
| 6 | `/finance/payments/quick` | `QuickPayment` | دفعة سريعة |
| 7 | `/finance/payments/import-excel` | `ExcelPaymentImport` | استيراد دفعات من Excel |
| 8 | `/finance/payments/tracking` | `PaymentTracking` | تتبع الدفعات |
| 9 | `/finance/vendors` | `Vendors` | إدارة الموردين |
| 10 | `/finance/vendors/categories` | `VendorCategories` | فئات الموردين |
| 11 | `/finance/purchase-orders` | `PurchaseOrders` | أوامر الشراء |
| 12 | `/finance/reports/ar-aging` | `ARAgingReport` | تقرير أعمار الذمم المدينة |
| 13 | `/admin/payments` | `SuperAdminPayments` | إدارة الدفعات (سوبر أدمن) |
| 14 | `/admin/duplicate-invoices` | `DuplicateInvoicesCleanup` | تنظيف الفواتير المكررة |

### مسارات متعلقة بالمالية في وحدات أخرى

| # | المسار | المكون | الوحدة |
|---|--------|--------|--------|
| 15 | `/fleet/traffic-violations/payments` | `TrafficViolationPayments` | مدفوعات المخالفات المرورية |
| 16 | `/fleet/vehicle-installments` | `VehicleInstallments` | أقساط المركبات |
| 17 | `/fleet/maintenance` | `Maintenance` | الصيانة (تنشئ قيوداً محاسبية) |
| 18 | `/fleet/traffic-violations` | `TrafficViolations` | المخالفات المرورية (تنشئ قيوداً) |
| 19 | `/hr/payroll` | `Payroll` | الرواتب (تنشئ قيوداً محاسبية) |

> **ملاحظة:** مكون `Finance` في المسار `/finance/*` يدير مسارات فرعية داخلية (44 صفحة و 96 مكوّناً حسب سياق المهمة). هذه المسارات الفرعية تشمل: دليل الحسابات، القيود اليومية، الأستاذ العام، ميزان المراجعة، قائمة الدخل، الميزانية العمومية، التقارير المالية، الأصول الثابتة، مراكز التكلفة، الميزانيات، الإيداعات، التسويات البنكية، إلخ.

---

## ج. نقاط التكامل بين المالية والوحدات الأخرى

### 1. تكامل الدفعات (Payment Operations) — `usePaymentOperations.ts`

**البيانات المالية المقروءة/المكتوبة:**
- **يكتب:** `payments`, `journal_entries`, `journal_entry_lines`, `bank_transactions`, `invoices` (تحديث المدفوع/الرصيد)
- **يقرأ:** `chart_of_accounts` (لبحث الحسابات النقدية والذمم المدينة), `banks`, `invoices`, `payments` (للكشف التكراري)

**كيفية إنشاء القيود:**
- يحاول أولاً استدعاء RPC: `ensure_payment_journal_entry(p_payment_id, p_company_id, p_actor_id)`
- إذا لم تتوفر الـ RPC، يلجأ للإنشاء من جهة العميل (client-side)
- **للإيصالات (receipt):**
  - مدين: حساب النقدية/البنك (أكواد: `11151`, `11111`, `1010`)
  - دائن: حساب الذمم المدينة (أكواد: `12101`, `11211`, `11212`, `11221`, `11222`)
- **للدفعات (payment):**
  - مدين: حساب الموردين/المصروف
  - دائن: حساب النقدية/البنك
- يتم إنشاء القيد بحالة `draft` ثم يُرحّل فوراً إلى `posted`
- يحدّث `payments.journal_entry_id` بالقيد المنشأ

**الربط بالوحدة الأصلية:**
- `reference_type = 'payment'`, `reference_id = payment.id`
- `payments.journal_entry_id` يُحدّث بمعرّف القيد

**آلية العكس عند الإلغاء:**
- يحاول RPC: `cancel_payment_with_reversal(p_payment_id, p_company_id, p_reason, p_actor_id)`
- إن لم تتوفر، ينشئ قيد عكس يدوياً: يقرأ بنود القيد الأصلي، ينشئ قيداً جديداً بـ `reference_type = 'payment_reversal'`، يعكس المدين/الدائن، يرحّله، ثم يحدّث القيد الأصلي بحالة `reversed`
- يعيد حساب `invoices.paid_amount`, `balance_due`, `payment_status` من الدفعات النشطة المتبقية
- يعكس الحركة البنكية المرتبطة

**الفجوات:**
- لا يوجد حقل `approved_by` / `approved_at` / `cancelled_at` / `cancelled_by` في مخطط `payments` (رغم محاولة الكتابة عليها)
- الاعتماد على RPC قد يفشل بصمت (fallback) — قد يؤدي لازدواجية القيود إذا عادت الـ RPC لاحقاً
- الكشف التكراري يستخدم `reference_number` كـ idempotency key بدلاً من حقل مخصص

---

### 2. تكامل إيصالات الإيجار — `useRentalPaymentJournalIntegration.ts`

**البيانات المالية المالية المقروءة/المكتوبة:**
- **يكتب:** `journal_entries`, `journal_entry_lines`
- **يقرأ:** `chart_of_accounts` (أكواد: `1010` النقدية, `1200` الذمم المدينة, `4110` إيرادات التأجير, `4200` إيرادات الغرامات)

**كيفية إنشاء القيود:**
يُنشأ قيد واحد متعدد البنود يغطي ثلاث عمليات:
1. **الاعتراف بإيراد الإيجار:** مدين `1200` (الذمم المدينة) / دائن `4110` (إيراد التأجير)
2. **الاعتراف بإيراد الغرامة:** مدين `1200` / دائن `4200` (إيراد الغرامات) — إذا وُجدت غرامة
3. **استلام الدفعة:** مدين `1010` (النقدية) / دائن `1200` (الذمم المدينة)

**الربط بالوحدة الأصلية:**
- `reference_type = 'rental_payment'`, `reference_id = payment_id` (من جدول `rental_payment_receipts`)

**الحذف:**
- يبحث عن القيد بـ `reference_type='rental_payment'` و `reference_id`, يحذف البنود ثم القيد

**الفجوات:**
- لا يُحدّث `rental_payment_receipts` بمعرّف القيد (لا يوجد حقل `journal_entry_id` في جدول `rental_payment_receipts`)
- الاعتراف بالإيراد واستلام الدفعة في نفس القيد يعني أن الإيراد يُعترف به عند التحصيل وليس عند الاستحقاق — غير متوافق مع الأساس الاستحقاقي
- لا يوجد قيد عكس عند حذف الإيصال — يُحذف القيد مباشرة (hard delete) بدلاً من إنشاء قيد عكسي
- لا يتم التحقق من توازن القيد إلا بعد إنشاء كل البنود

---

### 3. تكامل المخالفات المرورية — `useTrafficViolationJournalIntegration.ts`

**البيانات المالية المقروءة/المكتوبة:**
- **يكتب:** `journal_entries`, `journal_entry_lines`
- **يقرأ:** `chart_of_accounts` (أكواد: `1010` النقدية, `1200` الذمم المدينة, `4300` إيراد المخالفات, `5700` مصروف المخالفات)

**كيفية إنشاء القيود:**
حسب مسؤولية الدفع:

**إذا كان العميل مسؤولاً (`charged_to_customer = true`):**
- مدين: `1200` (ذمم العميل) — amount
- دائن: `4300` (إيراد مخالفة مرورية) — amount

**إذا كانت الشركة مسؤولة (`isCompanyLiability = true`):**
- مدين: `5700` (مصروف مخالفة مرورية) — amount
- دائن: `1010` (النقدية) — amount

- القيد يُنشأ مباشرة بحالة `posted`
- يتحقق من عدم وجود قيد سابق (`reference_type='traffic_violation'`, `reference_id=violationId`) لمنع التكرار

**الربط بالوحدة الأصلية:**
- `reference_type = 'traffic_violation'`, `reference_id = violationId`

**الحذف:**
- hard delete: يحذف البنود ثم القيد مباشرة

**الفجوات:**
- لا يوجد حقل `journal_entry_id` في جدول `traffic_violations` للربط العكسي
- لا يوجد قيد عكس عند الحذف — حذف مباشر
- المنطق المعكوس لتحميل العميل قد يكون غير دقيق: يستخدم `!violation.isCompanyLiability` كقيمة افتراضية لتحميل العميل إذا لم يُحدد `isCompanyLiability`
- لا يتم تمرير `total_debit` / `total_credit` عند إنشاء القيد — قد يبقى صفراً في قاعدة البيانات

---

### 4. تكامل الصيانة — `useMaintenanceJournalIntegration.ts`

**البيانات المالية المقروءة/المكتوبة:**
- **يكتب:** `journal_entries`, `journal_entry_lines`
- **يقرأ:** `chart_of_accounts` (أكواد: `1010` النقدية, `2100` ذمم دائنة, `5200` مصروف صيانة), `maintenance`

**كيفية إنشاء القيود:**
حسب حالة الدفع:

**مدفوع بالكامل (`status='completed'` و `paid=true`):**
- مدين: `5200` (مصروف الصيانة) — cost
- دائن: `1010` (النقدية) — cost

**مدفوع جزئياً (`amount_paid > 0` و `< cost`):**
- مدين: `5200` (مصروف الصيانة) — cost
- دائن: `1010` (النقدية) — amount_paid
- دائن: `2100` (ذمم دائنة) — المتبقي (cost - amount_paid)

**غير مدفوع:**
- مدين: `5200` (مصروف الصيانة) — cost
- دائن: `2100` (ذمم دائنة) — cost

- القيد يُنشأ مباشرة بحالة `posted`
- `reference_type = 'maintenance'`, `reference_id = maintenance.id`

**التحديث:**
- عند تغيير حالة الدفع: يحذف القيد القديم (hard delete) وينشئ قيداً جديداً

**الفجوات:**
- لا يوجد حقل `journal_entry_id` في جدول `maintenance`
- التحديث يحذف القيد القديم بدلاً من إنشاء قيد عكس — مخالف للممارسات المحاسبية
- لا يتم تمرير `total_debit` / `total_credit`
- يطلب حساب `2100` (ذمم دائنة) لكل الصيانة غير المدفوعة — قد لا يكون مناسباً دائماً (قد يكون مورد محدد)
- معالجة الأخطاء صامتة (console.error فقط) — لا يُعلم المستخدم بالفشل

---

### 5. تكامل أقساط المركبات — `useVehicleInstallmentJournalIntegration.ts`

**البيانات المالية المقروءة/المكتوبة:**
- **يكتب:** `journal_entries`, `journal_entry_lines`, `vehicle_installment_schedules` (تحديث `journal_entry_id`)
- **يقرأ:** `chart_of_accounts` (بحث ديناميكي عن حسابات الإيراد/المصروف والنقدية), `vehicle_installment_schedules`, `vehicle_installments`

**كيفية إنشاء القيود:**

**دفعة القسط:**
- يبحث عن حساب مصروف شراء مركبة (باسم يحتوي "vehicle purchase" أو "شراء مركبة" أو "مصروف مركبة")
- إذا لم يجد، يستخدم أول حساب إيراد
- مدين: حساب المصروف/الإيراد — totalPayment (principal + interest)
- دائن: حساب النقدية (`1010`, `1111`, `11151`) — totalPayment

**إذا وُجدت فائدة (interestAmount > 0):**
- يبحث عن حساب مصروف فائدة (باسم يحتوي "interest" أو "فائدة")
- مدين: حساب المصروف/الإيراد — principalAmount
- مدين: حساب الفائدة — interestAmount
- دائن: النقدية — totalPayment

**شراء مركبة بقرض (`createVehiclePurchaseEntry`):**
- يبحث عن أكواد: `1010` (نقدية), `1400` (مركبات - أصل), `2300` (قروض مركبات - التزام)
- مدين: `1400` (المركبات) — purchasePrice
- دائن: `1010` (النقدية) — downPayment
- دائن: `2300` (القروض) — loanAmount

- القيد يُنشأ بحالة `posted`
- `reference_type = 'vehicle_installment'` أو `vehicle_purchase`

**الربط بالوحدة الأصلية:**
- `reference_type = 'vehicle_installment'`, `reference_id = scheduleId`
- يحدّث `vehicle_installment_schedules.journal_entry_id` بالقيد المنشأ ✅

**الفجوات:**
- ⚠️ **منطق محاسبي مشكوك فيه:** دفع قسط للمورد يُسجّل كمدين على حساب "الإيرادات" — هذا يقلل الإيراد بدلاً من تسديد ذمم. التعليق في الكود يقول "خصم من الإيرادات" وهذا غير منطقي محاسبياً (يجب أن يكون مدين: ذمم المورد، دائن: النقدية)
- البحث الديناميكي عن الحسابات قد يختار حساباً خاطئاً
- لا يتم تمرير `total_debit` / `total_credit`
- الحذف مباشر (hard delete)

---

### 6. تكامل الرواتب — `usePayrollJournalIntegration.ts`

**البيانات المالية المقروءة/المكتوبة:**
- **يكتب:** `journal_entries`, `journal_entry_lines`
- **يقرأ:** `chart_of_accounts` (أكواد: `1010` نقدية, `2200` ذمم رواتب, `5300` مصروف رواتب, `5400` مصروف بدلات), `payroll`

**كيفية إنشاء القيود:**

**قيد الرواتب (الاعتراف بالمصروف):**
- مدين: `5300` (مصروف الرواتب) — basicSalary
- مدين: `5400` (مصروف البدلات) — allowances (إذا وُجدت)
- دائن: `1010` (النقدية) — netSalary [إذا كان `status='paid'`]
- دائن: `2200` (ذمم رواتب) — netSalary [إذا لم يكن مدفوعاً]

**قيد دفع الراتب (`createPaymentEntry`):**
- مدين: `2200` (ذمم رواتب) — netSalary
- دائن: `1010` (النقدية) — netSalary

- القيود تُنشأ بحالة `posted`
- `reference_type = 'payroll'` أو `payroll_payment`

**الربط بالوحدة الأصلية:**
- `reference_type = 'payroll'`, `reference_id = payroll.id`
- `reference_type = 'payroll_payment'`, `reference_id = payrollId`

**الفجوات:**
- لا يوجد حقل `journal_entry_id` في جدول `payroll`
- ⚠️ **الخصومات لا تُسجّل:** `deductions` تُطرح من `netSalary` لكن لا يوجد بند دائن للخصومات (مثل ضرائب أو تأمينات) — الرصيد لا يتوازن إذا وُجدت خصومات
- لا يتم تمرير `total_debit` / `total_credit`
- الحذف يستخدم استعلام `or` قد يطرد قيوداً غير صحيحة: `.or('reference_id.eq.${payrollId},reference_type.eq.payroll,reference_type.eq.payroll_payment')` — هذا يطابق أي قيد `reference_type='payroll'` بغض النظر عن `reference_id`

---

### 7. تكامل دفعات الإيجار (نظام التتبع) — `useRentalPayments.ts`

**البيانات المالية المقروءة/المكتوبة:**
- **يكتب:** `rental_payment_receipts` (جدول منفصل عن `payments`)
- **يقرأ:** `rental_payment_receipts`, `customers`, `contracts`, `vehicles` (عبر RPCs: `get_customer_rental_payment_totals`, `get_customer_outstanding_balance`, `get_customer_unpaid_months`, `get_all_customers_outstanding_balance`)

**العلاقة مع المحاسبة:**
- يستدعي `createJournalEntryForRentalPayment` (من `useRentalPaymentJournalIntegration`) بعد إنشاء الإيصال
- يستدعي `deleteJournalEntryForRentalPayment` بعد حذف الإيصال

**الفجوات:**
- جدول `rental_payment_receipts` منفصل تماماً عن `payments` — لا تكامل مباشر بين النظامين
- لا يوجد حقل `journal_entry_id` في `rental_payment_receipts`
- غرامة التأخير محسوبة برمجياً (`120 ريال/يوم`، حد أقصى `3000 ريال/شهر`) وليست قابلة للتكوين من قاعدة البيانات

---

## د. مخططات تدفق البيانات (نصية)

### 1. تدفق الدفعات العامة

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Payment Form   │────▶│ usePayment    │────▶│  payments table  │
│ (PaymentReg/    │     │ Operations    │     │  (insert)        │
│  QuickPayment/  │     │               │     └────────┬─────────┘
│  ExcelImport)   │     │               │              │
└─────────────────┘     │               │              ▼
                        │               │     ┌──────────────────┐
                        │               │────▶│ ensure_payment_   │
                        │               │     │ journal_entry RPC │
                        │               │     └────────┬─────────┘
                        │               │              │ success?
                        │               │              ├─Yes─▶ done
                        │               │              │
                        │               │              └─No──▶ fallback:
                        │               │     ┌──────────────────┐
                        │               │────▶│ journal_entries   │
                        │               │     │ (insert, posted)  │
                        │               │     └────────┬─────────┘
                        │               │              │
                        │               │              ▼
                        │               │     ┌──────────────────┐
                        │               │────▶│journal_entry_lines│
                        │               │     │ (DR cash, CR AR)  │
                        │               │     └────────┬─────────┘
                        │               │              │
                        │               │              ▼
                        │               │     ┌──────────────────┐
                        │               │────▶│ payments.          │
                        │               │     │ journal_entry_id   │
                        │               │     │ (update)           │
                        │               │     └────────┬─────────┘
                        │               │              │
                        │               │              ▼
                        │               │     ┌──────────────────┐
                        │               │────▶│ bank_transactions  │
                        │               │     │ (if bank_id)       │
                        │               │     └────────┬─────────┘
                        │               │              │
                        │               │              ▼
                        │               │     ┌──────────────────┐
                        │               │────▶│ invoices.         │
                        │               │     │ paid_amount,      │
                        │               │     │ balance_due       │
                        └──────────────┘     │ (if invoice_id)   │
                                             └──────────────────┘
```

### 2. تدفق إيصالات الإيجار

```
┌───────────────┐     ┌─────────────┐     ┌────────────────────┐
│ Rental Payment│────▶│useRental     │────▶│rental_payment_     │
│ Form          │     │Payments      │     │receipts (insert)   │
│               │     │              │     └─────────┬──────────┘
└───────────────┘     │              │               │
                      │              │               ▼
                      │              │     ┌────────────────────┐
                      │              │────▶│createJournalEntry    │
                      │              │     │ForRentalPayment()   │
                      │              │     └─────────┬──────────┘
                      │              │               │
                      │              │               ▼
                      │              │     ┌────────────────────┐
                      │              │     │journal_entries      │
                      │              │     │(posted, ref=         │
                      │              │     │ 'rental_payment')   │
                      │              │     └─────────┬──────────┘
                      │              │               │
                      │              │               ▼
                      │              │     ┌────────────────────┐
                      │              │     │journal_entry_lines  │
                      │              │     │DR 1200 (AR)          │
                      │              │     │CR 4110 (Rental Rev)  │
                      │              │     │DR 1010 (Cash)        │
                      │              │     │CR 1200 (AR)          │
                      └─────────────┘     └────────────────────┘
```

### 3. تدفق المخالفات المرورية

```
┌───────────────┐     ┌─────────────────┐     ┌──────────────────┐
│Traffic        │────▶│useTrafficViolation│────▶│chart_of_accounts  │
│Violation Page │     │JournalIntegration│     │(fetch 1010,1200,  │
│               │     │                   │     │ 4300,5700)        │
└───────────────┘     │                   │     └────────┬─────────┘
                      │                   │              │
                      │   ┌───────────────┐│              ▼
                      │   │If customer    ││     ┌──────────────────┐
                      │   │responsible:   ││────▶│journal_entries    │
                      │   │DR 1200 (AR)   ││     │(posted, ref=      │
                      │   │CR 4300 (Rev)  ││     │'traffic_violation')│
                      │   ├───────────────┤│     └────────┬─────────┘
                      │   │If company     ││              │
                      │   │liable:        ││              ▼
                      │   │DR 5700 (Exp)  ││     ┌──────────────────┐
                      │   │CR 1010 (Cash) ││────▶│journal_entry_lines│
                      │   └───────────────┘│     └──────────────────┘
                      └───────────────────┘
```

### 4. تدفق الصيانة

```
┌───────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│Maintenance    │────▶│useMaintenanceJournal │────▶│chart_of_accounts │
│Page           │     │Integration           │     │(1010, 2100, 5200)│
└───────────────┘     │                      │     └────────┬─────────┘
                      │  ┌─────────────────┐ │              │
                      │  │Fully paid:      │ │              ▼
                      │  │DR 5200 (Exp)    │─┼────▶┌──────────────────┐
                      │  │CR 1010 (Cash)   │ │     │journal_entries    │
                      │  ├─────────────────┤ │     │(posted, ref=      │
                      │  │Partially paid:  │ │     │'maintenance')     │
                      │  │DR 5200 (Exp)    │ │     └────────┬─────────┘
                      │  │CR 1010 (Cash)   │ │              │
                      │  │CR 2100 (AP)     │ │              ▼
                      │  ├─────────────────┤ │     ┌──────────────────┐
                      │  │Not paid:        │ │     │journal_entry_lines│
                      │  │DR 5200 (Exp)    │ │     └──────────────────┘
                      │  │CR 2100 (AP)     │ │
                      │  └─────────────────┘ │
                      └──────────────────────┘
```

### 5. تدفق أقساط المركبات

```
┌───────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│Vehicle        │────▶│useVehicleInstallment     │────▶│chart_of_accounts │
│Installments   │     │JournalIntegration        │     │(dynamic search)  │
│Page           │     │                          │     └────────┬─────────┘
└───────────────┘     │  ┌──────────────────────┐│              │
                      │  │Installment payment:  ││              ▼
                      │  │DR Revenue/Expense     ││     ┌──────────────────┐
                      │  │  (principal)         ││     │journal_entries    │
                      │  │DR Interest Expense   ││     │(posted, ref=      │
                      │  │  (if interest)        ││     │'vehicle_installment')│
                      │  │CR Cash/Bank          ││     └────────┬─────────┘
                      │  └──────────────────────┘│              │
                      │                          │              ▼
                      │  ┌──────────────────────┐│     ┌──────────────────┐
                      │  │Vehicle purchase:     ││     │journal_entry_lines│
                      │  │DR 1400 (Vehicles)    ││     └────────┬─────────┘
                      │  │CR 1010 (Cash/down)   ││              │
                      │  │CR 2300 (Loan AP)     ││              ▼
                      │  └──────────────────────┘│     ┌──────────────────┐
                      └──────────────────────────┘     │vehicle_installment│
                                                        │_schedules.       │
                                                        │journal_entry_id  │
                                                        │(update) ✅        │
                                                        └──────────────────┘
```

### 6. تدفق الرواتب

```
┌───────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│Payroll Page   │────▶│usePayrollJournal       │────▶│chart_of_accounts │
│               │     │Integration             │     │(1010,2200,5300, │
└───────────────┘     │                        │     │ 5400)            │
                      │  ┌──────────────────┐ │     └────────┬─────────┘
                      │  │Accrual entry:     │ │              │
                      │  │DR 5300 (Salary)   │ │              ▼
                      │  │DR 5400 (Benefits) │─┼────▶┌──────────────────┐
                      │  │CR 1010 (Cash)     │ │     │journal_entries    │
                      │  │  or CR 2200 (AP)  │ │     │(posted, ref=      │
                      │  └──────────────────┘ │     │'payroll')         │
                      │                        │     └────────┬─────────┘
                      │  ┌──────────────────┐ │              │
                      │  │Payment entry:    │ │              ▼
                      │  │(when status→paid)│ │     ┌──────────────────┐
                      │  │DR 2200 (AP)      │ │     │journal_entry_lines│
                      │  │CR 1010 (Cash)    │ │     └──────────────────┘
                      │  └──────────────────┘ │
                      └────────────────────────┘
```

### 7. خريطة شاملة لتفاعل الوحدات مع الجداول المالية

```
                         ┌─────────────────────────────────────────────┐
                         │           journal_entries                    │
                         │  (reference_type, reference_id)              │
                         └─────┬───────┬───────┬───────┬───────┬────────┘
                               │       │       │       │       │
          ┌──────────────┐     │       │       │       │       │    ┌──────────────┐
          │usePayment     │─────┘       │       │       │       │    │useGeneral     │
          │Operations     │             │       │       │       │    │Ledger (read) │
          └───────┬───────┘             │       │       │       │    └──────────────┘
                  │                     │       │       │       │
          ┌───────▼───────┐    ┌─────────┘  ┌────┘  ┌────┘  ┌────┘
          │useRentalPayment│    │useTraffic │useMain-│useVehicle│usePayroll
          │Journal         │    │Violation  │tenance│Install- │Journal
          │Integration     │    │Journal    │Journal│ment     │Integration
          └───────┬────────┘    │Integration│Integr.│Journal  │
                  │             └───────────┘───────┘─────────┘
                  │
          ┌───────▼───────┐
          │useRentalPayments│ (rental_payment_receipts)
          └───────────────┘

          ┌─────────────────────────────────────────────────────┐
          │                    payments                           │
          └─────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘
                │      │      │      │      │      │      │
     usePayment  useContracts useCustomer useDashboard useEmployee useFinancial
     Operations  Operations   Operations  Stats       Performance  Overview
     (write)     (read)       (read)      (read)      (read)       (read)

          ┌─────────────────────────────────────────────────────┐
          │                    invoices                            │
          └─────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘
                │      │      │      │      │      │      │
     useInvoices useContract useCustomer useDashboard usePayment useLegal
     (CRUD)      Operations   Operations  Stats       Operations  Services
                 (read)       (read)      (read)      (read)      (read)
```

---

## هـ. الفجوات والمخاطر في التكامل

### 1. فجوات الربط العكسي (Missing Linkage Fields)

| الوحدة | جدول المصدر | حقل `journal_entry_id` موجود؟ | الربط عبر `reference_type`/`reference_id`؟ |
|--------|-------------|------|------|
| الدفعات | `payments` | ✅ نعم | ✅ `payment` |
| الفواتير | `invoices` | ✅ نعم | ❌ (يستخدم الفاتورة القيد، وليس العكس) |
| إيصالات الإيجار | `rental_payment_receipts` | ❌ **لا** | ✅ `rental_payment` |
| المخالفات المرورية | `traffic_violations` | ❌ **لا** | ✅ `traffic_violation` |
| الصيانة | `maintenance` | ❌ **لا** | ✅ `maintenance` |
| أقساط المركبات | `vehicle_installment_schedules` | ✅ نعم | ✅ `vehicle_installment` |
| الرواتب | `payroll` | ❌ **لا** | ✅ `payroll` / `payroll_payment` |
| شراء مركبة | `vehicles` | ❌ **لا** | ✅ `vehicle_purchase` |

> 🔴 **خطر:** بدون حقل `journal_entry_id` في جداول المصدر، لا يمكن التحقق من وجود قيد محاسبي من جهة المصدر — يجب البحث في `journal_entries` بـ `reference_type` و `reference_id` في كل مرة، مما يبطئ الأداء ويزيد خطر التكرار.

### 2. مخاطر التكرار وعدم الذرية

- **توليد رقم القيد:** كل خطاف تكامل يولّد `entry_number` بشكل مستقل بالبحث عن آخر قيد وزيادة رقمه — هذا سباق (race condition) قد ينتج أرقاماً مكررة عند التزامن
- **عدم استخدام المعاملات (transactions):** لا توجد معاملات Supabase تلفّ إنشاء القيد وبنوده في عملية واحدة ذرية — إذا فشل إنشاء البنود، يُحذف القيد يدوياً (rollback يدوي)
- **اعتماد الـ RPC:** `ensure_payment_journal_entry` و `cancel_payment_with_reversal` قد لا تكون منشورة في قاعدة البيانات — الـ fallback يتم بصمت وقد ينتج ازدواجية

### 3. فجوات محاسبية

| # | الفجوة | الوحدة | الأثر |
|---|--------|--------|-------|
| 1 | **عدم تمرير `total_debit` / `total_credit`** | كل خطافات التكامل ما عدا `useRentalPaymentJournalIntegration` و `usePaymentOperations` | القيد في قاعدة البيانات قد يكون `total_debit=0` و `total_credit=0` رغم وجود بنود |
| 2 | **الخصومات في الرواتب لا تُسجّل** | `usePayrollJournalIntegration` | الخصومات تُطرح من صافي الراتب لكن لا يوجد بند دائن للخصومات — **القيد غير متوازن** |
| 3 | **منطق قيد أقساط المركبات** | `useVehicleInstallmentJournalIntegration` | دفع القسط يُسجّل كمدين على "الإيرادات" بدلاً من "ذمم المورد" — يقلل الإيراد بدلاً من تسديد الالتزام |
| 4 | **الاعتراف بالإيراد عند التحصيل** | `useRentalPaymentJournalIntegration` | الإيراد يُعترف به عند استلام الدفعة وليس عند الاستحقاق — غير متوافق مع أساس الاستحقاق |
| 5 | **الحذف المباشر بدلاً من قيد العكس** | كل خطافات التكامل ما عدا `usePaymentOperations` | حذف القيد يؤثر على الأرصدة التاريخية ويفقد التتبع المحاسبي |
| 6 | **عدم التحقق من توازن القيد قبل الإدراج** | `useMaintenanceJournalIntegration`, `useTrafficViolationJournalIntegration`, `usePayrollJournalIntegration` | قد يُنشأ قيد غير متوازن |
| 7 | **معالجة أخطاء صامتة** | `useMaintenanceJournalIntegration`, `useTrafficViolationJournalIntegration` | `console.error` فقط — لا يُعلم المستخدم بفشل إنشاء القيد |

### 4. مخاطر أمنية وصلاحيات

- **فصل المهام (Segregation of Duties):** `usePaymentOperations` و `useJournalEntries` يطبّقان فصل المهام (منشئ القيد لا يرحّله)، لكن `useMaintenanceJournalIntegration` و `useTrafficViolationJournalIntegration` و `usePayrollJournalIntegration` و `useVehicleInstallmentJournalIntegration` **تُنشئ القيود بحالة `posted` مباشرة** دون فصل مهام أو مراجعة
- **التحقق من الفترة المحاسبية:** `usePaymentOperations` و `useJournalEntries` يستدعيان `assertFinancialPeriodOpen` قبل إنشاء القيد، لكن كل خطافات التكامل الأخرى **لا تتحقق من الفترة المحاسبية** — قد تُنشأ قيود في فترة مغلقة
- **صلاحيات المالية:** `usePaymentOperations` و `useJournalEntries` و `useInvoices` يستخدمون `useFinanceAccessGuard`، لكن خطافات التكامل الأخرى لا تتحقق من الصلاحيات المالية

### 5. فجوات بنيوية

| # | الفجوة | الأثر |
|---|--------|-------|
| 1 | **جدول `rental_payment_receipts` منفصل عن `payments`** | إيصالات الإيجار لا تظهر في تقارير الدفعات العامة، ولا ترتبط بالفواتير أو البنوك |
| 2 | **عدم وجود جدول `deposits`** | رغم ذكره في المهمة، لا يوجد جدول `deposits` في `types.ts` — الإيداعات قد تكون مدمجة في `bank_transactions` |
| 3 | **عدم وجود `approved_by`/`approved_at` في `payments`** | `usePaymentOperations` يحاول كتابة هذه الحقول لكنها غير موجودة في المخطط |
| 4 | **`cancelled_at`/`cancelled_by` غير موجودة في `payments`** | يتم استخدام `processing_notes` لتسجيل بيانات الإلغاء بدلاً من حقول مخصصة |
| 5 | **غرامة التأخير hardcoded** | `DELAY_FINE_PER_DAY = 120` و `MAX_FINE_PER_MONTH = 3000` في `useRentalPayments.ts` — غير قابلة للتكوين من قاعدة البيانات |
| 6 | **اكتشاف القيود المكررة غير مضمون** | كل خطاف تكامل يتحقق بطريقته الخاصة (أو لا يتحقق) — لا يوجد قيد فريد في قاعدة البيانات على `(reference_type, reference_id)` |
| 7 | **تعدد أنظمة الدفع** | `payments` (النظام الرئيسي) و `rental_payment_receipts` (إيصالات الإيجار) و `traffic_violation_payments` (مدفوعات المخالفات) — أنظمة منفصلة بدون تكامل مالي موحد |

### 6. مخاطر الأداء

- **توليد رقم القيد بالبحث عن آخر قيد:** كل عملية إنشاء قيد تتطلب استعلام `ORDER BY entry_number DESC LIMIT 1` — يتباطأ مع نمو البيانات
- **الكشف التكراري للدفعات:** `usePaymentOperations` يقوم بـ 3-5 استعلامات منفصلة للكشف التكراري قبل الإدراج
- **إعادة حساب الفواتير بعد الإلغاء:** يجلب كل الدفعات النشطة للفاتورة ويعيد التجميع — قد يبطئ مع كثرة الدفعات

---

## ملخص التوصيات (بدون تعديلات كود)

1. **إضافة حقل `journal_entry_id`** لكل جداول المصدر (`rental_payment_receipts`, `traffic_violations`, `maintenance`, `payroll`, `vehicles`)
2. **إنشاء قيد فريد (unique constraint)** على `journal_entries(company_id, reference_type, reference_id)` لمنع التكرار
3. **استخدام Supabase transactions / RPC موحد** لإنشاء القيود ذرياً
4. **توحيد نظام الدفعات** — دمج `rental_payment_receipts` في `payments` أو إنشاء طبقة تجريد
5. **إضافة حقول `approved_by`, `approved_at`, `cancelled_at`, `cancelled_by`** لجدول `payments`
6. **مراجعة المنطق المحاسبي** لقيد أقساط المركبات (مدين إيرادات بدلاً من ذمم المورد) وخصومات الرواتب (قيد غير متوازن)
7. **تطبيق فصل المهام والتحقق من الفترة المحاسبية** على كل خطافات التكامل، وليس فقط على الدفعات والقيود اليدوية
8. **استبدال الحذف المباشر بقيد عكس** في كل خطافات التكامل
9. **تمرير `total_debit` و `total_credit`** عند إنشاء كل قيد
10. **جعل غرامات التأخير قابلة للتكوين** من قاعدة البيانات بدلاً من hardcoded values

---

*تم إعداد هذا التقرير بقراءة مباشرة للكود المصدري — بدون أي تعديلات على الملفات.*