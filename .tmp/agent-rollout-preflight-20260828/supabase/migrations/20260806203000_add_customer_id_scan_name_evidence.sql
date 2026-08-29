-- Store visual evidence for customer ID/name scan proposals.
-- The proposal remains human-reviewed; these fields only help reviewers see
-- the source snippet that produced the suggested name.

alter table public.customer_id_scan_proposals
  add column if not exists evidence_image_bucket text not null default 'contract-documents',
  add column if not exists evidence_image_path text,
  add column if not exists evidence_crop jsonb,
  add column if not exists evidence_label text;
comment on column public.customer_id_scan_proposals.evidence_image_path is
  'Storage object path for the scanned page/image used as visual evidence.';
comment on column public.customer_id_scan_proposals.evidence_crop is
  'Approximate OCR bounding box for the extracted name: {x,y,width,height}.';
comment on column public.customer_id_scan_proposals.evidence_label is
  'Human-readable label for the evidence crop, usually the OCR-extracted name.';
