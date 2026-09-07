// Native multi-session PostgreSQL, isolated synthetic data. No production URL accepted.
// Exercises real receipt journals/banks/allocations and canonical settlement
// writers/schedules; auth, periods and other department engines remain doubles.
import assert from "node:assert/strict";
import { before, after, beforeEach, afterEach, describe, it } from "node:test";
import pg from "pg";
import { startTemporaryPostgres } from "./helpers/temporary-postgres.mjs";
import {
  ids,
  configureSession,
  collect,
  receiptState,
  cancelReceipt,
} from "./helpers/collected-fee-fixture.mjs";
import {
  installFinancialLifecycleFixture,
  seedFinancialLifecycleFixture,
  readSettlementProposal,
  settlementState,
} from "./helpers/financial-lifecycle-fixture.mjs";

describe(
  "native PostgreSQL financial concurrency",
  { concurrency: false },
  () => {
    let cluster, admin;
    const clients = new Set();
    const connect = async () => {
      const client = new pg.Client(cluster.config);
      await client.connect();
      clients.add(client);
      await configureSession(client);
      return client;
    };
    before(async () => {
      cluster = await startTemporaryPostgres();
      admin = new pg.Client(cluster.config);
      await admin.connect();
      admin.exec = (sql) => admin.query(sql);
      console.log("Isolated PostgreSQL version:", cluster.version);
    });
    after(async () => {
      await Promise.allSettled([...clients].map((client) => client.end()));
      await admin?.end();
      await cluster?.close();
    });
    beforeEach(async () => {
      // Only the disposable database created above is ever reset.
      await admin.query(`DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE;
      DROP ROLE IF EXISTS anon; DROP ROLE IF EXISTS authenticated; DROP ROLE IF EXISTS service_role;
      CREATE SCHEMA public;`);
      await installFinancialLifecycleFixture(admin);
      await admin.exec(await readSettlementProposal());
      await seedFinancialLifecycleFixture(admin);
    });
    afterEach(async () => {
      await Promise.allSettled([...clients].map((client) => client.end()));
      clients.clear();
    });
    const contend = async (firstOptions, secondOptions) => {
      const first = await connect(),
        second = await connect();
      await first.query("BEGIN");
      const id = await collect(first, firstOptions);
      let settled = false;
      const pending = collect(second, secondOptions)
        .then(
          (value) => ({ value }),
          (error) => ({ error })
        )
        .finally(() => {
          settled = true;
        });
      // Verify actual lock blocking before releasing the first transaction.
      for (let attempt = 0; attempt < 50; attempt++) {
        const blocked = (
          await admin.query(
            `SELECT count(*)::int n FROM pg_stat_activity
        WHERE pid=$1 AND wait_event_type='Lock'`,
            [second.processID]
          )
        ).rows[0].n;
        if (blocked) break;
        if (attempt === 49)
          assert.fail(
            "Second database session never waited on the first transaction"
          );
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(settled, false);
      await first.query("COMMIT");
      return { id, result: await pending };
    };
    it("two simultaneous retries return one receipt, one journal and one bank deposit", async () => {
      const { id, result } = await contend(
        { key: "shared" },
        { key: "shared" }
      );
      assert.equal(result.value, id);
      assert.deepEqual(await receiptState(admin), {
        payments: 1,
        journals: 1,
        lines: 3,
        movements: 1,
        allocations: 2,
        requests: 1,
        context: 0,
        paid: 500,
        balance: 720,
        debit: 620,
        credit: 620,
        rent: 500,
        fees: 120,
      });
    });
    it("serializes two different partial payments without a lost bank balance update", async () => {
      const { id, result } = await contend({ key: "first" }, { key: "second" });
      assert.ok(result.value);
      assert.notEqual(result.value, id);
      const state = await receiptState(admin);
      assert.equal(state.paid, 1000);
      assert.equal(state.balance, 1340);
      assert.equal(state.payments, 2);
      assert.equal(state.journals, 2);
      assert.equal(state.fees, 240);
      const settlement = await settlementState(admin);
      assert.equal(settlement.contract, 1000);
      assert.equal(settlement.schedule, 1000);
    });
    it("rejects the losing request if both callers try to pay the remaining invoice principal", async () => {
      const { result } = await contend(
        { key: "first", amount: 1620 },
        { key: "second", amount: 1620 }
      );
      assert.match(result.error?.message || "", /overpay/i);
      const state = await receiptState(admin);
      assert.equal(state.payments, 1);
      assert.equal(state.paid, 1500);
      assert.equal(state.balance, 1720);
      assert.equal(state.context, 0);
      assert.equal((await settlementState(admin)).schedule, 1500);
    });
    it("rejects concurrent reuse of an attempt key with different receipt data", async () => {
      const { result } = await contend(
        { key: "shared" },
        { key: "shared", amount: 720 }
      );
      assert.match(result.error?.message || "", /different payment data/);
      assert.equal((await receiptState(admin)).payments, 1);
    });
    it("rechecks collectible fee balance after the first transaction commits", async () => {
      await admin.query("UPDATE public.late_fees SET fee_amount=120");
      const { result } = await contend(
        { key: "first", amount: 120 },
        { key: "second", amount: 120 }
      );
      assert.match(result.error?.message || "", /remaining assessed fee/);
      const state = await receiptState(admin);
      assert.equal(state.payments, 1);
      assert.equal(state.fees, 120);
      assert.equal(state.paid, 0);
    });
    it("allows a waiting retry to succeed after the first complete receipt transaction rolls back", async () => {
      const first = await connect(),
        second = await connect();
      await first.query("BEGIN");
      const abandoned = await collect(first, { key: "retry-after-rollback" });
      const pending = collect(second, { key: "retry-after-rollback" });
      await first.query("ROLLBACK");
      const id = await pending;
      assert.notEqual(id, abandoned);
      const state = await receiptState(admin);
      assert.equal(state.payments, 1);
      assert.equal(state.balance, 720);
      assert.equal(state.requests, 1);
    });
    it("serializes independent invoices depositing into the same bank without losing either amount", async () => {
      const invoice2 = "11111111-1111-4111-8111-111111111112",
        fee2 = "44444444-4444-4444-8444-444444444445";
      await admin.query(
        `INSERT INTO public.invoices(id,company_id,balance,status,total_amount,contract_id,customer_id,due_date,balance_due)
      SELECT $1,company_id,balance,status,total_amount,contract_id,customer_id,due_date,balance_due FROM public.invoices WHERE id=$2`,
        [invoice2, ids.invoice]
      );
      await admin.query(
        `INSERT INTO public.late_fees(id,company_id,invoice_id,fee_amount,status,contract_id)
      VALUES($1,$2,$3,3000,'applied',$4)`,
        [fee2, ids.company, invoice2, ids.contract]
      );
      const { result } = await contend(
        { key: "invoice-one" },
        { key: "invoice-two", invoice: invoice2, fee: fee2 }
      );
      assert.ok(result.value, result.error?.message);
      const state = await receiptState(admin);
      assert.equal(state.balance, 1340);
      assert.equal(state.payments, 2);
      assert.equal(state.fees, 240);
    });
    it("concurrent cancellations preserve one journal reversal and one bank withdrawal", async () => {
      const id = await collect(admin);
      const first = await connect(),
        second = await connect();
      await first.query("BEGIN");
      const reversal = await cancelReceipt(first, id);
      const pending = cancelReceipt(second, id);
      await first.query("COMMIT");
      const retry = await pending;
      assert.deepEqual(retry.reversal_entry_ids, reversal.reversal_entry_ids);
      assert.equal(
        retry.bank_reversal_transaction_id,
        reversal.bank_reversal_transaction_id
      );
      const state = await receiptState(admin);
      assert.equal(state.balance, 100);
      assert.equal(state.paid, 0);
      assert.equal(state.journals, 2);
      assert.equal(state.movements, 2);
      const settlement = await settlementState(admin);
      assert.equal(settlement.contract, 0);
      assert.equal(settlement.schedule, 0);
      assert.equal(settlement.paid_date, null);
    });
  }
);
