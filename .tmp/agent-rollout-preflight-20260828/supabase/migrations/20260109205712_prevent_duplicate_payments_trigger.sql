-- Step 5: Create a function to check for potential duplicates before insert
CREATE OR REPLACE FUNCTION check_for_duplicate_payment()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  duplicate_info TEXT;
BEGIN
  -- Skip if idempotency key is set (this is a retry)
  IF NEW.idempotency_key IS NOT NULL THEN
    -- Check if this idempotency key was already used
    SELECT COUNT(*) INTO duplicate_count
    FROM public.payments
    WHERE idempotency_key = NEW.idempotency_key
    AND id != COALESCE(NEW.id, gen_random_uuid()::TEXT);

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Duplicate request detected: idempotency key % already used', NEW.idempotency_key;
    END IF;

    RETURN NEW;
  END IF;

  -- For contract payments: check for potential duplicates (within 1 hour)
  IF NEW.contract_id IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT COUNT(*), string_agg(payment_number || ' (' || created_at::TEXT || ')', ', ')
    INTO duplicate_count, duplicate_info
    FROM public.payments
    WHERE company_id = NEW.company_id
    AND customer_id = NEW.customer_id
    AND contract_id = NEW.contract_id
    AND payment_date = NEW.payment_date
    AND amount = NEW.amount
    AND created_at > NOW() - INTERVAL '1 hour'
    AND id != COALESCE(NEW.id, gen_random_uuid()::TEXT);

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Potential duplicate payment detected. Existing payment(s) with same details found in last hour: %', duplicate_info;
    END IF;
  END IF;

  -- For non-contract payments: check for potential duplicates (within 1 hour)
  IF NEW.contract_id IS NULL AND NEW.customer_id IS NOT NULL THEN
    SELECT COUNT(*), string_agg(payment_number || ' (' || created_at::TEXT || ')', ', ')
    INTO duplicate_count, duplicate_info
    FROM public.payments
    WHERE company_id = NEW.company_id
    AND customer_id = NEW.customer_id
    AND contract_id IS NULL
    AND payment_date = NEW.payment_date
    AND amount = NEW.amount
    AND created_at > NOW() - INTERVAL '1 hour'
    AND id != COALESCE(NEW.id, gen_random_uuid()::TEXT);

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION 'Potential duplicate payment detected. Existing payment(s) with same details found in last hour: %', duplicate_info;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to enforce duplicate check
DROP TRIGGER IF EXISTS validate_payment_duplicate_before_insert ON public.payments;
CREATE TRIGGER validate_payment_duplicate_before_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION check_for_duplicate_payment();;
