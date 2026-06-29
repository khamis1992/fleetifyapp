-- Allow invoice cancellation for legacy invoices whose stored dates predate
-- the contract start date. Cancelling an invoice does not change invoice_date
-- or due_date, so the date validation should not block that operational action.

CREATE OR REPLACE FUNCTION validate_invoice_date_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_start_date DATE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- If the update does not modify the date-related fields, there is no
    -- reason to revalidate historical data. This also lets status-only
    -- operations such as cancellation complete safely.
    IF NEW.contract_id IS NOT DISTINCT FROM OLD.contract_id
      AND NEW.invoice_date IS NOT DISTINCT FROM OLD.invoice_date
      AND NEW.due_date IS NOT DISTINCT FROM OLD.due_date THEN
      RETURN NEW;
    END IF;

    -- Explicitly allow moving an invoice into cancelled status even when it
    -- carries legacy dates that no longer pass the current validation rule.
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.contract_id IS NOT NULL THEN
    SELECT start_date INTO v_contract_start_date
    FROM contracts
    WHERE id = NEW.contract_id;

    IF v_contract_start_date IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.invoice_date IS NOT NULL AND NEW.invoice_date < v_contract_start_date THEN
      RAISE EXCEPTION 'Invoice date (%) cannot be before contract start date (%)',
        NEW.invoice_date, v_contract_start_date;
    END IF;

    IF NEW.due_date IS NOT NULL AND NEW.due_date < v_contract_start_date THEN
      RAISE EXCEPTION 'Invoice due date (%) cannot be before contract start date (%)',
        NEW.due_date, v_contract_start_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_invoice_date_before_insert() IS
'Validates invoice dates against contract start date while allowing status-only updates and invoice cancellation.';
