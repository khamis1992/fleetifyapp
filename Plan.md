# Plan: قم بمراجعة شاملة للنظام المالي في مشروع Fleetify (C:\Users\khamis\Documents\fleetifyapp) وتكامله مع بقية الوحدات. قدم تقريراً كاملاً بدون تغيير أي كود.

المطلوب:
1. فحص جميع ملفات النظام المالي: الصفحات (pages/finance/، pages/Finance.tsx، pages/FinancialTracking.tsx، pages/SyncPaymentsToLedger.tsx)، المكونات (components/finance/)، الهوكس (hooks/finance/، hooks/useFinance.ts، hooks/useGeneralLedger.ts، hooks/useChartOfAccounts.ts، hooks/useEnhancedFinancialReports.ts، hooks/useFinancialAnalysis.ts، hooks/useFinancialOverview.ts، hooks/useFinancialAudit.ts، hooks/useTreasury.ts، hooks/useMonthlyObligations.ts، hooks/useMonthlyRentTracking.ts، hooks/useCostCenterReports.ts، hooks/useCostCenters.ts، hooks/useCustomerFinancialSummary.ts، hooks/useFleetFinancialAnalytics.ts، hooks/useAdvancedFinancialAnalytics.ts، hooks/useAdvancedFinancialRatios.ts، hooks/useFinancialReportsExport.ts، hooks/useFinancialSystemAnalysis.ts، hooks/useFinancialAIAnalysis.ts، hooks/useFinancialFixes.ts، hooks/usePayrollFinancialAnalysis.ts، hooks/usePendingJournalEntries.ts، hooks/useJournalEntryPermissions.ts، hooks/useInvoiceJournalLinking.ts، hooks/useInvoiceMatching.ts، hooks/useReportingAccounts.ts، hooks/useEntryAllowedAccounts.ts، hooks/useAccountMappings.ts، hooks/useEssentialAccountMappings.ts، hooks/useEnhancedAccountDeletion.ts، hooks/useEnhancedAccountSuggestions.ts، hooks/useEnhancedChartOfAccountsCSVUpload.ts، hooks/useCopySelectedAccounts.ts، hooks/useAccountingWizard.ts، hooks/useAccountConflictCheck.ts، hooks/useDeposits.ts، hooks/useDelinquencyStats.ts، hooks/useLateFines.ts، hooks/usePaymentSchedules.ts، hooks/useCustomerAccounts.ts، hooks/useCustomerAccountStatement.ts، hooks/useCustomerAccountTypes.ts، hooks/useEnhancedCustomerAccounts.ts، hooks/useEnhancedCustomerFinancials.ts، hooks/useVendorAccounts.ts، hooks/useCreateCustomerWithAccount.ts، hooks/useSimpleAccountDeletion.ts، hooks/useUnifiedAccountSelector.ts)، الخدمات (services/AccountingService.ts، services/financialControls.ts، services/PaymentService.ts، services/PaymentLinkingService.ts، services/PaymentStateMachine.ts، services/InvoiceService.ts، services/UnifiedInvoiceService.ts، services/reportDataService.ts)

2. فحص جميع نقاط التكامل مع الوحدات الأخرى:
   - التكامل مع العقود (Contracts): hooks/useContracts.ts، hooks/useContractsData.tsx، pages/contracts/
   - التكامل مع الإيجارات (Rental Payments): hooks/useRentalPaymentJournalIntegration.ts، hooks/useRentalPayments.ts
   - التكامل مع الصيانة (Maintenance): hooks/useMaintenanceJournalIntegration.ts، hooks/useMaintenanceDetails.ts
   - التكامل مع الرواتب (Payroll): hooks/usePayrollJournalIntegration.ts، hooks/usePayroll.ts
   - التكامل مع مخالفات المرور (Traffic Violations): hooks/useTrafficViolationJournalIntegration.ts، hooks/useTrafficViolationPayments.ts
   - التكامل مع أقساط المركبات (Vehicle Installments): hooks/useVehicleInstallmentJournalIntegration.ts، hooks/useVehicleInstallments.ts
   - التكامل مع الفواتير (Invoices): hooks/useInvoiceJournalLinking.ts، hooks/useInvoiceMatching.ts، services/InvoiceService.ts
   - التكامل مع المدفوعات (Payments): hooks/usePayments.unified.ts، services/PaymentService.ts، services/PaymentLinkingService.ts
   - التكامل مع التحصيلات (Collections): hooks/useMonthlyCollections.ts
   - التكامل مع العملاء (Customers): hooks/useCustomerAccounts.ts، hooks/useEnhancedCustomerFinancials.ts
   - التكامل مع المخزون (Inventory): hooks/useInventoryReports.ts
   - التكامل مع الموارد البشرية (HR): hooks/useHRReports.ts
   - التكامل مع التقارير (Reports): hooks/useUnifiedReports.ts، hooks/useModuleReportData.ts
   - التكامل مع الفريق (Team): hooks/useEmployeeDetailedReport.tsx
   - التكامل مع التحليل المالي (Financial Analysis): hooks/useFinancialAnalysis.ts، hooks/useAdvancedFinancialAnalytics.ts
   - التكامل مع التدقيق (Audit): hooks/useFinancialAudit.ts، hooks/useAuditLog.ts، hooks/useAuditTrail.ts
   - التكامل مع الموافقات (Approvals): hooks/useApprovalWorkflows.ts
   - التكامل مع النظام القانوني (Legal): hooks/useLegalCollectionReport.ts، hooks/usePaymentLegalIntegration.ts
   - التكامل مع الموردين (Vendors): hooks/useVendorAccounts.ts

3. فحص قاعدة البيانات: ملفات SQL في supabase/ والمجلدات المتعلقة بالمigrations

4. فحص التوجيه (Routing): كيف يتم ربط الصفحات المالية في نظام التوجيه

5. فحص الأمان والصلاحيات: hooks/useJournalEntryPermissions.ts، hooks/usePermissionCheck.ts، hooks/usePermissions.ts، hooks/useRolePermissions.ts، hooks/useUserPermissions.ts، hooks/useFeatureAccess.ts

المخرجات المطلوبة:
- تقرير كامل باللغة العربية عن النظام المالي وتكامله
- تحديد نقاط القوة والضعف
- تحديد الثغرات في التكامل
- توصيات للتحسين
- الإشارة إلى ملفات محددة مع أرقام الأسطر لكل finding

## Reasoning
The task is a comprehensive audit of the financial system and its integrations. I decomposed it into 5 independent subtasks covering: (1) core financial files (pages, components, hooks, services), (2) integration points with other modules, (3) database schema and migrations, (4) routing for financial pages, and (5) security/permissions hooks. Each subtask reads specific files and produces structured findings. The final subtask (assembly) collects all findings and writes the final Arabic report. All subtasks are independent and can run in parallel, except assembly which depends on all.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: review-core-financial-files, review-database-schema, review-integration-points, review-routing, review-security-permissions
- Acceptance criteria:
  - A structured findings document (JSON or markdown) is produced listing strengths, weaknesses, gaps, and recommendations for each file, with specific line numbers where issues are found.
  - A structured findings document (JSON or markdown) is produced listing schema strengths, weaknesses, gaps, and recommendations, with specific file paths and line numbers where issues are found.
  - A structured findings document (JSON or markdown) is produced listing integration strengths, weaknesses, gaps, and recommendations for each integration point, with specific line numbers where issues are found.
  - A structured findings document (JSON or markdown) is produced listing routing strengths, weaknesses, gaps, and recommendations, with specific file paths and line numbers where issues are found.
  - A structured findings document (JSON or markdown) is produced listing security strengths, weaknesses, gaps, and recommendations, with specific file paths and line numbers where issues are found.

### Parallel group 2
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file 'financial-system-audit-report.md' is written and contains all findings from prior subtasks in Arabic, with clear structure and actionable recommendations.

## DAG
- `review-core-financial-files` group=0 deps=none: Read and analyze all core financial system files: pages (pages/finance/, pages/Finance.tsx, pages/FinancialTracking.tsx, pages/SyncPaymentsToLedger.tsx), components (components/finance/), hooks (hooks/finance/, hooks/useFinance.ts, hooks/useGeneralLedger.ts, hooks/useChartOfAccounts.ts, hooks/useEnhancedFinancialReports.ts, hooks/useFinancialAnalysis.ts, hooks/useFinancialOverview.ts, hooks/useFinancialAudit.ts, hooks/useTreasury.ts, hooks/useMonthlyObligations.ts, hooks/useMonthlyRentTracking.ts, hooks/useCostCenterReports.ts, hooks/useCostCenters.ts, hooks/useCustomerFinancialSummary.ts, hooks/useFleetFinancialAnalytics.ts, hooks/useAdvancedFinancialAnalytics.ts, hooks/useAdvancedFinancialRatios.ts, hooks/useFinancialReportsExport.ts, hooks/useFinancialSystemAnalysis.ts, hooks/useFinancialAIAnalysis.ts, hooks/useFinancialFixes.ts, hooks/usePayrollFinancialAnalysis.ts, hooks/usePendingJournalEntries.ts, hooks/useJournalEntryPermissions.ts, hooks/useInvoiceJournalLinking.ts, hooks/useInvoiceMatching.ts, hooks/useReportingAccounts.ts, hooks/useEntryAllowedAccounts.ts, hooks/useAccountMappings.ts, hooks/useEssentialAccountMappings.ts, hooks/useEnhancedAccountDeletion.ts, hooks/useEnhancedAccountSuggestions.ts, hooks/useEnhancedChartOfAccountsCSVUpload.ts, hooks/useCopySelectedAccounts.ts, hooks/useAccountingWizard.ts, hooks/useAccountConflictCheck.ts, hooks/useDeposits.ts, hooks/useDelinquencyStats.ts, hooks/useLateFines.ts, hooks/usePaymentSchedules.ts, hooks/useCustomerAccounts.ts, hooks/useCustomerAccountStatement.ts, hooks/useCustomerAccountTypes.ts, hooks/useEnhancedCustomerAccounts.ts, hooks/useEnhancedCustomerFinancials.ts, hooks/useVendorAccounts.ts, hooks/useCreateCustomerWithAccount.ts, hooks/useSimpleAccountDeletion.ts, hooks/useUnifiedAccountSelector.ts), and services (services/AccountingService.ts, services/financialControls.ts, services/PaymentService.ts, services/PaymentLinkingService.ts, services/PaymentStateMachine.ts, services/InvoiceService.ts, services/UnifiedInvoiceService.ts, services/reportDataService.ts). Produce a structured list of findings (strengths, weaknesses, gaps, recommendations) with file paths and line numbers.
- `review-database-schema` group=0 deps=none: Read and analyze all SQL migration files in supabase/ and related directories (e.g., migrations/). Identify the database schema for financial tables (journal_entries, journal_entry_lines, chart_of_accounts, etc.), relationships, constraints, indexes, and any inconsistencies. Produce a structured list of findings about schema design, missing indexes, foreign key issues, and potential data integrity problems.
- `review-integration-points` group=0 deps=none: Read and analyze all integration hooks and services that connect the financial system with other modules: Contracts (hooks/useContracts.ts, hooks/useContractsData.tsx, pages/contracts/), Rental Payments (hooks/useRentalPaymentJournalIntegration.ts, hooks/useRentalPayments.ts), Maintenance (hooks/useMaintenanceJournalIntegration.ts, hooks/useMaintenanceDetails.ts), Payroll (hooks/usePayrollJournalIntegration.ts, hooks/usePayroll.ts), Traffic Violations (hooks/useTrafficViolationJournalIntegration.ts, hooks/useTrafficViolationPayments.ts), Vehicle Installments (hooks/useVehicleInstallmentJournalIntegration.ts, hooks/useVehicleInstallments.ts), Invoices (hooks/useInvoiceJournalLinking.ts, hooks/useInvoiceMatching.ts, services/InvoiceService.ts), Payments (hooks/usePayments.unified.ts, services/PaymentService.ts, services/PaymentLinkingService.ts), Collections (hooks/useMonthlyCollections.ts), Customers (hooks/useCustomerAccounts.ts, hooks/useEnhancedCustomerFinancials.ts), Inventory (hooks/useInventoryReports.ts), HR (hooks/useHRReports.ts), Reports (hooks/useUnifiedReports.ts, hooks/useModuleReportData.ts), Team (hooks/useEmployeeDetailedReport.tsx), Financial Analysis (hooks/useFinancialAnalysis.ts, hooks/useAdvancedFinancialAnalytics.ts), Audit (hooks/useFinancialAudit.ts, hooks/useAuditLog.ts, hooks/useAuditTrail.ts), Approvals (hooks/useApprovalWorkflows.ts), Legal (hooks/useLegalCollectionReport.ts, hooks/usePaymentLegalIntegration.ts), Vendors (hooks/useVendorAccounts.ts). Produce a structured list of findings about integration quality, data consistency, and potential gaps.
- `review-routing` group=0 deps=none: Read and analyze the routing configuration for financial pages. Look for files like App.tsx, routes/ or similar that define how financial pages are accessed. Identify any missing routes, incorrect paths, or security issues in route definitions. Produce a structured list of findings.
- `review-security-permissions` group=0 deps=none: Read and analyze all security and permission hooks: hooks/useJournalEntryPermissions.ts, hooks/usePermissionCheck.ts, hooks/usePermissions.ts, hooks/useRolePermissions.ts, hooks/useUserPermissions.ts, hooks/useFeatureAccess.ts. Also check any Row Level Security (RLS) policies in the database schema. Identify gaps in access control, missing permission checks, and potential security vulnerabilities. Produce a structured list of findings.
- `assembly` group=1 deps=review-core-financial-files, review-integration-points, review-database-schema, review-routing, review-security-permissions: Collect all findings from the five prior subtasks (review-core-financial-files, review-integration-points, review-database-schema, review-routing, review-security-permissions). Combine them into a single comprehensive report in Arabic. The report should include: an executive summary, detailed findings per area (with file paths and line numbers), strengths, weaknesses, integration gaps, and recommendations. Write the final report to a file named 'financial-system-audit-report.md' in the project root.
