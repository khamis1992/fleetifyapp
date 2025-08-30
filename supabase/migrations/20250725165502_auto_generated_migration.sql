-- إصلاح مشكلة search_path في دالة حساب الراتب
CREATE OR REPLACE FUNCTION calculate_employee_salary(
    employee_id_param UUID,
    period_start_param DATE,
    period_end_param DATE
) RETURNS TABLE (
    basic_salary NUMERIC,
    allowances NUMERIC,
    overtime_amount NUMERIC,
    total_earnings NUMERIC,
    late_penalty NUMERIC,
    total_deductions NUMERIC,
    net_salary NUMERIC,
    working_days INTEGER,
    present_days INTEGER,
    late_days INTEGER,
    absent_days INTEGER,
    overtime_hours NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    emp_record RECORD;
    settings_record RECORD;
    attendance_stats RECORD;
    calc_basic_salary NUMERIC := 0;
    calc_allowances NUMERIC := 0;
    calc_overtime_amount NUMERIC := 0;
    calc_total_earnings NUMERIC := 0;
    calc_late_penalty NUMERIC := 0;
    calc_total_deductions NUMERIC := 0;
    calc_net_salary NUMERIC := 0;
    calc_working_days INTEGER := 0;
    calc_present_days INTEGER := 0;
    calc_late_days INTEGER := 0;
    calc_absent_days INTEGER := 0;
    calc_overtime_hours NUMERIC := 0;
BEGIN
    -- الحصول على بيانات الموظف
    SELECT * INTO emp_record
    FROM public.employees e
    WHERE e.id = employee_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;
    
    -- الحصول على إعدادات الرواتب
    SELECT * INTO settings_record
    FROM public.payroll_settings ps
    WHERE ps.company_id = emp_record.company_id
    LIMIT 1;
    
    -- إذا لم توجد إعدادات، استخدم القيم الافتراضية
    IF NOT FOUND THEN
        settings_record.working_days_per_month := 26;
        settings_record.working_hours_per_day := 8;
        settings_record.late_penalty_per_hour := 0;
        settings_record.overtime_rate := 1.5;
    END IF;
    
    -- حساب إحصائيات الحضور
    SELECT 
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'late') as late_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COALESCE(SUM(overtime_hours), 0) as total_overtime,
        COALESCE(SUM(late_hours), 0) as total_late_hours
    INTO attendance_stats
    FROM public.attendance_records ar
    WHERE ar.employee_id = employee_id_param
    AND ar.attendance_date BETWEEN period_start_param AND period_end_param;
    
    -- حساب أيام العمل في الفترة
    calc_working_days := (period_end_param - period_start_param + 1);
    calc_present_days := COALESCE(attendance_stats.present_count, 0);
    calc_late_days := COALESCE(attendance_stats.late_count, 0);
    calc_absent_days := COALESCE(attendance_stats.absent_count, 0);
    calc_overtime_hours := COALESCE(attendance_stats.total_overtime, 0);
    
    -- حساب الراتب الأساسي (بناءً على أيام الحضور)
    calc_basic_salary := (emp_record.basic_salary / settings_record.working_days_per_month) * calc_present_days;
    
    -- حساب البدلات
    calc_allowances := emp_record.allowances;
    
    -- حساب مبلغ الإضافي
    calc_overtime_amount := calc_overtime_hours * (emp_record.basic_salary / settings_record.working_days_per_month / settings_record.working_hours_per_day) * settings_record.overtime_rate;
    
    -- حساب إجمالي الأرباح
    calc_total_earnings := calc_basic_salary + calc_allowances + calc_overtime_amount;
    
    -- حساب غرامة التأخير
    calc_late_penalty := COALESCE(attendance_stats.total_late_hours, 0) * settings_record.late_penalty_per_hour;
    
    -- حساب إجمالي الخصومات
    calc_total_deductions := calc_late_penalty;
    
    -- حساب صافي الراتب
    calc_net_salary := calc_total_earnings - calc_total_deductions;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT 
        calc_basic_salary,
        calc_allowances,
        calc_overtime_amount,
        calc_total_earnings,
        calc_late_penalty,
        calc_total_deductions,
        calc_net_salary,
        calc_working_days,
        calc_present_days,
        calc_late_days,
        calc_absent_days,
        calc_overtime_hours;
END;
$$;