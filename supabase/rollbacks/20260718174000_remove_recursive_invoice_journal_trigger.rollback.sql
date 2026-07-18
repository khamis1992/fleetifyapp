-- Intentionally do not restore the recursive legacy trigger. Restoring it
-- would make invoice status updates fail again with SQLSTATE 27000.
SELECT true;
