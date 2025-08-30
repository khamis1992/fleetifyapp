-- Add foreign key constraint between payroll and employees tables
ALTER TABLE public.payroll 
ADD CONSTRAINT fk_payroll_employee 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) 
ON DELETE RESTRICT;