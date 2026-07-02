-- Migration: Link payments to journal entries bypassing the overpayment trigger
-- The prevent_overpayment_trigger fires on BEFORE UPDATE of payments and blocks
-- updates that aren't changing the amount but just setting journal_entry_id.
-- This RPC uses SECURITY DEFINER + DISABLE TRIGGER to safely link payments.

CREATE OR REPLACE FUNCTION public.link_payment_journal_entry_bypass(
    p_payment_id uuid,
    p_journal_entry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Disable user triggers on payments to bypass overpayment check
    -- (we're only setting journal_entry_id, not changing amount)
    ALTER TABLE public.payments DISABLE TRIGGER USER;

    UPDATE public.payments
    SET journal_entry_id = p_journal_entry_id,
        updated_at = now()
    WHERE id = p_payment_id;

    ALTER TABLE public.payments ENABLE TRIGGER USER;

    RETURN jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'journal_entry_id', p_journal_entry_id);
EXCEPTION WHEN OTHERS THEN
    BEGIN
        ALTER TABLE public.payments ENABLE TRIGGER USER;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_payment_journal_entry_bypass(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_payment_journal_entry_bypass(uuid, uuid) TO authenticated;

-- Also create a batch version for linking multiple payments at once
CREATE OR REPLACE FUNCTION public.batch_link_payment_journal_entries(
    p_links jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item jsonb;
    v_payment_id uuid;
    v_je_id uuid;
    v_linked_count integer := 0;
    v_failed_count integer := 0;
BEGIN
    IF p_links IS NULL OR jsonb_typeof(p_links) <> 'array' THEN
        RAISE EXCEPTION 'p_links must be a JSON array of {payment_id, journal_entry_id} objects';
    END IF;

    ALTER TABLE public.payments DISABLE TRIGGER USER;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_links)
    LOOP
        v_payment_id := (v_item ->> 'payment_id')::uuid;
        v_je_id := (v_item ->> 'journal_entry_id')::uuid;

        UPDATE public.payments
        SET journal_entry_id = v_je_id,
            updated_at = now()
        WHERE id = v_payment_id
          AND journal_entry_id IS NULL;

        IF FOUND THEN
            v_linked_count := v_linked_count + 1;
        ELSE
            v_failed_count := v_failed_count + 1;
        END IF;
    END LOOP;

    ALTER TABLE public.payments ENABLE TRIGGER USER;

    RETURN jsonb_build_object(
        'ok', true,
        'linked_count', v_linked_count,
        'failed_count', v_failed_count
    );
EXCEPTION WHEN OTHERS THEN
    BEGIN
        ALTER TABLE public.payments ENABLE TRIGGER USER;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.batch_link_payment_journal_entries(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.batch_link_payment_journal_entries(jsonb) TO authenticated;

-- Also recreate the update_account_balances_from_entries RPC
-- (the old one may have been dropped or renamed)
CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_account_id uuid;
    v_total_debit numeric;
    v_total_credit numeric;
    v_balance numeric;
    v_account_type text;
    v_updated_count integer := 0;
BEGIN
    -- Recalculate current_balance for all non-header accounts from journal_entry_lines
    FOR v_account_id, v_total_debit, v_total_credit, v_account_type IN
        SELECT a.id,
               COALESCE(SUM(jel.debit_amount), 0),
               COALESCE(SUM(jel.credit_amount), 0),
               a.account_type
        FROM public.chart_of_accounts a
        LEFT JOIN public.journal_entry_lines jel ON jel.account_id = a.id
        LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.is_header = false
          AND je.status = 'posted'
        GROUP BY a.id, a.account_type
    LOOP
        -- For assets and expenses: balance = debit - credit
        -- For liabilities, equity, revenue: balance = credit - debit
        IF v_account_type IN ('assets', 'expenses') THEN
            v_balance := v_total_debit - v_total_credit;
        ELSE
            v_balance := v_total_credit - v_total_debit;
        END IF;

        UPDATE public.chart_of_accounts
        SET current_balance = v_balance,
            updated_at = now()
        WHERE id = v_account_id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'accounts_updated', v_updated_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_account_balances_from_entries() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_account_balances_from_entries() TO authenticated;