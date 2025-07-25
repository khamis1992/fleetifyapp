-- Activate triggers for automatic journal entry creation

-- Trigger for invoice changes
CREATE OR REPLACE TRIGGER trigger_invoice_changes
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invoice_changes();

-- Trigger for payment changes  
CREATE OR REPLACE TRIGGER trigger_payment_changes
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_changes();

-- Trigger for bank transaction changes
CREATE OR REPLACE TRIGGER trigger_bank_transaction_changes
    BEFORE INSERT OR UPDATE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bank_transaction_changes();

-- Trigger for contract changes
CREATE OR REPLACE TRIGGER trigger_contract_changes
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_changes();

-- Trigger for penalty changes
CREATE OR REPLACE TRIGGER trigger_penalty_changes
    BEFORE INSERT OR UPDATE ON public.penalties
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_penalty_changes();

-- Trigger for payroll changes
CREATE OR REPLACE TRIGGER trigger_payroll_changes
    BEFORE INSERT OR UPDATE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_changes();