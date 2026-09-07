import { readFile } from "node:fs/promises";
import { installCanonicalFeeFixture } from "./canonical-fee-fixture.mjs";
export const ids = {
  company: "22222222-2222-4222-8222-222222222222",
  invoice: "11111111-1111-4111-8111-111111111111",
  actor: "33333333-3333-4333-8333-333333333333",
  fee: "44444444-4444-4444-8444-444444444444",
  contract: "55555555-5555-4555-8555-555555555555",
  customer: "66666666-6666-4666-8666-666666666666",
  other: "77777777-7777-4777-8777-777777777777",
  bank: "88888888-8888-4888-8888-888888888888",
};
export const readProposal = (rollback) =>
  readFile(
    new URL(
      rollback
        ? "../../../supabase/rollbacks/20260906074051_separate_collected_late_fee_journal.rollback.sql"
        : "../../../supabase/migrations/20260906074051_separate_collected_late_fee_journal.sql",
      import.meta.url
    ),
    "utf8"
  );
export async function installCollectedFeeFixture(db) {
  await installCanonicalFeeFixture(db);
  await db.exec(`ALTER TABLE public.default_account_types ADD COLUMN type_name text,
    ADD COLUMN type_name_ar text, ADD COLUMN account_category text, ADD COLUMN description text,
    ADD COLUMN is_system boolean;`);
  await db.exec(await readProposal());
  await db.exec(`ALTER TABLE public.journal_entries ADD COLUMN reversal_entry_id uuid,
    ADD COLUMN reversed_by uuid,ADD COLUMN reversed_at timestamptz;
    ALTER TABLE public.journal_entry_lines ADD COLUMN asset_id uuid,ADD COLUMN employee_id uuid;
    ALTER TABLE public.chart_of_accounts ADD COLUMN account_name_ar text;
    ALTER TABLE public.payments ADD COLUMN processing_notes text;
    ALTER TABLE public.payment_allocations ADD COLUMN voided_by uuid;
    CREATE TABLE public.payment_allocation_change_log(id uuid,payment_id uuid);
    CREATE TABLE public.payment_cancellation_audit(company_id uuid,payment_id uuid,status_before text,
      reason text,actor_id uuid,already_cancelled boolean,reversal_entry_ids uuid[],
      bank_reversal_transaction_id uuid,affected_invoice_ids uuid[],affected_contract_ids uuid[]);
    CREATE TABLE public.financial_data_repair_snapshots(migration_version text,repair_key text,company_id uuid,
      entity_type text,entity_id uuid,before_value jsonb,after_value jsonb,metadata jsonb,
      UNIQUE(migration_version,entity_type,entity_id));
    CREATE TABLE public.contracts(id uuid PRIMARY KEY,company_id uuid);
    -- The schedule engine remains an explicit double, not full-schema coverage.
    CREATE FUNCTION public.reconcile_contract_rental_schedule_invoice_state(uuid,uuid,uuid[])
    RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;`);
  await db.exec(
    await readFile(
      new URL(
        "../fixtures/live-receipt-reversal-functions-20260906.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  await db.exec(`CREATE TRIGGER a_enforce_posted_journal_reversal_semantics
      BEFORE INSERT OR UPDATE OF status,reversal_entry_id ON public.journal_entries
      FOR EACH ROW EXECUTE FUNCTION public.enforce_posted_journal_reversal_semantics();
    CREATE TRIGGER enforce_journal_entry_financial_controls_trigger BEFORE INSERT OR UPDATE ON public.journal_entries
      FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_entry_financial_controls();
    CREATE TRIGGER validate_journal_entry_line_account BEFORE INSERT OR UPDATE ON public.journal_entry_lines
      FOR EACH ROW EXECUTE FUNCTION public.validate_journal_entry_line_account();`);
}
export async function configureSession(db) {
  await db.query(
    `SELECT set_config('fixture.uid',$1,false),set_config('fixture.role','authenticated',false),
    set_config('fixture.allowed','yes',false),set_config('fixture.period_closed','no',false),
    set_config('fixture.fail_effect','',false),set_config('app.financial_controls_bypass','off',false),
    set_config('app.payment_allocation_batch_mode','off',false),set_config('app.payment_allocation_sync','off',false)`,
    [ids.actor]
  );
}
export async function seedCollectedFeeFixture(db) {
  await configureSession(db);
  await db.query("INSERT INTO public.contracts(id,company_id) VALUES($1,$2)", [
    ids.contract,
    ids.company,
  ]);
  await db.query(
    `INSERT INTO public.invoices(id,company_id,balance,status,total_amount,contract_id,customer_id,due_date,balance_due)
    VALUES($1,$2,1500,'sent',1500,$3,$4,'2026-09-01',1500)`,
    [ids.invoice, ids.company, ids.contract, ids.customer]
  );
  await db.query(
    `INSERT INTO public.late_fees(id,company_id,invoice_id,fee_amount,status,contract_id)
    VALUES($1,$2,$3,3000,'applied',$4)`,
    [ids.fee, ids.company, ids.invoice, ids.contract]
  );
  await db.query(
    `INSERT INTO public.banks(id,company_id,bank_name,account_number,currency,opening_balance,current_balance)
    VALUES($1,$2,'Isolated bank','TEST-ONLY','QAR',100,100)`,
    [ids.bank, ids.company]
  );
  for (const type of [
    "CASH",
    "BANK",
    "RECEIVABLES",
    "LATE_FEE_REVENUE",
    "CUSTOMER_ADVANCES",
  ]) {
    const category =
      type === "LATE_FEE_REVENUE"
        ? "revenue"
        : type === "CUSTOMER_ADVANCES"
        ? "liabilities"
        : "assets";
    const account = (
      await db.query(
        `INSERT INTO public.chart_of_accounts(company_id,account_name,account_type,balance_type,is_active,is_header,account_level)
      VALUES($1,$2,$3,$4,true,false,3) RETURNING id`,
        [
          ids.company,
          type,
          category,
          category === "assets" ? "debit" : "credit",
        ]
      )
    ).rows[0].id;
    let accountType = (
      await db.query(
        "SELECT id FROM public.default_account_types WHERE type_code=$1",
        [type]
      )
    ).rows[0]?.id;
    if (!accountType)
      accountType = (
        await db.query(
          "INSERT INTO public.default_account_types(type_code) VALUES($1) RETURNING id",
          [type]
        )
      ).rows[0].id;
    await db.query(
      `INSERT INTO public.account_mappings(company_id,chart_of_accounts_id,default_account_type_id,is_active)
      VALUES($1,$2,$3,true)`,
      [ids.company, account, accountType]
    );
  }
}
export async function collect(
  db,
  {
    amount = 620,
    feeAmount = 120,
    key = "attempt-one",
    method = "bank_transfer",
    invoice = ids.invoice,
    fee = ids.fee,
  } = {}
) {
  return (
    await db.query(
      `SELECT public.create_invoice_payment_with_late_fee_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) id`,
      [
        ids.company,
        invoice,
        amount,
        feeAmount,
        fee,
        "2026-09-03",
        method,
        null,
        null,
        key,
        ids.actor,
      ]
    )
  ).rows[0].id;
}
export async function receiptState(db) {
  return (
    await db.query(
      `SELECT jsonb_build_object(
    'payments',(SELECT count(*) FROM public.payments),
    'journals',(SELECT count(*) FROM public.journal_entries),
    'lines',(SELECT count(*) FROM public.journal_entry_lines),
    'movements',(SELECT count(*) FROM public.bank_transactions),
    'allocations',(SELECT count(*) FROM public.payment_allocations),
    'requests',(SELECT count(*) FROM public.invoice_fee_payment_requests),
    'context',(SELECT count(*) FROM public.invoice_fee_payment_context),
    'paid',(SELECT paid_amount FROM public.invoices WHERE id=$1),
    'balance',(SELECT current_balance FROM public.banks WHERE id=$2),
    'debit',(SELECT coalesce(sum(debit_amount),0) FROM public.journal_entry_lines),
    'credit',(SELECT coalesce(sum(credit_amount),0) FROM public.journal_entry_lines),
    'rent',(SELECT coalesce(sum(l.credit_amount),0) FROM public.journal_entry_lines l JOIN public.chart_of_accounts a ON a.id=l.account_id WHERE a.account_name='RECEIVABLES'),
    'fees',(SELECT coalesce(sum(l.credit_amount),0) FROM public.journal_entry_lines l JOIN public.chart_of_accounts a ON a.id=l.account_id WHERE a.account_name='LATE_FEE_REVENUE')
  ) state`,
      [ids.invoice, ids.bank]
    )
  ).rows[0].state;
}
export async function cancelReceipt(db, paymentId, companyId = ids.company) {
  return (
    await db.query(
      "SELECT public.cancel_payment_with_reversal($1,$2,$3,$4) result",
      [paymentId, companyId, "Isolated test reversal", ids.actor]
    )
  ).rows[0].result;
}
