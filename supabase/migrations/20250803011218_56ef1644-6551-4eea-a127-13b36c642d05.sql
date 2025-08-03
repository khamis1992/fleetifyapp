-- Drop the existing problematic trigger first
DROP TRIGGER IF EXISTS trigger_invoice_changes ON public.invoices;

-- Recreate the trigger to run AFTER INSERT instead of BEFORE
CREATE TRIGGER trigger_invoice_changes 
AFTER INSERT OR UPDATE ON public.invoices 
FOR EACH ROW 
EXECUTE FUNCTION handle_invoice_changes();

-- Update the handle_invoice_changes function to work with AFTER trigger
CREATE OR REPLACE FUNCTION public.handle_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle UPDATE operations
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('sent', 'paid') AND NEW.journal_entry_id IS NULL THEN
        UPDATE public.invoices 
        SET journal_entry_id = create_invoice_journal_entry(NEW.id)
        WHERE id = NEW.id;
    -- Handle INSERT operations  
    ELSIF TG_OP = 'INSERT' AND NEW.status IN ('sent', 'paid') AND NEW.journal_entry_id IS NULL THEN
        UPDATE public.invoices 
        SET journal_entry_id = create_invoice_journal_entry(NEW.id)
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;