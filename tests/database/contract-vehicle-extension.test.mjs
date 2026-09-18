import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const company = uid(1), contract = uid(2), vehicle = uid(3), actor = uid(4);
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${actor}'::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
    CREATE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${company}'::uuid $$;
    CREATE TABLE user_roles(user_id uuid, role text);
    CREATE TABLE vehicles(id uuid PRIMARY KEY, company_id uuid, is_active boolean, plate_number text, status text);
    CREATE TABLE contracts(id uuid PRIMARY KEY, company_id uuid, customer_id uuid, vehicle_id uuid, status text,
      start_date date, end_date date, monthly_amount numeric, contract_amount numeric, total_paid numeric DEFAULT 0,
      balance_due numeric, description text, terms text, contract_type text, license_plate text, updated_at timestamptz);
    CREATE TABLE penalties(company_id uuid, customer_id uuid, vehicle_id uuid, payment_status text, amount numeric);
    CREATE TABLE legal_cases(company_id uuid, contract_id uuid, case_status text);
    ALTER TABLE contracts ADD creation_idempotency_key text;
    CREATE TABLE contract_amendments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, contract_id uuid,
      amendment_number text, amendment_type text, amendment_reason text, original_values jsonb, new_values jsonb,
      amount_difference numeric, requires_payment_adjustment boolean, status text, created_by uuid, approved_by uuid,
      approved_at timestamptz, effective_date date, applied_at timestamptz, updated_at timestamptz,
      requires_customer_signature boolean, customer_signed boolean);
    CREATE TABLE contract_payment_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid,
      contract_id uuid, installment_number int, due_date date, amount numeric, status text, paid_amount numeric,
      created_by uuid, description text, invoice_id uuid);
    CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, contract_id uuid,
      total_amount numeric, penalty_id uuid, invoice_number text, due_date date, invoice_month date, status text);
    CREATE FUNCTION generate_amendment_number(uuid,uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'AMD-test' $$;
    CREATE FUNCTION generate_invoice_for_contract_month(p_contract uuid, p_month date) RETURNS uuid LANGUAGE plpgsql AS $$
    DECLARE v_id uuid; BEGIN
      IF current_setting('test.fail_invoice',true) = 'on' THEN RAISE EXCEPTION 'invoice failure'; END IF;
      -- The production canonical command bootstraps all remaining months.
      INSERT INTO public.contract_payment_schedules(company_id,contract_id,installment_number,due_date,amount,status,paid_amount)
      SELECT c.company_id,c.id,19 + extract(month from m)::int - 1,m,c.monthly_amount,'pending',0
      FROM public.contracts c CROSS JOIN generate_series('2027-01-01'::date,c.end_date,'1 month') m
      WHERE c.id=p_contract AND NOT EXISTS (SELECT 1 FROM public.contract_payment_schedules s
        WHERE s.contract_id=c.id AND s.due_date=m);
      INSERT INTO public.invoices(company_id,contract_id,total_amount,invoice_number,due_date,invoice_month,status)
      SELECT company_id,id,monthly_amount,'RENT-test',p_month,p_month,'posted' FROM public.contracts WHERE id=p_contract
      RETURNING id INTO v_id; RETURN v_id;
    END $$;`);
  await db.exec(await read('../../supabase/migrations/20260826094500_fix_contract_amendment_atomic_guard.sql'));
  await db.exec(await read('../../supabase/migrations/20260905142924_amend_contract_vehicle_and_extension_atomic.sql'));
  await db.exec(await read('../../supabase/migrations/20260905150206_fix_contract_extension_vehicle_metadata.sql'));
  await db.exec(await read('../../supabase/migrations/20260905150343_reuse_generated_extension_schedules.sql'));
  await db.exec(`CREATE TRIGGER eligibility BEFORE UPDATE OF vehicle_id ON contracts
    FOR EACH ROW EXECUTE FUNCTION trg_enforce_rental_eligibility();`);
});
beforeEach(async () => {
  await db.exec(`TRUNCATE contracts, vehicles, user_roles, penalties, contract_amendments, contract_payment_schedules, invoices;
    SELECT set_config('test.fail_invoice','off',false);
    INSERT INTO user_roles VALUES ('${actor}','company_admin');
    INSERT INTO vehicles VALUES ('${vehicle}','${company}',true,'893409','available');
    INSERT INTO contracts(id,company_id,customer_id,vehicle_id,status,start_date,end_date,monthly_amount,contract_amount,updated_at)
    VALUES ('${contract}','${company}','${uid(5)}','${uid(6)}','active','2025-07-01','2026-12-31',1500,27000,'2026-09-05');
    INSERT INTO penalties SELECT '${company}','${uid(5)}','${vehicle}','unpaid',300 FROM generate_series(1,17);
    INSERT INTO contract_payment_schedules(company_id,contract_id,installment_number,due_date,amount,status,paid_amount)
    VALUES ('${company}','${contract}',18,'2026-12-01',1500,'paid',1500);`);
});
after(() => db.close());
const amend = (end='2027-12-01', version='2026-09-05', tenant=company) => db.query(
  'SELECT amend_contract_vehicle_and_extension_atomic($1,$2,$3,$4,$5,$6) result',
  [tenant,contract,version,vehicle,end,'edited']);
it('changes the vehicle despite 17 fines, adds 12 months and preserves paid evidence', async () => {
  const result = (await amend()).rows[0].result;
  assert.equal(result.contract_amount,45000);
  assert.equal(result.vehicle_id,vehicle);
  assert.equal(result.end_date,'2027-12-01');
  assert.equal((await db.query('SELECT count(*)::int n FROM invoices')).rows[0].n,12);
  assert.equal((await db.query('SELECT count(*)::int n FROM contract_payment_schedules')).rows[0].n,13);
  assert.equal((await db.query("SELECT paid_amount FROM contract_payment_schedules WHERE status='paid'")).rows[0].paid_amount,'1500');
  assert.equal((await db.query('SELECT count(*)::int n FROM contract_amendments WHERE applied_at IS NOT NULL')).rows[0].n,1);
});
it('rolls back both amendment and contract if invoice generation fails', async () => {
  await db.exec("SELECT set_config('test.fail_invoice','on',false)");
  await assert.rejects(amend(), /invoice failure/);
  assert.equal((await db.query('SELECT count(*)::int n FROM contract_amendments')).rows[0].n,0);
  assert.equal((await db.query('SELECT contract_amount FROM contracts')).rows[0].contract_amount,'27000');
});
it('rejects a stale editor version', () => assert.rejects(amend('2027-12-01','2026-09-04'), /تغير العقد/));
it('rejects another tenant', () => assert.rejects(amend('2027-12-01','2026-09-05',uid(9)), /صلاحية/));
it('rejects unauthorized users', async () => {
  await db.exec('TRUNCATE user_roles');
  await assert.rejects(amend(), /صلاحية/);
});
it('still rejects seized vehicles', async () => {
  await db.exec("UPDATE vehicles SET status='police_station'");
  await assert.rejects(amend(), /محجوزة/);
});
it('does not create invoices for a vehicle-only change', async () => {
  await amend('2026-12-31');
  assert.equal((await db.query('SELECT count(*)::int n FROM invoices')).rows[0].n,0);
});
it('rejects shortening rather than discarding existing financial evidence', () => assert.rejects(amend('2026-11-01'), /تقليص/));
it('keeps ordinary contract updates subject to the original violation guard', async () => {
  await assert.rejects(db.query('UPDATE contracts SET vehicle_id=$1 WHERE id=$2', [vehicle,contract]), /مخالفة/);
});
it('cannot reuse the accepted amendment scope for a later update', async () => {
  await amend('2026-12-31');
  await assert.rejects(db.query('UPDATE contracts SET vehicle_id=$1 WHERE id=$2', [vehicle,contract]), /مخالفة/);
});
