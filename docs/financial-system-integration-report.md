# تقرير تكامل النظام المالي مع الوحدات الأخرى - Fleetify

**تاريخ التقرير:** 5 يوليو 2026  
**النطاق:** تحليل شامل لتكامل النظام المالي مع جميع وحدات النظام  
**ملاحظة:** هذا تقرير تحليلي فقط - لا يتضمن أي تغييرات في الكود

---

## فهرس المحتويات

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [هندسة النظام المالي](#2-هندسة-النظام-المالي)
3. [تكامل العقود (Contracts)](#3-تكامل-العقود-contracts)
4. [تكامل الأسطول (Fleet)](#4-تكامل-الأسطول-fleet)
5. [تكامل الموارد البشرية والرواتب (HR/Payroll)](#5-تكامل-الموارد-البشرية-والرواتب-hrpayroll)
6. [تكامل المخزون والمشتريات (Inventory/Purchasing)](#6-تكامل-المخزون-والمشتريات-inventorypurchasing)
7. [تكامل العملاء والفواتير (Customers/Invoicing)](#7-تكامل-العملاء-والفواتير-customersinvoicing)
8. [تكامل العقارات (Properties)](#8-تكامل-العقارات-properties)
9. [تكامل النظام القانوني (Legal)](#9-تكامل-النظام-القانوني-legal)
10. [تكامل المدفوعات والتحصيل (Payments)](#10-تكامل-المدفوعات-والتحصيل-payments)
11. [نظام الموافقات والرقابة الداخلية](#11-نظام-الموافقات-والرقابة-الداخلية)
12. [التقارير المالية والتحليلات](#12-التقارير-المالية-والتحليلات)
13. [نقاط القوة](#13-نقاط-القوة)
14. [الفجوات والمشاكل](#14-الفجوات-والمشاكل)
15. [التوصيات](#15-التوصيات)

---

## 1. ملخص تنفيذي

النظام المالي في Fleetify هو نظام محاسبي متكامل (مزدوج القيد) مبني على Supabase مع واجهة React. يتكون من **208 ملف TypeScript/React** (+353 ملف SQL للهجرة) موزعة على:

- **دليل الحسابات (Chart of Accounts):** هيكل هرمي متعدد المستويات مع أنواع حسابات (أصول، خصوم، حقوق ملكية، إيرادات، مصروفات)
- **القيود اليومية (Journal Entries):** نظام متكامل مع دورة حياة كاملة (مسودة → مراجعة → اعتماد → ترحيل → عكس)
- **الفواتير (Invoices):** أنواع متعددة (مبيعات، مشتريات، خدمات) مع ربط بالقيود
- **المدفوعات (Payments):** تحصيل ودفع مع ربط تلقائي بالقيود
- **التقارير المالية:** ميزانية عمومية، قائمة دخل، تدفقات نقدية، تقارير العملاء/الموردين

**مستوى التكامل العام: قوي مع وجود فجوات محددة**

النظام المالي متكامل بشكل جيد مع معظم الوحدات التشغيلية عبر:
1. **ربط مباشر عبر reference_type/reference_id** في جدول journal_entries
2. **دوال PL/pgSQL (SECURITY DEFINER)** لإنشاء القيود تلقائياً
3. **Account Mappings** لربط أنواع الحسابات الافتراضية بالحسابات الفعلية
4. **Hooks React** تستخدم Supabase queries مباشرة من الواجهة

---

## 2. هندسة النظام المالي

### 2.1 طبقات النظام

```
واجهة المستخدم (React Components)
    ↓
Hooks Layer (React Query + Supabase Client)
    ↓
خدمات التحكم المالي (financialControls.ts)
    ↓
قواعد الصلاحيات (financeAccessRules.ts)
    ↓
طبقة API (Supabase RPCs + Direct Queries)
    ↓
قاعدة البيانات (PostgreSQL + Triggers)
```

### 2.2 الجداول الأساسية

| الجدول | الوصف | حجم التكامل |
|--------|-------|-------------|
| `chart_of_accounts` | دليل الحسابات | أساسي |
| `journal_entries` | القيود اليومية | مركزي |
| `journal_entry_lines` | بنود القيود | مركزي |
| `account_mappings` | ربط أنواع الحسابات | وسيط |
| `default_account_types` | أنواع الحسابات الافتراضية | وسيط |
| `accounting_periods` | الفترات المحاسبية | أساسي |
| `customer_accounts` | حسابات العملاء | تكامل |
| `customer_balances` | أرصدة العملاء | تكامل |
| `customer_aging_analysis` | تحليل أعمار العملاء | تكامل |
| `budgets` | الميزانيات | مستقل |
| `cost_centers` | مراكز التكلفة | تكامل |

### 2.3 دورة حياة القيد المحاسبي

```
مسودة (draft) → قيد المراجعة (under_review) → معتمد (approved) → مرحل (posted) → معكوس (reversed)
                                                                    ↓
                                                               ملغي (cancelled)
```

الانتقالات محكومة بدالة `change_journal_entry_status()` مع التحقق من صحة الانتقالات.

### 2.4 ملفات النظام المالي الرئيسية

| الملف | الوظيفة |
|-------|---------|
| `src/types/finance.types.ts` | أنواع البيانات المالية (531 سطر) |
| `src/hooks/useFinance.ts` | hooks رئيسية (1301 سطر) |
| `src/hooks/finance/useJournalEntries.ts` | إدارة القيود اليومية |
| `src/hooks/finance/useInvoices.ts` | إدارة الفواتير |
| `src/hooks/business/usePaymentOperations.ts` | عمليات الدفع المتقدمة (1659 سطر) |
| `src/services/financialControls.ts` | التحقق من الفترات المالية المغلقة |
| `src/utils/financeAccessRules.ts` | مصفوفة الصلاحيات المالية (563 سطر) |
| `src/utils/financialApprovalWorkflowRules.ts` | قواعد الموافقات المالية |
| `src/contexts/FinanceContext.tsx` | سياق التطبيق المالي |

---

## 3. تكامل العقود (Contracts)

### 3.1 آلية التكامل

**المستوى: متكامل بالكامل مع وجود آليتين منفصلتين**

#### المسار A: دالة قاعدة البيانات (RPC)
- الملف: `supabase/migrations/20250829220000_fix_contract_journal_creation.sql`
- الدالة: `create_contract_with_journal_entry()`
- **آلية العمل:**
  1. تنشئ العقد بحالة `draft`
  2. تبحث عن حسابات `RECEIVABLES` و `RENTAL_REVENUE`/`REVENUE` من `account_mappings`
  3. إذا وُجدت الحسابات → تنشئ قيداً محاسبياً (مدين: ذمم عملاء، دائن: إيرادات) بحالة `posted`
  4. تحدّث العقد إلى `active` وتربط `journal_entry_id`
  5. إذا لم توجد الحسابات → تترك العقد `draft` مع تحذير `requires_manual_entry`

#### المسار B: الواجهة الأمامية (Fallback)
- الملف: `src/utils/contractJournalEntry.ts` (580 سطر)
- الدالة: `createContractJournalEntryManual()`
- **آلية العمل:**
  1. تستدعي `ensureEssentialAccountMappings()` لإنشاء الحسابات المفقودة تلقائياً
  2. تنشئ حسابات (ذمم عملاء، إيرادات تأجير، إيرادات عامة) إذا لم تكن موجودة
  3. تنشئ القيد المحاسبي من الواجهة

#### المسار C: Hook متقدم
- الملف: `src/hooks/useContractCreation.ts` (786 سطر)
- **آلية العمل:**
  1. 6 خطوات مع تتبع الحالة: تحقق → فحص حسابات → إنشاء → تفعيل → تحقق من القيد → إتمام
  2. يستخدم `useEssentialAccountMappings()` للتحقق من وجود الحسابات
  3. يسجل كل خطوة عبر `log_contract_creation_step` RPC
  4. يدعم إعادة المحاولة (retry) عند الفشل

### 3.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `contracts.journal_entry_id` → `journal_entries.id` | قاعدة البيانات | ✅ موجود |
| `journal_entries.reference_type = 'contract'` | قاعدة البيانات | ✅ موجود |
| `journal_entries.reference_id = contracts.id` | قاعدة البيانات | ✅ موجود |
| `contracts.account_id` → `chart_of_accounts.id` | قاعدة البيانات | ✅ موجود |
| `FinancialDashboard` في العقود | `src/components/contracts/FinancialDashboard.tsx` | ✅ موجود |
| `PropertyAccountingIntegration` | `src/components/property/PropertyAccountingIntegration.tsx` | ✅ موجود |

### 3.3 المشاكل المعروفة

1. **ازدواجية المسار:** وجود مسارين (RPC و Frontend) لإنشاء القيد يؤدي إلى احتمالية عدم الاتساق
2. **الترحيل المباشر:** القيد ينشأ بحالة `posted` مباشرة دون المرور بدورة الموافقات
3. **حالة `draft` للعقد:** إذا فشل إنشاء القيد، يبقى العقد `draft` ولا يتم تفعيله

---

## 4. تكامل الأسطول (Fleet)

### 4.1 آلية التكامل

**المستوى: متوسط - تحليلي بشكل أساسي**

- الملف: `src/hooks/useFleetFinancialAnalytics.ts` (517 سطر)
- **آلية العمل:**
  1. `useFleetFinancialOverview()`: تجلب المركبات النشطة + إيرادات العقود لكل مركبة
  2. تحسب: القيمة الدفترية، صافي الربح، العائد على الاستثمار (ROI)
  3. `useMaintenanceFinancialData()`: تجلب تكاليف الصيانة لكل مركبة مع `journal_entry_id`
  4. `useValidateDepreciationData()`: تتحقق من بيانات الاستهلاك قبل إنشاء القيود

### 4.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `vehicles.purchase_cost` → حساب الأصول الثابتة | غير مباشر | ⚠️ غير مباشر |
| `vehicles.accumulated_depreciation` | قاعدة البيانات | ✅ موجود |
| `vehicle_maintenance.journal_entry_id` | قاعدة البيانات | ✅ موجود |
| `vehicles.cost_center_id` → `cost_centers.id` | قاعدة البيانات | ✅ موجود |
| إيرادات المركبات من `contracts.total_paid` | تحليلي | ✅ موجود |

### 4.3 المشاكل المعروفة

1. **لا يوجد ربط مباشر للأصول الثابتة:** لا يوجد ربط بين `vehicles` وحساب الأصول الثابتة في `chart_of_accounts`
2. **الاستهلاك:** `useValidateDepreciationData()` يتحقق فقط من البيانات ولا ينشئ قيود الاستهلاك تلقائياً
3. **تكاليف الوقود:** حقل `total_fuel_cost` في `FleetFinancialData` مضبوط على `0` دائماً (لا توجد بيانات وقود)
4. **حساب الإيرادات:** يستخدم `contracts.total_paid` بدلاً من القيود المحاسبية الفعلية

---

## 5. تكامل الموارد البشرية والرواتب (HR/Payroll)

### 5.1 آلية التكامل

**المستوى: متكامل مع تتبع الحالة**

- الملفات:
  - `src/hooks/usePayrollFinancialAnalysis.ts` (198 سطر)
  - `src/components/finance/PayrollIntegrationCard.tsx` (191 سطر)

- **آلية العمل:**
  1. `usePayrollFinancialAnalysis()`: تجلب بيانات الرواتب من `payroll_financial_analysis` (view)
  2. `usePayrollSummary()`: تحسب إحصائيات التكامل (عدد المدمج، المعلق، الخطأ)
  3. `usePayrollIntegrationStatus()`: تعرض حالة التكامل مع إمكانية إعادة المعالجة
  4. `PayrollIntegrationCard`: واجهة مستخدم تعرض:
     - عدد الرواتب المدمجة مع المحاسبة
     - معدل التكامل (%)
     - إنذارات للأخطاء
     - روابط لصفحة إدارة الرواتب

### 5.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `payroll_financial_analysis.journal_entry_id` | قاعدة البيانات | ✅ موجود |
| `payroll_financial_analysis.integration_status` | قاعدة البيانات | ✅ موجود |
| `PayrollIntegrationCard` في واجهة المالية | `src/components/finance/` | ✅ موجود |
| رابط إلى `/hr/payroll` | `PayrollIntegrationCard.tsx` | ✅ موجود |

### 5.3 المشاكل المعروفة

1. **لا يوجد trigger تلقائي:** لا يوجد trigger على جدول `payroll` ينشئ القيد المحاسبي تلقائياً
2. **الاعتماد على view:** `payroll_financial_analysis` هو view قد لا يكون محدثاً في الوقت الفعلي
3. **لا يوجد ربط بحسابات المصروفات:** لا توجد آلية واضحة لربط بنود الراتب (راتب أساسي، بدلات، خصومات) بحسابات مصروفات محددة

---

## 6. تكامل المخزون والمشتريات (Inventory/Purchasing)

### 6.1 آلية التكامل

**المستوى: متكامل مع إنشاء قيود تلقائي**

- الملفات:
  - `src/hooks/integrations/useInventoryPurchaseOrders.ts` (551 سطر)
  - `src/hooks/integrations/usePurchaseOrderFinancialIntegration.ts` (551 سطر)

- **آلية العمل:**
  1. `usePurchaseAccountMappings()`: تجلب حسابات المشتريات والمخزون والذمم الدائنة
  2. `useCreatePOReceiptJournalEntry()`: تنشئ قيداً محاسبياً عند استلام أمر الشراء:
     - مدين: حساب المشتريات/المخزون
     - دائن: حساب الذمم الدائنة
  3. `createPOJournalEntryInternal()`: دالة مساعدة داخلية لإنشاء القيد
  4. `useCreatePOFromLowStock()`: تنشئ أمر شراء تلقائي من المخزون المنخفض

### 6.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `purchase_orders` → `journal_entries` (reference_type='PURCHASE_ORDER') | قاعدة البيانات | ✅ موجود |
| `account_mappings` للمشتريات والمخزون | قاعدة البيانات | ✅ موجود |
| Fallback برمز الحساب (51xxx للمشتريات، 21xxx للذمم) | الكود | ✅ موجود |
| التحقق من وجود قيد مسبق (منع التكرار) | الكود | ✅ موجود |

### 6.3 المشاكل المعروفة

1. **ازدواجية الكود:** `createPOJournalEntryInternal()` في `useInventoryPurchaseOrders.ts` و `useCreatePOReceiptJournalEntry()` في `usePurchaseOrderFinancialIntegration.ts` يؤديان نفس الوظيفة
2. **الترحيل المباشر:** القيد ينشأ بحالة `posted` دون مراجعة
3. **لا يوجد ربط بدفعات الموردين:** لا توجد آلية لربط دفعات الموردين بأوامر الشراء

---

## 7. تكامل العملاء والفواتير (Customers/Invoicing)

### 7.1 آلية التكامل

**المستوى: متكامل بالكامل مع طبقات متعددة**

- الملفات:
  - `src/hooks/finance/useInvoices.ts` (507 سطر)
  - `src/hooks/useCustomerFinancialSummary.ts` (110 سطر)
  - `src/hooks/useEnhancedCustomerFinancials.ts` (288 سطر)
  - `src/hooks/useEnhancedFinancialReports.ts` (808 سطر)

- **آلية العمل:**
  1. **الفواتير:** `useInvoices()` تجلب الفواتير مع ربط العملاء والعقود والمركبات
  2. **الملخص المالي للعميل:** `useCustomerFinancialSummary()` تحسب:
     - إجمالي الفواتير والمدفوعات
     - المبالغ المتأخرة وأيام التأخير
     - الحد الائتماني والمتاح
  3. **تحليل الأعمار:** `useCustomerAgingAnalysis()` مع RPC `update_customer_aging_analysis`
  4. **كشف حساب:** `useCustomerStatementData()` مع RPC `generate_customer_statement_data`

### 7.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `invoices.customer_id` → `customers.id` | قاعدة البيانات | ✅ موجود |
| `invoices.contract_id` → `contracts.id` | قاعدة البيانات | ✅ موجود |
| `invoices.journal_entry_id` → `journal_entries.id` | قاعدة البيانات | ✅ موجود |
| `customer_accounts` لربط العملاء بالحسابات | قاعدة البيانات | ✅ موجود |
| `customer_balances` للأرصدة | قاعدة البيانات | ✅ موجود |
| `customer_aging_analysis` لتحليل الأعمار | قاعدة البيانات | ✅ موجود |
| Trigger تلقائي للفواتير (`create_invoice_journal_entry`) | SQL | ✅ موجود |

### 7.3 المشاكل المعروفة

1. **ازدواجية hooks:** يوجد `useCustomerFinancialSummary` في ملفين مختلفين (`useCustomerFinancialSummary.ts` و `useEnhancedCustomerFinancials.ts`)
2. **تحليل الأعمار:** حقول `aging_30_days`، `aging_60_days`، `aging_90_days` مضبوطة على `0` دائماً في `useEnhancedCustomerFinancials.ts`
3. **الحد الائتماني:** `credit_limit` يُقرأ من `customers.credit_limit` ولكن لا يوجد ربط بجدول `customer_balances`

---

## 8. تكامل العقارات (Properties)

### 8.1 آلية التكامل

**المستوى: متكامل مع واجهة عرض**

- الملف: `src/components/property/PropertyAccountingIntegration.tsx` (256 سطر)

- **آلية العمل:**
  1. مكون عرض يظهر التكامل المحاسبي للعقود والدفعات العقارية
  2. يعرض:
     - تفاصيل الدفعة (المبلغ، التاريخ)
     - حالة القيد المحاسبي (منشور/مسودة/غير منشئ)
     - بنود القيد مع الحسابات
  3. زر لعرض القيد المحاسبي

### 8.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `property_payments.journal_entry_id` | قاعدة البيانات | ✅ موجود |
| عرض التكامل المحاسبي | `PropertyAccountingIntegration.tsx` | ✅ موجود |
| `useFinancialOverview()` يشمل العقارات | `useFinancialOverview.ts` | ✅ موجود |

### 8.3 المشاكل المعروفة

1. **لا يوجد إنشاء تلقائي للقيود:** لا يوجد trigger أو RPC لإنشاء قيود للدفعات العقارية
2. **مكون عرض فقط:** `PropertyAccountingIntegration` يعرض فقط ولا ينشئ القيود

---

## 9. تكامل النظام القانوني (Legal)

### 9.1 آلية التكامل

**المستوى: محدود - تحليلي بشكل أساسي**

- الملفات:
  - `src/pages/legal/FinancialDelinquency.tsx` (1025 سطر)
  - `src/pages/legal/financial-delinquency/` (مجلد كامل)

- **آلية العمل:**
  1. `FinancialDelinquency`: يعرض العملاء المتعثرين مع:
     - الإيجارات المتأخرة
     - الغرامات المتأخرة
     - المخالفات المرورية
     - إجمالي المطالبة
  2. يستخدم `calculateDelinquencyAmounts()` لحساب المبالغ
  3. `ConvertToLegalDialog`: يحول العقود المتعثرة إلى قضايا قانونية

### 9.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `legal_cases.contract_id` → `contracts.id` | قاعدة البيانات | ✅ موجود |
| عرض المبالغ المالية المتعثرة | `FinancialDelinquency.tsx` | ✅ موجود |
| `legal_cases.case_value` (قيمة القضية) | قاعدة البيانات | ✅ موجود |

### 9.3 المشاكل المعروفة

1. **لا يوجد ربط محاسبي للقضايا:** لا توجد آلية لإنشاء قيود محاسبية للشكوك في التحصيل أو مخصصات الديون المشكوك فيها
2. **حساب المبالغ يدوي:** `calculateDelinquencyAmounts()` يحسب المبالغ من العقود مباشرة بدلاً من الأرصدة المحاسبية
3. **لا يوجد تكامل مع مخصصات الديون:** لا توجد مخصصات محاسبية للديون المشكوك في تحصيلها

---

## 10. تكامل المدفوعات والتحصيل (Payments)

### 10.1 آلية التكامل

**المستوى: متكامل بالكامل مع طبقات متعددة**

- الملفات:
  - `src/hooks/business/usePaymentOperations.ts` (1659 سطر)
  - `src/hooks/finance/usePaymentValidation.ts` (246 سطر)
  - `src/services/financialControls.ts`

- **آلية العمل:**
  1. **إنشاء الدفعة:** `usePaymentOperations()` مع:
     - التحقق من الصلاحيات (`finance.payment.create`)
     - التحقق من الفترة المالية المفتوحة (`assertFinancialPeriodOpen`)
     - منع التكرار (idempotency key + duplicate detection)
     - إنشاء القيد المحاسبي تلقائياً (`createJournalEntry`)
     - تحديث رصيد البنك (`createBankTransactionFromPayment`)
  2. **التحقق من المبلغ:** `usePaymentValidation()` مع:
     - التحقق من الحد الأقصى (10× المبلغ الشهري)
     - التحقق من الدفع الزائد (10% buffer)
     - تحذير عند اختلاف المبلغ عن الفاتورة
  3. **Trigger تلقائي:** `create_payment_journal_entry()` في SQL

### 10.2 نقاط التكامل

| نقطة التكامل | الموقع | الحالة |
|-------------|--------|--------|
| `payments.journal_entry_id` | قاعدة البيانات | ✅ موجود |
| `payments.invoice_id` → `invoices.id` | قاعدة البيانات | ✅ موجود |
| `payments.contract_id` → `contracts.id` | قاعدة البيانات | ✅ موجود |
| `payments.customer_id` → `customers.id` | قاعدة البيانات | ✅ موجود |
| Trigger تلقائي للدفعات | SQL | ✅ موجود |
| Idempotency (منع التكرار) | `usePaymentOperations.ts` | ✅ موجود |
| التحقق من الفترة المالية | `financialControls.ts` | ✅ موجود |
| تحديث رصيد البنك | `bankTransactionHelper.ts` | ✅ موجود |

### 10.3 المشاكل المعروفة

1. **ازدواجية إنشاء القيد:** يوجد مساران لإنشاء قيد الدفعة: (أ) trigger في SQL و (ب) `createJournalEntry()` في `usePaymentOperations.ts` - قد يؤدي إلى قيد مكرر
2. **Idempotency key:** `payments` لا يحتوي على عمود `idempotency_key` - يستخدم `reference_number` كبديل
3. **حجم الملف:** `usePaymentOperations.ts` (1659 سطر) كبير جداً ويحتاج إلى إعادة هيكلة

---

## 11. نظام الموافقات والرقابة الداخلية

### 11.1 مصفوفة الصلاحيات المالية

- الملف: `src/utils/financeAccessRules.ts` (563 سطر)
- **29 صلاحية مالية** محددة بدقة:
  - الفواتير: إنشاء، تعديل (مبلغ/تاريخ/عميل)، إلغاء
  - المدفوعات: إنشاء، تعديل (مبلغ/تاريخ/بنك)، إلغاء، مطابقة
  - القيود: إنشاء مسودة، تقديم للمراجعة، مراجعة، اعتماد، ترحيل، عكس، إلغاء
  - الفترات: إغلاق، إعادة فتح
  - البنك: استيراد كشف، مطابقة
  - الميزانية: تجاوز، اعتماد
  - المراجعة: عرض، تصدير

### 11.2 فصل المهام (Segregation of Duties)

- الملف: `src/utils/financeAccessRules.ts`
- **آلية العمل:**
  1. `evaluateSegregationOfDuties()`: تتحقق من أن منشئ القيد ليس هو نفسه من يرحله
  2. `checkSegregationOfDuties()` في `useFinanceAccessGuard.ts`
  3. `usePostJournalEntry()`: تطبق فصل المهام قبل الترحيل
  4. صلاحية خاصة `finance.payment.cancel_own` لتجاوز فصل المهام (للمدير فقط)

### 11.3 نظام الموافقات

- الملفات:
  - `src/utils/financialApprovalWorkflowRules.ts` (140 سطر)
  - `src/components/finance/FinancialApprovalsPanel.tsx` (222 سطر)

- **آلية العمل:**
  1. `resolveFinancialApprovalWorkflow()`: تحدد سياسة الموافقة بناءً على:
     - نوع الإجراء (إلغاء فاتورة، إلغاء دفعة، ترحيل قيد، إعادة فتح فترة، تجاوز ميزانية)
     - المبلغ
     - الفرع
     - العملة
  2. `canActorApproveFinancialStep()`: تتحقق من أهلية المعتمد:
     - لا يمكن للمنشئ الموافقة
     - لا يمكن الموافقة المكررة
     - التحقق من الدور والفرع
  3. `FinancialApprovalsPanel`: واجهة عرض طلبات الموافقة المالية

### 11.4 نقاط القوة

1. **مصفوفة صلاحيات شاملة:** 29 صلاحية مالية محددة بمستويات المخاطرة
2. **فصل المهام:** مطبق في `usePostJournalEntry()` مع إمكانية التجاوز للمدير
3. **سياسات الموافقة:** دعم متعدد المستويات مع التحقق من الأهلية
4. **سجل التغييرات:** `journal_entry_status_history` يسجل كل تغيير في حالة القيد

### 11.5 المشاكل المعروفة

1. **عدم تطبيق فصل المهام في كل مكان:** `usePostJournalEntry()` فقط يطبق فصل المهام - باقي العمليات لا تطبقه
2. **الموافقات غير مربوطة بالقيود:** `FinancialApprovalsPanel` يعرض طلبات الموافقة ولكن لا يوجد ربط مباشر بين الموافقة وإنشاء القيد
3. **`canActorApproveFinancialStep` غير موصول:** الدالة موجودة ولكن لا توجد واجهة تستخدمها حالياً

---

## 12. التقارير المالية والتحليلات

### 12.1 التقارير الأساسية

| التقرير | الملف | المصدر |
|---------|-------|--------|
| الميزانية العمومية | `BalanceSheetReport.tsx` | `chart_of_accounts.current_balance` |
| قائمة الدخل | `IncomeStatementReport.tsx` | `journal_entry_lines` |
| التدفقات النقدية | `CashFlowStatementReport.tsx` | `journal_entries` + `reference_type` |
| تقارير العملاء | `ARAgingReport.tsx` | `invoices` + `payments` |
| تقارير الموردين | `PayablesReport.tsx` | `invoices` (purchase) |
| ميزانية التكاليف | `CostCenterReports.tsx` | `cost_centers` + `journal_entry_lines` |
| النسب المالية | `AdvancedFinancialRatios.tsx` | `chart_of_accounts` |
| تحليل AI | `useFinancialAIAnalysis.ts` | Edge Function + OpenAI |

### 12.2 التقارير المتقدمة

| التقرير | الملف | الوصف |
|---------|-------|-------|
| `useEnhancedFinancialReports.ts` | 808 سطر | تقارير محسّنة مع تصنيف التدفقات النقدية |
| `useAdvancedFinancialAnalytics.ts` | 335 سطر | تحليل متقدم مع مراكز التكلفة والصحة المالية |
| `useFinancialOverview.ts` | 396 سطر | نظرة عامة مالية مع إيرادات/مصروفات |
| `useFinancialAnalysis.ts` | 612 سطر | تحليل مالي شامل مع مقارنة سنوية |
| `useFinancialSystemAnalysis.ts` | 321 سطر | تحليل شامل للنظام المالي |

### 12.3 نقاط القوة

1. **تقارير متعددة:** تغطي جميع القوائم المالية الأساسية
2. **بيانات حية:** معظم التقارير تستخدم Supabase queries مباشرة
3. **تحليل AI:** Edge Function مع OpenAI لتحليل متقدم
4. **مقارنات تاريخية:** `useFinancialAnalysis.ts` يقارن السنة الحالية بالسابقة

### 12.4 المشاكل المعروفة

1. **ازدواجية التقارير:** يوجد تقارير متعددة تؤدي نفس الوظيفة (مثلاً `BalanceSheetReport.tsx` و `reports/BalanceSheet.tsx`)
2. **قيم افتراضية:** `useFinancialOverview.ts` يستخدم قيماً افتراضية لـ `currentRatio` (1.2) و `quickRatio` (1.0) بدلاً من حسابها
3. **تحليل AI غير موثوق:** `extractRecommendations()` و `extractUrgentActions()` في Edge Function تعتمد على كلمات مفتاحية بسيطة
4. **حساب التدفقات النقدية:** `useFinancialAnalysis.ts` يصنف التدفقات بناءً على `reference_type` فقط (invoice/payment/fixed_asset/loan/equity) وهو تصنيف محدود

---

## 13. نقاط القوة

### 13.1 معماري
1. **نظام محاسبي متكامل (مزدوج القيد):** جميع العمليات المالية تؤدي إلى قيود محاسبية
2. **Account Mappings:** نظام مرن لربط أنواع الحسابات الافتراضية بالحسابات الفعلية لكل شركة
3. **دورة حياة كاملة للقيد:** من مسودة إلى ترحيل مع سجل تغييرات
4. **فصل المهام:** مطبق في العمليات الحرجة مع إمكانية التجاوز
5. **منع التكرار:** Idempotency keys + duplicate detection في المدفوعات

### 13.2 تكاملي
1. **ربط موحد:** جميع الجداول المالية تستخدم `company_id` للعزل بين الشركات
2. **Triggers تلقائية:** إنشاء قيود تلقائي للمدفوعات والفواتير
3. **RPCs متعددة:** دوال قاعدة بيانات لإنشاء القيود من العقود وأوامر الشراء
4. **Hooks متخصصة:** hooks منفصلة لكل وحدة (Payroll, Fleet, Inventory, Contracts)

### 13.3 رقابي
1. **مصفوفة صلاحيات شاملة:** 29 صلاحية مالية محددة
2. **سياسات موافقة:** دعم متعدد المستويات مع التحقق من الأهلية
3. **سجل تدقيق:** `journal_entry_status_history` + `audit_logs`
4. **التحقق من الفترات:** `assertFinancialPeriodOpen()` يمنع العمليات في الفترات المغلقة

---

## 14. الفجوات والمشاكل

### 14.1 حرجة
| # | المشكلة | الموقع | التأثير |
|---|---------|--------|---------|
| 1 | **ازدواجية إنشاء القيود:** Trigger في SQL + كود في الواجهة لنفس العملية | `create_payment_journal_entry()` trigger + `createJournalEntry()` في `usePaymentOperations.ts` | قيود مكررة محتملة |
| 2 | **عدم تطبيق فصل المهام في كل مكان:** فقط `usePostJournalEntry()` يطبق فصل المهام | باقي العمليات المالية | مخاطرة أمنية |
| 3 | **`canActorApproveFinancialStep` غير موصول:** الدالة موجودة ولكن غير مستخدمة | `financialApprovalWorkflowRules.ts` | نظام الموافقات غير مكتمل |

### 14.2 متوسطة
| # | المشكلة | الموقع | التأثير |
|---|---------|--------|---------|
| 4 | **ازدواجية الكود:** `createPOJournalEntryInternal()` و `useCreatePOReceiptJournalEntry()` يؤديان نفس الوظيفة | `useInventoryPurchaseOrders.ts` + `usePurchaseOrderFinancialIntegration.ts` | صعوبة الصيانة |
| 5 | **ازدواجية التقارير:** `BalanceSheetReport.tsx` و `reports/BalanceSheet.tsx` | finance/reports | تشتت المستخدم |
| 6 | **حساب التدفقات النقدية محدود:** يعتمد على `reference_type` فقط | `useFinancialAnalysis.ts` | تصنيف غير دقيق |
| 7 | **قيم افتراضية في التقارير:** `currentRatio` و `quickRatio` قيم ثابتة | `useFinancialOverview.ts` | تقارير غير دقيقة |
| 8 | **حجم `usePaymentOperations.ts`:** 1659 سطر في ملف واحد | `usePaymentOperations.ts` | صعوبة الصيانة |

### 14.3 بسيطة
| # | المشكلة | الموقع | التأثير |
|---|---------|--------|---------|
| 9 | **تحليل الأعمار غير مكتمل:** `aging_30/60/90` مضبوطة على 0 | `useEnhancedCustomerFinancials.ts` | تقارير غير دقيقة |
| 10 | **`total_fuel_cost` = 0 دائماً:** لا توجد بيانات وقود | `useFleetFinancialAnalytics.ts` | تحليل أسطول غير كامل |
| 11 | **تحليل AI غير موثوق:** يعتمد على كلمات مفتاحية | `financial-analysis-ai/index.ts` | توصيات غير دقيقة |
| 12 | **لا يوجد ربط للأصول الثابتة:** المركبات غير مرتبطة بحساب أصول | Fleet module | ميزانية عمومية غير كاملة |

---

## 15. التوصيات

### 15.1 توصيات فورية (عالية الأولوية)

1. **توحيد إنشاء القيود:** اختيار مسار واحد (SQL trigger أو Frontend) لكل نوع عملية لتجنب الازدواجية
2. **تطبيق فصل المهام على جميع العمليات:** توسيع `checkSegregationOfDuties()` لتشمل جميع العمليات المالية الحرجة
3. **ربط `canActorApproveFinancialStep`:** توصيل دالة التحقق من أهلية الموافقة بواجهة الموافقات

### 15.2 توصيات المدى القصير

4. **دمج التقارير المكررة:** توحيد `BalanceSheetReport.tsx` و `reports/BalanceSheet.tsx` في تقرير واحد
5. **إعادة هيكلة `usePaymentOperations.ts`:** تقسيم الملف إلى وحدات أصغر (إنشاء، إلغاء، تعديل)
6. **إكمال تحليل الأعمار:** ربط `aging_30/60/90` ببيانات حقيقية من `customer_aging_analysis`
7. **حساب النسب المالية:** استبدال القيم الافتراضية بحسابات حقيقية من `chart_of_accounts`

### 15.3 توصيات المدى البعيد

8. **ربط المركبات بالأصول الثابتة:** إنشاء ربط بين `vehicles` وحساب الأصول الثابتة في دليل الحسابات
9. **تحسين تحليل AI:** استخدام تحليل هيكلي بدلاً من الكلمات المفتاحية
10. **إنشاء مخصصات الديون المشكوك فيها:** ربط النظام القانوني بالمحاسبة لإنشاء مخصصات
11. **تحسين تصنيف التدفقات النقدية:** استخدام تحليل الحسابات بدلاً من `reference_type`
12. **إضافة Idempotency Key:** إضافة عمود `idempotency_key` إلى جدول `payments`

---

## ملحق: خريطة التكامل

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                    النظام المالي                            │
                    │  chart_of_accounts ← account_mappings → default_account_types│
                    │  journal_entries ← journal_entry_lines → chart_of_accounts   │
                    └──────────┬──────────┬──────────┬──────────┬─────────────────┘
                               │          │          │          │
              ┌────────────────┼──────────┼──────────┼──────────┼────────────────┐
              │                │          │          │          │                │
              ▼                ▼          ▼          ▼          ▼                ▼
    ┌──────────────┐  ┌────────────┐  ┌──────┐  ┌────────┐  ┌────────┐  ┌──────────────┐
    │   العقود     │  │  الأسطول   │  │الرواتب│  │المشتريات│  │العملاء  │  │   العقارات    │
    │  Contracts   │  │   Fleet    │  │Payroll│  │Inventory│  │Customers│  │  Properties   │
    ├──────────────┤  ├────────────┤  ├──────┤  ├────────┤  ├────────┤  ├──────────────┤
    │journal_entry │  │purchase_cost│  │JE ID │  │JE ID   │  │JE ID   │  │JE ID         │
    │_id ✅        │  │✅(غير مباشر)│  │✅    │  │✅      │  │✅      │  │✅            │
    │reference_type│  │accumulated_ │  │status│  │reference│  │customer│  │عرض فقط       │
    │='contract' ✅│  │depreciation✅│  │✅    │  │✅      │  │_id ✅  │  │⚠️            │
    │account_id ✅ │  │cost_center  │  │      │  │        │  │aging   │  │              │
    │              │  │✅          │  │      │  │        │  │⚠️     │  │              │
    └──────────────┘  └────────────┘  └──────┘  └────────┘  └────────┘  └──────────────┘

    ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
    │   القانوني   │  │   المدفوعات  │  │  التقارير المالية │
    │    Legal     │  │   Payments   │  │  Financial Reports│
    ├──────────────┤  ├──────────────┤  ├──────────────────┤
    │case_value ✅ │  │JE ID ✅     │  │ميزانية عمومية ✅  │
    │delinquency   │  │invoice_id ✅│  │قائمة دخل ✅      │
    │amounts ✅    │  │contract_id ✅│  │تدفقات نقدية ⚠️   │
    │(لا مخصصات ❌)│  │idempotency  │  │تحليل AI ⚠️       │
    │              │  │⚠️          │  │نسب مالية ⚠️      │
    └──────────────┘  └──────────────┘  └──────────────────┘

    ✅ = متكامل بالكامل    ⚠️ = متكامل جزئياً    ❌ = غير موجود
```

---

**نهاية التقرير**
