BEGIN;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='contract-financial-integrity-minute';
UPDATE public.contract_financial_reconciliation_controls ctl SET enabled=false,updated_at=now()
WHERE ctl.company_id IN (SELECT company_id FROM public.contracts WHERE contract_number='LTO202410');
-- Keep verified totals and evidence holds: reversal must not reintroduce known wrong totals
-- or silently reopen an obligation. Original rows remain in financial_data_repair_snapshots.
COMMIT;
