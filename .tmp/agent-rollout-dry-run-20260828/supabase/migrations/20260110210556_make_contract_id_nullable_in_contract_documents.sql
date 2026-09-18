
-- Make contract_id nullable to allow uploading documents before matching to a contract
ALTER TABLE contract_documents ALTER COLUMN contract_id DROP NOT NULL;

COMMENT ON COLUMN contract_documents.contract_id IS 'Optional - can be NULL for documents uploaded via signed agreements upload before AI matching';
;
