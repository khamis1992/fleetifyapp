import { readFile } from "node:fs/promises";
import {
  installCollectedFeeFixture,
  seedCollectedFeeFixture,
  ids,
} from "./collected-fee-fixture.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
export const readSettlementProposal = (rollback = false) =>
  read(
    `../../../supabase/${
      rollback ? "rollbacks" : "migrations"
    }/20260906081942_canonical_settlement_trigger_writers${
      rollback ? ".rollback" : ""
    }.sql`
  );

// Real deployed aggregate writers, identity guards, invoice normalization,
// contract totals, schedule reconciliation and receipt reversal. Period/auth,
// numbering, budgets, reminders, assessment and legal engines are not modeled.
export const lifecycleFunctions = [
  "sync_payment_with_invoice",
  "update_contract_balance",
  "update_contract_payment_totals",
  "update_invoice_payment_totals",
  "update_invoice_on_payment_completion",
  "update_invoice_on_payment",
  "update_schedule_on_payment",
  "guard_payment_invoice_identity",
  "guard_payment_allocation_identity",
  "normalize_invoice_payment_state",
  "ensure_invoice_balance_due",
  "enforce_invoice_date_first_of_month",
  "enforce_invoice_financial_controls",
  "normalize_contract_payment_schedule_status",
  "preserve_inactive_duplicate_schedule_state",
  "enforce_payment_schedule_first_of_month",
  "sync_contract_last_payment_date_from_payment",
];

export async function installFinancialLifecycleFixture(db) {
  await installCollectedFeeFixture(db);
  await db.exec(`ALTER TABLE public.contracts
    ADD COLUMN contract_amount numeric DEFAULT 1500, ADD COLUMN total_paid numeric DEFAULT 0,
    ADD COLUMN balance_due numeric DEFAULT 1500, ADD COLUMN payment_status text DEFAULT 'unpaid',
    ADD COLUMN last_payment_date date, ADD COLUMN updated_at timestamptz;
    ALTER TABLE public.invoices ADD COLUMN invoice_date date DEFAULT '2026-09-01',
      ADD COLUMN invoice_month date DEFAULT '2026-09-01', ADD COLUMN penalty_id uuid,
      ADD COLUMN created_at timestamptz DEFAULT now(), ADD COLUMN journal_entry_id uuid;
    CREATE TABLE public.contract_payment_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid, contract_id uuid, invoice_id uuid, due_date date,
      amount numeric, paid_amount numeric DEFAULT 0, status text DEFAULT 'pending',
      paid_date date, installment_number integer DEFAULT 1, updated_at timestamptz);
    DROP FUNCTION public.recalculate_contract_financial_state(uuid);`);
  await db.exec(
    await read("../fixtures/live-contract-settlement-functions-20260906.sql")
  );
  const graph = JSON.parse(
    await read("../fixtures/live-financial-trigger-graph-20260906.json")
  );
  const functions = new Set();
  for (const trigger of graph.filter((row) =>
    lifecycleFunctions.includes(row.proname)
  )) {
    if (!functions.has(trigger.proname)) {
      await db.exec(trigger.function_definition);
      functions.add(trigger.proname);
    }
    await db.exec(trigger.definition);
  }
  // Include the deployed UPDATE journal trigger as well as the INSERT trigger
  // installed by the receipt fixture, so pending -> completed is exercised.
  const completion = graph.find(
    (row) => row.tgname === "payment_journal_before_completion"
  );
  await db.exec(completion.definition);
  await db.exec(`CREATE TABLE public.fixture_settlement_changes(kind text,id uuid,paid numeric);
    CREATE FUNCTION public.fixture_observe_settlement() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_TABLE_NAME = 'contracts' THEN
        INSERT INTO public.fixture_settlement_changes VALUES(TG_TABLE_NAME,NEW.id,NEW.total_paid);
      ELSE
        INSERT INTO public.fixture_settlement_changes VALUES(TG_TABLE_NAME,NEW.id,NEW.paid_amount);
      END IF;
      RETURN NEW;
    END; $$;
    CREATE TRIGGER zz_fixture_observe_invoice AFTER UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.fixture_observe_settlement();
    CREATE TRIGGER zz_fixture_observe_contract AFTER UPDATE ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.fixture_observe_settlement();`);
}

export async function seedFinancialLifecycleFixture(db) {
  await seedCollectedFeeFixture(db);
  await db.query(
    `INSERT INTO public.contract_payment_schedules
    (company_id,contract_id,invoice_id,due_date,amount) VALUES($1,$2,$3,'2026-09-01',1500)`,
    [ids.company, ids.contract, ids.invoice]
  );
}

export async function settlementState(db) {
  return (
    await db.query(
      `SELECT jsonb_build_object(
    'invoice',(SELECT paid_amount FROM public.invoices WHERE id=$1),
    'contract',(SELECT total_paid FROM public.contracts WHERE id=$2),
    'schedule',(SELECT paid_amount FROM public.contract_payment_schedules WHERE invoice_id=$1 AND status <> 'cancelled'),
    'schedule_status',(SELECT status FROM public.contract_payment_schedules WHERE invoice_id=$1 AND status <> 'cancelled'),
    'paid_date',(SELECT paid_date FROM public.contract_payment_schedules WHERE invoice_id=$1 AND status <> 'cancelled'),
    'max_invoice',(SELECT max(paid) FROM public.fixture_settlement_changes WHERE kind='invoices'),
    'max_contract',(SELECT max(paid) FROM public.fixture_settlement_changes WHERE kind='contracts')) state`,
      [ids.invoice, ids.contract]
    )
  ).rows[0].state;
}
