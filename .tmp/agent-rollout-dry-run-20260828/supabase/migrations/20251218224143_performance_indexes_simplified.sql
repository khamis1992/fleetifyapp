-- تحسينات أداء قاعدة البيانات للوحة التحكم
-- إنشاء فهرسة محسنة لتحسين سرعة الاستعلامات

-- فهرسة جداول العقود
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON contracts(company_id, status);

-- فهرسة جداول العملاء
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers(first_name_ar);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers(last_name_ar);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name_ar);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active);

-- فهرسة جداول المركبات
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status);

-- فهرسة جداول الفواتير
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_amount ON invoices(total_amount);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_date ON invoices(company_id, invoice_date);

-- فهرسة جداول المدفوعات
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_company_status ON payments(company_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date);

-- فهرسة جداول القيود المحاسبية
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference_type ON journal_entries(reference_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date);

-- فهرسة جداول بنود القيود المحاسبية
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_debit ON journal_entry_lines(debit_amount);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_credit ON journal_entry_lines(credit_amount);

-- فهرسة جداول المخطط المحاسبي
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_id ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_level ON chart_of_accounts(account_level);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_is_header ON chart_of_accounts(is_header);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_level ON chart_of_accounts(company_id, account_level);

-- تحديث إحصائيات قاعدة البيانات
ANALYZE;

-- إنشاء فهرس مركب للبحث الشائع في لوحة التحكم
CREATE INDEX IF NOT EXISTS idx_dashboard_contracts_stats ON contracts(company_id, status, start_date);
CREATE INDEX IF NOT EXISTS idx_dashboard_vehicles_stats ON vehicles(company_id, status, make);
CREATE INDEX IF NOT EXISTS idx_dashboard_invoices_stats ON invoices(company_id, status, invoice_date);
CREATE INDEX IF NOT EXISTS idx_dashboard_payments_stats ON payments(company_id, payment_status, payment_date);;
