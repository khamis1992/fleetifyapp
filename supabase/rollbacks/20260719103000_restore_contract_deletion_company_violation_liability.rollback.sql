-- This rollback removes the feature schema. It cannot restore contracts already deleted by the feature.

DROP FUNCTION IF EXISTS public.create_traffic_violation_payment_with_journal_v2(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
);
DROP FUNCTION IF EXISTS public.delete_contract_with_company_violations_v1(uuid, uuid, text, text, uuid);

DROP TABLE IF EXISTS public.contract_deletion_audit;

DROP INDEX IF EXISTS public.idx_traffic_violations_original_contract_number;
DROP INDEX IF EXISTS public.idx_traffic_violations_company_responsibility;

ALTER TABLE public.traffic_violations
  DROP CONSTRAINT IF EXISTS traffic_violations_liability_journal_entry_id_fkey,
  DROP CONSTRAINT IF EXISTS traffic_violations_responsible_customer_id_fkey,
  DROP CONSTRAINT IF EXISTS traffic_violations_responsibility_party_check,
  DROP COLUMN IF EXISTS liability_journal_entry_id,
  DROP COLUMN IF EXISTS liability_recognized_at,
  DROP COLUMN IF EXISTS liability_amount,
  DROP COLUMN IF EXISTS original_contract_number,
  DROP COLUMN IF EXISTS responsible_customer_id,
  DROP COLUMN IF EXISTS responsibility_decided_by,
  DROP COLUMN IF EXISTS responsibility_decided_at,
  DROP COLUMN IF EXISTS responsibility_reason,
  DROP COLUMN IF EXISTS responsibility_party;

DELETE FROM public.account_mappings mapping
USING public.default_account_types account_type
WHERE mapping.default_account_type_id = account_type.id
  AND account_type.type_code = 'TRAFFIC_FINE_PAYABLE';

DELETE FROM public.default_account_types
WHERE type_code = 'TRAFFIC_FINE_PAYABLE';

-- Dedicated chart accounts and posted journals are intentionally retained for financial audit safety.
