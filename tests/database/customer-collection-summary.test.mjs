import assert from "node:assert/strict";
import { before, after, beforeEach, afterEach, describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { ids } from "./helpers/collected-fee-fixture.mjs";
const read = (rollback) =>
  readFile(
    new URL(
      `../../supabase/${
        rollback ? "rollbacks" : "migrations"
      }/20260906083542_canonical_customer_collection_summary${
        rollback ? ".rollback" : ""
      }.sql`,
      import.meta.url
    ),
    "utf8"
  );

describe("customer collection snapshot from receipt allocations", () => {
  let db;
  const report = async (company = ids.company) =>
    (
      await db.query(
        "SELECT public.get_customer_collection_summary_v1($1,$2) result",
        [company, "2026-09-06"]
      )
    ).rows[0].result;
  before(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${ids.actor}'::uuid $$;
      CREATE FUNCTION public.get_user_company(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${ids.company}'::uuid $$;
      CREATE FUNCTION public.is_super_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE TABLE public.companies(id uuid PRIMARY KEY);
      CREATE TABLE public.contracts(id uuid PRIMARY KEY,company_id uuid);
      CREATE TABLE public.invoices(id uuid PRIMARY KEY,company_id uuid,customer_id uuid,contract_id uuid,penalty_id uuid,
        status text,invoice_date date,total_amount numeric,paid_amount numeric,currency text,invoice_type text DEFAULT 'sales',
        invoice_number text DEFAULT 'TEST-INVOICE',due_date date DEFAULT '2026-09-01');
      CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,customer_id uuid,
        invoice_id uuid,payment_date date,payment_status text,transaction_type text,amount numeric,currency text,late_fine_amount numeric);
      CREATE TABLE public.payment_allocations(company_id uuid,payment_id uuid,allocation_type text,target_id uuid,amount numeric,is_active boolean DEFAULT true);
      CREATE TABLE public.late_fees(id uuid PRIMARY KEY,company_id uuid);
      CREATE TABLE public.rental_payment_receipts(total_paid numeric,fine numeric);
      GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;`);
    for (const table of [
      "contracts",
      "invoices",
      "payments",
      "payment_allocations",
      "late_fees",
    ])
      await db.exec(`
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant ON public.${table} TO authenticated USING(company_id=public.get_user_company(auth.uid()));`);
    await db.exec(await read(false));
  });
  after(async () => db?.close());
  beforeEach(async () => {
    await db.exec("BEGIN");
    await db.query("INSERT INTO public.companies VALUES($1),($2)", [
      ids.company,
      ids.other,
    ]);
    await db.query("INSERT INTO public.contracts VALUES($1,$2)", [
      ids.contract,
      ids.company,
    ]);
    await db.query(
        `INSERT INTO public.invoices(id,company_id,customer_id,contract_id,penalty_id,status,invoice_date,total_amount,paid_amount,currency,invoice_type)
          VALUES($1,$2,$3,$4,NULL,'sent','2026-09-01',1500,999,'QAR','sales')`,
      [ids.invoice, ids.company, ids.customer, ids.contract]
    );
    await db.query("INSERT INTO public.late_fees VALUES($1,$2)", [
      ids.fee,
      ids.company,
    ]);
    const payment = (
      await db.query(
        `INSERT INTO public.payments(company_id,customer_id,invoice_id,payment_date,payment_status,transaction_type,amount,currency,late_fine_amount)
      VALUES($1,$2,$3,'2026-09-03','completed','receipt',620,'QAR',9999) RETURNING id`,
        [ids.company, ids.customer, ids.invoice]
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO public.payment_allocations VALUES($1,$2,'invoice',$3,500,true),($1,$2,'late_fee',$4,120,true)`,
      [ids.company, payment, ids.invoice, ids.fee]
    );
    await db.exec(
      "INSERT INTO public.rental_payment_receipts VALUES(99999,88888)"
    );
  });
  afterEach(async () => db.exec("ROLLBACK; RESET ROLE"));
  it("counts one actual receipt and derives rent, fees and invoice balance independently of cached totals or legacy documents", async () => {
    const data = await report();
    assert.deepEqual(data.monthly, [
      {
        month_key: "2026-09",
        total: 620,
        rent: 500,
        fines: 120,
        advances: 0,
        other: 0,
        count: 1,
      },
    ]);
    assert.deepEqual(data.customers, [
      {
        customer_id: ids.customer,
        total: 620,
        rent: 500,
        fines: 120,
        advances: 0,
        other: 0,
        count: 1,
        pending: 1000,
        partial_count: 1,
        last_payment_date: "2026-09-03",
      },
    ]);
  });
  it("excludes cancelled, pending, disbursement, future and foreign-currency receipts", async () => {
    for (const [status, type, date, currency] of [
      ["cancelled", "receipt", "2026-09-03", "QAR"],
      ["pending", "receipt", "2026-09-03", "QAR"],
      ["completed", "payment", "2026-09-03", "QAR"],
      ["completed", "receipt", "2026-10-03", "QAR"],
      ["completed", "receipt", "2026-09-03", "USD"],
    ])
      await db.query(
        `INSERT INTO public.payments(company_id,customer_id,amount,payment_status,transaction_type,payment_date,currency) VALUES($1,$2,500,$3,$4,$5,$6)`,
        [ids.company, ids.customer, status, type, date, currency]
      );
    assert.equal((await report()).monthly[0].total, 620);
  });
  it("separates unallocated advances from rent without using legacy fine fields", async () => {
    await db.query(
      `INSERT INTO public.payments(company_id,customer_id,payment_date,payment_status,transaction_type,amount,currency,late_fine_amount)
      VALUES($1,$2,'2026-09-03','completed','receipt',300,'QAR',150)`,
      [ids.company, ids.customer]
    );
    const row = (await report()).monthly[0];
    assert.equal(row.total, 920);
    assert.equal(row.rent, 500);
    assert.equal(row.fines, 120);
    assert.equal(row.advances, 300);
  });
  it("does not lose non-rental allocations from the receipt total", async () => {
    await db.exec(
      "UPDATE public.payment_allocations SET allocation_type='obligation' WHERE allocation_type='invoice'"
    );
    const row = (await report()).monthly[0];
    assert.equal(row.rent, 0);
    assert.equal(row.other, 500);
    assert.equal(row.total, 620);
  });
  it("drops reversed receipt cash and reopens the invoice balance in the current snapshot", async () => {
    await db.exec("UPDATE public.payments SET payment_status='cancelled'");
    const data = await report();
    assert.deepEqual(data.monthly, []);
    assert.equal(data.customers[0].pending, 1500);
    assert.equal(data.customers[0].total, 0);
  });
  it("fails instead of reporting a receipt whose allocations exceed its value", async () => {
    await db.exec(
      "UPDATE public.payment_allocations SET amount=700 WHERE allocation_type='invoice'; SAVEPOINT failure"
    );
    await assert.rejects(report(), /need reconciliation/);
    await db.exec("ROLLBACK TO SAVEPOINT failure");
  });
  it("enforces company permission and invoker row policies", async () => {
    await db.query(
      `INSERT INTO public.payments(company_id,customer_id,payment_date,payment_status,transaction_type,amount,currency)
      VALUES($1,$2,'2026-09-03','completed','receipt',777,'QAR')`,
      [ids.other, ids.customer]
    );
    await db.exec("SET LOCAL ROLE authenticated");
    assert.equal((await report()).monthly[0].total, 620);
    await db.exec("SAVEPOINT failure");
    await assert.rejects(report(ids.other), /Company reporting access/);
    await db.exec("ROLLBACK TO SAVEPOINT failure");
  });
  it("blocks anonymous RPC access", async () => {
    await db.exec("SET LOCAL ROLE anon; SAVEPOINT failure");
    await assert.rejects(report(), /permission denied/);
    await db.exec("ROLLBACK TO SAVEPOINT failure");
  });
  it('uses the linked invoice customer when an older receipt has no customer pointer',async()=>{
    await db.exec('UPDATE public.payments SET customer_id=NULL');
    const data=await report();
    assert.equal(data.monthly[0].total,620);assert.equal(data.customers[0].customer_id,ids.customer);
    assert.equal(data.customers[0].pending,1000);
  });
  it('includes allocated principal in invoice balances even without a legacy invoice/customer pointer',async()=>{
    await db.exec('UPDATE public.payments SET customer_id=NULL,invoice_id=NULL');
    const data=await report();
    assert.equal(data.open_invoices[0].balance,1000);
    assert.equal(data.customers[0].pending,1000);
    assert.equal(data.monthly[0].total,620);
    assert.equal(data.customers[0].total,620);
  });
  it("does not treat a draft or purchase invoice as customer receivables", async () => {
    await db.query(
      `INSERT INTO public.invoices(id,company_id,customer_id,status,invoice_date,total_amount,currency,invoice_type)
      VALUES(gen_random_uuid(),$1,$2,'draft','2026-09-01',800,'QAR','sales'),
        (gen_random_uuid(),$1,$2,'sent','2026-09-01',900,'QAR','purchase')`,
      [ids.company, ids.customer]
    );
    assert.equal((await report()).customers[0].pending, 1000);
  });
  it("rollback removes only the reader and preserves receipt and allocation facts", async () => {
    await db.exec(
      (await read(true)).replace(/^BEGIN;\r?\n|^COMMIT;\r?\n?/gm, "")
    );
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM public.payments")).rows[0].n,
      1
    );
    assert.equal(
      (
        await db.query(
          "SELECT to_regprocedure('public.get_customer_collection_summary_v1(uuid,date)') fn"
        )
      ).rows[0].fn,
      null
    );
  });
});
