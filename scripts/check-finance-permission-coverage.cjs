const fs = require('fs');
const path = require('path');

const sourcePath = path.join(process.cwd(), 'src', 'utils', 'financeAccessRules.ts');
const enforcementFiles = [
  {
    path: path.join(process.cwd(), 'src', 'utils', 'financeAccessRules.ts'),
    markers: [
      'FINANCE_PERMISSION_CONFLICT_RULES',
      'findFinancePermissionConflicts',
      'payment_create_cancel_conflict',
      'journal_create_post_conflict',
      'conflictRulesWithoutKnownAction',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'financeAccessRules.test.ts'),
    markers: [
      'detects conflicting permission bundles',
      'does not flag limited finance roles',
      'FINANCE_PERMISSION_CONFLICT_RULES',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627030000_finance_permission_conflict_rules.sql'),
    markers: [
      'finance_permission_conflict_rules',
      'evaluate_finance_permission_conflicts',
      'assert_no_finance_permission_conflicts',
      'Finance permission bundle violates segregation of duties',
      'payment_create_cancel_conflict',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627031000_financial_health_snapshots.sql'),
    markers: [
      'financial_health_snapshots',
      'publish_financial_health_snapshot',
      'financial_health_snapshot_unique_daily_source',
      'critical_issues',
      'reconciliation_issues',
    ],
  },
  {
    path: path.join(process.cwd(), 'scripts', 'publish-financial-health-snapshot.cjs'),
    markers: [
      'publish_financial_health_snapshot',
      'latestReport',
      'deriveSnapshot',
      'Financial health snapshot is required',
      '--require-snapshot',
      'financial-integrity-',
      'financial-reconciliation-',
    ],
  },
  {
    path: path.join(process.cwd(), 'scripts', 'run-finance-ci.cjs'),
    markers: [
      "finance:health:snapshot",
      "finance:health:snapshot:required",
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'hooks', 'business', 'usePaymentOperations.ts'),
    markers: [
      "financeAccess.can('finance.payment.create')",
      "financeAccess.canEditField('payment', 'amount')",
      "financeAccess.canEditField('payment', 'payment_date')",
      "financeAccess.canEditField('payment', 'bank_account_id')",
      "financeAccess.can('finance.payment.cancel')",
      "action: 'finance.payment.cancel'",
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'hooks', 'finance', 'useJournalEntries.ts'),
    markers: [
      "financeAccess.can('finance.journal.create_draft')",
      "financeAccess.can('finance.journal.post')",
      "action: 'finance.journal.post'",
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'components', 'finance', 'InvoiceEditDialog.tsx'),
    markers: [
      'financeAccess.canEditField("invoice", "total_amount")',
      'financeAccess.canEditField("invoice", "invoice_date")',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'pages', 'finance', 'BillingCenter.tsx'),
    markers: [
      "financeAccess.can('finance.invoice.cancel')",
      "action: 'finance.invoice.cancel'",
      "status: 'cancelled'",
      "payment_status: 'cancelled'",
    ],
    forbiddenMarkers: [
      "supabase.from('invoice_items').delete().eq('invoice_id'",
      "supabase.from('invoices').delete().eq('id'",
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'hooks', 'finance', 'useInvoices.ts'),
    markers: [
      "financeAccess.can('finance.invoice.cancel')",
      "action: 'finance.invoice.cancel'",
      'status: "cancelled"',
      'payment_status: "cancelled"',
    ],
    forbiddenMarkers: [
      '.from("invoices")\n          .delete()',
      '.from("invoices").delete()',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627010000_prevent_hard_delete_invoices.sql'),
    markers: [
      'prevent_invoices_hard_delete',
      'BEFORE DELETE ON public.invoices',
      'Invoices cannot be deleted permanently',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627011000_prevent_posted_journal_line_mutation.sql'),
    markers: [
      'prevent_posted_journal_line_mutation',
      'BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entry_lines',
      'Posted journal entry lines cannot be changed',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627012000_budget_control_cost_centers.sql'),
    markers: [
      'enforce_cost_center_budget_control',
      'Cost center budget exceeded',
      'sync_cost_center_actual_amount',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'budgetControlRules.ts'),
    markers: [
      'evaluateBudgetControl',
      'blocksPosting',
      'near_limit',
      'exceeded',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'budgetOverrideRules.ts'),
    markers: [
      'evaluateBudgetOverride',
      'approved_budget_override',
      'amount_too_low',
      'source_mismatch',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'budgetOverrideRules.test.ts'),
    markers: [
      'approved budget override requests',
      'unapproved budget override requests',
      'another cost center or company',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627023000_budget_override_approval_guard.sql'),
    markers: [
      'budget_override_request_id',
      'assert_budget_override_request_approved',
      'Approved budget override is required',
      "v_request.action <> 'budget_override'",
      'Budget override approval amount is lower than the overage amount',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627013000_controlled_period_reopening.sql'),
    markers: [
      'financial_period_reopening_requests',
      'request_financial_period_reopening',
      'approve_financial_period_reopening',
      'Requester cannot approve their own period reopening request',
      'expire_financial_period_reopenings',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'periodReopeningImpactRules.ts'),
    markers: [
      'summarizePeriodReopeningImpact',
      'evaluatePeriodReclosureReadiness',
      'journalImbalance',
      'requiresControllerReview',
      'impact_report_required',
      'controller_review_required',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'periodReopeningImpactRules.test.ts'),
    markers: [
      'summarizes reopening impact',
      'requires controller review',
      'empty reopening windows',
      'impact report and controller review',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627022000_period_reopening_impact_reports.sql'),
    markers: [
      'financial_period_reopening_impact_reports',
      'generate_period_reopening_impact_report',
      'requires_controller_review',
      'journal_imbalance',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627027000_period_reclosure_impact_approval.sql'),
    markers: [
      'pending_controller_review',
      'approve_period_reopening_impact_report',
      'Impact report generator cannot approve their own report',
      'DROP FUNCTION IF EXISTS public.close_reopened_financial_period',
      'finalize_reviewed_period_reclosure',
      'Approved impact report is required before final reclosure',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'hooks', 'useGeneralLedger.ts'),
    markers: [
      '.select("id,status")',
      'entry?.status !== "draft"',
      'Posted entries must be reversed',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'bankReconciliationRules.ts'),
    markers: [
      'scoreBankStatementMatch',
      'findBestBankStatementMatch',
      'amount_mismatch',
      'reference_exact',
      'autoMatch',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'bankReconciliationRules.test.ts'),
    markers: [
      'auto matches an exact amount',
      'rejects mismatched amounts',
      'selects the highest scored candidate',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'bankStatementImportParser.ts'),
    markers: [
      'parseBankStatementRows',
      'createBankStatementImportFingerprint',
      'lineFingerprint',
      'FIELD_ALIASES',
      'debitAmount',
      'creditAmount',
      'netAmount',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'bankStatementImportParser.test.ts'),
    markers: [
      'parses English debit and credit',
      'parses Arabic headers',
      'reports invalid rows',
      'stable import fingerprint',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'components', 'finance', 'BankReconciliationPanel.tsx'),
    markers: [
      'parseBankStatementRows',
      'createBankStatementImportFingerprint',
      'bank_statement_imports',
      'bank_statement_lines',
      'line_hash',
      'run_auto_bank_reconciliation_batch',
      'bank_reconciliation_batches',
      'استيراد كشف بنكي',
      'حفظ الكشف',
      'تشغيل المطابقة التلقائية',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627014000_bank_statement_import_matching.sql'),
    markers: [
      'bank_statement_imports',
      'bank_statement_lines',
      'mark_bank_statement_line_matched',
      'match_score',
      'reconciliation_status',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627026000_bank_statement_duplicate_guards.sql'),
    markers: [
      'line_hash',
      'idx_bank_statement_imports_file_hash_unique',
      'idx_bank_statement_lines_line_hash_unique',
      'assign_bank_statement_line_hash',
      'duplicate import guard',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627021000_bank_reconciliation_batches.sql'),
    markers: [
      'bank_reconciliation_batches',
      'bank_reconciliation_batch_matches',
      'run_auto_bank_reconciliation_batch',
      'approve_bank_reconciliation_batch',
      'Batch starter cannot approve their own reconciliation batch',
      'auto_matched_count',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'financialConsolidationRules.ts'),
    markers: [
      'consolidateTrialBalance',
      'CurrencyRate',
      'ConsolidationElimination',
      'evaluateConsolidationApprovalReadiness',
      'Missing consolidation currency rate',
      'eliminationCount',
      'unreviewed_eliminations',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'financialConsolidationRules.test.ts'),
    markers: [
      'consolidates trial balance lines',
      'converts foreign currency lines',
      'applies intercompany eliminations',
      'consolidation evidence is incomplete',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627015000_financial_consolidation_schema.sql'),
    markers: [
      'financial_consolidation_runs',
      'financial_consolidation_companies',
      'financial_consolidation_lines',
      'financial_consolidation_eliminations',
      'recalculate_financial_consolidation_run',
      'Creator cannot approve their own consolidation run',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627029000_financial_consolidation_approval_controls.sql'),
    markers: [
      'review_financial_consolidation_elimination',
      'Elimination creator cannot review their own elimination',
      'Consolidation approval requires at least two companies',
      'All consolidation eliminations must be independently reviewed before approval',
      'prevent_approved_financial_consolidation_mutation',
      'Approved or locked consolidation detail rows are immutable',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'standardFinancialReportRules.ts'),
    markers: [
      'buildTrialBalanceReport',
      'buildIncomeStatementReport',
      'buildBalanceSheetReport',
      'evaluateFinancialReportApprovalReadiness',
      'sourceFingerprint',
      'createReportFingerprint',
      'generator_cannot_approve',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'standardFinancialReportRules.test.ts'),
    markers: [
      'audit-ready trial balance',
      'standard income statement',
      'balance sheet where assets do not equal',
      'without audit evidence or proper segregation',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'ledgerCashFlowReportRules.ts'),
    markers: [
      'buildGeneralLedgerReport',
      'buildCashFlowReport',
      'runningBalance',
      'operatingCashFlow',
      'financingCashFlow',
      'sourceFingerprint',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'ledgerCashFlowReportRules.test.ts'),
    markers: [
      'general ledger running balances',
      'classifies cash flow lines',
      'operating cash flow',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'officialFinancialReportExport.ts'),
    markers: [
      'OfficialFinancialReportExportPayload',
      'validateOfficialReportExportPayload',
      'sourceFingerprint_required',
      'Audit Trail',
      'Report Data',
      'buildOfficialFinancialReportHtml',
      'letter-container',
      'subject-box',
      'approval-section',
      'exportOfficialFinancialReportToPDF',
      'exportOfficialFinancialReportToExcel',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'officialFinancialReportExport.test.ts'),
    markers: [
      'requires audit metadata before export',
      'stable audit rows',
      'official file names',
      'official letter documents',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'components', 'finance', 'TrialBalanceReport.tsx'),
    markers: [
      'exportOfficialFinancialReportToPDF',
      'exportOfficialFinancialReportToExcel',
      'buildTrialBalanceReport',
      'sourceFingerprint',
    ],
    forbiddenMarkers: [
      'import jsPDF from "jspdf"',
      'import * as XLSX from "xlsx"',
      'Trial Balance Report',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'components', 'finance', 'IncomeStatementReport.tsx'),
    markers: [
      'exportOfficialFinancialReportToPDF',
      'buildIncomeStatementReport',
      'sourceFingerprint',
      'income_statement',
    ],
    forbiddenMarkers: [
      'import jsPDF from "jspdf"',
      'jspdf-autotable',
      'doc.autoTable',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'components', 'finance', 'BalanceSheetReport.tsx'),
    markers: [
      'exportOfficialFinancialReportToPDF',
      'buildBalanceSheetReport',
      'sourceFingerprint',
      'balance_sheet',
    ],
    forbiddenMarkers: [
      'import jsPDF from "jspdf"',
      'jspdf-autotable',
      'doc.autoTable',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'components', 'finance', 'CashFlowStatementReport.tsx'),
    markers: [
      'exportOfficialFinancialReportToPDF',
      'buildCashFlowReport',
      'sourceFingerprint',
      'cash_flow_statement',
    ],
    forbiddenMarkers: [
      'import jsPDF from "jspdf"',
      'jspdf-autotable',
      'doc.autoTable',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627016000_financial_report_snapshots.sql'),
    markers: [
      'financial_report_snapshots',
      'publish_financial_report_snapshot',
      'approve_financial_report_snapshot',
      'Generator cannot approve their own financial report snapshot',
      'source_fingerprint',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627028000_financial_report_snapshot_immutability.sql'),
    markers: [
      'calculate_financial_report_snapshot_hash',
      'assign_financial_report_snapshot_hash',
      'prevent_approved_financial_report_snapshot_mutation',
      'Financial report snapshots cannot be deleted',
      'Approved financial report snapshots are immutable',
      'Financial report hash is required before approval',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627017000_immutable_audit_log_hash_chain.sql'),
    markers: [
      'calculate_audit_log_entry_hash',
      'assign_audit_log_hash_chain',
      'prevent_audit_log_mutation',
      'BEFORE UPDATE ON public.audit_logs',
      'BEFORE DELETE ON public.audit_logs',
      'verify_audit_log_hash_chain',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627025000_harden_audit_log_append_only_permissions.sql'),
    markers: [
      'FORCE ROW LEVEL SECURITY',
      'BEFORE TRUNCATE ON public.audit_logs',
      'REVOKE UPDATE, DELETE, TRUNCATE',
      'audit_logs_company_select_only',
      'audit_logs_company_insert_only',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'services', 'auditService.ts'),
    markers: [
      'detectComplianceViolations',
      'compliance_flags',
      'Financial audit log created',
      'Audit logs are append-only',
      'Audit logs are immutable and cannot be deleted',
    ],
    forbiddenMarkers: [
      ".from('audit_logs')\n        .update({",
      ".from('audit_logs')\n          .delete()",
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'financialApprovalWorkflowRules.ts'),
    markers: [
      'resolveFinancialApprovalWorkflow',
      'canActorApproveFinancialStep',
      'requester_cannot_approve',
      'duplicate_step_approval',
      'branch_mismatch',
      'head_office_required',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'financialApprovalWorkflowRules.test.ts'),
    markers: [
      'prefers a branch-specific policy',
      'adds higher amount approval stages',
      'prevents requesters from approving their own step',
      'approving the same step twice',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627018000_financial_multi_stage_approval_workflows.sql'),
    markers: [
      'financial_approval_policies',
      'financial_approval_policy_steps',
      'financial_approval_requests',
      'financial_approval_actions',
      'resolve_financial_approval_policy',
      'Requester cannot approve their own financial approval request',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627024000_prevent_duplicate_financial_step_approvals.sql'),
    markers: [
      'idx_financial_approval_actions_one_actor_per_step',
      'Actor already approved this financial approval step',
      'existing_action.actor_id = auth.uid()',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'annualCloseRules.ts'),
    markers: [
      'calculateAnnualNetIncome',
      'buildAnnualClosingEntry',
      'buildOpeningBalanceLines',
      'isBalancedAnnualEntry',
      'Transfer annual profit to retained earnings',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'annualCloseRules.test.ts'),
    markers: [
      'balanced closing entry for annual profit',
      'balanced closing entry for annual loss',
      'carries only balance sheet accounts',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627019000_annual_financial_close.sql'),
    markers: [
      'annual_financial_close_runs',
      'annual_financial_close_lines',
      'calculate_annual_financial_close',
      'approve_annual_financial_close',
      'Requester cannot approve their own annual close',
      'Opening balance entry is not balanced',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', 'financialOperationalReportRules.ts'),
    markers: [
      'buildReceivablesAgingReport',
      'buildBankReconciliationSummary',
      'criticalOverdueAmount',
      'reconciliationRate',
    ],
  },
  {
    path: path.join(process.cwd(), 'src', 'utils', '__tests__', 'financialOperationalReportRules.test.ts'),
    markers: [
      'receivables aging buckets',
      'fully reconciled bank report',
      'summarizes bank reconciliation status',
    ],
  },
  {
    path: path.join(process.cwd(), 'supabase', 'migrations', '20260627020000_operational_financial_report_snapshots.sql'),
    markers: [
      'receivables_aging',
      'bank_reconciliation',
      'general_ledger',
      'publish_operational_financial_report_snapshot',
    ],
  },
];

if (!fs.existsSync(sourcePath)) {
  console.error('Finance access rules file is missing.');
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, 'utf8');

const requiredActions = [
  'finance.invoice.edit_amount',
  'finance.invoice.cancel',
  'finance.payment.create',
  'finance.payment.edit_amount',
  'finance.payment.cancel',
  'finance.journal.approve',
  'finance.journal.post',
  'finance.journal.reverse',
  'finance.period.close',
  'finance.period.reopen',
  'finance.bank.reconcile',
  'finance.budget.override',
];

const requiredFieldGuards = [
  'invoice", field: "total_amount"',
  'invoice", field: "customer_id"',
  'payment", field: "amount"',
  'payment", field: "bank_account_id"',
  'journal_entry", field: "lines"',
  'budget", field: "limit_amount"',
];

const requiredSodRules = [
  'journal_creator_cannot_approve',
  'journal_creator_cannot_post',
  'payment_creator_cannot_cancel',
  'invoice_creator_cannot_cancel',
  'period_reopen_requires_independent_requester',
  'budget_requester_cannot_approve_override',
  'bank_importer_cannot_reconcile',
];

const missingActions = requiredActions.filter((action) => !source.includes(action));
const missingFields = requiredFieldGuards.filter((field) => !source.includes(field));
const missingRules = requiredSodRules.filter((rule) => !source.includes(rule));
const missingEnforcement = [];

for (const file of enforcementFiles) {
  if (!fs.existsSync(file.path)) {
    missingEnforcement.push(`${path.relative(process.cwd(), file.path)} is missing`);
    continue;
  }

  const fileSource = fs.readFileSync(file.path, 'utf8');
  for (const marker of file.markers) {
    if (!fileSource.includes(marker)) {
      missingEnforcement.push(`${path.relative(process.cwd(), file.path)} missing marker: ${marker}`);
    }
  }
  for (const marker of file.forbiddenMarkers || []) {
    if (fileSource.includes(marker)) {
      missingEnforcement.push(`${path.relative(process.cwd(), file.path)} contains forbidden marker: ${marker}`);
    }
  }
}

if (missingActions.length || missingFields.length || missingRules.length || missingEnforcement.length) {
  console.error('Finance permission coverage is incomplete.');
  if (missingActions.length) console.error(`Missing actions: ${missingActions.join(', ')}`);
  if (missingFields.length) console.error(`Missing field guards: ${missingFields.join(', ')}`);
  if (missingRules.length) console.error(`Missing SoD rules: ${missingRules.join(', ')}`);
  if (missingEnforcement.length) console.error(`Missing enforcement: ${missingEnforcement.join('; ')}`);
  process.exit(1);
}

console.log('Finance permission coverage OK.');
console.log(`Checked ${requiredActions.length} critical actions, ${requiredFieldGuards.length} field guards, ${requiredSodRules.length} SoD rules, ${enforcementFiles.length} enforcement files.`);
