-- Keep invoice date validation strict for new data, while allowing old
-- imported invoices to be repaired or recalculated during payment cancellation.
--
-- Legacy rows can have invoice_date/due_date before contract.start_date. Any
-- update to those rows used to fail, even when the update was only payment
-- totals/status or when the date was being moved forward to the contract start.

CREATE OR REPLACE FUNCTION validate_invoice_date_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_start_date DATE;
BEGIN
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT start_date INTO v_contract_start_date
  FROM contracts
  WHERE id = NEW.contract_id;

  IF v_contract_start_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Recalculating balances, changing status, or writing audit fields should
    -- not revalidate legacy invoice dates that the update did not touch.
    IF NEW.contract_id IS NOT DISTINCT FROM OLD.contract_id
      AND NEW.invoice_date IS NOT DISTINCT FROM OLD.invoice_date
      AND NEW.due_date IS NOT DISTINCT FROM OLD.due_date THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.invoice_date IS NOT NULL AND NEW.invoice_date < v_contract_start_date THEN
    RAISE EXCEPTION 'Invoice date (%) cannot be before contract start date (%)',
      NEW.invoice_date, v_contract_start_date;
  END IF;

  IF NEW.due_date IS NOT NULL AND NEW.due_date < v_contract_start_date THEN
    RAISE EXCEPTION 'Invoice due date (%) cannot be before contract start date (%)',
      NEW.due_date, v_contract_start_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_invoice_dates_trigger ON invoices;

CREATE TRIGGER validate_invoice_dates_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_date_before_insert();

COMMENT ON FUNCTION validate_invoice_date_before_insert() IS
'Validates invoice dates against contract start date while allowing legacy invoice recalculation and forward date repair.';
