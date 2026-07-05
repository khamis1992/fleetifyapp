# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

قم بمراجعة شاملة جديدة وكاملة للنظام المالي في مشروع Fleetify ERP وتكامله مع جميع الوحدات الأخرى. قدم تقريراً مفصلاً باللغة العربية.

هذه مراجعة جديدة تماماً — لا تعتمد على أي تقارير سابقة. اقرأ الكود الفعلي من المصدر.

المطلوب بالتفصيل:

## 1. هيكل النظام المالي
- اقرأ جميع جداول النظام المالي من ملفات types.ts وملفات الترحيل (migrations)
- وثق: chart_of_accounts, journal_entries, journal_entry_lines, account_mappings, financial_periods, financial_approval_policies, financial_approval_requests, financial_approval_actions, financial_report_snapshots, annual_financial_close_runs
- اشرح العلاقات بين الجداول والمفاتيح الخارجية

## 2. التكامل مع كل وحدة — بالتفصيل
لكل وحدة من الوحدات التالية، اقرأ الكود الفعلي واشرح:
- كيف تنشئ القيود المحاسبية؟
- ما هو المنطق المحاسبي (أي حساب مدين وأي حساب دائن)؟
- هل تستخدم Trigger أم RPC أم Frontend code؟
- هل تتحقق من توازن القيد؟
- هل تتحقق من الفترة المالية المفتوحة؟
- هل تطبق فصل المهام (SoD)؟

الوحدات:
أ. **المدفوعات (Payments)** — payments/usePaymentOperations.ts
ب. **الفواتير (Invoices)** — invoices/useInvoices.ts
ج. **العقود (Contracts)** — contracts/useContractCreation.ts + contractJournalEntry.ts
د. **المشتريات (Purchase Orders)** — integrations/useInventoryPurchaseOrders.ts + usePurchaseOrderFinancialIntegration.ts
هـ. **الرواتب (Payroll)** — payroll/usePayrollJournalIntegration.ts
و. **الصيانة (Maintenance)** — maintenance/useMaintenanceJournalIntegration.ts
ز. **مخالفات المرور (Traffic Violations)** — traffic/useTrafficViolationJournalIntegration.ts
ح. **أقساط المركبات (Vehicle Installments)** — vehicle/useVehicleInstallmentJournalIntegration.ts
ط. **الإيجار (Rental Payments)** — rental/useRentalPaymentJournalIntegration.ts

## 3. سير العمل المالي الكامل
- من إنشاء المعاملة → إنشاء القيد → إدراج البنود → الترحيل → الإقفال
- اشرح دور المحفزات (Triggers) في كل خطوة
- اشرح آلية التجاوز (Bypass) ومتى تستخدم

## 4. تحليل المحفزات (Trigger Analysis)
اقرأ جميع ملفات الترحيل المالية ووثق كل محفز:
- اسم المحفز
- الجدول والعملية
- التوقيت (BEFORE/AFTER)
- الشرط
- ماذا يحدث عند المخالفة
- الملف:السطر

## 5. القيود والمشاكل
- أي مشاكل في ترتيب إنشاء القيود (status posted قبل البنود)
- أي مسارات متوازية لإنشاء القيود (خطر الازدواجية)
- أي كود مكرر
- أي منطق محاسبي غير صحيح
- أي ثغرات في الرقابة (SoD, period check, approval workflow)
- أي قيم ثابتة (hardcoded) بدلاً من الحساب الديناميكي

## 6. تقييم عام
- نقاط القوة
- نقاط الضعف
- توصيات مرتبة حسب الأولوية (فوري / قصير / متوسط / بعيد)

هام جداً:
- لا تقم بتغيير أي كود — هذا تقرير فقط
- اقرأ الملفات الفعلية من src/ و supabase/migrations/
- اذكر مراجع ملف:سطر لكل نتيجة
- اكتب التقرير إلى ملف docs/financial-system-integration-audit-v5-2026-07-05.md

## Reasoning
The task is a comprehensive financial system audit requiring analysis of many source files. To keep under 8 subtasks, I grouped integration analyses into four subtasks by module similarity (payments/invoices, contracts/purchase orders, payroll/maintenance, traffic/vehicle/rental). I added a subtask for table structure extraction, one for trigger/workflow analysis, and an overall assessment subtask that depends on all analysis subtasks. The final assembly subtask collects all intermediate findings and writes the final report in Arabic. All analysis subtasks are independent and can run in parallel (group 0), overall assessment runs after them (group 1), and assembly runs last (group 2).

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: contract-purchase-integration, financial-tables-structure, payment-invoice-integration, payroll-maintenance-integration, traffic-vehicle-rental-integration, trigger-workflow-analysis
- Acceptance criteria:
  - A findings file (contract_purchase_findings.md) is created.
  - A JSON file (financial_tables.json) is created containing all financial tables with columns and relationships.
  - A findings file (payment_invoice_findings.md) is created with detailed analysis.
  - A findings file (payroll_maintenance_findings.md) is created.
  - A findings file (traffic_vehicle_rental_findings.md) is created.
  - A findings file (trigger_workflow_findings.md) is created with all triggers documented and workflow described.

### Parallel group 2
- Subtasks: overall-assessment
- Acceptance criteria:
  - A summary JSON file (overall_assessment.json) is created with strengths, weaknesses, recommendations.

### Parallel group 3
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks.

## DAG
- `contract-purchase-integration` group=0 deps=none: Read contracts/useContractCreation.ts, contracts/contractJournalEntry.ts, integrations/useInventoryPurchaseOrders.ts, integrations/usePurchaseOrderFinancialIntegration.ts to analyze journal entry creation for contracts and purchase orders. Document accounting logic, triggers, checks. Output findings file (contract_purchase_findings.md).
- `financial-tables-structure` group=0 deps=none: Read types.ts and all migration files in supabase/migrations/ to extract all financial tables (chart_of_accounts, journal_entries, etc.), their columns, foreign keys, and relationships. Output a structured JSON file (financial_tables.json) with table definitions.
- `payment-invoice-integration` group=0 deps=none: Read payments/usePaymentOperations.ts and invoices/useInvoices.ts to understand how journal entries are created for payments and invoices. Document the accounting logic (debit/credit accounts), whether triggers or RPCs are used, balance checks, period checks, SoD. Output a findings file (payment_invoice_findings.md).
- `payroll-maintenance-integration` group=0 deps=none: Read payroll/usePayrollJournalIntegration.ts and maintenance/useMaintenanceJournalIntegration.ts to analyze journal entry creation for payroll and maintenance. Document accounting logic, triggers, checks. Output findings file (payroll_maintenance_findings.md).
- `traffic-vehicle-rental-integration` group=0 deps=none: Read traffic/useTrafficViolationJournalIntegration.ts, vehicle/useVehicleInstallmentJournalIntegration.ts, rental/useRentalPaymentJournalIntegration.ts to analyze journal entry creation for traffic violations, vehicle installments, and rental payments. Document accounting logic, triggers, checks. Output findings file (traffic_vehicle_rental_findings.md).
- `trigger-workflow-analysis` group=0 deps=none: Read all migration files in supabase/migrations/ that contain financial triggers. Document each trigger: name, table, operation, timing, condition, action, file:line. Also analyze the overall workflow from transaction creation to journal entry posting to period close. Output findings file (trigger_workflow_findings.md).
- `overall-assessment` group=1 deps=financial-tables-structure, payment-invoice-integration, contract-purchase-integration, payroll-maintenance-integration, traffic-vehicle-rental-integration, trigger-workflow-analysis: Based on all findings from previous subtasks (financial_tables.json, payment_invoice_findings.md, contract_purchase_findings.md, payroll_maintenance_findings.md, traffic_vehicle_rental_findings.md, trigger_workflow_findings.md), produce an overall assessment including strengths, weaknesses, and prioritized recommendations. Output a summary JSON file (overall_assessment.json).
- `assembly` group=2 deps=financial-tables-structure, payment-invoice-integration, contract-purchase-integration, payroll-maintenance-integration, traffic-vehicle-rental-integration, trigger-workflow-analysis, overall-assessment: Collect all findings from all prior subtasks (financial_tables.json, payment_invoice_findings.md, contract_purchase_findings.md, payroll_maintenance_findings.md, traffic_vehicle_rental_findings.md, trigger_workflow_findings.md, overall_assessment.json) and produce the final report in Arabic at docs/financial-system-integration-audit-v5-2026-07-05.md. The report must include all sections as specified: financial system structure, integration details for each module, full workflow, trigger analysis, issues, overall assessment. Write in Arabic.
