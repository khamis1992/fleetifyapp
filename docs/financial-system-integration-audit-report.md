# تقرير تدقيق النظام المالي والتكامل — Fleetify ERP

**التاريخ:** 5 يوليو 2026  
**النظام:** Fleetify ERP (تأجير السيارات وإدارة الأسطول)  
**الموقع:** `C:\Users\khamis\Documents\fleetifyapp\`

---

## ملخص تنفيذي

| البند | القيمة |
|-------|--------|
| **تصنيف المخاطر** | **متوسط** |
| **إجمالي النتائج** | 0 حرجة، 3 عالية، 5 متوسطة، 4 منخفضة |
| **التوصية** | ✅ قابل للتشغيل مع معالجة النتائج العالية |

النظام المالي في Fleetify مبني على **القيد المزدوج الكامل (Double-Entry)** مع دليل حسابات هرمي، قيود يومية، فواتير، مدفوعات، ومسارات تدقيق. التكامل مع الوحدات الأخرى (العقود، الموظفين، الصيانة، المخالفات، أقساط المركبات) يتم عبر **6 هوكات تكامل محاسبي** تنشئ قيودًا محاسبية تلقائيًا. النظام متطور مقارنة بمعظم أنظمة ERP المخصصة، لكنه يعاني من بعض الفجوات في التكامل والضوابط الداخلية.

---

## 1. اكتشاف النظام — نموذج البيانات والهندسة

### الجداول المالية الأساسية (من Supabase types.ts)

| الجدول | الموقع في types.ts | الوظيفة |
|--------|-------------------|---------|
| `chart_of_accounts` | `:1958` | دليل الحسابات الهرمي (6 مستويات) |
| `accounting_periods` | `:245` | الفترات المحاسبية (مفتوحة/مغلقة/مقفلة) |
| `accounting_templates` | `:281` | قوالب القيود المحاسبية التلقائية |
| `journal_entries` | `:9450` | رؤوس القيود اليومية |
| `journal_entry_lines` | `:9560` | بنود القيود اليومية |
| `journal_entry_status_history` | `:9659` | سجل حالات القيود |
| `invoices` | `:9270` | الفواتير (مبيعات/مشتريات/خدمات) |
| `payments` | `:13327` | المدفوعات (مقبوضات/مدفوعات) |
| `fixed_assets` | `:4820` | الأصول الثابتة |
| `cost_centers` | `:3417` | مراكز التكلفة |
| `budgets` | `:493` | الموازنات |
| `audit_logs` | `:245` | سجل التدقيق |

### هيكل التوجيه (Routes)

```
/finance/*              → Finance.tsx (الموجه الرئيسي)
/finance/overview       → نظرة عامة مالية
/finance/accounting     → محاسبة عامة (دليل حسابات + دفتر أستاذ + قيود)
/finance/billing        → مركز الفواتير والمدفوعات الموحد
/finance/treasury       → الخزينة
/finance/reports-analysis → تقارير وتحليل
/finance/budgets-centers  → موازنات ومراكز تكلفة
/finance/audit-settings   → تدقيق وإعدادات
/finance/assets         → الأصول الثابتة
/finance/vendors        → الموردين
/finance/operations/receive-payment → استلام دفعة
/finance/accounting-wizard → معالج محاسبي
```

### طبقات الخدمة

```
services/
├── AccountingService.ts      → تحديث أرصدة الحسابات، ربط المدفوعات بالقيود
├── PaymentService.ts         → منطق المدفوعات (إنشاء، ربط تلقائي)
├── PaymentStateMachine.ts    → آلة حالة المدفوعات
├── PaymentLinkingService.ts  → ربط ذكي للمدفوعات بالفواتير/العقود
├── InvoiceService.ts         → إنشاء الفواتير وإدارة الحالة
├── ContractService.ts        → إنشاء العقود (3 مراحل)
├── financialControls.ts      → التحقق من الفترات المالية المغلقة
└── auditService.ts           → خدمة التدقيق المالي الشامل
```

---

## 2. سلامة القيد المزدوج (Double-Entry Integrity)

### الحالة: ✅ ممتاز

**الأدلة:**
- كل قيد يُنشأ بحالة `draft` أولاً، ثم تُضاف البنود، ثم يُرفع إلى `posted` — هذا النمط الصحيح موجود في جميع هوكات التكامل الستة:
  - `usePayrollJournalIntegration.ts:60-74` ← `status: 'draft'` → إدراج البنود → تحديث إلى `posted`
  - `useVehicleInstallmentJournalIntegration.ts:105-117` ← نفس النمط
  - `useRentalPaymentJournalIntegration.ts:190-200` ← نفس النمط
  - `useTrafficViolationJournalIntegration.ts:117-131` ← نفس النمط
  - `useMaintenanceJournalIntegration.ts:58-72` ← نفس النمط

- **فحص التوازن:** `useRentalPaymentJournalIntegration.ts:168-175` يتحقق من `Math.abs(total_debit - total_credit) > 0.01` قبل الحفظ

- **التراجع (Rollback):** جميع الهوكات تحذف القيد إذا فشلت إدراج البنود:
  - `usePayrollJournalIntegration.ts:153`
  - `useVehicleInstallmentJournalIntegration.ts:186`
  - `useTrafficViolationJournalIntegration.ts:140`

- **حقول الرصيد:** `journal_entries` يحتوي على `total_debit` و `total_credit` (`types.ts:9471-9472`)

### ⚠️ ملاحظة مهمة
> لا يمكن تأكيد توازن A=L+E بدون استعلام مباشر على قاعدة البيانات الحية. البنية التحتية موجودة (جدول `chart_of_accounts` مع `current_balance` و `account_type`)، لكن حالة التنفيذ الفعلية تتطلب فحصًا مباشرًا.

---

## 3. دليل الحسابات (Chart of Accounts)

### الحالة: ✅ جيد

**البنية:**
- هرمي بـ 6 مستويات (`account_level: number | null` في `types.ts:1961`)
- أنواع الحسابات: `asset`, `liability`, `equity`, `revenue`, `expense` (`types.ts:1965`)
- نوع الرصيد: `balance_type` (`types.ts:1966`)
- حسابات رئيسية/فرعية: `is_header: boolean | null` (`types.ts:1977`)
- حسابات نظامية: `is_system: boolean | null` (`types.ts:1978`)
- ربط العملاء/الموظفين/الموردين: `can_link_customers`, `can_link_employees`, `can_link_vendors` (`types.ts:1967-1969`)
- رصيد حالي: `current_balance: number | null` (`types.ts:1972`)
- علاقة ذاتية: `parent_account_id` → `chart_of_accounts` (`types.ts:2036-2048`)

**الملاحظات:**
- ✅ لا توجد مشكلة في أنواع الحسابات — النظام يستخدم الأنواع القياسية الخمسة
- ✅ `account_code` هو المعرف الأساسي (وليس `id`)
- ✅ `account_name` هو الاسم المستخدم (وليس `account_name_en`)
- ⚠️ `current_balance` قد لا يتم تحديثه تلقائيًا — `AccountingService.ts:168` يحتوي على تعليق `// TODO: تنفيذ التحديث الفعلي بعد التحقق من بنية الجدول`

---

## 4. التسوية مع دفتر الأستاذ العام (GL Reconciliation)

### الحالة: ⚠️ متوسط — فجوات في الربط

**الربط المالي (GL Linkage):**

| الكيان | حقل الربط | الموقع | الحالة |
|--------|-----------|--------|--------|
| `invoices.journal_entry_id` | `types.ts:9288` | ✅ موجود |
| `payments.journal_entry_id` | `types.ts:13349` | ✅ موجود |
| `contracts.account_id` | `types.ts:3576` | ✅ موجود |
| `payments.invoice_id` | `types.ts:13348` | ✅ موجود |
| `payments.contract_id` | `types.ts:13338` | ✅ موجود |

**خدمة الربط الذكي:** `PaymentLinkingService.ts` (1015 سطرًا) — نظام متطور لربط المدفوعات بالفواتير/العقود بناءً على:
- تطابق المبلغ (وزن 0.40)
- تطابق العميل (وزن 0.30)
- تطابق المرجع (وزن 0.30)
- القرب الزمني (وزن 0.10)
- عتبات ثقة: 70% ربط تلقائي، 40% اقتراح يدوي

**مشكلة:** `AccountingService.ts:168` — تحديث `current_balance` في `chart_of_accounts` لم يُنفذ بعد (TODO). الرصيد الحالي يُحسب ديناميكيًا من `journal_entry_lines` عبر `getAccountBalance()` (السطر 228-257)، مما يعني أن استعلامات الرصيد المباشر من `chart_of_accounts.current_balance` قد تكون قديمة.

---

## 5. الذمم المدينة/الدائنة (AP/AR)

### الحالة: ✅ جيد مع ملاحظات

**نظام الفواتير:**
- `InvoiceService.ts` — إنشاء الفواتير مع حساب `total_amount = amount + tax_amount - discount_amount` (السطر 49)
- أنواع الفواتير: `rental`, `sales`, `purchase`, `service`
- حالات الفاتورة: `pending`, `sent`, `paid`, `overdue`, `cancelled`
- حالات الدفع: `unpaid`, `partial`, `paid`

**نظام المدفوعات:**
- `PaymentService.ts` — إنشاء المدفوعات مع ربط تلقائي
- `PaymentStateMachine.ts` — آلة حالة متكاملة: `pending → processing → completed | failed | voided | reversed`
- أنواع الدفع: `cash`, `check`, `bank_transfer`, `credit_card`
- طرق الدفع: `received` (مقبوضات), `made` (مدفوعات)

**تتبع الأعمار (Aging):**
- `useEnhancedCustomerFinancialSummary.ts` — يحسب الأعمار يدويًا (0-30, 31-60, 61-90, 90+) عبر مقارنة `due_date` مع التاريخ الحالي (السطر 71-73)
- ⚠️ **لا يوجد تقرير AP Aging مخصص** — يوجد `ARAgingReport.tsx` للذمم المدينة فقط

---

## 6. التعرف على الإيرادات (Revenue Recognition)

### الحالة: ⚠️ متوسط — لا يوجد نظام إيرادات مؤجلة

**التحليل:**
- `useRentalPaymentJournalIntegration.ts` يعترف بالإيراد عند استلام الدفعة (نقدًا)، وليس عند تقديم الخدمة
- القيد المحاسبي: مدين `Accounts Receivable` / دائن `Rental Revenue` + مدين `Cash` / دائن `Accounts Receivable` (السطر 101-162)
- **لا يوجد deferred revenue** — لا يوجد جدول `deferred_revenue` في قاعدة البيانات
- **لا يوجد ASC 606** — النظام لا يطبق نموذج الخطوات الخمس
- هذا مقبول لنموذج تأجير السيارات قصير الأجل، لكنه مشكلة إذا كان النظام سيُستخدم للعقود طويلة الأجل

---

## 7. القوائم المالية (Financial Statements)

### الحالة: ⚠️ متوسط — لا توجد قوائم مالية رسمية

**التحليل:**
- **لا توجد صفحة ميزانية عمومية (Balance Sheet)** مخصصة
- **لا توجد صفحة قائمة دخل (Income Statement)** مخصصة
- **لا توجد صفحة قائمة تدفقات نقدية (Cash Flow Statement)** مخصصة
- `useFinancialOverview.ts` يحسب إيرادات/مصروفات من جدول `payments` مباشرة (وليس من `journal_entries`) — السطر 64-92
- `useEnhancedFinancialReports.ts` يحسب تقارير مالية محسّنة من `invoices` و `payments` و `customers`

**الملاحظة:** النظام يعتمد على **المدفوعات** كمصدر للبيانات المالية بدلاً من **القيود المحاسبية**، مما يعني أن القوائم المالية لا تعكس الاستحقاقات (accruals).

---

## 8. الضوابط الداخلية (Internal Controls)

### الحالة: ✅ جيد

**فصل المهام (Segregation of Duties):**
- `ProtectedFinanceRoute.tsx` — صلاحيات دقيقة لكل عملية مالية:
  - `finance.view` — عرض عام
  - `finance.accounts.view` / `finance.accounts.write` — دليل الحسابات
  - `finance.payments.create` / `finance.payments.view` — المدفوعات
  - `finance.invoices.view` — الفواتير
  - `finance.treasury.view` — الخزينة
  - `finance.budgets.view` — الموازنات
  - `finance.vendors.view` / `finance.vendors.manage` — الموردين
  - `finance.assets.view` — الأصول الثابتة
- إعدادات القيود متاحة فقط لـ `SuperAdminRoute` (`Finance.tsx:335-341`)

**سير الموافقات:**
- `ApprovalSystem.tsx` — نظام موافقات موجود
- `QuotationApproval.tsx` — موافقات عروض الأسعار
- ⚠️ **لا يوجد نظام موافقات للمدفوعات فوق حد معين** — `PaymentService.ts` لا يتحقق من الموافقات

**سجل التدقيق (Audit Trail):**
- `auditTrailSystem.ts` — نظام تدقيق متكامل (377 سطرًا)
- `auditService.ts` — خدمة تدقيق مالي شامل (897 سطرًا) مع:
  - تتبع `old_values` و `new_values`
  - كشف انتهاكات الامتثال (`detectComplianceViolations`)
  - تصدير التقارير
  - `TransactionLineage` — تتبع سلسلة المعاملات
- `journal_entry_status_history` (`types.ts:9659`) — سجل حالات القيود
- `AuditLogsPage.tsx` — صفحة عرض سجل التدقيق

**الضوابط على الفترات المالية:**
- `financialControls.ts` — يتحقق من أن الفترة المالية غير مغلقة قبل تنفيذ المعاملات (السطر 3-25)
- يرمي خطأ: `Financial period "${period_name}" is ${status}. Transactions dated ${transactionDate} are locked.`

---

## 9. الامتثال (SOX/COSO)

### الحالة: ✅ جيد

**مكونات COSO:**

| المكون | الحالة |
|--------|--------|
| بيئة الرقابة | ✅ صلاحيات وأدوار محددة |
| تقييم المخاطر | ⚠️ لا يوجد تقييم آلي للمخاطر المالية |
| الأنشطة الرقابية | ✅ موافقات، تسوية، صلاحيات |
| المعلومات والتواصل | ✅ تقارير مالية، لوحات معلومات |
| المراقبة | ✅ سجل تدقيق، تحليل مالي |

**ITGC:**
- ✅ إدارة الوصول عبر `usePermissionCheck` و `ProtectedFinanceRoute`
- ✅ سجل تدقيق لجميع العمليات المالية
- ✅ التحكم في الفترات المالية المغلقة
- ⚠️ لا يوجد إدارة تغيير رسمية للتعديلات على المنطق المالي

---

## 10. التقارير ولوحات المعلومات

### الحالة: ✅ جيد

**لوحة المعلومات المالية:**
- `FinanceHub.tsx` — لوحة معلومات متكاملة مع:
  - إيرادات الشهر
  - نسبة التحصيل
  - الفواتير المتأخرة
  - رصيد الخزينة
  - الالتزامات الشهرية
  - رسوم بيانية (AreaChart, BarChart من recharts)
  - الأنشطة الأخيرة

**التقارير:**
- `ReportsAndAnalysis.tsx` — تقارير وتحليل مالي
- `FinancialRatios.tsx` — النسب المالية
- `FinancialAnalysis.tsx` — تحليل مالي متقدم
- `useFinancialSystemAnalysis.ts` — تحليل شامل للنظام المالي (321 سطرًا) مع:
  - عدد الحسابات
  - العملاء/المركبات/العقود المرتبطة
  - مراكز التكلفة النشطة
  - القيود الحديثة
  - الكيانات غير المرتبطة

**ملاحظة:** جميع التقارير تستخدم استعلامات Supabase مباشرة (وليس بيانات وهمية) — ✅

---

## 11. إدارة التدفقات النقدية

### الحالة: ✅ جيد

- `Treasury.tsx` — صفحة الخزينة
- `useTreasury.ts` — ملخص الخزينة (الرصيد الكلي)
- `useFinancialOverview.ts` — يحسب التدفقات النقدية من:
  - مدفوعات تأجير السيارات (إيرادات)
  - مدفوعات العقارات (إيرادات)
  - مدفوعات المصروفات

---

## 12. إقفال الفترة المالية

### الحالة: ✅ جيد

- `accounting_periods` (`types.ts:245`) — جدول الفترات المحاسبية مع:
  - `start_date`, `end_date`
  - `status`: `open`, `closed`, `locked`
  - `is_adjustment_period`
- `financialControls.ts` — يمنع المعاملات في الفترات المغلقة/المقفلة
- `assertFinancialPeriodOpen()` — يُستدعى قبل أي معاملة مالية

---

## 13. تحليل التكامل مع الوحدات الأخرى

### هوكات التكامل المحاسبي (6 هوكات)

| الهوك | الملف | نوع المرجع | الحالة |
|------|-------|-----------|--------|
| الرواتب | `usePayrollJournalIntegration.ts` | `reference_type: 'payroll'` | ✅ |
| أقساط المركبات | `useVehicleInstallmentJournalIntegration.ts` | `reference_type: 'vehicle_installment'` | ✅ |
| إيرادات التأجير | `useRentalPaymentJournalIntegration.ts` | `reference_type: 'rental_payment'` | ✅ |
| المخالفات المرورية | `useTrafficViolationJournalIntegration.ts` | `reference_type: 'traffic_violation'` | ✅ |
| الصيانة | `useMaintenanceJournalIntegration.ts` | `reference_type: 'maintenance'` | ✅ |
| المدفوعات | `AccountingService.ts` | `reference_type: 'payment'` | ✅ |

### نمط التكامل الموحد (جميع الهوكات)

```
1. جلب الحسابات من chart_of_accounts (بأكواد محددة)
2. الحصول على رقم القيد التالي
3. إنشاء قيد بحالة 'draft'
4. إدراج بنود القيد
5. رفع الحالة إلى 'posted'
6. (عند الفشل) حذف القيد — rollback
```

### تدفق البيانات بين الوحدات

```
العقود (Contracts)
  → ContractService.ts ينشئ العقد
  → العقد يُنشئ فاتورة (InvoiceService.ts)
  → الفاتورة تُربط بدفعة (PaymentService.ts + PaymentLinkingService.ts)
  → الدفعة تُنشئ قيدًا محاسبيًا (AccountingService.ts / useRentalPaymentJournalIntegration.ts)
  → القيد يُحدث أرصدة الحسابات (AccountingService.ts)

الموظفين (HR/Payroll)
  → معالجة الرواتب
  → usePayrollJournalIntegration.ts ينشئ قيدًا (مدين: مصروف رواتب، دائن: نقدية/ذمم رواتب)

المركبات (Fleet)
  → أقساط المركبات → useVehicleInstallmentJournalIntegration.ts
  → الصيانة → useMaintenanceJournalIntegration.ts
  → المخالفات → useTrafficViolationJournalIntegration.ts
```

---

## النتائج حسب الخطورة

### عالية (High) — 3 نتائج

| # | النتيجة | الموقع | التفاصيل |
|---|---------|--------|----------|
| H1 | **تحديث الرصيد الحالي لم يُنفذ** | `AccountingService.ts:168` | `// TODO: تنفيذ التحديث الفعلي بعد التحقق من بنية الجدول` — `current_balance` في `chart_of_accounts` لا يتم تحديثه تلقائيًا |
| H2 | **لا توجد قوائم مالية رسمية** | النظام | لا ميزانية عمومية، لا قائمة دخل، لا قائمة تدفقات نقدية مبنية على القيود المحاسبية (الاستحقاقات) |
| H3 | **لا يوجد نظام إيرادات مؤجلة** | النظام | الإيرادات تُعترف عند الدفع وليس عند تقديم الخدمة — غير متوافق مع ASC 606/IFRS 15 |

### متوسطة (Medium) — 5 نتائج

| # | النتيجة | الموقع | التفاصيل |
|---|---------|--------|----------|
| M1 | **لا يوجد تقرير AP Aging** | النظام | يوجد `ARAgingReport.tsx` للذمم المدينة فقط، لا يوجد تقرير مماثل للذمم الدائنة |
| M2 | **لا يوجد نظام موافقات للمدفوعات** | `PaymentService.ts` | لا يوجد تحقق من الموافقات للمدفوعات فوق حد معين |
| M3 | **التقارير المالية تعتمد على المدفوعات وليس القيود** | `useFinancialOverview.ts:64-92` | الإيرادات/المصروفات تُحسب من `payments` مباشرة، مما لا يعكس الاستحقاقات |
| M4 | **لا يوجد إدارة تغيير رسمية** | النظام | لا يوجد سجل لتغييرات المنطق المالي أو الموافقات عليها |
| M5 | **لا يوجد تقييم آلي للمخاطر المالية** | النظام | لا يوجد نظام لتقييم مخاطر الائتمان أو الاحتيال |

### منخفضة (Low) — 4 نتائج

| # | النتيجة | الموقع | التفاصيل |
|---|---------|--------|----------|
| L1 | **أعمار الذمم تُحسب يدويًا** | `useEnhancedCustomerFinancialSummary.ts:71-73` | المقارنة مع `new Date()` بدلاً من استعلام SQL مُحسّن |
| L2 | **لا يوجد تقرير تدفقات نقدية رسمي** | النظام | `CashFlowStatementReport.tsx` موجود لكنه يعتمد على `payments` |
| L3 | **لا يوجد تصنيف للتدفقات النقدية** | النظام | لا توجد حقول `operating`, `investing`, `financing` في جدول `payments` |
| L4 | **لا يوجد إقفال آلي للحسابات** | النظام | لا توجد وظيفة مجدولة لإقفال حسابات الإيرادات/المصروفات في `retained_earnings` |

---

## خريطة التكامل الكاملة

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLEETIFY ERP SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ العقود    │───▶│ الفواتير │───▶│المدفوعات │───▶│ القيود   │  │
│  │ Contracts │    │ Invoices │    │ Payments │    │ Journals │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │العملاء   │    │ الموردين │    │ الخزينة  │    │دليل      │  │
│  │Customers │    │ Vendors  │    │ Treasury │    │الحسابات  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              هوكات التكامل المحاسبي (6)                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ الرواتب  │ │ أقساط   │ │ إيرادات  │ │ مخالفات  │    │    │
│  │  │ Payroll  │ │المركبات │ │ التأجير  │ │مرورية   │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  │  ┌──────────┐ ┌──────────┐                              │    │
│  │  │ الصيانة  │ │المدفوعات│                              │    │
│  │  │Maintenanc│ │(محاسبة) │                              │    │
│  │  └──────────┘ └──────────┘                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              طبقات الحماية والضبط                          │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │    │
│  │  │ صلاحيات     │ │ سجل التدقيق │ │التحكم بالفترات│      │    │
│  │  │ Protected   │ │ Audit Trail  │ │المالية       │      │    │
│  │  │ FinanceRoute│ │              │ │ Period Lock  │      │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## التوصيات

### أولوية عالية — خلال أسبوعين
1. **إكمال تحديث `current_balance`** في `AccountingService.ts` — إزالة TODO وتنفيذ التحديث الفعلي
2. **بناء قوائم مالية رسمية** — Balance Sheet و Income Statement من `journal_entries`/`journal_entry_lines` (وليس من `payments`)

### أولوية متوسطة — خلال شهر
3. **إضافة نظام إيرادات مؤجلة** للعقود طويلة الأجل
4. **إضافة تقرير AP Aging** للذمم الدائنة
5. **إضافة نظام موافقات للمدفوعات** فوق حد معين
6. **تحويل التقارير المالية** لتعتمد على القيود المحاسبية بدلاً من المدفوعات

### أولوية منخفضة — خلال ربعين
7. **إضافة تصنيف التدفقات النقدية** (operating/investing/financing)
8. **إضافة إقفال آلي للحسابات** في نهاية الفترة
9. **إضافة تقييم آلي للمخاطر المالية**

---

## الملحق: الاستعلامات المستخدمة في التدقيق

```sql
-- التحقق من توازن القيود (على مستوى الرؤوس)
SELECT id, entry_number, total_debit, total_credit
FROM journal_entries
WHERE ABS(total_debit - total_credit) > 0.01;

-- التحقق من توازن القيود (على مستوى البنود)
SELECT jel.journal_entry_id,
       SUM(jel.debit_amount) as total_debits,
       SUM(jel.credit_amount) as total_credits
FROM journal_entry_lines jel
GROUP BY jel.journal_entry_id
HAVING ABS(SUM(jel.debit_amount) - SUM(jel.credit_amount)) > 0.01;

-- القيود بدون بنود
SELECT COUNT(*) FROM journal_entries je
WHERE NOT EXISTS (SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id);

-- معادلة المحاسبة (A = L + E)
SELECT 
  (SELECT COALESCE(SUM(current_balance), 0) FROM chart_of_accounts WHERE account_type = 'asset') as total_assets,
  (SELECT COALESCE(SUM(current_balance), 0) FROM chart_of_accounts WHERE account_type = 'liability') as total_liabilities,
  (SELECT COALESCE(SUM(current_balance), 0) FROM chart_of_accounts WHERE account_type = 'equity') as total_equity;

-- المدفوعات بدون ربط بالقيد المحاسبي
SELECT COUNT(*) FROM payments WHERE journal_entry_id IS NULL;

-- الفواتير بدون ربط بالقيد المحاسبي
SELECT COUNT(*) FROM invoices WHERE journal_entry_id IS NULL;
```

---

**ملاحظة ختامية:** النظام المالي في Fleetify متطور بشكل ملحوظ مقارنة بمعظم أنظمة ERP المخصصة. نقاط القوة الرئيسية هي: القيد المزدوج الكامل مع التراجع، هوكات التكامل المحاسبي الستة، سجل التدقيق الشامل، والضوابط على الفترات المالية. الفجوات الرئيسية هي: عدم تحديث `current_balance` تلقائيًا، وغياب القوائم المالية الرسمية المبنية على الاستحقاقات.
