// Shared real financial function/trigger slice for PGlite and multi-session PostgreSQL.
// Auth, period policy, numbering and contract rollup remain explicit doubles.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

export async function installCanonicalFeeFixture(db) {
  const loadFunction = async (file, name) => {
    assert.match(name, /^[a-z_][a-z_0-9]*$/);
    const source = (await read(`../../supabase/migrations/${file}`)).replace(
      /\r\n/g,
      "\n"
    );
    const body = source.match(
      new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`
      )
    )?.[0];
    assert.ok(body, `function ${name} missing from ${file}`);
    await db.exec(body);
  };
  await db.exec(await read("./fixtures/invoice-fee-replay-schema.sql"));
  await db.exec(await read("./fixtures/invoice-fee-v1-integration-schema.sql"));
  await db.exec(
    await read("./fixtures/invoice-fee-bank-integration-schema.sql")
  );
  await db.exec(
    await read("./fixtures/invoice-fee-journal-integration-schema.sql")
  );
  await db.exec(`DROP FUNCTION public.resolve_payment_bank_id(uuid,uuid,text,text);
      DROP FUNCTION public.create_payment_bank_transaction(uuid);`);
  for (const name of ["payment_method_uses_bank", "resolve_payment_bank_id"]) {
    await loadFunction(
      "20260712052400_atomic_payment_creation_and_bank_linkage.sql",
      name
    );
  }
  await loadFunction(
    "20260712052400_atomic_payment_creation_and_bank_linkage.sql",
    "enforce_bank_transaction_payment_link"
  );
  await db.exec(`CREATE TRIGGER a_enforce_bank_transaction_payment_link
      BEFORE INSERT OR UPDATE OF payment_id,reversal_of_transaction_id,company_id,bank_id,amount,transaction_type,journal_entry_id
      ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.enforce_bank_transaction_payment_link();`);
  await loadFunction(
    "20260712052300_atomic_payment_cancellation_and_contract_totals.sql",
    "recalculate_bank_balance"
  );
  for (const name of [
    "create_payment_receipt_journal",
    "trg_payment_journal_entry_fn",
  ]) {
    await loadFunction(
      "20260712052400_atomic_payment_creation_and_bank_linkage.sql",
      name
    );
  }
  await db.exec(
    await read("./fixtures/live-bank-journal-functions-20260904.sql")
  );
  await db.exec(`CREATE TRIGGER payment_journal_before_insert BEFORE INSERT ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.trg_payment_journal_entry_fn();
      CREATE TRIGGER trigger_bank_transaction_changes BEFORE INSERT OR UPDATE ON public.bank_transactions
      FOR EACH ROW EXECUTE FUNCTION public.handle_bank_transaction_changes();
      CREATE TRIGGER handle_bank_transaction_changes AFTER INSERT ON public.bank_transactions
      FOR EACH ROW EXECUTE FUNCTION public.handle_bank_transaction_changes();
      CREATE TRIGGER bank_transaction_balance_update_trigger AFTER INSERT OR DELETE OR UPDATE ON public.bank_transactions
      FOR EACH ROW EXECUTE FUNCTION public.handle_bank_transaction_balance_update();`);
  await loadFunction(
    "20260803150437_harden_employee_workspace_payment_authorization.sql",
    "create_payment_bank_transaction"
  );
  await db.exec(`REVOKE ALL ON FUNCTION public.create_payment_bank_transaction(uuid) FROM PUBLIC,anon,authenticated;
      GRANT EXECUTE ON FUNCTION public.create_payment_bank_transaction(uuid) TO service_role;`);
  await db.exec(
    await read(
      "../../supabase/migrations/20260903213117_validate_legacy_bank_movement_before_payment_link.sql"
    )
  );
  await db.exec(`ALTER TABLE public.invoices ADD COLUMN balance_due numeric(15,2), ADD COLUMN updated_at timestamptz;
      DROP FUNCTION public.canonical_invoice_paid_amount(uuid,uuid);
      DROP FUNCTION public.sync_payment_allocation_state(uuid);
      DROP FUNCTION public.recalculate_invoice_financial_state(uuid);`);
  await loadFunction(
    "20260712052900_unify_canonical_payment_allocation_semantics.sql",
    "canonical_invoice_paid_amount"
  );
  await loadFunction(
    "20260712055600_use_sent_for_open_invoice_recalculation.sql",
    "recalculate_invoice_financial_state"
  );
  for (const name of [
    "sync_payment_allocation_state",
    "auto_seed_payment_invoice_allocation",
  ]) {
    await loadFunction(
      "20260712052000_canonical_payment_allocation_ledger.sql",
      name
    );
  }
  // Match the production helper ACL, excluded by loadFunction's body matcher.
  await db.exec(`REVOKE ALL ON FUNCTION public.sync_payment_allocation_state(uuid) FROM PUBLIC,anon,authenticated;
      GRANT EXECUTE ON FUNCTION public.sync_payment_allocation_state(uuid) TO service_role;`);
  for (const name of [
    "create_invoice_payment_with_late_fee_v1",
    "validate_payment_allocation_row",
    "after_payment_allocation_change",
  ]) {
    await loadFunction(
      "20260725170000_separate_invoice_late_fee_payments.sql",
      name
    );
  }
  await loadFunction(
    "20260712052300_atomic_payment_cancellation_and_contract_totals.sql",
    "enforce_payment_financial_controls"
  );
  await db.exec(await read("./fixtures/live-overpayment-warning-20260903.sql"));
  await db.exec(
    await read(
      "../../supabase/migrations/20260903203807_replay_safe_invoice_late_fee_payment.sql"
    )
  );
  await db.exec(
    await read(
      "../../supabase/migrations/20260903210643_guard_fee_receipt_principal_with_command_context.sql"
    )
  );
  await db.exec(
    await read(
      "../../supabase/migrations/20260903211652_preserve_invoice_link_for_fee_only_receipts.sql"
    )
  );
  await db.exec(`CREATE TRIGGER enforce_payment_financial_controls_trigger BEFORE INSERT OR UPDATE ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_financial_controls();
      CREATE TRIGGER trigger_check_overpayment BEFORE INSERT ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.check_payment_overpayment();
      CREATE TRIGGER payment_allocation_auto_seed_after_payment AFTER INSERT OR UPDATE OF payment_status,invoice_id ON public.payments
        FOR EACH ROW EXECUTE FUNCTION public.auto_seed_payment_invoice_allocation();
      CREATE TRIGGER validate_payment_allocation_row_trigger BEFORE INSERT OR UPDATE ON public.payment_allocations
        FOR EACH ROW EXECUTE FUNCTION public.validate_payment_allocation_row();
      CREATE TRIGGER after_payment_allocation_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.payment_allocations
        FOR EACH ROW EXECUTE FUNCTION public.after_payment_allocation_change();`);
}
