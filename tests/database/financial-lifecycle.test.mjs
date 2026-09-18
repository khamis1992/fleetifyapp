import assert from "node:assert/strict";
import { before, after, beforeEach, afterEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  installFinancialLifecycleFixture,
  seedFinancialLifecycleFixture,
  settlementState,
  readSettlementProposal,
} from "./helpers/financial-lifecycle-fixture.mjs";
import {
  collect,
  cancelReceipt,
  ids,
} from "./helpers/collected-fee-fixture.mjs";

describe(
  "settlement lifecycle with deployed trigger writers",
  { concurrency: false },
  () => {
    let db;
    before(async () => {
      db = new PGlite();
      await installFinancialLifecycleFixture(db);
    });
    after(async () => {
      await db?.close();
    });
    beforeEach(async () => {
      await db.exec("BEGIN");
      await seedFinancialLifecycleFixture(db);
    });
    afterEach(async () => {
      await db.exec("ROLLBACK");
    });
    // Execute the exact migration body inside this test's rollback transaction.
    const apply = async (rollback = false) =>
      db.exec(
        (await readSettlementProposal(rollback)).replace(
          /^BEGIN;\r?\n|^COMMIT;\r?\n?/gm,
          ""
        )
      );
    const insertReceipt = async (status = "completed", invoice = ids.invoice) =>
      (
        await db.query(
          `
    INSERT INTO public.payments(company_id,customer_id,contract_id,invoice_id,amount,late_fee_amount,
      payment_status,payment_date,payment_method,transaction_type,payment_number,created_by)
    VALUES($1,$2,$3,$4,100,0,$5,'2026-09-03','cash','receipt','PLAIN-TEST',$6) RETURNING id`,
          [ids.company, ids.customer, ids.contract, invoice, status, ids.actor]
        )
      ).rows[0].id;

    it("reproduces gross transient totals and a stale schedule with the captured writers", async () => {
      await collect(db);
      const state = await settlementState(db);
      assert.equal(state.invoice, 500);
      assert.equal(state.contract, 500);
      assert.equal(state.schedule, 620);
      assert.ok(state.max_invoice >= 620);
      assert.ok(state.max_contract >= 620);
    });

    for (const amount of [620, 1620, 120])
      it(`keeps invoice, contract and schedule aligned for a ${amount} receipt`, async () => {
        await apply();
        const id = await collect(db, { amount });
        assert.equal(await collect(db, { amount }), id);
        const state = await settlementState(db);
        for (const key of [
          "invoice",
          "contract",
          "schedule",
          "max_invoice",
          "max_contract",
        ])
          assert.equal(state[key], amount - 120, key);
        assert.equal(state.paid_date, amount === 1620 ? "2026-09-03" : null);
        if (amount > 120)
          assert.equal(
            state.schedule_status,
            amount === 1620 ? "paid" : "partially_paid"
          );
      });

    it("collects partial installments and then clears their paid date on cancellation", async () => {
      await apply();
      await collect(db);
      const second = await collect(db, { amount: 1120, key: "second" });
      assert.equal((await settlementState(db)).schedule, 1500);
      await cancelReceipt(db, second);
      const state = await settlementState(db);
      assert.equal(state.invoice, 500);
      assert.equal(state.contract, 500);
      assert.equal(state.schedule, 500);
      assert.equal(state.schedule_status, "partially_paid");
      assert.equal(state.paid_date, null);
    });

    it("reverses a fully paid receipt across invoice, contract, schedule, journal and bank", async () => {
      await apply();
      const id = await collect(db, { amount: 1620 });
      await cancelReceipt(db, id);
      const state = await settlementState(db);
      assert.equal(state.invoice, 0);
      assert.equal(state.contract, 0);
      assert.equal(state.schedule, 0);
      assert.equal(state.paid_date, null);
      const effects = (
        await db.query(`SELECT
      (SELECT sum(debit_amount-credit_amount) FROM public.journal_entry_lines) net,
      (SELECT current_balance FROM public.banks LIMIT 1) bank,
      (SELECT count(*)::int FROM public.payment_allocations WHERE is_active) active`)
      ).rows[0];
      assert.equal(Number(effects.net), 0);
      assert.equal(Number(effects.bank), 100);
      assert.equal(effects.active, 0);
    });

    it("does not count a pending payment and posts it exactly once on completion", async () => {
      await apply();
      const id = await insertReceipt("pending");
      assert.equal((await settlementState(db)).contract, 0);
      assert.equal(
        (await db.query("SELECT count(*)::int n FROM public.journal_entries"))
          .rows[0].n,
        0
      );
      await db.query(
        "UPDATE public.payments SET payment_status='completed' WHERE id=$1",
        [id]
      );
      await db.query("UPDATE public.payments SET notes='changed' WHERE id=$1", [
        id,
      ]);
      const state = await settlementState(db);
      assert.equal(state.invoice, 100);
      assert.equal(state.contract, 100);
      assert.equal(state.schedule, 100);
      assert.equal(
        (await db.query("SELECT count(*)::int n FROM public.journal_entries"))
          .rows[0].n,
        1
      );
    });

    it("leaves an unallocated contract receipt unlinked to invoices and posts a customer advance", async () => {
      await apply();
      const id = await insertReceipt("completed", null);
      const payment = (
        await db.query("SELECT invoice_id FROM public.payments WHERE id=$1", [
          id,
        ])
      ).rows[0];
      assert.equal(payment.invoice_id, null);
      assert.equal((await settlementState(db)).invoice, 0);
      const offset = (
        await db.query(`SELECT a.account_name FROM public.journal_entry_lines l
      JOIN public.chart_of_accounts a ON a.id=l.account_id WHERE l.credit_amount>0`)
      ).rows[0];
      assert.equal(offset.account_name, "CUSTOMER_ADVANCES");
    });

    it("does not revive or overwrite cancelled duplicate installments", async () => {
      await apply();
      await db.query(
        `INSERT INTO public.contract_payment_schedules
      (company_id,contract_id,invoice_id,due_date,amount,status,paid_amount,paid_date)
      VALUES($1,$2,$3,'2026-09-01',1500,'cancelled',75,'2026-08-01')`,
        [ids.company, ids.contract, ids.invoice]
      );
      await collect(db, { amount: 1620 });
      const row = (
        await db.query(
          "SELECT status,paid_amount,paid_date::text FROM public.contract_payment_schedules WHERE status='cancelled'"
        )
      ).rows[0];
      assert.equal(Number(row.paid_amount), 75);
      assert.equal(row.paid_date, "2026-08-01");
    });

    it("preserves prepaid due dates in the invoice's own month", async () => {
      await apply();
      await db.query(
        "UPDATE public.invoices SET due_date='2026-10-01' WHERE id=$1",
        [ids.invoice]
      );
      await collect(db);
      assert.equal(
        (
          await db.query(
            "SELECT due_date::text FROM public.invoices WHERE id=$1",
            [ids.invoice]
          )
        ).rows[0].due_date,
        "2026-09-01"
      );
    });

    it("refuses changed trigger definitions before removing any writer", async () => {
      await db.exec(
        "ALTER TABLE public.payments DISABLE TRIGGER trg_sync_payment_invoice; SAVEPOINT failure"
      );
      await assert.rejects(apply(), /differs from inspected schema/);
      await db.exec("ROLLBACK TO SAVEPOINT failure");
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_trigger WHERE tgname='payments_update_contract_balance'"
          )
        ).rows[0].n,
        1
      );
    });

    it("refuses installation while invoices can still manufacture historical receipts", async () => {
      const graph = JSON.parse(
        await readFile(
          new URL(
            "./fixtures/live-financial-trigger-graph-20260906.json",
            import.meta.url
          ),
          "utf8"
        )
      );
      const legacy = graph.find(
        (row) => row.tgname === "trg_sync_receipt_on_invoice_update"
      );
      await db.exec(legacy.function_definition);
      await db.exec(legacy.definition);
      await db.exec("SAVEPOINT failure");
      await assert.rejects(
        apply(),
        /Retire invoice aggregate receipt synchronization/
      );
      await db.exec("ROLLBACK TO SAVEPOINT failure");
    });

    it("rolls back the entire receipt when schedule finalization fails", async () => {
      await apply();
      await db.exec(`CREATE FUNCTION public.fixture_fail_schedule() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected schedule failure'; END; $$;
      CREATE TRIGGER fixture_fail_schedule BEFORE UPDATE ON public.contract_payment_schedules
        FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_schedule(); SAVEPOINT failure;`);
      await assert.rejects(collect(db), /injected schedule failure/);
      await db.exec("ROLLBACK TO SAVEPOINT failure");
      const effects = (
        await db.query(`SELECT
      (SELECT count(*)::int FROM public.payments) payments,
      (SELECT count(*)::int FROM public.journal_entries) journals,
      (SELECT count(*)::int FROM public.payment_allocations) allocations,
      (SELECT count(*)::int FROM public.bank_transactions) movements,
      (SELECT count(*)::int FROM public.invoice_fee_payment_requests) requests`)
      ).rows[0];
      assert.deepEqual(effects, {
        payments: 0,
        journals: 0,
        allocations: 0,
        movements: 0,
        requests: 0,
      });
      const state = await settlementState(db);
      assert.equal(state.invoice, 0);
      assert.equal(state.contract, 0);
      assert.equal(state.schedule, 0);
    });

    it("recalculates both installments when principal allocation moves to another invoice month", async () => {
      await apply();
      const invoice2 = "11111111-1111-4111-8111-111111111112";
      await db.query(
        `INSERT INTO public.invoices(id,company_id,contract_id,customer_id,total_amount,status,invoice_month,invoice_date,due_date)
      VALUES($1,$2,$3,$4,1500,'sent','2026-10-01','2026-10-01','2026-10-01')`,
        [invoice2, ids.company, ids.contract, ids.customer]
      );
      await db.query(
        `INSERT INTO public.contract_payment_schedules(company_id,contract_id,invoice_id,due_date,amount)
      VALUES($1,$2,$3,'2026-10-01',1500)`,
        [ids.company, ids.contract, invoice2]
      );
      const id = await collect(db);
      await db.query(
        `UPDATE public.payment_allocations SET is_active=false,voided_at=now(),
      voided_by=$1,void_reason='Synthetic replacement' WHERE payment_id=$2 AND allocation_type='invoice'`,
        [ids.actor, id]
      );
      await db.query(
        `INSERT INTO public.payment_allocations(company_id,payment_id,allocation_type,target_id,amount)
      VALUES($1,$2,'invoice',$3,500)`,
        [ids.company, id, invoice2]
      );
      const first = await settlementState(db);
      assert.equal(first.invoice, 0);
      assert.equal(first.schedule, 0);
      assert.equal(first.contract, 500);
      const second = (
        await db.query(
          "SELECT paid_amount FROM public.contract_payment_schedules WHERE invoice_id=$1",
          [invoice2]
        )
      ).rows[0];
      assert.equal(Number(second.paid_amount), 500);
    });

    it("restores the original trigger definitions and handler body on rollback", async () => {
      const before = (
        await db.query(
          "SELECT tgname,pg_get_triggerdef(oid) definition FROM pg_trigger WHERE tgrelid='public.payments'::regclass ORDER BY tgname"
        )
      ).rows;
      await apply();
      await apply(true);
      const after = (
        await db.query(
          "SELECT tgname,pg_get_triggerdef(oid) definition FROM pg_trigger WHERE tgrelid='public.payments'::regclass ORDER BY tgname"
        )
      ).rows;
      assert.deepEqual(after, before);
      assert.equal(
        (
          await db.query(
            "SELECT md5(prosrc) hash FROM pg_proc WHERE oid='public.update_invoice_on_payment_completion()'::regprocedure"
          )
        ).rows[0].hash,
        "6051314941348f1edd6002f7c0788369"
      );
    });

    it("does not expose the schedule finalization trigger as a callable browser RPC", async () => {
      await apply();
      for (const role of ["anon", "authenticated", "service_role"])
        assert.equal(
          (
            await db.query(
              "SELECT has_function_privilege($1,'public.sync_schedule_after_invoice_settlement_v1()','EXECUTE') allowed",
              [role]
            )
          ).rows[0].allowed,
          false
        );
    });

    it("refuses rollback when the schedule handler has changed since installation", async () => {
      await apply();
      await db.exec(`CREATE OR REPLACE FUNCTION public.sync_schedule_after_invoice_settlement_v1()
      RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$; SAVEPOINT failure;`);
      await assert.rejects(apply(true), /Schedule settlement handler changed/);
      await db.exec("ROLLBACK TO SAVEPOINT failure");
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_trigger WHERE tgname='sync_schedule_after_invoice_settlement_v1'"
          )
        ).rows[0].n,
        1
      );
    });
  }
);
