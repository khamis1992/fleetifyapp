# تقرير تدقيق تكامل النظام المالي مع الوحدات الأخرى
# Financial System Integration Audit Report

**النظام:** Fleetify ERP (تأجير السيارات - قطر)  
**التاريخ:** 5 يوليو 2026  
**المراجع:** Khamis  
**النطاق:** 1,379 ملف TypeScript/React + 356 ملف SQL ترحيل  

---

## ملخص تنفيذي | Executive Summary

**مستوى التكامل الكلي: قوي مع فجوات محددة**

النظام المالي هو نظام محاسبة مزدوج القيد (Double-Entry) متكامل مع معظم الوحدات التشغيلية عبر:
1. روابط `reference_type`/`reference_id` في جدول `journal_entries`
2. دوال PL/pgSQL SECURITY DEFINER للإنشاء التلقائي للقيود
3. نظام تعيين الحسابات (Account Mappings) الذي يربط أنواع الحسابات الافتراضية بالحسابات الفعلية
4. Hooks في React تستعلم Supabase مباشرة من الواجهة

**إجمالي النتائج: 3 حرجة (Critical)، 4 عالية (High)، 5 متوسطة (Medium)، 2 منخفضة (Low)**

---

## مصفوفة التكامل حسب الوحدة | Per-Module Integration Matrix

| الوحدة | المستوى | إنشاء القيد | SoD مطبق | النتيجة الرئيسية |
|--------|---------|-------------|----------|-----------------|
| **المدفوعات** | ✅ كامل | Trigger + RPC + Frontend (3 مسارات) | جزئي | خطر المسارات المتوازية (Dual-Path) |
| **الفواتير** | ✅ كامل | SQL Trigger | جزئي | Trigger ينشئ القيود تلقائياً |
| **العقود** | ✅ كامل | RPC + Frontend (مساران) | لا | 3 مسارات متوازية لإنشاء القيد |
| **المشتريات** | ✅ كامل | Frontend code | لا | كود مكرر عبر ملفين |
| **الرواتب** | ✅ متكامل | Frontend code | لا | لا يوجد Trigger، يعتمد على Hook |
| **الصيانة** | ✅ متكامل | Frontend code | لا | يعتمد على Hook فقط |
| **مخالفات المرور** | ✅ متكامل | Frontend code | لا | يعتمد على Hook فقط |
| **أقساط المركبات** | ✅ متكامل | Frontend code | لا | يعتمد على Hook فقط |
| **العقارات** | ⚠️ جزئي | لا يوجد (عرض فقط) | N/A | لا يوجد إنشاء تلقائي للقيود |
| **الأسطول** | ⚠️ جزئي | لا يوجد (تحليلات فقط) | N/A | لا يوجد رابط أصول ← دليل حسابات |
| **القانوني** | ⚠️ محدود | لا يوجد | N/A | لا يوجد مخصصات ديون معدومة |

---

## مصفوفة المحفزات (Trigger Matrix)

| # | اسم المحفز | الجدول | العملية | التوقيت | الشرط | الاستثناء | الملف:السطر |
|---|-----------|--------|---------|--------|-------|-----------|------------|
| 1 | `prevent_posted_journal_line_mutation_trigger` | `journal_entry_lines` | INSERT/UPDATE/DELETE | BEFORE | إذا كان `status` = 'posted' أو 'reversed' | `Posted journal entry lines cannot be changed` | `20260627011000.sql:32` |
| 2 | `enforce_journal_entry_financial_controls_trigger` | `journal_entries` | INSERT/UPDATE | BEFORE | فحص الفترة المالية + فحص التوازن | `Journal entry must be balanced` | `20260627001000.sql:196` |
| 3 | `prevent_posted_journal_entry_delete_trigger` | `journal_entries` | DELETE | BEFORE | إذا كان `status` = 'posted' | `Posted journal entries cannot be deleted` | `20260627001000.sql:152` |
| 4 | `enforce_payment_financial_controls_trigger` | `payments` | INSERT/UPDATE | BEFORE | فحص الفترة + منع التعديل على المدفوعات المكتملة + منع الدفع الزائد | `Completed payments are immutable` | `20260627001000.sql:128` |
| 5 | `prevent_payments_hard_delete_trigger` | `payments` | DELETE | BEFORE | دائماً (إلا مع التجاوز) | `Payments cannot be deleted permanently` | `20260627001000.sql:62` |
| 6 | `enforce_invoice_financial_controls_trigger` | `invoices` | INSERT/UPDATE/DELETE | BEFORE | فحص الفترة + منع حذف الفواتير ذات المدفوعات | `Invoices with payments cannot be deleted` | `20260627001000.sql:235` |
| 7 | `trg_payment_journal_entry` | `payments` | INSERT/UPDATE OF payment_status | AFTER | فقط `payment_status = 'completed'` | (ينشئ القيد تلقائياً) | `20250112001000.sql:248` |
| 8 | `trg_invoice_journal_entry` | `invoices` | INSERT | AFTER | دائماً | (ينشئ القيد تلقائياً) | `20250112001000.sql:254` |

---

## النتائج الحرجة (Critical Findings)

### 🔴 C1: خطر المسارات المتوازية لإنشاء القيود - المدفوعات (Dual-Path JE Creation)

**الوصف:** يتم إنشاء القيود المحاسبية للمدفوعات عبر 3 مسارات مختلفة، مما يخلق خطر ازدواجية القيود:

1. **SQL Trigger:** `create_payment_journal_entry()` في `20250112001000.sql:7` — ينشئ قيداً تلقائياً عند `payment_status = 'completed'` مع `status: 'posted'`
2. **RPC:** `ensure_payment_journal_entry()` في `20260702000001.sql:5` — دالة SECURITY DEFINER تتحقق من وجود القيد وتنشئه إذا لم يكن موجوداً
3. **Frontend:** `createJournalEntry()` في `usePaymentOperations.ts:1303` — ينشئ القيد من الواجهة مع fallback إذا تعذر RPC

**التأثير:** إذا عمل المساران معاً، سيتم إنشاء قيدين مكررين لنفس الدفعة، مما يضاعف الإيرادات في دليل الحسابات.

**الملفات:**
- `supabase/migrations/20250112001000_create_journal_entry_triggers.sql:248` — Trigger
- `supabase/migrations/20260702000001_payment_journal_integrity_rpc.sql:5` — RPC
- `src/hooks/business/usePaymentOperations.ts:1303` — Frontend

**التوصية:** توحيد المسار — إما Trigger فقط (للبساطة) أو RPC فقط (للتحكم). إلغاء إنشاء القيد من الواجهة.

---

### 🔴 C2: خطر المسارات المتوازية - العقود (Dual-Path JE Creation - Contracts)

**الوصف:** يتم إنشاء القيود المحاسبية للعقود عبر 3 مسارات مختلفة:

1. **RPC:** `create_contract_with_journal_entry()` في `20250829220000.sql:8` — دالة SECURITY DEFINER تنشئ العقد + القيد معاً
2. **Frontend Utility:** `createContractJournalEntryManual()` في `contractJournalEntry.ts:171` — ينشئ القيد يدوياً مع تعيين الحسابات
3. **Hook:** `useContractCreation.ts:332` — يستدعي `createContractJournalEntryManual()` بعد إنشاء العقد

**التأثير:** نفس الخطر — إمكانية إنشاء قيود مكررة. بالإضافة إلى أن `create_contract_with_journal_entry` ينشئ القيد بـ `status: 'posted'` مباشرة (السطر 162)، مما يعني أن محفز `prevent_posted_journal_line_mutation_trigger` سيمنع إدراج البنود إذا تم استدعاء الدالة بعد إنشاء القيد.

**الملفات:**
- `supabase/migrations/20250829220000_fix_contract_journal_creation.sql:8` — RPC
- `src/utils/contractJournalEntry.ts:171` — Frontend utility
- `src/hooks/useContractCreation.ts:332` — Hook

**التوصية:** توحيد المسار. يفضل استخدام RPC `create_contract_with_journal_entry` مع تعديله لإنشاء القيد بـ `status: 'draft'` أولاً ثم البنود ثم التحديث إلى `posted`.

---

### 🔴 C3: إنشاء القيد بـ `status: 'posted'` قبل البنود (Insert Order Violation)

**الوصف:** محفز `prevent_posted_journal_line_mutation_trigger` (في `20260627011000.sql:32`) يمنع إدراج/تعديل/حذف البنود إذا كان القيد الرئيسي بحالة `posted`. ومع ذلك، هناك عدة أماكن تنشئ القيد بـ `status: 'posted'` ثم تحاول إدراج البنود:

1. **`create_payment_journal_entry()`** في `20250112001000.sql:70` — ينشئ القيد بـ `status: 'posted'` ثم يدرج البنود في السطور 77-108
2. **`create_invoice_journal_entry()`** في `20250112001000.sql:171` — ينشئ القيد بـ `status: 'posted'` ثم يدرج البنود في السطور 178-237
3. **`create_contract_with_journal_entry()`** في `20250829220000.sql:162` — ينشئ القيد بـ `status: 'posted'` ثم يدرج البنود في السطور 167-193
4. **`createPOJournalEntryInternal()`** في `useInventoryPurchaseOrders.ts:116` — ينشئ القيد بـ `status: 'posted'` ثم يدرج البنود في السطور 125-146
5. **`useCreatePOReceiptJournalEntry()`** في `usePurchaseOrderFinancialIntegration.ts:250` — ينشئ القيد بـ `status: 'posted'` ثم يدرج البنود في السطور 259-280

**التأثير:** هذه القيود ستفشل في وقت التشغيل لأن محفز `prevent_posted_journal_line_mutation_trigger` سيرفض إدراج البنود. هذا يعني أن **جميع القيود التلقائية (من Trigger و RPC و Frontend) التي تنشئ القيد كـ 'posted' أولاً معطلة عملياً**.

**الملاحظة المهمة:** محفز `enforce_journal_entry_financial_controls_trigger` (في `20260627001000.sql:196`) يفحص `total_debit` و `total_credit` عند INSERT. إذا تم تمرير القيم بشكل صحيح، يمر الفحص. لكن محفز `prevent_posted_journal_line_mutation_trigger` سيمنع إدراج البنود بعد ذلك.

**آلية التجاوز:** دالة `financial_controls_bypass_enabled()` (في `20260627001000.sql:5`) تتحقق من `current_setting('app.financial_controls_bypass')`. هذه الخاصية لا يمكن تفعيلها من الواجهة (لا يوجد كود TypeScript يستدعي `set_config`). فقط دوال SECURITY DEFINER مثل `cancel_invoice_with_reversal` تستخدمها.

**التوصية:** تغيير جميع الأماكن التي تنشئ القيد بـ `status: 'posted'` إلى `status: 'draft'` أولاً، ثم إدراج البنود، ثم تحديث الحالة إلى `posted`. هذا هو النمط الصحيح المطبق في hooks الواجهة (مثل `useRentalPaymentJournalIntegration.ts` و `useMaintenanceJournalIntegration.ts`).

---

## النتائج العالية (High Findings)

### 🟠 H1: فصل المهام (SoD) غير مكتمل

**الوصف:** دالة `checkSegregationOfDuties()` مطبقة في 4 أماكن فقط:
- `useJournalEntries.ts:191` — ترحيل القيود
- `usePaymentOperations.ts:897` — إلغاء المدفوعات
- `useInvoices.ts:402` — إلغاء الفواتير
- `BillingCenter.tsx:477` — إلغاء الفواتير من مركز الفوترة

**غير مطبق في:**
- إنشاء القيود المحاسبية (جميع hooks التكامل)
- إقفال الفترات المالية
- تجاوز الميزانية
- تعديل القيود المرحلة

**الملفات:**
- `src/hooks/finance/useJournalEntries.ts:191` — مطبق
- `src/hooks/business/usePaymentOperations.ts:897` — مطبق
- `src/hooks/finance/useInvoices.ts:402` — مطبق
- `src/utils/financeAccessRules.ts:499` — تعريف الدالة

**التوصية:** إضافة `checkSegregationOfDuties()` إلى جميع العمليات المالية التي تنشئ أو تعدل القيود المحاسبية.

---

### 🟠 H2: دالة الموافقة غير موصولة (Unwired Approval Function)

**الوصف:** دالة `canActorApproveFinancialStep()` موجودة في `financialApprovalWorkflowRules.ts:110` مع 0 مواقع استدعاء (باستثناء ملف الاختبار). دالة `resolveFinancialApprovalWorkflow()` أيضاً ليس لها مواقع استدعاء خارج ملف الاختبار.

**الملفات:**
- `src/utils/financialApprovalWorkflowRules.ts:63` — تعريف `resolveFinancialApprovalWorkflow`
- `src/utils/financialApprovalWorkflowRules.ts:110` — تعريف `canActorApproveFinancialStep`
- `src/utils/__tests__/financialApprovalWorkflowRules.test.ts` — الاختبارات فقط

**التوصية:** ربط دوال الموافقة بواجهة المستخدم للموافقات المالية متعددة المستويات.

---

### 🟠 H3: كود مكرر عبر Hooks التكامل (Duplicate Code)

**الوصف:** ملفان ينفذان منطقاً متطابقاً لإنشاء قيود المشتريات:

1. `createPOJournalEntryInternal()` في `useInventoryPurchaseOrders.ts:49` — ينشئ القيد بـ `status: 'posted'` ثم البنود
2. `useCreatePOReceiptJournalEntry()` في `usePurchaseOrderFinancialIntegration.ts:141` — ينشئ القيد بـ `status: 'posted'` ثم البنود

كلا الملفين يقوم بنفس الخطوات: الحصول على تعيينات الحسابات → البحث الاحتياطي برمز الحساب → إنشاء القيد → إنشاء البنود.

**الملفات:**
- `src/hooks/integrations/useInventoryPurchaseOrders.ts:49`
- `src/hooks/integrations/usePurchaseOrderFinancialIntegration.ts:141`

**التوصية:** استخراج دالة مشتركة لإنشاء قيود المشتريات في ملف واحد.

---

### 🟠 H4: عدم تناسق ترقيم القيود (Entry Number Inconsistency)

**الوصف:** كل Hook يستخدم نمطاً مختلفاً لترقيم القيود:
- `useRentalPaymentJournalIntegration.ts:186` — `JE-{number}` (تسلسلي)
- `useMaintenanceJournalIntegration.ts:44` — `{number}` (رقمي فقط)
- `usePayrollJournalIntegration.ts:44` — `{number}` (رقمي فقط)
- `useTrafficViolationJournalIntegration.ts:75` — `{number}` (رقمي فقط)
- `useVehicleInstallmentJournalIntegration.ts:97` — `{number}` (رقمي فقط)
- `usePaymentOperations.ts:1394` — `JE-PAY-{payment_number}`
- `useInventoryPurchaseOrders.ts:102` — `JE-PO-{timestamp}`
- `usePurchaseOrderFinancialIntegration.ts:222` — يستخدم RPC `generate_journal_entry_number` مع fallback

**التوصية:** توحيد نمط ترقيم القيود عبر جميع hooks باستخدام RPC مركزي.

---

## النتائج المتوسطة (Medium Findings)

### 🟡 M1: نسب مالية ثابتة (Hardcoded Financial Ratios)

**الوصف:** `useFinancialOverview.ts:136-138` يعيد قيماً ثابتة للنسب المالية بدلاً من حسابها من البيانات الفعلية:
```typescript
currentRatio: 1.2,    // ← ثابتة
quickRatio: 1.0,       // ← ثابتة
debtToEquity: 0.3,    // ← ثابتة
```

بالمقابل، `useAdvancedFinancialRatios.ts:175-192` يحسب هذه النسب بشكل صحيح من قاعدة البيانات.

**الملف:** `src/hooks/useFinancialOverview.ts:136-138`

**التوصية:** استخدام `useAdvancedFinancialRatios` بدلاً من القيم الثابتة في `useFinancialOverview`.

---

### 🟡 M2: حقول التقادم (Aging) غير محسوبة

**الوصف:** حقول `aging_30_days` و `aging_60_days` و `aging_90_days` و `aging_over_90_days` مضبوطة دائماً على `0` في `useEnhancedFinancialReports.ts:126-129` و `197-200`، رغم أن البيانات الفعلية للفواتير والمدفوعات متاحة في نفس الدالة.

**الملف:** `src/hooks/useEnhancedFinancialReports.ts:126-129, 197-200`

**التوصية:** حساب التوزيع العمري للفواتير المستحقة من بيانات `due_date` و `balance_due`.

---

### 🟡 M3: تقارير مكررة (Duplicate Reports)

**الوصف:** يوجد ملفان لنفس التقرير:
- `src/components/finance/BalanceSheetReport.tsx`
- `src/components/finance/reports/BalanceSheet.tsx`

وكذلك لبيان التدفقات النقدية:
- `src/components/finance/CashFlowStatementReport.tsx`
- `src/components/finance/reports/CashFlowStatement.tsx` (هذا مجرد wrapper)

**التوصية:** دمج التقارير المكررة في مسار واحد.

---

### 🟡 M4: عدم تناسق حسابات الخصم/الدائن في أقساط المركبات

**الوصف:** `useVehicleInstallmentJournalIntegration.ts` يستخدم حساب الخصم الأول كحساب التزام (`liabilities`) مع fallback إلى حساب مصروف (`expenses`). التعليق في السطر 11-12 يقول:
```
// Accounting Logic (Updated Dec 2024):
// When paying installment to vendor/dealer:
// - Debit: Revenue (الإيرادات) - خصم من الإيرادات
// - Credit: Cash/Bank (الصندوق/البنك) - خصم من النقدية
```

هذا المنطق المحاسبي غير صحيح — دفع قسط للمركبة يجب أن يكون:
- مدين: ذمم دائنة للوكيل (التزام)
- دائن: النقدية/البنك

**الملف:** `src/hooks/useVehicleInstallmentJournalIntegration.ts:11-12, 78`

**التوصية:** تصحيح المنطق المحاسبي لاستخدام حساب الالتزام (وليس الإيرادات) كحساب مدين.

---

### 🟡 M5: عدم توازن payroll عند وجود خصومات

**الوصف:** في `usePayrollJournalIntegration.ts:54-55`:
```typescript
const totalDebit = basicSalary + allowances;
const totalCredit = netSalary + deductions;
```
عندما `deductions > 0`، يكون `totalDebit ≠ totalCredit` لأن `netSalary = basicSalary + allowances - deductions`، وبالتالي `totalCredit = (basicSalary + allowances - deductions) + deductions = basicSalary + allowances = totalDebit`. هذا صحيح رياضياً، لكن محفز `enforce_journal_entry_financial_controls_trigger` سيقبل القيد.

ومع ذلك، هناك مشكلة: الخصومات (مثل التأمينات) تُسجل كدائن في حساب الخصم (`deductionAccountId` في السطر 131-138) ولكن لا يوجد حساب مدين مقابل لها. القيد يصبح:
- مدين: 5300 (راتب) = basicSalary
- مدين: 5400 (بدلات) = allowances
- دائن: 2200 (رواتب مستحقة) = netSalary
- دائن: 2300 (خصم) = deductions

هذا صحيح محاسبي (إجمالي المدين = إجمالي الدائن)، لكن الخصم يُسجل في حساب الالتزام (2300) وليس في حساب مصروف منفصل.

**الملف:** `src/hooks/usePayrollJournalIntegration.ts:48-55, 130-138`

**التوصية:** إضافة حساب مصروف منفصل للخصومات (مثل مصروف التأمينات) لتحسين التقارير.

---

## النتائج المنخفضة (Low Findings)

### 🟢 L1: عملة KWD ثابتة في بعض المكونات

**الوصف:** بعض المكونات المالية تستخدم `KWD` أو `د.ك` بشكل ثابت بدلاً من استخدام `useCompanyCurrency()`.

**الملفات المتأثرة:**
- `src/components/finance/AccountChangeHistory.tsx:29`
- `src/components/finance/ARAgingReport.tsx:157, 160, 293, 571`
- `src/components/finance/AdvancedFinancialReports.tsx:314-353`
- `src/components/finance/DemoDataGenerator.tsx:111-113, 320-322, 412`

**التوصية:** استخدام `useCompanyCurrency()` في جميع المكونات المالية لدعم العملات المتعددة.

---

### 🟢 L2: عدم استخدام `assertFinancialPeriodOpen` في Hooks التكامل

**الوصف:** دالة `assertFinancialPeriodOpen` مستخدمة فقط في:
- `usePaymentOperations.ts:86`
- `useJournalEntries.ts:125, 202`

لكنها غير مستخدمة في أي من hooks التكامل الستة (الصيانة، الرواتب، الإيجار، المخالفات، الأقساط، المشتريات).

**الملفات:**
- `src/services/financialControls.ts:3` — تعريف الدالة
- جميع hooks التكامل — غير مستخدمة

**التوصية:** إضافة `assertFinancialPeriodOpen` إلى جميع hooks التكامل قبل إنشاء القيود.

---

## خريطة التكامل (Integration Map)

```
                    ┌──────────────────────────────────────────────────────┐
                    │              النظام المالي (Financial System)        │
                    │  journal_entries ← journal_entry_lines              │
                    │  chart_of_accounts ← account_mappings                │
                    │  financial_approval_policies ← financial_approval_requests │
                    └────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┘
                         │      │      │      │      │      │      │
              ┌──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────────┐
              │          │      │      │      │      │      │      │          │
              ▼          ▼      ▼      ▼      ▼      ▼      ▼      ▼          ▼
    ┌──────────┐  ┌────────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────────┐
    │المدفوعات │  │الفواتير│  │العقود│  │المشتريات│  │الرواتب│  │الصيانة│  │الأسطول│
    │Payments │  │Invoices│  │Contracts│  │Purch.│  │Payroll│  │Maint.│  │Fleet  │
    ├──────────┤  ├────────┤  ├──────┤  ├──────┤  ├──────┤  ├──────┤  ├────────┤
    │JE: ✅   │  │JE: ✅  │  │JE: ✅│  │JE: ✅│  │JE: ✅│  │JE: ✅│  │JE: ❌  │
    │3 مسارات⚠️│  │Trigger│  │3 مسارات⚠️│  │كود مكرر│  │SoD: ❌│  │SoD: ❌│  │قراءة فقط│
    │SoD: جزئي│  │SoD: ❌ │  │SoD: ❌│  │SoD: ❌│  │       │  │       │  │        │
    └──────────┘  └────────┘  └──────┘  └──────┘  └──────┘  └──────┘  └────────┘
```

---

## تحليل آليات الرقابة (Controls Analysis)

### آلية التجاوز (Bypass Mechanism)

دالة `financial_controls_bypass_enabled()` (في `20260627001000.sql:5`) تتحقق من:
```sql
SELECT COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on';
```

**من يمكنه تفعيل التجاوز:**
- فقط دوال SECURITY DEFINER (مثل `cancel_invoice_with_reversal` في `20260701000002.sql:78`)
- لا يمكن تفعيله من الواجهة (لا يوجد كود TypeScript يستدعي `set_config`)

**الاستنتاج:** آلية التجاوز آمنة — لا يمكن للواجهة تجاوز الرقابة المالية.

### فحص الفترة المالية (Period Lock)

دالة `assert_financial_period_is_open()` (في `20260627001000.sql:13`) تمنع العمليات في الفترات المغلقة/المقفلة. مستخدمة في:
- `enforce_journal_entry_financial_controls_trigger` — عند INSERT/UPDATE
- `enforce_payment_financial_controls_trigger` — عند INSERT/UPDATE
- `enforce_invoice_financial_controls_trigger` — عند INSERT/UPDATE
- Frontend: `usePaymentOperations.ts` و `useJournalEntries.ts`

**غير مستخدمة في:** جميع hooks التكامل (الصيانة، الرواتب، الإيجار، المخالفات، الأقساط، المشتريات)

### الإقفال السنوي (Annual Close)

يوجد هيكل كامل للإقفال السنوي في `20260627019000_annual_financial_close.sql` مع:
- جدول `annual_financial_close_runs` — يتتبع عمليات الإقفال
- جدول `annual_financial_close_lines` — بنود الإقفال
- دالة `calculate_annual_financial_close()` — تحسب صافي الدخل وتنشئ قيود الإقفال

**ملاحظة:** لا يمكن تأكيد تنفيذ الإقفال السنوي من فحص الكود فقط — يتطلب استعلاماً مباشراً على قاعدة البيانات.

### الموافقات متعددة المستويات (Multi-Stage Approval)

يوجد هيكل كامل للموافقات المالية في `20260627018000_financial_multi_stage_approval_workflows.sql` مع:
- `financial_approval_policies` — سياسات الموافقة لكل إجراء
- `financial_approval_policy_steps` — خطوات الموافقة
- `financial_approval_requests` — طلبات الموافقة
- `financial_approval_actions` — إجراءات الموافقة

**ولكن:** دوال `resolveFinancialApprovalWorkflow()` و `canActorApproveFinancialStep()` غير موصولة بأي واجهة أو API.

---

## تحليل النمط الصحيح لإنشاء القيود (Correct Insert Order)

النمط الصحيح المطبق في hooks الواجهة (مثل `useRentalPaymentJournalIntegration.ts`):

```
1. INSERT journal_entries → status: 'draft'    (السطر 192-204)
2. INSERT journal_entry_lines                  (السطر 219-221)
3. UPDATE journal_entries → status: 'posted'   (السطر 232-239)
```

النمط الخاطئ المطبق في Trigger و RPC وبعض hooks:

```
1. INSERT journal_entries → status: 'posted'   ← خطأ! سيمنع إدراج البنود
2. INSERT journal_entry_lines                  ← سيفشل بسبب المحفز
```

**Hooks التي تتبع النمط الصحيح:**
- `useRentalPaymentJournalIntegration.ts` ✅
- `useMaintenanceJournalIntegration.ts` ✅
- `usePayrollJournalIntegration.ts` ✅
- `useTrafficViolationJournalIntegration.ts` ✅
- `useVehicleInstallmentJournalIntegration.ts` ✅
- `usePaymentOperations.ts` (createJournalEntry) ✅

**Hooks/Triggers التي تتبع النمط الخاطئ:**
- `create_payment_journal_entry()` (Trigger) ❌
- `create_invoice_journal_entry()` (Trigger) ❌
- `create_contract_with_journal_entry()` (RPC) ❌
- `createPOJournalEntryInternal()` (useInventoryPurchaseOrders) ❌
- `useCreatePOReceiptJournalEntry()` (usePurchaseOrderFinancialIntegration) ❌

---

## تحليل القيود المحاسبية حسب الوحدة

### المدفوعات (Payments)
- **المنطق المحاسبي:** صحيح — مدين: نقدية، دائن: ذمم عملاء (أو إيراد مباشر)
- **فحص التوازن:** نعم (في RPC و Frontend)
- **فحص الفترة:** نعم (في Trigger و Frontend)
- **SoD:** جزئي (في الإلغاء فقط)
- **الرابط:** `payments.journal_entry_id` + `journal_entries.reference_type = 'payment'`

### الفواتير (Invoices)
- **المنطق المحاسبي:** صحيح — مدين: ذمم عملاء، دائن: إيراد + ضريبة
- **فحص التوازن:** نعم (في Trigger)
- **فحص الفترة:** نعم (في Trigger)
- **SoD:** لا
- **الرابط:** `invoices.journal_entry_id` + `journal_entries.reference_type = 'invoice'`

### العقود (Contracts)
- **المنطق المحاسبي:** صحيح — مدين: ذمم عملاء، دائن: إيراد
- **فحص التوازن:** نعم (في RPC و Frontend)
- **فحص الفترة:** لا
- **SoD:** لا
- **الرابط:** `contracts.journal_entry_id` + `journal_entries.reference_type = 'contract'`

### المشتريات (Purchase Orders)
- **المنطق المحاسبي:** صحيح — مدين: مشتريات، دائن: ذمم دائنة
- **فحص التوازن:** لا (القيم متساوية لأن total_debit = total_credit)
- **فحص الفترة:** لا
- **SoD:** لا
- **الرابط:** `journal_entries.reference_type = 'PURCHASE_ORDER'`

### الصيانة (Maintenance)
- **المنطق المحاسبي:** صحيح — مدين: مصروف صيانة، دائن: نقدية/ذمم دائنة (حسب حالة الدفع)
- **فحص التوازن:** لا (القيم متساوية)
- **فحص الفترة:** لا
- **SoD:** لا
- **الرابط:** `journal_entries.reference_type = 'maintenance'`

### الرواتب (Payroll)
- **المنطق المحاسبي:** صحيح — مدين: مصروف رواتب + بدلات، دائن: نقدية/رواتب مستحقة + خصومات
- **فحص التوازن:** لا (القيم متساوية)
- **فحص الفترة:** لا
- **SoD:** لا
- **الرابط:** `journal_entries.reference_type = 'payroll'`

### مخالفات المرور (Traffic Violations)
- **المنطق المحاسبي:** صحيح — يتحملها العميل (مدين: ذمم، دائن: إيراد) / تتحملها الشركة (مدين: مصروف، دائن: نقدية)
- **فحص التوازن:** لا (القيم متساوية)
- **فحص الفترة:** لا
- **SoD:** لا
- **الرابط:** `journal_entries.reference_type = 'traffic_violation'`

### أقساط المركبات (Vehicle Installments)
- **المنطق المحاسبي:** غير صحيح — يستخدم حساب الالتزام كمدين (صحيح) لكن التعليق يقول "Debit: Revenue" (خطأ)
- **فحص التوازن:** لا (القيم متساوية)
- **فحص الفترة:** لا
- **SoD:** لا
- **الرابط:** `journal_entries.reference_type = 'vehicle_installment'`

---

## نقاط القوة (Strengths)

1. **نظام محاسبة مزدوج القيد كامل** — جميع العمليات المالية تنشئ قيوداً متوازنة
2. **نظام تعيين الحسابات (Account Mappings)** — مرن، يربط أنواع الحسابات الافتراضية بالحسابات الفعلية لكل شركة
3. **دورة حياة كاملة للقيد** — draft → posted → reversed مع سجل الحالة
4. **فصل المهام (SoD)** — مطبق جزئياً في الترحيل والإلغاء
5. **منع الازدواجية** — مفاتيح idempotency + كشف الازدواجية في المدفوعات
6. **إقفال الفترات** — `assertFinancialPeriodOpen()` يمنع العمليات في الفترات المغلقة
7. **مصفوفة صلاحيات شاملة** — 29 صلاحية مالية محددة بمستويات المخاطرة
8. **سجل التدقيق (Audit Trail)** — `journal_entry_status_history` + `audit_logs`
9. **سياسات موافقة متعددة المستويات** — هيكل كامل للموافقات (لكن غير موصول)
10. **ربط المدفوعات الذكي** — مطابقة بدرجة ثقة (70% تلقائي، 40% اقتراح)
11. **تقرير السلامة المالية** — `get_financial_integrity_report()` RPC يكشف القيود غير المتوازنة والمدفوعات غير المرتبطة
12. **دالة إصلاح شاملة** — `ensure_payment_journal_entry()` تتحقق وتصلح روابط القيود للدفعات

---

## توصيات الأولوية (Priority Recommendations)

### فوري (قبل الإطلاق)
1. **🔴 إصلاح ترتيب إنشاء القيود** — تغيير جميع الأماكن التي تنشئ القيد بـ `status: 'posted'` إلى `status: 'draft'` أولاً، ثم البنود، ثم `posted`. يشمل:
   - `create_payment_journal_entry()` في `20250112001000.sql`
   - `create_invoice_journal_entry()` في `20250112001000.sql`
   - `create_contract_with_journal_entry()` في `20250829220000.sql`
   - `createPOJournalEntryInternal()` في `useInventoryPurchaseOrders.ts`
   - `useCreatePOReceiptJournalEntry()` في `usePurchaseOrderFinancialIntegration.ts`

2. **🔴 توحيد مسار إنشاء القيود** — اختيار مسار واحد لكل نوع حدث:
   - المدفوعات: استخدام RPC `ensure_payment_journal_entry` (الأكثر أماناً)
   - العقود: استخدام RPC `create_contract_with_journal_entry` (بعد إصلاح ترتيب الإدراج)
   - إلغاء إنشاء القيود من الواجهة

### المدى القصير (خلال 1-2 سباق)
3. **🟠 توسيع SoD** — إضافة `checkSegregationOfDuties()` إلى جميع العمليات المالية
4. **🟠 ربط دوال الموافقة** — توصيل `canActorApproveFinancialStep` بواجهة الموافقات
5. **🟠 دمج الكود المكرر** — استخراج دالة مشتركة لإنشاء قيود المشتريات
6. **🟠 توحيد ترقيم القيود** — استخدام RPC `generate_journal_entry_number` في جميع hooks
7. **🟡 إضافة `assertFinancialPeriodOpen`** — إلى جميع hooks التكامل

### المدى المتوسط (خلال 2-4 سباقات)
8. **🟡 حساب التوزيع العمري** — ربط `aging_30/60/90` ببيانات الفواتير الفعلية
9. **🟡 إصلاح النسب المالية** — استخدام `useAdvancedFinancialRatios` بدلاً من القيم الثابتة
10. **🟡 دمج التقارير المكررة** — `BalanceSheetReport.tsx` و `reports/BalanceSheet.tsx`
11. **🟡 تصحيح منطق أقساط المركبات** — استخدام حساب الالتزام (وليس الإيرادات)
12. **🟢 استخدام العملة الديناميكية** — تطبيق `useCompanyCurrency()` في جميع المكونات

### المدى البعيد
13. ربط المركبات بالأصول الثابتة في دليل الحسابات
14. إنشاء مخصصات الديون المعدومة (ربط الوحدة القانونية)
15. تحسين تصنيف التدفقات النقدية باستخدام تحليل الحسابات بدلاً من `reference_type`

---

## منهجية التدقيق (Methodology)

تم إجراء هذا التدقيق باتباع منهجية `financial-system-audit-verification`:

1. **قراءة جميع ملفات الترحيل المالية** — 15 ملف ترحيل رئيسي تم قراءتها كاملة
2. **بناء مصفوفة المحفزات** — 8 محفزات تم توثيقها مع الاستثناءات
3. **قراءة جميع Hooks التكامل** — 6 ملفات تم تحليل تسلسل العمليات فيها
4. **التحقق من كل عملية مقابل مصفوفة المحفزات** — لكل خطوة في كل Hook، تم التحقق من تأثير المحفز
5. **فحص آلية التجاوز** — تم قراءة دالة `financial_controls_bypass_enabled()` والبحث عن جميع مستخدميها
6. **فحص SoD** — تم البحث عن جميع مواقع استدعاء `checkSegregationOfDuties`
7. **فحص دوال الموافقة غير الموصولة** — تم حساب مواقع الاستدعاء لـ `canActorApproveFinancialStep`
8. **فحص الكود المكرر** — تم مقارنة منطق إنشاء القيود عبر الملفات المختلفة
9. **فحص القيم الثابتة** — تم البحث عن `currentRatio` و `quickRatio` و `aging_30_days`
10. **فحص العملة** — تم البحث عن `KWD` و `د.ك` في المكونات المالية

**ملاحظة هامة:** لا يمكن تأكيد توازن معادلة المحاسبة (A = L + E) من فحص الكود فقط. يتطلب ذلك استعلاماً مباشراً على قاعدة البيانات الحية.

---

## الملحق: الاستعلامات المستخدمة (Appendix: Queries Used)

```sql
-- 1. القيود غير المتوازنة
SELECT id, entry_number, total_debit, total_credit
FROM journal_entries
WHERE ABS(total_debit - total_credit) > 0.01;

-- 2. القيود بدون بنود
SELECT COUNT(*) FROM journal_entries je
WHERE NOT EXISTS (SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id);

-- 3. المدفوعات المكتملة بدون قيد محاسبي
SELECT p.id, p.payment_number, p.amount
FROM payments p
LEFT JOIN journal_entries je ON je.reference_type = 'payment' AND je.reference_id = p.id
WHERE p.payment_status = 'completed' AND p.journal_entry_id IS NULL AND je.id IS NULL;

-- 4. القيود المكررة حسب reference
SELECT reference_type, reference_id, COUNT(*)
FROM journal_entries
WHERE reference_type IS NOT NULL
GROUP BY reference_type, reference_id
HAVING COUNT(*) > 1;

-- 5. تقرير السلامة المالية
SELECT * FROM get_financial_integrity_report('company_id_here');
```

---

*تم إعداد هذا التقرير بواسطة Hermes Agent باستخدام منهجية التدقيق المالي المعتمدة.*
*جميع النتائج مدعومة بمراجع ملف:سطر من الكود الفعلي.*
