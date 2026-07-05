# Plan: قم بعمل فحص (Audit) جديد وحديث وشامل للنظام المالي في تطبيق Fleetify، تأكد أن تقرأ الأكواد الفعلية الآن ولا تعتمد على ملفات قديمة. قم بفحص Edge Functions الـ 48، تحليل RLS policies، وفحص قاعدة البيانات الحية عبر Supabase API إذا لزم الأمر. أضف أقساماً جديدة مثل تحليل الأداء، تحليل الأمان، وتدقيق i18n. تحقق من النتائج - يجب تشغيل AGI للتحقق من كل finding في التقرير بشكل مستقل. لا تقم بتغيير أي كود، فقط قدم تقريراً مفصلاً وحديثاً باسم docs/financial-system-audit-v5-final.md

## Reasoning
The task requires a comprehensive audit of the financial system in Fleetify, including Edge Functions, RLS policies, database checks, performance, security, and i18n analysis. The decomposition ensures each subtask is independently executable and verifiable, with the final assembly task compiling all findings into a single report.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: audit-database-live, audit-edge-functions, audit-i18n, audit-performance, audit-rls-policies, audit-security
- Acceptance criteria:
  - A JSON file is created with findings from the live database audit, including discrepancies and recommendations.
  - A JSON file is created with findings for each Edge Function, including potential issues and recommendations.
  - A JSON file is created with i18n findings and recommendations for improvement.
  - A JSON file is created with performance metrics and recommendations for optimization.
  - A JSON file is created with findings for each RLS policy, including potential misconfigurations and recommendations.
  - A JSON file is created with security findings and recommendations for hardening.

### Parallel group 2
- Subtasks: verify-findings
- Acceptance criteria:
  - A verified JSON file is created with confirmed findings and any corrections to prior results.

### Parallel group 3
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks, verified and structured clearly.

## DAG
- `audit-database-live` group=0 deps=none: Query the live Supabase database to verify schema consistency, data integrity, and financial data accuracy.
- `audit-edge-functions` group=0 deps=none: Analyze all 48 Edge Functions for financial logic, security, and performance. Document findings in a structured format.
- `audit-i18n` group=0 deps=none: Analyze the internationalization (i18n) support for financial features, including currency handling and localization.
- `audit-performance` group=0 deps=none: Analyze the performance of financial operations, including query execution times and API response times.
- `audit-rls-policies` group=0 deps=none: Review all Row-Level Security (RLS) policies in the Supabase configuration for correctness and security.
- `audit-security` group=0 deps=none: Review the security of financial operations, including authentication, authorization, and data encryption.
- `verify-findings` group=1 deps=audit-edge-functions, audit-rls-policies, audit-database-live, audit-performance, audit-security, audit-i18n: Use AGI to independently verify each finding from the prior subtasks. Cross-check results for accuracy.
- `assembly` group=2 deps=audit-edge-functions, audit-rls-policies, audit-database-live, audit-performance, audit-security, audit-i18n, verify-findings: Compile all findings into a final report named docs/financial-system-audit-v5-final.md. Ensure the report is comprehensive and well-structured.
