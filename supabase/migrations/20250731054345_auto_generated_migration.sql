-- تحديث دالة حساب الصحة المالية لتحسين حساب السيولة
CREATE OR REPLACE FUNCTION public.calculate_financial_health_score(company_id_param uuid)
RETURNS TABLE(
    profitability_score numeric, 
    liquidity_score numeric, 
    efficiency_score numeric, 
    solvency_score numeric, 
    overall_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_revenue numeric := 0;
    total_expenses numeric := 0;
    total_assets numeric := 0;
    total_liabilities numeric := 0;
    cash_balance numeric := 0;
    current_assets numeric := 0;
    current_liabilities numeric := 0;
    profit_margin numeric := 0;
    current_ratio numeric := 0;
    debt_ratio numeric := 0;
    prof_score numeric := 0;
    liq_score numeric := 0;
    eff_score numeric := 0;
    solv_score numeric := 0;
    overall numeric := 0;
    receivables_balance numeric := 0;
    inventory_balance numeric := 0;
    payables_balance numeric := 0;
BEGIN
    -- حساب إجمالي الإيرادات (آخر 6 أشهر)
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) INTO total_revenue
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.company_id = company_id_param
    AND coa.account_type = 'revenue'
    AND je.entry_date >= CURRENT_DATE - INTERVAL '6 months'
    AND je.status = 'posted';
    
    -- حساب إجمالي المصروفات (آخر 6 أشهر)
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) INTO total_expenses
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.company_id = company_id_param
    AND coa.account_type = 'expenses'
    AND je.entry_date >= CURRENT_DATE - INTERVAL '6 months'
    AND je.status = 'posted';
    
    -- حساب رصيد النقدية (جميع الحسابات النقدية)
    SELECT COALESCE(SUM(current_balance), 0) INTO cash_balance
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%' OR account_name ILIKE '%صندوق%' OR account_name ILIKE '%بنك%')
    AND is_active = true;
    
    -- حساب الأصول المتداولة
    SELECT COALESCE(SUM(current_balance), 0) INTO current_assets
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND account_subtype = 'current'
    AND is_active = true;
    
    -- حساب أرصدة الذمم المدينة
    SELECT COALESCE(SUM(current_balance), 0) INTO receivables_balance
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_name ILIKE '%ذمم%')
    AND is_active = true;
    
    -- إضافة أرصدة الذمم للأصول المتداولة إذا لم تكن مضمنة
    IF current_assets = 0 THEN
        current_assets := cash_balance + receivables_balance;
    END IF;
    
    -- حساب الخصوم المتداولة
    SELECT COALESCE(SUM(current_balance), 0) INTO current_liabilities
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND account_subtype = 'current'
    AND is_active = true;
    
    -- حساب أرصدة الدائنين
    SELECT COALESCE(SUM(current_balance), 0) INTO payables_balance
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%' OR account_name ILIKE '%موردين%')
    AND is_active = true;
    
    -- إضافة أرصدة الدائنين للخصوم المتداولة إذا لم تكن مضمنة
    IF current_liabilities = 0 THEN
        current_liabilities := payables_balance;
    END IF;
    
    -- حساب إجمالي الأصول
    SELECT COALESCE(SUM(current_balance), 0) INTO total_assets
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND is_active = true;
    
    -- حساب إجمالي الخصوم
    SELECT COALESCE(SUM(current_balance), 0) INTO total_liabilities
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND is_active = true;
    
    -- حساب درجة الربحية (0-100)
    IF total_revenue > 0 THEN
        profit_margin := ((total_revenue - total_expenses) / total_revenue) * 100;
        prof_score := GREATEST(0, LEAST(100, profit_margin + 50)); -- تعديل النطاق ليكون 0-100
    ELSE
        prof_score := 50; -- نقطة متوسطة إذا لم تكن هناك إيرادات
    END IF;
    
    -- حساب درجة السيولة (0-100)
    IF current_liabilities > 0 THEN
        current_ratio := current_assets / current_liabilities;
        -- نسبة التداول الممتازة 2.0، الجيدة 1.5، المقبولة 1.0
        IF current_ratio >= 2.0 THEN
            liq_score := 100;
        ELSIF current_ratio >= 1.5 THEN
            liq_score := 80;
        ELSIF current_ratio >= 1.0 THEN
            liq_score := 60;
        ELSIF current_ratio >= 0.5 THEN
            liq_score := 40;
        ELSE
            liq_score := 20;
        END IF;
    ELSIF current_assets > 0 THEN
        liq_score := 90; -- أصول متداولة موجودة بدون خصوم متداولة (وضع جيد)
    ELSIF cash_balance > 0 THEN
        liq_score := 70; -- يوجد نقدية فقط
    ELSE
        liq_score := 30; -- لا توجد أصول متداولة واضحة
    END IF;
    
    -- حساب درجة الكفاءة (0-100) - بناءً على معدل دوران الأصول
    IF total_assets > 0 AND total_revenue > 0 THEN
        eff_score := LEAST(100, (total_revenue / total_assets) * 20); -- تعديل المعامل
    ELSE
        eff_score := 40; -- نقطة متوسطة
    END IF;
    
    -- حساب درجة الملاءة المالية (0-100)
    IF total_assets > 0 THEN
        debt_ratio := total_liabilities / total_assets;
        IF debt_ratio <= 0.3 THEN
            solv_score := 100;
        ELSIF debt_ratio <= 0.5 THEN
            solv_score := 80;
        ELSIF debt_ratio <= 0.7 THEN
            solv_score := 60;
        ELSIF debt_ratio <= 0.9 THEN
            solv_score := 40;
        ELSE
            solv_score := 20;
        END IF;
    ELSE
        solv_score := 50; -- نقطة متوسطة
    END IF;
    
    -- حساب الدرجة الإجمالية مع أوزان محدثة
    overall := (prof_score * 0.30) + (liq_score * 0.30) + (eff_score * 0.20) + (solv_score * 0.20);
    
    RETURN QUERY SELECT 
        ROUND(prof_score, 2) as profitability_score,
        ROUND(liq_score, 2) as liquidity_score,
        ROUND(eff_score, 2) as efficiency_score,
        ROUND(solv_score, 2) as solvency_score,
        ROUND(overall, 2) as overall_score;
END;
$function$;