alter table public.contract_documents
  add column if not exists legal_identity_match_status text not null default 'pending',
  add column if not exists legal_identity_expected_name text,
  add column if not exists legal_identity_extracted_name text,
  add column if not exists legal_identity_expected_id text,
  add column if not exists legal_identity_extracted_id text,
  add column if not exists legal_identity_match_reason text,
  add column if not exists legal_identity_checked_at timestamptz;

alter table public.contract_documents
  drop constraint if exists contract_documents_legal_identity_match_status_check;

alter table public.contract_documents
  add constraint contract_documents_legal_identity_match_status_check
  check (legal_identity_match_status in ('pending', 'matched', 'mismatch', 'unverified', 'failed'));

comment on column public.contract_documents.legal_identity_match_status is
  'Legal filing safety check: whether the signed contract tenant matches the contract customer/defendant.';

create index if not exists contract_documents_legal_identity_pending_idx
  on public.contract_documents (company_id, legal_identity_match_status)
  where legal_identity_match_status in ('pending', 'unverified', 'failed');

update public.contract_documents
set
  legal_identity_match_status = 'mismatch',
  legal_identity_match_reason = processing_error,
  legal_identity_checked_at = coalesce(updated_at, now())
where id_scan_status = 'failed'
  and processing_error ilike '%does not match the contract customer%';
