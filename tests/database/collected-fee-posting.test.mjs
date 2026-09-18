import assert from "node:assert/strict";
import { before, after, beforeEach, afterEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  ids,
  installCollectedFeeFixture,
  seedCollectedFeeFixture,
  collect,
  receiptState,
  readProposal,
  cancelReceipt,
} from "./helpers/collected-fee-fixture.mjs";

describe(
  "collected fee proposal — real receipt/allocation/bank functions",
  { concurrency: false },
  () => {
    let db;
    before(async () => {
      db = new PGlite();
      await installCollectedFeeFixture(db);
    });
    after(async () => {
      await db?.close();
    });
    beforeEach(async () => {
      await db.exec("BEGIN");
      await seedCollectedFeeFixture(db);
    });
    afterEach(async () => {
      await db.exec("ROLLBACK");
    });
    const rejectAtomically = async (operation, pattern) => {
      const beforeState = await receiptState(db);
      await db.exec("SAVEPOINT failure");
      await assert.rejects(operation(), pattern);
      await db.exec("ROLLBACK TO SAVEPOINT failure");
      assert.deepEqual(await receiptState(db), beforeState);
    };
    for (const method of ["cash", "bank_transfer"])
      for (const amount of [1620, 620, 120]) {
        it(`${method}: separates ${
          amount - 120
        } principal and 120 fees in one ${amount} receipt`, async () => {
          const id = await collect(db, { amount, method });
          assert.equal(await collect(db, { amount, method }), id);
          const state = await receiptState(db);
          assert.deepEqual(state, {
            payments: 1,
            journals: 1,
            lines: amount === 120 ? 2 : 3,
            movements: method === "cash" ? 0 : 1,
            allocations: amount === 120 ? 1 : 2,
            requests: 1,
            context: 0,
            paid: amount - 120,
            balance: method === "cash" ? 100 : 100 + amount,
            debit: amount,
            credit: amount,
            rent: amount - 120,
            fees: 120,
          });
        });
      }
    for (const [name, change] of [
      [
        "missing",
        "DELETE FROM public.account_mappings WHERE default_account_type_id=(SELECT id FROM public.default_account_types WHERE type_code='LATE_FEE_REVENUE')",
      ],
      [
        "inactive",
        "UPDATE public.chart_of_accounts SET is_active=false WHERE account_name='LATE_FEE_REVENUE'",
      ],
      [
        "header",
        "UPDATE public.chart_of_accounts SET is_header=true WHERE account_name='LATE_FEE_REVENUE'",
      ],
      [
        "level two",
        "UPDATE public.chart_of_accounts SET account_level=2 WHERE account_name='LATE_FEE_REVENUE'",
      ],
      [
        "foreign company",
        `UPDATE public.chart_of_accounts SET company_id='${ids.other}' WHERE account_name='LATE_FEE_REVENUE'`,
      ],
      [
        "asset instead of revenue",
        "UPDATE public.chart_of_accounts SET account_type='assets' WHERE account_name='LATE_FEE_REVENUE'",
      ],
      [
        "wrong balance type",
        "UPDATE public.chart_of_accounts SET balance_type='debit' WHERE account_name='LATE_FEE_REVENUE'",
      ],
      [
        "ambiguous",
        `INSERT INTO public.account_mappings(company_id,chart_of_accounts_id,default_account_type_id,is_active)
      SELECT m.company_id,a.id,m.default_account_type_id,true FROM public.account_mappings m
      JOIN public.default_account_types t ON t.id=m.default_account_type_id
      JOIN public.chart_of_accounts a ON a.account_name='RECEIVABLES' WHERE t.type_code='LATE_FEE_REVENUE'`,
      ],
    ])
      it(`rejects ${name} fee mapping without any financial effect`, async () => {
        await db.exec(change);
        await rejectAtomically(
          () => collect(db),
          /LATE_FEE_REVENUE posting mapping/
        );
      });
    for (const [method, type] of [
      ["bank_transfer", "BANK"],
      ["cash", "CASH"],
    ])
      it(`never substitutes another cash/bank mapping for ${type}`, async () => {
        await db.query(
          `UPDATE public.account_mappings SET is_active=false
      WHERE default_account_type_id=(SELECT id FROM public.default_account_types WHERE type_code=$1)`,
          [type]
        );
        await rejectAtomically(
          () => collect(db, { method }),
          new RegExp(type + " posting mapping")
        );
      });
    it("preserves successful replay after period closure and mapping removal", async () => {
      const id = await collect(db);
      const state = await receiptState(db);
      await db.exec(
        "SELECT set_config('fixture.period_closed','yes',false); DELETE FROM public.account_mappings"
      );
      assert.equal(await collect(db), id);
      assert.deepEqual(await receiptState(db), state);
    });
    it("rolls back the receipt, principal, fees and journal on a bank failure", async () => {
      await db.exec(`CREATE FUNCTION public.reject_fixture_bank() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      RAISE EXCEPTION 'injected bank failure'; END; $$;
      CREATE TRIGGER fixture_bank_failure BEFORE UPDATE ON public.banks FOR EACH ROW EXECUTE FUNCTION public.reject_fixture_bank();`);
      await rejectAtomically(() => collect(db), /injected bank failure/);
    });
    it("posts fee-only collection even when rent receivable mapping is unavailable", async () => {
      await db.exec(
        "UPDATE public.chart_of_accounts SET is_active=false WHERE account_name='RECEIVABLES'"
      );
      await collect(db, { amount: 120 });
      assert.equal((await receiptState(db)).rent, 0);
    });
    for (const amount of [1620, 620, 120])
      it(`reverses ${amount} receipt with separate principal and fee lines, once`, async () => {
        const id = await collect(db, { amount });
        const first = await cancelReceipt(db, id);
        const second = await cancelReceipt(db, id);
        assert.equal(first.status, "cancelled");
        assert.equal(second.already_cancelled, true);
        assert.deepEqual(first.reversal_entry_ids, second.reversal_entry_ids);
        assert.equal(
          first.bank_reversal_transaction_id,
          second.bank_reversal_transaction_id
        );
        const state = await receiptState(db);
        assert.equal(state.paid, 0);
        assert.equal(state.balance, 100);
        assert.equal(state.journals, 2);
        assert.equal(state.movements, 2);
        assert.equal(state.payments, 1);
        assert.deepEqual(
          (
            await db.query(`SELECT a.account_name,sum(l.debit_amount-l.credit_amount)::float8 balance
      FROM public.journal_entry_lines l JOIN public.chart_of_accounts a ON a.id=l.account_id
      JOIN public.journal_entries e ON e.id=l.journal_entry_id WHERE e.status='posted' GROUP BY a.account_name`)
          ).rows.map((r) => r.balance),
          amount === 120 ? [0, 0] : [0, 0, 0]
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int n FROM public.payment_allocations WHERE is_active"
            )
          ).rows[0].n,
          0
        );
        assert.equal(await collect(db, { amount }), id); // Historical replay must not collect again.
        assert.deepEqual(await receiptState(db), state);
      });
    it("refuses a foreign-company cancellation without changing any financial state", async () => {
      const id = await collect(db);
      await rejectAtomically(
        () => cancelReceipt(db, id, ids.other),
        /authorized|not found/i
      );
    });
    it("rolls back an attempted cancellation when the financial period is closed", async () => {
      const id = await collect(db);
      await db.exec("SELECT set_config('fixture.period_closed','yes',false)");
      await rejectAtomically(
        () => cancelReceipt(db, id),
        /financial period closed/
      );
    });
    it("restores function definitions on rollback without changing posted records or configuration", async () => {
      await collect(db);
      const state = await receiptState(db);
      // Remove transaction wrappers so this test can roll back its own fixture.
      await db.exec(
        (await readProposal(true)).replace(/^BEGIN;|COMMIT;\s*$/gm, "")
      );
      assert.deepEqual(await receiptState(db), state);
      assert.equal(
        (
          await db.query(
            "SELECT to_regprocedure('public.create_payment_receipt_journal_v2(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid,numeric)') absent"
          )
        ).rows[0].absent,
        null
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int n FROM public.default_account_types WHERE type_code='LATE_FEE_REVENUE'"
          )
        ).rows[0].n,
        1
      );
    });
    it("refuses migration when the inspected posting helper has changed", async () => {
      await db.exec(
        (await readProposal(true)).replace(/^BEGIN;|COMMIT;\s*$/gm, "")
      );
      await db.exec(`CREATE OR REPLACE FUNCTION public.trg_payment_journal_entry_fn() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;`);
      const sql = (await readProposal()).replace(/^BEGIN;|COMMIT;\s*$/gm, "");
      await rejectAtomically(
        () => db.exec(sql),
        /differs from the inspected schema/
      );
    });
    it("refuses migration without the replay-safe payment command prerequisite", async () => {
      await db.exec(
        (await readProposal(true)).replace(/^BEGIN;|COMMIT;\s*$/gm, "")
      );
      await db.exec(
        "DROP FUNCTION public.create_invoice_payment_with_late_fee_v2(uuid,uuid,numeric,numeric,uuid,date,text,text,text,text,uuid)"
      );
      const sql = (await readProposal()).replace(/^BEGIN;|COMMIT;\s*$/gm, "");
      await rejectAtomically(() => db.exec(sql), /replay-safe fee command/);
    });
    for (const signature of [
      "resolve_receipt_posting_account_v1(uuid,text)",
      "create_payment_receipt_journal_v2(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid,numeric)",
      "create_payment_receipt_journal(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid)",
    ]) {
      it(`does not expose internal helper ${
        signature.split("(")[0]
      } to browser roles`, async () => {
        for (const role of ["anon", "authenticated"])
          assert.equal(
            (
              await db.query(
                "SELECT has_function_privilege($1,$2,'EXECUTE') allowed",
                [role, "public." + signature]
              )
            ).rows[0].allowed,
            false
          );
      });
    }
  }
);
