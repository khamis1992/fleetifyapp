# Plan: ## المهمة: تدقيق شامل للنظام المالي في Fleetify ERP

**المشروع:** C:\Users\khamis\Documents\fleetifyapp
**النوع:** تدقيق فقط — لا تغيير في الكود
**اللغة:** التقرير النهائي بالعربية

## المنهجية المطلوبة (مهم جداً — اتبعها بدقة)

### القاعدة الذهبية: لا تثق بتقارير الـ subagents
كل subagent سيقرأ ملفات ويقدم تقريراً. **يجب التحقق من كل ادعاء بقراءة الملف بنفسك.** كل finding يجب أن يكون له `file:line` reference.

### المرحلة 1: اكتشف السطح المالي
- ابحث عن كل الصفحات المالية: `src/pages/*finance*`, `src/pages/*accounting*`, `src/pages/*invoice*`, `src/pages/*payment*`
- ابحث عن كل hooks المالية: `src/hooks/*finance*`, `src/hooks/*journal*`, `src/hooks/*payment*`, `src/hooks/*ledger*`
- ابحث عن كل مكونات التقارير المالية: `src/components/finance/`
- ابحث عن كل ملفات الـ migration المالية: `supabase/migrations/` التي تحتوي على financial, journal, payment, invoice, control, trigger, rpc
- ابحث عن كل hooks التكامل: `*JournalIntegration*`

### المرحلة 2: اقرأ كل ملف migration مالي
**هذه أهم خطوة.** لا تتخط أي ملف migration. لكل ملف:
1. اقرأ الملف كاملاً
2. استخرج كل `CREATE OR REPLACE FUNCTION` — ماذا تفعل؟
3. استخرج كل `CREATE TRIGGER` — أي جدول، أي عملية، أي توقيت، أي شرط؟
4. استخرج كل دالة trigger — ما الـ exception الذي ترفعه؟
5. استخرج كل RPC — ما الـ parameters، هل هو SECURITY DEFINER؟
6. لاحظ أي `set_config('app.*')` — هذه آليات bypass

### المرحلة 3: ابنِ مصفوفة تريغرات كاملة
جدول بالأعمدة: #, اسم التريغر, الجدول, العملية, التوقيت, الشرط, الـ exception, مصدر الملف:سطر

### المرحلة 4: اقرأ كل hook تكامل
لكل hook من نوع `*JournalIntegration*`:
1. تتبع تسلسل العمليات بالضبط:
   - الخطوة 1: أي جدول؟ أي status؟ (مثلاً: INSERT journal_entries status: 'posted')
   - الخطوة 2: أي جدول تالياً؟ (مثلاً: INSERT journal_entry_lines)
   - الخطوة 3: معالجة الأخطاء؟ (مثلاً: `.delete()` عند rollback)
2. تحقق: هل يمرر `total_debit` و `total_credit`؟
3. تحقق: هل لديه فحص توازن (`Math.abs(total_debit - total_credit) > 0.01`)?
4. تحقق: ما الحسابات التي يستخدمها؟ (حساب مدين، حساب دائن)
5. تحقق: هل المنطق المحاسبي صحيح؟ (مثلاً: قسط مركبة يجب أن يكون مدين: موردين، ليس إيراد)

### المرحلة 5: تقاطع كل عملية hook مع مصفوفة التريغرات
لكل خطوة في كل hook، اسأل:
- "هل هذه العملية ستطلق هذا التريغر؟"
- "ماذا سيفعل التريغر؟ يمرر؟ يمنع؟ يرفع exception؟"
- "إذا منع، ماذا يحدث بعدها؟ هل هناك معالجة أخطاء؟"

**السؤال الرئيسي:** هل ينشئ الـ hook القيد كـ `posted` قبل إدخال البنود؟ إذا نعم، تريغر `prevent_posted_journal_line_mutation` سيمنع إدخال البنود.

### المرحلة 6: تحقق من آلية الـ bypass
1. اقرأ دالة الـ bypass (عادة `financial_controls_bypass_enabled()`)
2. ابحث عن كل استدعاءات `set_config('app.financial_controls_bypass', ...)`
3. حدد: هل تستطيع client-side hooks تفعيل الـ bypass؟ (عادة لا — فقط SECURITY DEFINER RPCs)

### المرحلة 7: تحقق من التقارير المالية
لكل نوع تقرير (Trial Balance, Income Statement, Balance Sheet, Cash Flow):
1. هل يجلب بيانات حقيقية من DB أم يستخدم mock data؟
2. هل يستخدم `Math.abs()`؟ إذا نعم، أين ولماذا؟
3. هل المنطق المحاسبي صحيح؟
4. هل نوع التقرير موجود فعلاً في الـ hook؟

### المرحلة 8: ابحث عن البيانات الوهمية/المثبتة
ابحث عن:
- Account IDs مثبتة يدوياً (مثل `'1203'`, `'5401'`)
- تعليقات `// TODO` في hooks المالية
- تعليقات `// For now` أو `// mock`
- دوال تصدير ترجع رسالة نجاح كاذبة
- حسابات تقديرية (`* 0.8`, `* 0.1`)

### المرحلة 9: تحقق من عرض العملة
ابحث عن `KWD` أو `د.ك` في ملفات `src/components/finance/`
تحقق: هل يستخدم النظام `useCompanyCurrency()` أم يثبت KWD يدوياً؟

### المرحلة 10: اكتب التقرير النهائي

**كل finding يجب أن يكون له:**
- مرجع `file:line` يثبت أنه تم التحقق منه مقابل الكود الحالي
- اسم التريغر/الدالة بالضبط ورقم السطر من ملف الـ migration
- بيان واضح لماذا هذا finding مهم وما تأثيره

**هيكل التقرير:**
1. الملخص التنفيذي (مع أهم finding أولاً)
2. مصفوفة التريغرات الكاملة
3. تسلسل عمليات كل hook (متحقق منها مقابل التريغرات)
4. المنطق المحاسبي لكل hook
5. تحليل التقارير المالية
6. الضوابط الداخلية والامتثال
7. البيانات الوهمية/المثبتة
8. عرض العملة
9. خريطة التكامل (رسم بياني نصي)
10. تقييم المخاطر (حرج/عالٍ/متوسط مع دليل)
11. التوصيات (بدون تغيير كود)
12. بيان المنهجية (ماذا تم، ماذا أخطأت التقارير السابقة)

**اكتب التقرير إلى:** `C:\Users\khamis\Documents\fleetifyapp\docs\financial-system-audit-v5-final.md`

## ملاحظات مهمة من التقارير السابقة (تصحيح الأخطاء)

هذه أخطاء وقعت في تقارير سابقة — تجنبها:

1. **لا تقل "جدول deposits غير موجود"** — النظام يستخدم `customer_deposits` (موجود في `useDeposits.ts:48`)
2. **لا تقل "payroll ليس لديه journal_entry_id"** — الحقل موجود في `types.ts:13712`
3. **لا تقل "RPCs قد لا تكون منشورة"** — الـ RPCs موجودة في `20260702000001` و `20260702153000`
4. **لا تقل "posted entries يمكن حذفها"** — تريغر T3 في `20260627001000:142` يمنع حذف posted entries
5. **لا تقل "cash_flow غير مدعوم"** — مدعوم عبر `CashFlowStatementReport.tsx` + `ledgerCashFlowReportRules.ts`
6. **لا تقل "الموافقات لا تتحقق من المعتمد"** — `canActorApproveFinancialStep()` موجود في `financialApprovalWorkflowRules.ts:110-139` لكنه غير موصول
7. **لا تستخدم `search_files` مع limit لحساب العملة** — استخدم `grep -rl`
8. **لا تذكر A=L+E كحقيقة** — يحتاج استعلام DB مباشر، لا يمكن تأكيده من الكود فقط
9. **لا تقل أن hooks تفشل بسبب missing total_debit/total_credit فقط** — المشكلة الأكبر هي T6 trigger
10. **لا تقل أن payroll يسجل Cash AND Salaries Payable معاً** — اقرأ if/else بعناية

## المخرجات
- تقرير واحد شامل في `docs/financial-system-audit-v5-final.md`
- كل finding بمرجع `file:line`
- مصفوفة تريغرات كاملة
- تسلسل عمليات كل hook مقابل كل تريغر

## Reasoning
Decomposed the financial system audit into 8 subtasks following the methodology phases. Subtask 1 discovers all relevant files. Subtasks 2,4,6,7 analyze migrations, hooks, bypass, and reports in parallel after discovery. Subtask 3 builds trigger matrix from migration analysis. Subtask 5 cross-checks hooks with triggers. Subtask 8 assembles all findings into the final report. Each subtask produces an intermediate file for verification, and the assembly depends on all prior subtasks.

## Risk Level
high

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: discover-financial-surface
- Acceptance criteria:
  - File docs/audit/discovery.txt exists and contains paths to all financial pages, hooks, components, migrations, and integration hooks.

### Parallel group 2
- Subtasks: analyze-bypass-mechanism, analyze-financial-reports, analyze-integration-hooks, analyze-migration-files
- Acceptance criteria:
  - docs/audit/bypass_analysis.md describes the bypass function, all set_config calls, and whether client-side can enable it.
  - docs/audit/reports_analysis.md contains findings for each report type: data source, Math.abs usage, hardcoded values, currency, mock data.
  - docs/audit/hooks_analysis.json contains for each hook: step-by-step operations, balance check, accounts used, error handling.
  - docs/audit/migrations_analysis.json contains entries for each migration file with extracted functions, triggers, RPCs, and bypass calls.

### Parallel group 3
- Subtasks: build-trigger-matrix
- Acceptance criteria:
  - docs/audit/trigger_matrix.md contains a markdown table with all triggers from migration files, with correct file:line references.

### Parallel group 4
- Subtasks: cross-check-hooks-triggers
- Acceptance criteria:
  - docs/audit/cross_check.md contains for each hook step: trigger name, action, outcome, and whether error handling exists.

### Parallel group 5
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file docs/financial-system-audit-v5-final.md is written and contains all findings from prior subtasks with file:line references, trigger matrix, hook sequences, cross-check, bypass, reports analysis, and all required sections.

## DAG
- `discover-financial-surface` group=0 deps=none: Search for all financial-related files: pages (src/pages/*finance*, *accounting*, *invoice*, *payment*), hooks (src/hooks/*finance*, *journal*, *payment*, *ledger*), components (src/components/finance/), migrations (supabase/migrations/ with financial keywords), and integration hooks (*JournalIntegration*). Use grep and find commands. Save list to docs/audit/discovery.txt.
- `analyze-bypass-mechanism` group=1 deps=discover-financial-surface: Read the bypass function (likely financial_controls_bypass_enabled) and find all set_config('app.financial_controls_bypass', ...) calls in migration files. Determine if client-side hooks can enable bypass. Save analysis to docs/audit/bypass_analysis.md.
- `analyze-financial-reports` group=1 deps=discover-financial-surface: Read all financial report components (TrialBalance, IncomeStatement, BalanceSheet, CashFlow) from src/components/finance/ and related hooks. Check if they use real DB data or mock, use of Math.abs, hardcoded account IDs, TODO comments, currency handling (KWD). Also check for hardcoded KWD in src/components/finance/. Save analysis to docs/audit/reports_analysis.md.
- `analyze-integration-hooks` group=1 deps=discover-financial-surface: Read all *JournalIntegration* hook files (from discovery). For each, trace the exact sequence of operations: which tables, statuses, balance checks, account IDs, error handling. Save analysis to docs/audit/hooks_analysis.json.
- `analyze-migration-files` group=1 deps=discover-financial-surface: Read every migration file in supabase/migrations/ that contains financial keywords (financial, journal, payment, invoice, control, trigger, rpc). For each, extract all CREATE OR REPLACE FUNCTION, CREATE TRIGGER, trigger functions, RPCs, and set_config calls. Save structured analysis to docs/audit/migrations_analysis.json.
- `build-trigger-matrix` group=2 deps=analyze-migration-files: From migrations_analysis.json, build a complete trigger matrix table with columns: #, trigger name, table, operation, timing, condition, exception, source file:line. Save to docs/audit/trigger_matrix.md.
- `cross-check-hooks-triggers` group=3 deps=build-trigger-matrix, analyze-integration-hooks: For each step in each hook (from hooks_analysis.json), determine which triggers from trigger_matrix.md would fire. Analyze if the trigger would pass, block, or raise exception. Document the interaction. Save to docs/audit/cross_check.md.
- `assembly` group=4 deps=discover-financial-surface, analyze-migration-files, build-trigger-matrix, analyze-integration-hooks, cross-check-hooks-triggers, analyze-bypass-mechanism, analyze-financial-reports: Collect all findings from prior subtasks (discovery, migrations_analysis, trigger_matrix, hooks_analysis, cross_check, bypass_analysis, reports_analysis). Write the final comprehensive audit report in Arabic to docs/financial-system-audit-v5-final.md following the required structure (executive summary, trigger matrix, hook sequences, cross-check, bypass, reports, internal controls, hardcoded data, currency, integration map, risk assessment, recommendations, methodology statement). Verify each finding against actual code by reading the referenced files. Ensure no false claims from previous reports.
