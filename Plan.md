# Plan: قم بمراجعة شاملة للنظام المالي في مشروع Fleetify ERP وتكامله مع بقية الوحدات. هذا تدقيق READ-ONLY — لا تقم بتغيير أي كود. قدم تقريراً كاملاً باللغة العربية.

المشروع: C:\Users\khamis\Documents\fleetifyapp

## المنهجية (من financial-system-audit-verification skill)

### المرحلة 1: قراءة كل ملفات الـ migrations المالية
- اقرأ كل ملف في `supabase/migrations/` له علاقة بالنظام المالي (financial, journal, payment, control, trigger, rpc, invoice)
- استخرج كل trigger: أي جدول، أي عملية، أي شرط، أي استثناء
- استخرج كل RPC: ما المعاملات، هل SECURITY DEFINER؟
- استخرج كل دالة bypass: كيف تُفعّل؟

### المرحلة 2: بناء مصفوفة التريغرات
أنشئ جدولاً كاملاً: T1, T2, T3... إلخ مع:
- اسم التريغر
- الجدول المستهدف
- العملية (INSERT/UPDATE/DELETE)
- التوقيت (BEFORE/AFTER)
- الشرط
- الاستثناء المرفوع
- الملف والسطر

### المرحلة 3: قراءة كل hooks التكامل
اقرأ كل ملف يطابق `*JournalIntegration*` في `src/hooks/`:
- useRentalPaymentJournalIntegration.ts
- useTrafficViolationJournalIntegration.ts
- useMaintenanceJournalIntegration.ts
- useVehicleInstallmentJournalIntegration.ts
- usePayrollJournalIntegration.ts
- useConvertToLegalCase.ts (إن وجد)
- usePaymentOperations.ts (للمقارنة - هذا الـ hook الصحيح)

لكل hook، تتبع تسلسل العمليات:
1. أي جدول أولاً؟ بأي status؟
2. أي جدول ثانياً؟
3. هل يمرر total_debit و total_credit؟
4. هل يتحقق من التوازن؟
5. ما هي الحسابات المدينة والدائنة؟
6. ماذا يحدث عند الخطأ (rollback)؟

### المرحلة 4: تقاطع كل عملية hook مع مصفوفة التريغرات
لكل خطوة في كل hook:
- "هل هذه العملية ستطلق هذا التريغر؟"
- "ماذا سيفعل التريغر؟ يمرر؟ يمنع؟ يرفع استثناء؟"
- "إذا منع، ماذا سيحدث بعد ذلك؟"

السؤال المفتاحي: هل الـ hook ينشئ journal_entries بحالة posted قبل إدخال journal_entry_lines؟
إذا نعم → تريغر 20260627011000 سيمنع إدخال البنود.

### المرحلة 5: التحقق من آلية الـ bypass
- اقرأ دالة `financial_controls_bypass_enabled()`
- ابحث عن كل استدعاءات `set_config('app.financial_controls_bypass', ...)`
- هل تستطيع hooks الـ client-side تفعيل الـ bypass؟

### المرحلة 6: فحص التقارير المالية
- useEnhancedFinancialReports.ts — ما أنواع التقارير المدعومة؟
- CashFlowStatementReport.tsx — هل هو موجود؟ كيف يحسب التدفقات النقدية؟
- useFinancialIntegrityReport.ts — ماذا يفحص؟
- هل هناك mock data أو حسابات تقديرية (* 0.8, * 0.1)؟
- هل Math.abs() يُستخدم في أماكن تخفي أخطاء محاسبية؟

### المرحلة 7: فحص المدفوعات والتحكم
- usePaymentOperations.ts — ما الأعمدة التي يكتبها في payments؟
- هل أعمدة approved_by, approved_at, cancelled_at, cancelled_by موجودة في types.ts؟
- اقرأ RPCs: ensure_payment_journal_entry, cancel_payment_with_reversal
- كم عدد المدفوعات غير المرتبطة (unlinked payments)؟

### المرحلة 8: فحص الضوابط والامتثال
- هل `canActorApproveFinancialStep()` موصولة فعلياً أم موجودة فقط في tests؟
- هل هناك جدولي تدقيق منفصلين (audit_logs ≠ audit_trail)؟
- هل منطق الإقفال الشهري والسنوي موجود؟
- هل فحص الفترة المقفلة مطبق في hooks التكامل؟

### المرحلة 9: كشف البيانات الوهمية والثوابت
- ابحث عن معرفات حسابات ثابتة (مثل '1203', '5401')
- ابحث عن mock data في الـ hooks المالية
- ابحث عن دوال تصدير وهمية (تطبع "تم التصدير" بدون ملف فعلي)
- ابحث عن استخدام KWD/د.ك بدل QAR/ر.ق

### المرحلة 10: كتابة التقرير النهائي
اكتب التقرير إلى: `C:\Users\khamis\Documents\fleetifyapp\docs\financial-system-integration-audit-ar.md`

هيكل التقرير:
1. ملخص تنفيذي (أهم نتيجة حرجة أولاً)
2. مصفوفة التريغرات الكاملة (T1–T7+)
3. تحليل كل hook تكامل (تسلسل العمليات + التقاطع مع التريغرات)
4. المنطق المحاسبي لكل hook (مدين/دائن، صحة الحسابات)
5. تحليل التقارير المالية
6. الضوابط والامتثال
7. البيانات الوهمية والثوابت
8. عرض العملة (KWD vs QAR)
9. خريطة التكامل (رسم بياني نصي)
10. تقييم المخاطر (حرج/عالي/متوسط مع الأدلة)
11. التوصيات (بدون تغيير كود)
12. بيان المنهجية (ماذا تم فعله، مقارنة بالتقارير السابقة)

## قواعد صارمة

1. **كل نتيجة يجب أن توثق بـ file:line** — لا تقبل أي ادعاء بدون دليل من الملف الفعلي
2. **لا تثق بتقارير الـ subagents** — اقرأ الملفات بنفسك
3. **لا تتخط أي ملف migration** — اقرأ كل ملف له علاقة ولو بسيطة
4. **لا تدّعي أن A=L+E متوازن من فحص الكود فقط** — هذا يحتاج استعلام مباشر من قاعدة البيانات
5. **استخدم grep -rl للعد الدقيق** للملفات التي تستخدم KWD
6. **ابحث عن التقارير في كل المكونات** وليس فقط في useEnhancedFinancialReports
7. **ابحث عن دوال التحقق من الصلاحيات في utility files** وليس فقط في الـ hook الرئيسي

## سياق من التقارير السابقة (للتحقق منه)

التقرير v4 السابق وجد أن:
- migration 20260627011000 أنشأ تريغر يمنع INSERT/UPDATE/DELETE على journal_entry_lines إذا كان القيد الأب posted
- كل hooks التكامل الستة تنشئ القيد كـ posted قبل إدخال البنود → فشل صامت
- usePaymentOperations.ts هو الوحيد الذي يتبع draft → lines → posted
- قيد أقساط المركبات مدين خطأ (إيراد بدل موردين)
- قيد الرواتب غير متزن عند وجود استقطاعات
- canActorApproveFinancialStep موجودة لكن غير موصولة
- 25+ مكون مالي يستخدم KWD بدل QAR
- التصدير وهمي
- أعمدة مفقودة في payments

تحقق من كل هذه النتائج ضد الكود الحالي. صحح أي خطأ. أضف أي اكتشاف جديد.

## Reasoning
Decomposed the 10-phase audit into 6 independent analysis subtasks plus an assembly subtask. Subtask 1 (triggers/RPCs) is foundational; subtask 2 (hooks) depends on it. Subtasks 3–6 (reports, payments, controls, dummy data) can run in parallel with each other and with subtask 2. Each subtask produces a structured JSON file, and the assembly subtask collects them into the final Arabic report. This maximizes parallelism while keeping each subtask independently executable and verifiable.

## Risk Level
high

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: extract-triggers-rpcs
- Acceptance criteria:
  - docs/audit-triggers.json exists and contains: (a) trigger matrix with at least T1–T7 entries, each with file:line, table, operation, timing, condition, exception; (b) list of all financial RPCs with parameters and SECURITY DEFINER flag; (c) bypass function source and location.

### Parallel group 2
- Subtasks: analyze-integration-hooks, detect-dummy-data, examine-controls-compliance, examine-financial-reports, examine-payments-controls
- Acceptance criteria:
  - docs/audit-hooks.json exists and contains for each hook: (a) step-by-step operation sequence with table/status; (b) debit/credit accounts used; (c) whether total_debit==total_credit is checked; (d) which triggers fire at each step and whether they would block; (e) error/rollback behavior.
  - docs/audit-dummy.json exists and contains: (a) list of hardcoded account IDs with file:line; (b) mock data instances; (c) fake export functions; (d) count of files using KWD/د.ك with examples.
  - docs/audit-compliance.json exists and contains: (a) all locations of canActorApproveFinancialStep with call context; (b) differences between audit_logs and audit_trail; (c) presence/absence of closing logic; (d) any period-closed enforcement in hooks.
  - docs/audit-reports.json exists and contains: (a) list of all report types; (b) cash flow calculation method with file:line; (c) any mock data or hardcoded multipliers; (d) all Math.abs() usages in financial calculations with context.
  - docs/audit-payments.json exists and contains: (a) column mapping from usePaymentOperations to payments table; (b) presence/absence of approval/cancellation columns in types.ts; (c) RPC behavior summary; (d) unlinked payment count from fix scripts.

### Parallel group 3
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file docs/financial-system-integration-audit-ar.md is written and contains all findings from prior subtasks, with every claim backed by file:line references, and all required sections present.

## DAG
- `extract-triggers-rpcs` group=0 deps=none: Read all financial-related migration files in supabase/migrations/, extract every trigger (table, operation, timing, condition, exception) with file:line, every RPC (parameters, SECURITY DEFINER), and the bypass function financial_controls_bypass_enabled(). Build a complete trigger matrix (T1, T2, ...) and output as docs/audit-triggers.json.
- `analyze-integration-hooks` group=1 deps=extract-triggers-rpcs: Read all *JournalIntegration* hooks (useRentalPaymentJournalIntegration, useTrafficViolationJournalIntegration, useMaintenanceJournalIntegration, useVehicleInstallmentJournalIntegration, usePayrollJournalIntegration, useConvertToLegalCase) and usePaymentOperations. For each, trace the operation sequence (which table first, status, debit/credit accounts, balance check, error handling). Cross-reference each step with the trigger matrix from subtask 1 to determine which triggers fire and whether they block the operation. Output as docs/audit-hooks.json.
- `detect-dummy-data` group=1 deps=none: Search all source files for hardcoded account IDs (e.g., '1203', '5401'), mock data in financial hooks, fake export functions (e.g., console.log('تم التصدير') without actual file), and any usage of KWD/د.ك instead of QAR/ر.ق. Count files and occurrences. Output as docs/audit-dummy.json.
- `examine-controls-compliance` group=1 deps=none: Search the entire codebase for canActorApproveFinancialStep usage (is it wired or only in tests?), audit_logs vs audit_trail tables, monthly/yearly closing logic, and period-closed checks in integration hooks. Output as docs/audit-compliance.json.
- `examine-financial-reports` group=1 deps=none: Read useEnhancedFinancialReports.ts, CashFlowStatementReport.tsx, useFinancialIntegrityReport.ts, and any other report components. Identify supported report types, how cash flows are calculated, any mock data or hardcoded multipliers (e.g., *0.8), and any Math.abs() usage that could mask accounting errors. Output as docs/audit-reports.json.
- `examine-payments-controls` group=1 deps=none: Read usePaymentOperations.ts to identify which columns it writes to payments. Check types.ts for approved_by, approved_at, cancelled_at, cancelled_by columns. Read RPC definitions for ensure_payment_journal_entry and cancel_payment_with_reversal. Count unlinked payments from the fix scripts (fix_payments_invoices_v2.py, fix_payments_link2.py). Output as docs/audit-payments.json.
- `assembly` group=2 deps=extract-triggers-rpcs, analyze-integration-hooks, examine-financial-reports, examine-payments-controls, examine-controls-compliance, detect-dummy-data: Collect all intermediate JSON files (audit-triggers.json, audit-hooks.json, audit-reports.json, audit-payments.json, audit-compliance.json, audit-dummy.json) and compile the final comprehensive audit report in Arabic at docs/financial-system-integration-audit-ar.md. Follow the required structure: executive summary, trigger matrix, hook analysis, accounting logic, reports analysis, controls & compliance, dummy data & constants, currency, integration map, risk assessment, recommendations, methodology statement. Verify all findings are backed by file:line references from the intermediate files.
