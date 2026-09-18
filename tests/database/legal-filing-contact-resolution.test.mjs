import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, it } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migration = '20260909010027_align_filing_contact_resolution';
const read = async path => (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
let db;
const names = ['approve_taqadi_reviewed_legal_file_v1', 'legal_case_filing_block_reason_v1'];
let original, patched;
before(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA legal_memo_calc_private; CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
    CREATE TABLE taqadi_filing_jobs(id uuid);
    CREATE TABLE legal_cases(id uuid);
    CREATE TABLE contracts(id uuid);
    CREATE TABLE legal_case_memo_snapshots(id uuid);
    CREATE TABLE customers(address text, email text);
    CREATE TABLE legal_case_litigation_profile(defendant_service_address text, defendant_email text, defendant_email_status text, defendant_contact_source text);`);
  for (const [file, name, delimiter] of [
    ['20260827155145_agent_owned_legal_filing_approval.sql', names[0], '$function$'],
    ['20260826091101_legal_filing_readiness_guards.sql', names[1], '$$'],
  ]) {
    const source = await read('../../supabase/migrations/' + file);
    const start = source.indexOf('CREATE OR REPLACE FUNCTION public.' + name + '(');
    const bodyStart = source.indexOf(delimiter, start);
    const end = source.indexOf(delimiter + ';', bodyStart + delimiter.length);
    assert.ok(start >= 0 && end > bodyStart);
    await db.exec(source.slice(start, end + delimiter.length + 1));
  }
  const sync = await read('../../supabase/migrations/20260907135928_synchronize_taqadi_approved_case_value.sql');
  const patchStart = sync.indexOf('DO $patch$');
  const patchEnd = sync.indexOf("  original := pg_get_functiondef('public.complete_taqadi_filing_job_v1", patchStart);
  assert.ok(patchStart >= 0 && patchEnd > patchStart);
  await db.exec(sync.slice(patchStart, patchEnd) + 'END;\n$patch$;');
  const bodies = async () => (await db.query('SELECT proname,prosrc FROM pg_proc WHERE proname=ANY($1::text[]) ORDER BY proname', [names])).rows;
  original = await bodies();
  // Exact deployed body hashes are checked by the migration itself.
  await db.exec(await read('../../supabase/migrations/' + migration + '.sql'));
  patched = await bodies();
  for (const row of patched) {
    const block = row.prosrc.match(/v_address :=[\s\S]*?v_email :=[\s\S]*?\) END;/)?.[0];
    assert.ok(block);
    // Execute the exact installed expressions in isolation: no real approval,
    // worker, filing, financial mutation or portal operation is invoked.
    await db.exec(`CREATE FUNCTION public.test_${row.proname}(profile jsonb, customer jsonb) RETURNS jsonb LANGUAGE plpgsql AS $test$
      DECLARE v_profile public.legal_case_litigation_profile%ROWTYPE; v_customer public.customers%ROWTYPE; v_address text; v_email text;
      BEGIN
        v_profile := jsonb_populate_record(NULL::public.legal_case_litigation_profile, profile);
        v_customer := jsonb_populate_record(NULL::public.customers, customer);
        ${block}
        RETURN jsonb_build_object('address',v_address,'email',v_email);
      END $test$;`);
  }
});
after(async () => db?.close());

for (const name of names) {
  for (const [label, profile, customer, expected] of [
    ['verified customer source', { defendant_email_status: 'verified' }, { address: '  عنوان العميل  ', email: ' client@example.test ' }, { address: 'عنوان العميل', email: 'client@example.test' }],
    ['explicit profile contact', { defendant_email_status: 'verified', defendant_contact_source: 'verified_manual', defendant_service_address: ' عنوان مثبت ', defendant_email: ' verified@example.test ' }, { address: 'قديم', email: 'old@example.test' }, { address: 'عنوان مثبت', email: 'verified@example.test' }],
    ['manual source never borrows customer email', { defendant_email_status: 'verified', defendant_contact_source: 'verified_manual' }, { email: 'old@example.test' }, { address: 'الدوحة قطر', email: null }],
    ['unavailable email remains unavailable', { defendant_email_status: 'unavailable', defendant_email: 'old@example.test' }, { email: 'other@example.test' }, { address: 'الدوحة قطر', email: null }],
    ['unknown email is not verified by fallback', {}, { email: 'old@example.test' }, { address: 'الدوحة قطر', email: null }],
    ['empty strings use frontend defaults', { defendant_email_status: 'verified', defendant_contact_source: '', defendant_email: ' ', defendant_service_address: ' ' }, { address: ' ', email: ' client@example.test ' }, { address: 'الدوحة قطر', email: 'client@example.test' }],
  ]) {
    it(`${name}: ${label}`, async () => {
      const { rows } = await db.query(`SELECT public.test_${name}($1::jsonb,$2::jsonb) value`, [JSON.stringify(profile), JSON.stringify(customer)]);
      assert.deepEqual(rows[0].value, expected);
    });
  }
}
it('changes only the two contact assignment blocks, preserving all existing gates', () => {
  const strip = source => source.replace(/v_address :=[\s\S]*?v_email :=[\s\S]*?(?:\) END;|\);)/, '<contact>');
  assert.deepEqual(patched.map(row => strip(row.prosrc)), original.map(row => strip(row.prosrc)));
});
it('still rejects a non-worker before any approval operation', async () => {
  await assert.rejects(db.query('SELECT public.approve_taqadi_reviewed_legal_file_v1(NULL,\'test-worker\',\'{}\')'), /only the trusted Taqadi worker/);
});
it('keeps both backup functions inaccessible to API roles', async () => {
  const { rows } = await db.query(`SELECT bool_and(NOT has_function_privilege(role_name,p.oid,'EXECUTE')) denied
    FROM pg_proc p CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) role_name
    WHERE p.proname IN ('before_contact_worker_approval','before_contact_filing_block')`);
  assert.equal(rows[0].denied, true);
});
it('rollback restores both exact audited bodies', async () => {
  await db.exec(await read('../../supabase/rollbacks/' + migration + '.rollback.sql'));
  const { rows } = await db.query('SELECT proname,prosrc FROM pg_proc WHERE proname=ANY($1::text[]) ORDER BY proname', [names]);
  assert.deepEqual(rows, original);
});
