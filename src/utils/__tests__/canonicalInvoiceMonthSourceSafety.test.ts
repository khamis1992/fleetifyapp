import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('canonical invoice-month source safety', () => {
  it('never finds an existing monthly invoice through its payment deadline', () => {
    const source = readSource('src/services/UnifiedInvoiceService.ts');

    expect(source).toContain('.or(buildInvoiceMonthRangeFilter(monthStart, nextMonthStart))');
    expect(source).toContain('invoice_month: invoiceDate');
    expect(source).not.toContain(".gte('due_date', monthStart)");
    expect(source).not.toContain(".lte('due_date', monthEnd)");
  });

  it('does not rewrite an invoice deadline to force it into a schedule month', () => {
    const source = readSource('src/components/contracts/ContractHealthAnalysis.tsx');

    expect(source).toContain('getInvoiceBillingDate(invoice)');
    expect(source).not.toContain('applyInvoiceDueDateCorrections');
    expect(source).not.toContain('linkedInvoiceDueMonthKey');
    expect(source).not.toContain('invoiceDateCorrections');
    expect(source).toContain('generateCanonicalContractInvoice');
    expect(source).toContain("'generate_invoice_for_contract_month'");
    expect(source).not.toContain('restoreExistingInvoiceForContractMonth');
    expect(source).not.toMatch(/\.from\('invoices'\)\s*\.insert\(/);
  });

  it('shows invoice_month before invoice_date in payment views', () => {
    const contractPayments = readSource(
      'src/components/contracts/ContractPaymentsTabRedesigned.tsx',
    );
    const quickPayment = readSource(
      'src/components/payments/QuickPaymentRecording.tsx',
    );

    expect(contractPayments).toMatch(
      /payment\.invoice\?\.invoice_month\s*\|\|\s*payment\.invoice\?\.invoice_date/,
    );
    // Invoice presentation now comes from the parent's scoped evidence, not a
    // second Supabase join with a separately refreshed version of the invoice.
    expect(contractPayments).toContain('const invoiceById = new Map(invoices.map(');
    expect(contractPayments).toContain('invoice: invoice ? { ...invoice, due_date: invoice.due_date || null }');
    expect(contractPayments).not.toContain('invoice:invoices!invoice_id');
    expect(quickPayment).toContain(
      'parseDateOnly(getInvoiceBillingDate(invoice))',
    );
  });

  it('keeps every supported partial-payment status collectible', () => {
    const employeeQuickPayment = readSource(
      'src/components/finance/QuickPaymentDialog.tsx',
    );

    expect(employeeQuickPayment).toContain("'partial'");
    expect(employeeQuickPayment).toContain("'partial_paid'");
    expect(employeeQuickPayment).toContain("'partially_paid'");
  });

  it('indexes Excel imports by billing month without rewriting due_date', () => {
    const excelImport = readSource(
      'src/pages/payments/ExcelPaymentImport.tsx',
    );
    const monthlyInvoiceCreation = excelImport.slice(
      excelImport.indexOf('const createOrFindMonthlyInvoice'),
      excelImport.indexOf('const buildApprovalSummary'),
    );

    expect(excelImport).toContain('getInvoiceBillingMonthKey(invoice)');
    expect(excelImport).toContain('invoice_month: canonicalMonth');
    expect(monthlyInvoiceCreation).toContain("'generate_invoice_for_contract_month'");
    expect(monthlyInvoiceCreation).not.toContain(".insert(");
    expect(monthlyInvoiceCreation).not.toContain('duplicate?.[0]');
    expect(excelImport).not.toContain('alignInvoiceDueDateToExcelMonth');
    expect(excelImport).not.toContain('sameInvoiceMonth(invoice.due_date');
    expect(excelImport).not.toContain(
      'invoicesByMonth.set(invoice.due_date',
    );
  });

  it('routes keyed payment retries through the authorized atomic command', () => {
    const paymentOperations = readSource(
      'src/hooks/business/usePaymentOperations.ts',
    );
    const employeeQuickPayment = readSource(
      'src/components/finance/QuickPaymentDialog.tsx',
    );

    expect(paymentOperations).not.toContain(
      ".eq('idempotency_key', data.idempotencyKey)",
    );
    expect(paymentOperations).not.toContain('findIdempotentPayment');
    expect(paymentOperations).toMatch(
      /if \(!data\.idempotencyKey\) \{\s*await assertFinancialPeriodOpen/,
    );
    expect(paymentOperations).toContain(
      'const maxInsertAttempts = hasManualPaymentNumber || data.idempotencyKey ? 1 : 5;',
    );
    expect(paymentOperations).toMatch(
      /!data\.idempotencyKey\s*&& !paymentData\.bank_id/,
    );
    expect(paymentOperations).toContain(
      "if (!data.idempotencyKey && paymentData.invoice_id && paymentData.payment_status === 'completed')",
    );
    expect(employeeQuickPayment).toContain('paymentAttemptRef.current ??');
    expect(employeeQuickPayment).toContain('paymentDate: new Date()');
    expect(employeeQuickPayment).toContain(
      'idempotencyKey: `employee-workspace:${paymentAttempt.idempotencyKey}:${invoice.id}`',
    );
  });

  it('never hides a billing-month invoice behind its later deadline', () => {
    const monthlyCollections = readSource('src/hooks/useMonthlyCollections.ts');

    expect(monthlyCollections).toContain(
      '.or(buildInvoiceMonthRangeFilter(monthStart, nextMonthStart))',
    );
    expect(monthlyCollections).not.toContain(".gte('due_date', monthStart)");
    expect(monthlyCollections).not.toContain(".lt('due_date', nextMonthStart)");
    expect(monthlyCollections).not.toContain(
      'c.is_current_month && c.is_due_current_month',
    );
  });

  it('runs scheduled generation through the canonical database command', () => {
    const generator = readSource(
      'supabase/functions/generate-monthly-invoices/index.ts',
    );
    const config = readSource('supabase/config.toml');

    expect(generator).toContain('authorizeScheduledAgent');
    expect(generator).toContain('"generate-monthly-invoices"');
    expect(generator).toContain('companyId is required');
    expect(generator).toContain('finishAgentExecution');
    expect(generator).not.toContain('INVOICE_GENERATOR_SECRET');
    expect(generator).toContain('generate_invoice_for_contract_month_outcome');
    expect(generator).toContain('outcome?.created !== true');
    expect(generator).not.toContain('findActivePositiveInvoiceForMonth');
    expect(generator.indexOf('outcome?.created !== true'))
      .toBeLessThan(generator.indexOf('notifyCustomer('));
    expect(generator).not.toContain('.insert({');
    expect(generator).not.toContain('.gte("due_date"');
    expect(generator).toContain('.lt("start_date", monthStart)');
    expect(generator).not.toContain('.lte("start_date", monthEnd)');
    expect(config).toMatch(
      /\[functions\.generate-monthly-invoices\]\s*verify_jwt\s*=\s*false/,
    );
    expect(config).toMatch(
      /\[functions\.backfill-historical-invoices\]\s*verify_jwt\s*=\s*false/,
    );
  });

  it('rejects malformed scheduled-generator JSON instead of silently running defaults', () => {
    const generator = readSource(
      'supabase/functions/generate-monthly-invoices/index.ts',
    );

    expect(generator).toContain('const rawBody = await req.text()');
    expect(generator).toContain('Invalid JSON request body');
    expect(generator).toContain('Request body must be a JSON object');
    expect(generator).not.toContain('return await req.json()');
  });

  it('keeps historical invoice failures isolated to their billing month', () => {
    const historical = readSource(
      'supabase/functions/backfill-historical-invoices/index.ts',
    );

    expect(historical).toContain('generate_invoice_for_contract_month_outcome');
    expect(historical).toContain('if (outcome.created === true)');
    expect(historical).not.toContain('findActivePositiveInvoiceForMonth');
    expect(historical).not.toContain('isUniqueViolation(invoiceError)');
    expect(historical).toContain(
      'result.errors.push(`${invoiceMonth}: ${errorMessage(error)}`)',
    );
    expect(historical).toContain('continuation: {');
    expect(historical).toContain('nextCursor: contractPage.nextCursor');
    expect(historical).toContain('const partial = summary.errors > 0 || contractPage.truncated');
    expect(historical).toContain('}, partial ? 207 : 200)');
  });

  it('makes zero-row contracts visible to both audit paths', () => {
    const dailyAgent = readSource(
      'supabase/functions/daily-audit-agent/index.ts',
    );
    const systemWorker = readSource(
      'supabase/functions/_shared/system-audit/workers.ts',
    );

    expect(dailyAgent).toContain('const auditedContracts = await loadContractsForAudit(');
    expect(dailyAgent).toMatch(/auditedContracts\s*\.filter\(/);
    expect(dailyAgent).toContain('.map((contract: any) => contract.id)');
    expect(systemWorker).toContain('contract.missing_billing_graph');
    expect(systemWorker).toContain('activeInvoices.length === 0');
    expect(systemWorker).toContain('activeSchedules.length === 0');
    expect(dailyAgent).toContain('generate_invoices_from_payment_schedule');
    expect(dailyAgent).toContain('"under_legal_procedure"');
    expect(dailyAgent).toContain('.includes(String(contract.status || "").toLowerCase())');
    expect(dailyAgent).not.toContain('...(targetContractIds || [])');
    expect(dailyAgent).not.toContain('repairScheduleInvoiceLinks(');
    expect(dailyAgent).not.toContain('completeUniformContractMonths');
    expect(dailyAgent).not.toContain('canonicalizeUniformContractScheduleGraph');
  });

  it('rejects an unmatched or ambiguous targeted contract instead of auditing every contract', () => {
    const dailyAgent = readSource(
      'supabase/functions/daily-audit-agent/index.ts',
    );

    expect(dailyAgent).toContain(
      'hasContractSelector && targetContracts.length === 0',
    );
    expect(dailyAgent).toContain(
      'hasContractSelector && targetContracts.length !== 1',
    );
    expect(dailyAgent).toContain(
      'targetContractIds: hasContractSelector ? targetContractIds : null',
    );
    expect(dailyAgent).toContain(
      'if (!dryRun && targetContractIds === null)',
    );
    expect(dailyAgent).toMatch(
      /must\s+never replace or close the company-wide review task/,
    );
  });

  it('rotates through every eligible company instead of permanently limiting the oldest companies', () => {
    const dailyAgent = readSource(
      'supabase/functions/daily-audit-agent/index.ts',
    );

    expect(dailyAgent).toContain('Company keyset pagination did not advance');
    expect(dailyAgent).toContain('eligibleCompanies.length');
    expect(dailyAgent).toContain('buildDailyRotatingRanges(');
    expect(dailyAgent).not.toMatch(
      /\.order\("created_at", \{ ascending: true \}\)\s*\.limit\(limit\)/,
    );
  });

  it('does not accept an active zero-amount row as a collectible month', () => {
    const systemWorker = readSource(
      'supabase/functions/_shared/system-audit/workers.ts',
    );
    const billingMigration = readSource(
      'supabase/migrations/20260803155800_harden_invoice_schedule_generation_rpcs.sql',
    );
    const bulkGenerator = billingMigration.slice(
      billingMigration.indexOf(
        'CREATE OR REPLACE FUNCTION public.generate_invoices_from_payment_schedule(',
      ),
      billingMigration.indexOf(
        'REVOKE ALL ON FUNCTION public.generate_payment_schedules_for_contract',
      ),
    );

    expect(bulkGenerator).toContain(
      'public.generate_invoice_for_contract_month(',
    );
    expect(bulkGenerator).not.toContain('INSERT INTO public.invoices (');
    expect(systemWorker).toContain(
      'invoice.zero_amount_blocks_billing_month',
    );
  });

  it('surfaces automatic billing failures as human review and a partial machine result', () => {
    const dailyAgent = readSource(
      'supabase/functions/daily-audit-agent/index.ts',
    );

    expect(dailyAgent).toContain('status: "completed" | "partial"');
    expect(dailyAgent).toContain('status: totals.errors === 0 ? "completed" : "partial"');
    expect(dailyAgent).toContain('response.status === "partial" ? 207 : 200');
    expect(dailyAgent).toContain('result.reviewItems.push(...backfillFailures.map(');
    expect(dailyAgent).toContain('result.reviewItems.push(');
    expect(dailyAgent).toContain('No active manager profile is available for the daily audit review task');
    expect(dailyAgent).toContain('if (error) throw error;');
    expect(dailyAgent.indexOf('backfillFailures.map(')).toBeLessThan(
      dailyAgent.indexOf('surface_review_items_task'),
    );
    expect(dailyAgent.indexOf('"backfill_missing_contract_invoices"')).toBeLessThan(
      dailyAgent.indexOf('"recalculate_invoice_balances"'),
    );
    expect(dailyAgent).toContain('backfillContractInvoicesWithDurableCursor(');
    expect(dailyAgent).toContain('.from("daily_invoice_repair_cursors")');
    expect(dailyAgent).toContain('.eq("version", cursorVersion)');
    expect(dailyAgent).toContain('"recalculate_invoice_financial_states_batch"');
    expect(dailyAgent).toContain('"recalculate_contract_financial_states_batch"');
  });

  it('creates new contracts and their billing graph through one atomic command', () => {
    const contractCreation = readSource('src/hooks/useContractCreation.ts');
    const wizard = readSource(
      'src/components/contracts/SimpleContractWizard.tsx',
    );

    expect(contractCreation).not.toContain("await supabase.from('invoices').insert");
    expect(contractCreation).toContain(".rpc('create_contract_with_violation_override_atomic'");
    expect(contractCreation).toContain('p_accept_unpaid_violations: acceptedUnpaidViolations');
    expect(contractCreation).not.toContain(".rpc('create_contract_with_journal_entry'");
    expect(contractCreation).not.toContain(".rpc('generate_invoices_from_payment_schedule'");
    expect(wizard).toContain("'create_contract_with_violation_override_atomic'");
    expect(wizard).toContain('p_accept_unpaid_violations: acceptedUnpaidViolations');
    expect(wizard).not.toContain("supabase.from('contracts').insert");
    expect(wizard).not.toContain("'generate_payment_schedules_for_contract'");
  });

  it('does not leave known active contract writers outside the atomic command', () => {
    const mobile = readSource('src/pages/mobile/MobileContractWizard.tsx');
    const quotations = readSource('src/pages/Quotations.tsx');
    const salesQuoteConversion = readSource('src/hooks/useQuoteToContract.ts');
    const financialTracking = readSource('src/pages/FinancialTracking.tsx');
    const smartUpload = readSource('src/hooks/useUnifiedContractUpload.ts');
    const csvImport = readSource('src/pages/Import.tsx');

    for (const source of [mobile, quotations, salesQuoteConversion]) {
      expect(source).toContain("'create_contract_with_violation_override_atomic'");
      expect(source).toContain('p_accept_unpaid_violations:');
      expect(source).not.toContain(".from('contracts')\n        .insert");
    }
    expect(financialTracking).toContain("supabase.rpc('create_customer_with_contract_idempotent'");
    expect(financialTracking).toContain('p_idempotency_key: requestKey');
    expect(financialTracking).not.toContain(".from('contracts')\n      .insert");
    expect(smartUpload).toContain("status: 'draft'");
    expect(smartUpload).not.toContain("status: contract.requires_review ? 'under_review' : 'active'");
    expect(csvImport).toContain("row.status = 'draft'");
  });

  it('routes contract activation through the atomic billing command', () => {
    const renewal = readSource('src/hooks/useContractRenewal.ts');
    const statusManagement = readSource('src/components/contracts/ContractStatusManagement.tsx');

    expect(renewal).toContain("'activate_contract_with_billing_graph_atomic'");
    expect(renewal).toContain("if (status === 'active')");
    expect(renewal).toContain('payload.billing_graph_created');
    expect(renewal).toContain("'renew_contract_with_billing_graph_atomic'");
    expect(renewal).not.toContain(".from(\"contracts\")\n        .insert({");
    expect(renewal).toContain("new Set(['draft', 'pending', 'pending_completion', 'suspended'])");
    expect(statusManagement).toContain('ACTIVATABLE_CONTRACT_STATUSES.has(contract?.status)');
  });

  it('blocks non-atomic financial contract edits instead of repricing posted rows', () => {
    const wizard = readSource(
      'src/components/contracts/SimpleContractWizard.tsx',
    );

    expect(wizard).toContain('const billingDefinitionChanged =');
    expect(wizard).toContain(
      'تعديل العميل أو المركبة أو شروط الفوترة متوقف من هذه الشاشة لحماية الفواتير والقيود',
    );
    expect(wizard).not.toContain('subtotal: newMonthlyAmount');
    expect(wizard).not.toContain('total_amount: newMonthlyAmount');
    expect(wizard).not.toContain('balance_due: newBalanceDue');
    expect(wizard).not.toMatch(/^\s*amount:\s*newMonthlyAmount/m);

    const tracking = readSource('src/pages/FinancialTracking.tsx');
    const verification = readSource('src/pages/legal/CustomerVerificationPage.tsx');
    const details = readSource('src/components/contracts/ContractDetailsDialog.tsx');
    expect(tracking).not.toContain('.update({ monthly_amount: rentAmount })');
    expect(tracking).toContain('تعديل الإيجار لعقد نشط متوقف');
    expect(verification).not.toContain('monthly_amount: editedData.monthly_rent');
    expect(verification).toContain('يلزم ملحق مالي ذري ومعتمد');
    expect(details).toContain('const protectedTermsChanged =');
    expect(details).toContain('يلزم ملحق مالي ذري ومعتمد');
  });

  it('does not expose cancelled-contract reactivation or legal conversion as direct status changes', () => {
    const list = readSource('src/pages/ContractsRedesigned.tsx');
    const details = readSource('src/components/contracts/ContractDetailsPageRedesigned.tsx');
    const legal = readSource('src/hooks/useConvertToLegal.ts');
    const reactivation = readSource('src/services/contractReactivationService.ts');

    expect(details).toContain('await reactivateCancelledContract({');
    expect(details).not.toMatch(/executeReactivateContract[\s\S]*?status:\s*'active'/);
    expect(reactivation).toContain("'reactivate_cancelled_contract_atomic_v1'");
    expect(reactivation).not.toContain(".update({ status: 'active' })");
    expect(list).not.toContain("status: 'active',\n        reason:");
    expect(legal).toContain("const eligibleStatuses = new Set(['active', 'cancelled', 'canceled', 'closed', 'expired'])");
    expect(legal).toContain("'convert_contract_to_legal_collection_v2'");
  });

  it('keeps financially touched schedule mismatches review-only in contract health repair', () => {
    const healthRepair = readSource(
      'src/components/contracts/ContractHealthAnalysis.tsx',
    );

    expect(healthRepair).toContain('isFinanciallyUntouchedSchedule(current)');
    expect(healthRepair).toContain('isFinanciallyUntouchedSchedule(schedule)');
    expect(healthRepair).toContain(
      'لم يغيّر الإصلاح التلقائي أي مبلغ أو ربط مالي',
    );
    expect(healthRepair).not.toContain(
      'const reconciliation = await reconcileScheduleInvoicesForContract',
    );
  });

  it('routes invoice mismatches and cleanup candidates to review instead of mutating them', () => {
    const dailyAgent = readSource('supabase/functions/daily-audit-agent/index.ts');
    const systemWorker = readSource('supabase/functions/_shared/system-audit/workers.ts');
    const dispatcher = readSource('supabase/functions/system-audit-worker/index.ts');

    expect(dailyAgent).toContain('It was not repriced automatically');
    expect(dailyAgent).not.toContain('cancelInvoiceSoftly');
    expect(systemWorker).toContain('invoice.schedule_amount_mismatch_requires_review');
    expect(systemWorker).not.toContain('command: "invoice.sync_zero_impact_amount"');
    expect(dispatcher).not.toContain('"invoice.sync_zero_impact_amount"');
  });

  it('requires finite contract dates in both scheduled and historical generators', () => {
    const scheduled = readSource('supabase/functions/generate-monthly-invoices/index.ts');
    const historical = readSource('supabase/functions/backfill-historical-invoices/index.ts');

    expect(scheduled).toContain('.not("end_date", "is", null)');
    expect(historical).toContain('.not("start_date", "is", null)');
    expect(historical).toContain('.not("end_date", "is", null)');
  });

  it('keyset-pages system-audit relation lookups beyond the PostgREST row cap', () => {
    const systemWorker = readSource(
      'supabase/functions/_shared/system-audit/workers.ts',
    );
    const loadByIds = systemWorker.slice(
      systemWorker.indexOf('async function loadByIds('),
    );

    expect(loadByIds).toContain('.order(pagination.cursorField, { ascending: true })');
    expect(loadByIds).toContain('.limit(500)');
    expect(loadByIds).toContain('query.gt(pagination.cursorField, lastId)');
    expect(loadByIds).toContain('keyset pagination did not advance');
    expect(loadByIds).toContain('query.range(offset, offset + 499)');
    expect(systemWorker).toContain('"id,payment_id,classification,is_active"');
    expect(systemWorker).toContain(
      '{ cursorField: null, orderFields: ["item_id", "warehouse_id", "movement_type"] }',
    );
  });
});
