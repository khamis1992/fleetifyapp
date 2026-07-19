-- Intentionally retained: restoring the previous function would reintroduce an
-- invalid posted-header-before-lines sequence and break financial immutability.
DO $$
BEGIN
  RAISE NOTICE 'No rollback applied: the safe draft-lines-posted sequence is retained.';
END;
$$;
