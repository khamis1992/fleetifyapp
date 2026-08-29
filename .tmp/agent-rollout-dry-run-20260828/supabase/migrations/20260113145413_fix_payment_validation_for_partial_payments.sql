
-- تحسين دالة التحقق من المدفوعات لتعامل صحيح مع balance_due
CREATE OR REPLACE FUNCTION validate_payment_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_contract RECORD;
    v_invoice RECORD;
    v_current_total_paid NUMERIC;
    v_new_total_paid NUMERIC;
    v_max_payment_threshold NUMERIC;
    v_overpayment_threshold NUMERIC;
    v_invoice_difference NUMERIC;
    v_warning_message TEXT;
    v_duplicate_payment_count INTEGER;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
    v_invoice_balance_due NUMERIC;
BEGIN
    IF NEW.contract_id IS NOT NULL THEN
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = NEW.contract_id;

        IF FOUND THEN
            IF v_contract.status NOT IN ('active', 'under_review', 'draft', 'under_legal_procedure') THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Contract must be in active, under_review, draft, or under_legal_procedure status',
                    HINT = 'Contract status is: ' || v_contract.status || '. Please verify the contract is still active or under legal procedure.';
            END IF;

            SELECT COALESCE(SUM(amount), 0)
            INTO v_current_total_paid
            FROM payments
            WHERE contract_id = NEW.contract_id
              AND payment_status = 'completed'
              AND company_id = NEW.company_id
              AND (NEW.id IS NULL OR id != NEW.id);

            v_new_total_paid := v_current_total_paid + NEW.amount;
            v_contract_amount := COALESCE(v_contract.contract_amount, 0);

            IF v_contract_amount > 0 THEN
                v_overpayment_threshold := v_contract_amount * 1.10;

                IF v_new_total_paid > v_overpayment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment would cause contract to be overpaid beyond reasonable limit',
                        HINT = 'Current total paid: QAR ' || TO_CHAR(v_current_total_paid, 'FM999,999,999.00') || 
                               ', New total after this payment: QAR ' || TO_CHAR(v_new_total_paid, 'FM999,999,999.00') ||
                               ', Contract amount: QAR ' || TO_CHAR(v_contract_amount, 'FM999,999,999.00') ||
                               '. Maximum allowed: QAR ' || TO_CHAR(v_overpayment_threshold, 'FM999,999,999.00') ||
                               ' (110% of contract amount). Please review existing payments before adding more.';
                END IF;
            END IF;

            v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);

            IF v_monthly_amount > 0 THEN
                v_max_payment_threshold := GREATEST(
                    v_monthly_amount * 10,
                    50000
                );

                IF NEW.amount > v_max_payment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount is suspiciously large for this contract',
                        HINT = 'Payment amount (QAR ' || TO_CHAR(NEW.amount, 'FM999,999,999.00') ||
                               ') exceeds maximum allowed for this contract. Maximum is the higher of: 10x monthly amount (QAR ' ||
                               TO_CHAR(v_monthly_amount, 'FM999,999,999.00') || ') or QAR 50,000.';
                END IF;
            END IF;
        END IF;
    END IF;

    IF NEW.invoice_id IS NOT NULL THEN
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND THEN
            IF v_invoice.payment_status IN ('cancelled', 'voided') THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Cannot link payment to a cancelled or voided invoice',
                    HINT = 'Invoice ' || COALESCE(v_invoice.invoice_number::text, 'N/A') ||
                           ' is in status: ' || v_invoice.payment_status ||
                           '. Payments can only be linked to invoices in unpaid, partial, or pending status.';
            END IF;

            IF v_invoice.total_amount > 0 THEN
                -- ✅ حساب الرصيد المتبقي الفعلي من الدفعات
                SELECT COALESCE(SUM(amount), 0)
                INTO v_current_total_paid
                FROM payments
                WHERE invoice_id = NEW.invoice_id
                  AND payment_status = 'completed'
                  AND company_id = NEW.company_id
                  AND (NEW.id IS NULL OR id != NEW.id);
                
                -- ✅ الرصيد المتبقي = المبلغ الإجمالي - ما تم دفعه
                v_invoice_balance_due := v_invoice.total_amount - v_current_total_paid;
                
                -- ✅ السماح بالدفعات الجزئية: فقط تحقق من عدم تجاوز الرصيد المتبقي
                IF NEW.amount > v_invoice_balance_due + 0.01 THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount exceeds remaining invoice balance',
                        HINT = 'Payment amount (QAR ' || TO_CHAR(NEW.amount, 'FM999,999,999.00') ||
                               ') exceeds remaining invoice balance (QAR ' || TO_CHAR(v_invoice_balance_due, 'FM999,999,999.00') ||
                               '). Invoice total: QAR ' || TO_CHAR(v_invoice.total_amount, 'FM999,999,999.00') ||
                               ', Already paid: QAR ' || TO_CHAR(v_current_total_paid, 'FM999,999,999.00') ||
                               '. Please verify the payment amount.';
                END IF;
            END IF;
        END IF;
    END IF;

    IF NEW.idempotency_key IS NOT NULL THEN
        SELECT COUNT(*) INTO v_duplicate_payment_count
        FROM payments
        WHERE idempotency_key = NEW.idempotency_key
          AND company_id = NEW.company_id
          AND (NEW.id IS NULL OR id != NEW.id)
          AND created_at > NOW() - INTERVAL '30 days';

        IF v_duplicate_payment_count > 0 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'A payment with this idempotency key has already been processed recently',
                HINT = 'Idempotency key "' || NEW.idempotency_key ||
                       '" was already used for a payment in the last 30 days.';
        END IF;
    END IF;

    IF NEW.payment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Payment date cannot be more than 30 days in the future',
            HINT = 'Payment date is ' || NEW.payment_date::text ||
                   ', which is more than 30 days in the future.';
    END IF;

    IF NEW.contract_id IS NOT NULL AND NEW.invoice_id IS NOT NULL THEN
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND THEN
            IF v_invoice.contract_id != NEW.contract_id THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Invoice and contract must belong together',
                    HINT = 'Payment links to both contract (' || NEW.contract_id::text ||
                           ') and invoice (' || NEW.invoice_id::text ||
                           '), but the invoice belongs to a different contract.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة trigger لضمان تحديث balance_due عند إنشاء الفاتورة
CREATE OR REPLACE FUNCTION ensure_invoice_balance_due()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان balance_due غير محدد أو 0 ولم تكن الفاتورة مدفوعة
    IF (NEW.balance_due IS NULL OR NEW.balance_due = 0) AND COALESCE(NEW.paid_amount, 0) = 0 THEN
        NEW.balance_due := NEW.total_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS trg_ensure_invoice_balance_due ON invoices;

-- إضافة الـ trigger الجديد
CREATE TRIGGER trg_ensure_invoice_balance_due
BEFORE INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION ensure_invoice_balance_due();
;
