import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const migration='20260908221229_legal_memo_receipt_settlement';
const read=async path=>(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
export async function setupFullMemoDb(db){
    const fixture=await read('./legal-claim-source-audit.test.mjs');
    const start=fixture.indexOf('CREATE ROLE authenticated;');
    await db.exec(fixture.slice(start,fixture.indexOf('`);',start)));
    await db.exec(`ALTER TABLE penalties ADD COLUMN id uuid DEFAULT gen_random_uuid(), ADD COLUMN customer_id uuid,
        ADD COLUMN responsible_customer_id uuid, ADD COLUMN vehicle_id uuid, ADD COLUMN penalty_number text,
        ADD COLUMN penalty_date date, ADD COLUMN responsibility_party text, ADD COLUMN customer_payment_status text, ADD COLUMN violation_type text, ADD COLUMN location text;
      CREATE TABLE traffic_violations(id uuid DEFAULT gen_random_uuid(),company_id uuid,contract_id uuid,vehicle_id uuid,
        responsible_customer_id uuid,violation_number text,violation_date date,fine_amount numeric,status text,responsibility_party text,violation_type text,location text);
      ALTER TABLE contract_payment_schedules ADD COLUMN installment_number integer DEFAULT 1;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.uid',true),'')::uuid$$;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('role',current_setting('fixture.role',true))$$;
      CREATE OR REPLACE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('fixture.company',true),'')::uuid$$;
      ALTER TABLE invoices ADD COLUMN notes text, ADD COLUMN journal_entry_id uuid;
      CREATE TABLE journal_entries(id uuid PRIMARY KEY,company_id uuid,reference_type text,reference_id uuid,status text,reversal_entry_id uuid,description text);
      CREATE TABLE IF NOT EXISTS profiles(user_id uuid,company_id uuid,is_active boolean);`);
    await db.exec(await read('./fixtures/legal-claim-classification-baseline-20260907.sql'));
    const amountMigration=await read('../../supabase/migrations/20260831173107_add_traffic_violations_only_legal_claim_scope.sql');
    const amountStart=amountMigration.indexOf('CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(');
    await db.exec(amountMigration.slice(amountStart,amountMigration.indexOf('$;',amountStart)+3));
    await db.exec(await read('../../supabase/migrations/20260906223503_align_legal_claim_service_rent_classification.sql'));
    await db.exec(await read(`../../supabase/migrations/${migration}.sql`));
    await db.exec(await read("../../supabase/migrations/20260908221719_align_legal_recorded_rent_cutoff.sql"));
    await db.exec(await read("../../supabase/migrations/20260908223651_disclose_legal_invoice_service_periods.sql"));
    await db.exec(await read("../../supabase/migrations/20260908225924_recognize_reviewed_traffic_invoice_retirement.sql"));
    await db.exec(await read("../../supabase/migrations/20260908230412_bound_legal_traffic_retirement_lookup.sql"));
    await db.exec(`CREATE TABLE invoice_items(invoice_id uuid);
      CREATE FUNCTION public.can_prepare_contract_for_legal_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
      CREATE FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid) RETURNS jsonb LANGUAGE sql AS $$SELECT '{"signed_contract_ready":true,"payments":[],"preserved_metadata":"yes"}'::jsonb$$;`);
    const readinessSource=await read('../../supabase/migrations/20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql');
    const readinessStart=readinessSource.indexOf('CREATE OR REPLACE FUNCTION public.get_legal_transfer_readiness_v2(');
    await db.exec(readinessSource.slice(readinessStart,readinessSource.indexOf('$;',readinessStart)+3));
    await db.exec(await read('../../supabase/migrations/20260908232819_align_transfer_readiness_with_memo_statement.sql'));
    // Load the three exact deployed command bodies; the new migration verifies their hashes.
    const loadCommand=async(file,name,rename=name)=>{
      const source=await read('../../supabase/migrations/'+file);
      const start=source.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');
      const end=source.indexOf('$;',start)+3;
      assert.ok(start>=0 && end>start);
      await db.exec(source.slice(start,end).replace('public.'+name+'(', 'public.'+rename+'('));
    };
    await loadCommand('20260727013000_require_legal_transfer_readiness_wizard.sql','complete_legal_transfer_readiness_v1','complete_legal_transfer_readiness_v1_pre_pdf_request_agent');
    await loadCommand('20260831180500_harden_scoped_legal_readiness_authorization.sql','complete_legal_transfer_readiness_with_scope_v1');
    await loadCommand('20260901090230_unify_legal_claim_engine_and_cancelled_collection.sql','complete_legal_transfer_readiness_v2');
    await db.exec(`CREATE TABLE contract_operations_log(company_id uuid,contract_id uuid,operation_type text,operation_details jsonb,notes text,performed_by uuid,performed_at timestamptz);
      -- Evidence/request wrappers are isolated here: no messages or live completion calls.
      CREATE FUNCTION public.check_contract_has_verified_signed_lease_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('fixture.evidence',true)='ready'$$;
      CREATE FUNCTION public.check_contract_identity_verified_v1(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('fixture.evidence',true)='ready'$$;
      CREATE FUNCTION public.complete_legal_transfer_readiness_v1(p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_actor_id uuid DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
        IF current_setting('fixture.evidence',true) IS DISTINCT FROM 'ready' THEN RETURN '{"blocked":true,"message_ar":"مستند مطلوب"}'::jsonb; END IF;
        RETURN public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(p_company_id,p_contract_id,p_payload,p_actor_id);
      END $$;`);
    await db.exec(await read('../../supabase/migrations/20260908234503_persist_memo_aligned_readiness.sql'));
    await db.exec(`CREATE TABLE legal_case_memo_snapshots(id uuid PRIMARY KEY,company_id uuid,contract_id uuid,case_id uuid,version integer,payload jsonb);
      ALTER TABLE contract_documents ADD COLUMN id uuid DEFAULT gen_random_uuid();`);
    await db.exec(await read('../../supabase/migrations/20260907151151_align_taqadi_violation_document_requirements.sql'));
    await db.exec(await read('../../supabase/migrations/20260909002436_validate_filing_memo_statement_details.sql'));
    await db.exec(`ALTER TABLE contracts ADD COLUMN vehicle_id uuid, ADD COLUMN license_plate text;
      ALTER TABLE customers ADD COLUMN customer_type text,ADD COLUMN national_id text,ADD COLUMN nationality text,ADD COLUMN phone text,ADD COLUMN address text,ADD COLUMN email text;
      CREATE TABLE vehicles(id uuid,company_id uuid,plate_number text,make text,model text,year integer,vin text,color text);
      ALTER TABLE contract_documents ADD COLUMN legal_evidence_state text DEFAULT 'active',ADD COLUMN superseded_by_document_id uuid;
      ALTER TABLE legal_case_damage_costs ADD COLUMN cost_type text,ADD COLUMN description text;
      ALTER TABLE legal_case_litigation_profile ADD COLUMN delivery_handover_date date,ADD COLUMN delivery_handover_document_id uuid,ADD COLUMN vehicle_return_document_id uuid,
        ADD COLUMN rescission_strategy text,ADD COLUMN termination_type text,ADD COLUMN termination_supporting_document_id uuid,ADD COLUMN renewal_applies boolean,
        ADD COLUMN renewed_end_date date,ADD COLUMN termination_clause_number text,ADD COLUMN termination_clause_text text,
        ADD COLUMN notice_exception_type text,ADD COLUMN notice_exception_clause_or_reason text,ADD COLUMN notice_exception_document_id uuid;
      CREATE TABLE legal_case_formal_notices(company_id uuid,contract_id uuid,notice_type text,sent_on date,delivered_on date,delivery_confirmed boolean,proof_document_id uuid,grace_period_days integer,delivery_method text);`);
    await db.exec(await read('../../supabase/migrations/20260909004625_validate_filing_memo_facts_and_evidence.sql'));

}
