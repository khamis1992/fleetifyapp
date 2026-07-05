# Plan: توسيع تدقيق النظام المالي والتكامل في Fleetify ERP — تقرير فقط، لا تغيير في الكود

## المهمة
أكمل التدقيق المالي الموجود في `docs/financial-system-integration-audit-report.md` بإضافة الأقسام التالية. النتيجة النهائية يجب أن تكون تقريرًا واحدًا كاملاً في ملف `docs/financial-system-integration-audit-report-comprehensive.md`.

## الأقسام المطلوب إضافتها

### 1. فحص Edge Functions الـ 48
- افحص جميع الـ Edge Functions في `src/functions/` أو `supabase/functions/`
- لكل function: هل تتحقق من auth (JWT)؟ هل تتحقق من company_id؟
- هل تستخدم service role key بدون تحقق مناسب؟
- قائمة بجميع الـ functions مع حالة auth/company validation
- راجع الملفات الموجودة في `src/server/` أيضاً

### 2. تحليل RLS Policies
- افحص ملفات الـ migrations في `src/migrations/` أو `supabase/migrations/`
- ابحث عن RLS policies للجداول المالية: `journal_entries`, `journal_entry_lines`, `chart_of_accounts`, `payments`, `invoices`
- هل الـ policies تفرض company isolation؟
- هل هناك أي policies مفقودة أو ضعيفة؟

### 3. فحص قاعدة البيانات الحية عبر Supabase API
- اقرأ ملف `.env` لاستخراج رابط Supabase والمفاتيح
- استخدم `curl` مع service role key لفحص:
  - عدد القيود المحاسبية
  - القيود غير المتوازنة (debit ≠ credit)
  - القيود بدون بنود
  - المدفوعات بدون journal_entry_id
  - الفواتير بدون journal_entry_id
  - معادلة A = L + E (إن أمكن)
- **هام:** استخدم pagination (HTTP Range headers) لجلب كل البيانات، لا تعتمد على default limit 1000

### 4. تحليل الأمان (Security Audit)
- فحص `validateEnv.ts` — هل هناك مفاتيح احتياطية/fallback؟
- فحص `.env` و `.env.example` — هل هناك مفاتيح مسربة؟
- فحص `src/components/finance/ProtectedFinanceRoute.tsx` — هل الحماية كافية؟
- فحص صلاحيات الـ API endpoints
- البحث عن أي hardcoded credentials أو fallback keys

### 5. تدقيق i18n
- افحص ملفات الترجمة في `src/translations/` أو `src/locales/`
- هل جميع النصوص في الصفحات المالية (`src/pages/finance/`) تستخدم `t()` أو `useTranslation`؟
- هل هناك hardcoded English/Arabic labels؟
- قياس نسبة التغطية اللغوية

### 6. تحليل الأداء
- هل هناك استعلامات N+1 في الـ hooks المالية؟
- هل هناك `useQuery` بدون `staleTime` مناسب؟
- هل هناك مكونات ثقيلة بدون `React.memo` أو `useMemo`؟
- هل هناك استعلامات متكررة أو غير محسّنة؟

### 7. التحقق من نتائج التقرير السابق
- اقرأ التقرير الموجود في `docs/financial-system-integration-audit-report.md`
- تحقق من كل finding بشكل مستقل:
  - H1: هل `AccountingService.ts:168` لا يزال TODO؟
  - H2: هل توجد صفحات قوائم مالية رسمية؟
  - H3: هل يوجد deferred_revenue table؟
  - M1: هل يوجد AP Aging report؟
  - M2: هل PaymentService.ts يتحقق من الموافقات؟
  - M3: هل useFinancialOverview.ts يستخدم payments مباشرة؟
  - L1-L4: تحقق من وجودها

## قواعد صارمة
1. **لا تغيير في الكود** — تقرير فقط
2. كل finding يجب أن يكون له مرجع `file:line` محدد
3. استخدم `read_file` و `search_files` للتحقق المباشر — لا تعتمد على تقارير ذاتية
4. إذا كان هناك تعارض مع التقرير السابق، وثّق التعارض
5. استخدم pagination في استعلامات Supabase (HTTP Range headers)
6. النتيجة النهائية: ملف واحد شامل في `docs/financial-system-integration-audit-report-comprehensive.md`

## مسار المشروع
C:\Users\khamis\Documents\fleetifyapp

## Reasoning
The task requires expanding an existing audit report with 7 independent sections, plus a final assembly. Each section can be investigated in parallel because they involve reading different files or running independent Supabase queries. The last subtask (assembly) depends on all others to produce the final comprehensive report. Maximum 8 subtasks allows one per section plus assembly.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: edge-functions-audit, i18n-audit, live-database-audit, performance-audit, rls-policies-audit, security-audit, verify-previous-findings
- Acceptance criteria:
  - All Edge Functions are listed with their auth/company validation status. Missing or weak validations are documented with file:line references.
  - All finance pages checked for i18n usage. Hardcoded strings listed with file:line. Language coverage percentage calculated.
  - All required queries executed with pagination. Results include counts and examples of anomalies. No default limit of 1000 used.
  - All financial hooks and components reviewed. Performance issues documented with file:line and suggested fixes.
  - All RLS policies for financial tables are listed with their SQL definitions. Missing or weak policies are identified with file:line references.
  - All security checks completed. Any hardcoded credentials, fallback keys, or weak protections are documented with file:line references.
  - Each previous finding is independently verified. Discrepancies or confirmations documented with current file:line references.

### Parallel group 2
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks, structured as required.

## DAG
- `edge-functions-audit` group=0 deps=none: Scan all Edge Functions in src/functions/ or supabase/functions/ and src/server/ for JWT auth verification and company_id validation. List each function with its auth/company validation status. Report findings in a structured section.
- `i18n-audit` group=0 deps=none: Examine translation files in src/translations/ or src/locales/ and all finance pages in src/pages/finance/. Check if all UI strings use t() or useTranslation. Identify hardcoded English/Arabic labels. Measure language coverage (percentage of keys translated). Report findings.
- `live-database-audit` group=0 deps=none: Read .env to get Supabase URL and service role key. Use curl with HTTP Range headers (pagination) to query: count of journal_entries, unbalanced entries (debit != credit), entries without lines, payments without journal_entry_id, invoices without journal_entry_id, and check A=L+E if possible. Report all findings with actual numbers.
- `performance-audit` group=0 deps=none: Examine financial hooks (e.g., useFinancialOverview, usePayments, etc.) for N+1 queries, missing staleTime in useQuery, heavy components without React.memo or useMemo, and repeated/unoptimized queries. Report findings with file:line references.
- `rls-policies-audit` group=0 deps=none: Examine migration files in src/migrations/ or supabase/migrations/ for RLS policies on tables: journal_entries, journal_entry_lines, chart_of_accounts, payments, invoices. Check if policies enforce company isolation. Report any missing or weak policies.
- `security-audit` group=0 deps=none: Examine validateEnv.ts for fallback keys, .env and .env.example for leaked keys, src/components/finance/ProtectedFinanceRoute.tsx for protection adequacy, and search for hardcoded credentials or fallback keys across the codebase. Report all findings with file:line references.
- `verify-previous-findings` group=0 deps=none: Read docs/financial-system-integration-audit-report.md. For each finding (H1, H2, H3, M1, M2, M3, L1-L4), independently verify using file reads and searches. Check if AccountingService.ts:168 still has TODO, if official financial report pages exist, if deferred_revenue table exists, if AP Aging report exists, if PaymentService.ts checks approvals, if useFinancialOverview uses payments directly, and existence of L1-L4. Report any discrepancies.
- `assembly` group=1 deps=edge-functions-audit, rls-policies-audit, live-database-audit, security-audit, i18n-audit, performance-audit, verify-previous-findings: Collect all findings from the 7 prior subtasks and produce the final comprehensive audit report in docs/financial-system-integration-audit-report-comprehensive.md. The report must include all sections in the specified order, with file:line references, and note any conflicts with the previous report.
