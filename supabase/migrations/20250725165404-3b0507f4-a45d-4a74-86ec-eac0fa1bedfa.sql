-- إنشاء جداول الموارد البشرية

-- جدول الموظفين
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    employee_number VARCHAR(50) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    first_name_ar TEXT,
    last_name_ar TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    national_id TEXT,
    position TEXT,
    position_ar TEXT,
    department TEXT,
    department_ar TEXT,
    hire_date DATE NOT NULL,
    termination_date DATE,
    basic_salary NUMERIC NOT NULL DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    bank_account TEXT,
    iban TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    address TEXT,
    address_ar TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- تمكين RLS على جدول الموظفين
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للموظفين
CREATE POLICY "المديرون يمكنهم إدارة الموظفين في شركتهم"
ON public.employees 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role))));

CREATE POLICY "المستخدمون يمكنهم عرض الموظفين في شركتهم"
ON public.employees 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- جدول سجلات الحضور
CREATE TABLE public.attendance_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    total_hours NUMERIC DEFAULT 0,
    late_hours NUMERIC DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, sick_leave, vacation
    notes TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(employee_id, attendance_date)
);

-- تمكين RLS على جدول الحضور
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان للحضور
CREATE POLICY "المديرون يمكنهم إدارة سجلات الحضور"
ON public.attendance_records 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (EXISTS (SELECT 1 FROM employees e 
                WHERE e.id = attendance_records.employee_id 
                AND e.company_id = get_user_company(auth.uid()) 
                AND (has_role(auth.uid(), 'company_admin'::user_role) OR 
                     has_role(auth.uid(), 'manager'::user_role)))));

CREATE POLICY "المستخدمون يمكنهم عرض سجلات الحضور"
ON public.attendance_records 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM employees e 
               WHERE e.id = attendance_records.employee_id 
               AND e.company_id = get_user_company(auth.uid())));

-- جدول إعدادات الرواتب
CREATE TABLE public.payroll_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    working_days_per_month INTEGER DEFAULT 26,
    working_hours_per_day NUMERIC DEFAULT 8,
    late_penalty_per_hour NUMERIC DEFAULT 0,
    overtime_rate NUMERIC DEFAULT 1.5,
    social_security_rate NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    allow_negative_balance BOOLEAN DEFAULT false,
    auto_calculate_overtime BOOLEAN DEFAULT true,
    payroll_frequency TEXT DEFAULT 'monthly', -- monthly, weekly, bi-weekly
    pay_date INTEGER DEFAULT 1, -- يوم الشهر للدفع
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS على إعدادات الرواتب
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لإعدادات الرواتب
CREATE POLICY "المديرون يمكنهم إدارة إعدادات الرواتب"
ON public.payroll_settings 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role))));

CREATE POLICY "المستخدمون يمكنهم عرض إعدادات الرواتب"
ON public.payroll_settings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- جدول مراجعة الرواتب
CREATE TABLE public.payroll_reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_employees INTEGER DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    total_deductions NUMERIC DEFAULT 0,
    net_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_approval, approved, paid
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    journal_entry_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- تمكين RLS على مراجعة الرواتب
ALTER TABLE public.payroll_reviews ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لمراجعة الرواتب
CREATE POLICY "المديرون يمكنهم إدارة مراجعة الرواتب"
ON public.payroll_reviews 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role))));

CREATE POLICY "المستخدمون يمكنهم عرض مراجعة الرواتب"
ON public.payroll_reviews 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- جدول قسائم الرواتب
CREATE TABLE public.payroll_slips (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL,
    payroll_review_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    basic_salary NUMERIC NOT NULL DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    overtime_amount NUMERIC DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0,
    late_penalty NUMERIC DEFAULT 0,
    social_security_deduction NUMERIC DEFAULT 0,
    tax_deduction NUMERIC DEFAULT 0,
    other_deductions NUMERIC DEFAULT 0,
    total_deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, paid
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT DEFAULT 'bank_transfer',
    bank_reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS على قسائم الرواتب
ALTER TABLE public.payroll_slips ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لقسائم الرواتب
CREATE POLICY "المديرون يمكنهم إدارة قسائم الرواتب"
ON public.payroll_slips 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (EXISTS (SELECT 1 FROM employees e 
                WHERE e.id = payroll_slips.employee_id 
                AND e.company_id = get_user_company(auth.uid()) 
                AND (has_role(auth.uid(), 'company_admin'::user_role) OR 
                     has_role(auth.uid(), 'manager'::user_role)))));

CREATE POLICY "الموظفون يمكنهم عرض قسائم رواتبهم"
ON public.payroll_slips 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM employees e 
               WHERE e.id = payroll_slips.employee_id 
               AND e.company_id = get_user_company(auth.uid())));

-- إنشاء دالة لحساب الراتب التلقائي
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
    FROM employees e
    WHERE e.id = employee_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;
    
    -- الحصول على إعدادات الرواتب
    SELECT * INTO settings_record
    FROM payroll_settings ps
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
    FROM attendance_records ar
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

-- إنشاء المشغلات للتحديث التلقائي
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_settings_updated_at
    BEFORE UPDATE ON public.payroll_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_reviews_updated_at
    BEFORE UPDATE ON public.payroll_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_slips_updated_at
    BEFORE UPDATE ON public.payroll_slips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();