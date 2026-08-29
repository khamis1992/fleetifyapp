-- Isolated Zoho CRM schema (avoids collisions with existing public tables)
CREATE SCHEMA IF NOT EXISTS zcrm;

CREATE OR REPLACE FUNCTION zcrm.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE zcrm.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_owner TEXT DEFAULT 'Demo User',
  company TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  fax TEXT,
  mobile TEXT,
  website TEXT,
  lead_source TEXT,
  lead_status TEXT DEFAULT 'Open',
  industry TEXT,
  no_of_employees INT,
  annual_revenue NUMERIC(14,2),
  rating TEXT,
  email_opt_out BOOLEAN DEFAULT false,
  skype_id TEXT,
  secondary_email TEXT,
  twitter TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  description TEXT,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner TEXT DEFAULT 'Demo User',
  account_name TEXT NOT NULL,
  account_site TEXT,
  account_number TEXT,
  account_type TEXT,
  industry TEXT,
  annual_revenue NUMERIC(14,2),
  rating TEXT,
  phone TEXT,
  fax TEXT,
  website TEXT,
  ticker_symbol TEXT,
  ownership TEXT,
  employees INT,
  sic_code TEXT,
  billing_street TEXT, billing_city TEXT, billing_state TEXT, billing_code TEXT, billing_country TEXT,
  shipping_street TEXT, shipping_city TEXT, shipping_state TEXT, shipping_code TEXT, shipping_country TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_owner TEXT DEFAULT 'Demo User',
  account_id UUID REFERENCES zcrm.accounts(id) ON DELETE SET NULL,
  lead_source TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  fax TEXT,
  mobile TEXT,
  date_of_birth DATE,
  assistant TEXT,
  asst_phone TEXT,
  email_opt_out BOOLEAN DEFAULT false,
  skype_id TEXT,
  secondary_email TEXT,
  twitter TEXT,
  mailing_street TEXT, mailing_city TEXT, mailing_state TEXT, mailing_zip TEXT, mailing_country TEXT,
  other_street TEXT, other_city TEXT, other_state TEXT, other_zip TEXT, other_country TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_owner TEXT DEFAULT 'Demo User',
  deal_name TEXT NOT NULL,
  account_id UUID REFERENCES zcrm.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  type TEXT,
  next_step TEXT,
  lead_source TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  closing_date DATE,
  stage TEXT DEFAULT 'Qualification',
  probability INT DEFAULT 10,
  expected_revenue NUMERIC(14,2),
  campaign_source TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'Not Started',
  priority TEXT DEFAULT 'Normal',
  related_to_type TEXT,
  related_to_id UUID,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  description TEXT,
  reminder_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT,
  from_datetime TIMESTAMPTZ,
  to_datetime TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  related_to_type TEXT,
  related_to_id UUID,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  description TEXT,
  host_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  call_type TEXT DEFAULT 'Outbound',
  call_purpose TEXT,
  call_from_to TEXT,
  related_to_type TEXT,
  related_to_id UUID,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  call_start TIMESTAMPTZ,
  call_duration_minutes INT DEFAULT 0,
  call_result TEXT,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  product_code TEXT,
  product_category TEXT,
  manufacturer TEXT,
  product_active BOOLEAN DEFAULT true,
  unit_price NUMERIC(14,2) DEFAULT 0,
  commission_rate NUMERIC(5,2),
  tax NUMERIC(5,2),
  taxable BOOLEAN DEFAULT true,
  usage_unit TEXT,
  qty_in_stock INT DEFAULT 0,
  reorder_level INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.price_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_book_name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  pricing_model TEXT DEFAULT 'Flat',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT,
  subject TEXT NOT NULL,
  quote_stage TEXT DEFAULT 'Draft',
  valid_until DATE,
  account_id UUID REFERENCES zcrm.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES zcrm.deals(id) ON DELETE SET NULL,
  carrier TEXT,
  sub_total NUMERIC(14,2) DEFAULT 0,
  discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  adjustment NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  terms_conditions TEXT,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number TEXT,
  subject TEXT NOT NULL,
  account_id UUID REFERENCES zcrm.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES zcrm.deals(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT DEFAULT 'Created',
  sub_total NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT,
  subject TEXT NOT NULL,
  vendor_name TEXT,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  po_date DATE,
  due_date DATE,
  status TEXT DEFAULT 'Created',
  grand_total NUMERIC(14,2) DEFAULT 0,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT,
  subject TEXT NOT NULL,
  account_id UUID REFERENCES zcrm.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'Created',
  sub_total NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  campaign_type TEXT,
  status TEXT DEFAULT 'Planning',
  start_date DATE,
  end_date DATE,
  expected_revenue NUMERIC(14,2) DEFAULT 0,
  budgeted_cost NUMERIC(14,2) DEFAULT 0,
  actual_cost NUMERIC(14,2) DEFAULT 0,
  expected_response NUMERIC(5,2),
  numbers_sent INT DEFAULT 0,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  category TEXT,
  street TEXT, city TEXT, state TEXT, zip_code TEXT, country TEXT,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT,
  subject TEXT NOT NULL,
  case_origin TEXT,
  status TEXT DEFAULT 'New',
  priority TEXT DEFAULT 'Medium',
  type TEXT,
  case_reason TEXT,
  account_id UUID REFERENCES zcrm.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES zcrm.contacts(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  description TEXT,
  solution TEXT,
  is_escalated BOOLEAN DEFAULT false,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_title TEXT NOT NULL,
  status TEXT DEFAULT 'Draft',
  question TEXT,
  answer TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  folder TEXT DEFAULT 'My Documents',
  file_name TEXT,
  file_url TEXT,
  description TEXT,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_name TEXT NOT NULL,
  period TEXT,
  year INT,
  quarter INT,
  amount NUMERIC(14,2) DEFAULT 0,
  quota NUMERIC(14,2) DEFAULT 0,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT,
  related_to_type TEXT NOT NULL,
  related_to_id UUID NOT NULL,
  owner_name TEXT DEFAULT 'Demo User',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  related_to_type TEXT,
  related_to_id UUID,
  owner_name TEXT DEFAULT 'Demo User',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zcrm.record_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID REFERENCES zcrm.tags(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL
);

CREATE INDEX idx_zcrm_leads_status ON zcrm.leads(lead_status);
CREATE INDEX idx_zcrm_deals_stage ON zcrm.deals(stage);
CREATE INDEX idx_zcrm_contacts_account ON zcrm.contacts(account_id);
CREATE INDEX idx_zcrm_tasks_status ON zcrm.tasks(status);

-- Expose schema via API
GRANT USAGE ON SCHEMA zcrm TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA zcrm TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA zcrm TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA zcrm GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- RLS open for demo
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'zcrm'
  LOOP
    EXECUTE format('ALTER TABLE zcrm.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON zcrm.%I', r.tablename);
    EXECUTE format('CREATE POLICY allow_all ON zcrm.%I FOR ALL USING (true) WITH CHECK (true)', r.tablename);
  END LOOP;
END $$;

-- Seed
INSERT INTO zcrm.tags (name, color) VALUES
  ('Hot', '#ef4444'), ('Warm', '#f59e0b'), ('Cold', '#3b82f6'), ('VIP', '#8b5cf6'), ('Partner', '#10b981');

INSERT INTO zcrm.leads (company, first_name, last_name, title, email, phone, lead_source, lead_status, industry, annual_revenue, city, state, country) VALUES
  ('King (Sample)', 'Kris', 'Marrier', 'Marketing Manager', 'kris@king.com', '555-1212', 'Cold Call', 'Contacted', 'Technology', 250000, 'San Francisco', 'CA', 'USA'),
  ('Printz (Sample)', 'Sage', 'Wieser', 'Media Relations', 'sage@printz.com', '555-1213', 'Employee Referral', 'Open', 'Media', 180000, 'Austin', 'TX', 'USA'),
  ('James (Sample)', 'Mattie', 'Poquette', 'VP Marketing', 'mattie@james.com', '555-1214', 'Advertisement', 'Open', 'Retail', 500000, 'Chicago', 'IL', 'USA'),
  ('Chemel (Sample)', 'Meaghan', 'Garufi', 'CEO', 'meaghan@chemel.com', '555-1215', 'Trade Show', 'Not Contacted', 'Manufacturing', 1200000, 'Detroit', 'MI', 'USA'),
  ('Feltz (Sample)', 'Gladys', 'Rim', 'Sales Manager', 'gladys@feltz.com', '555-1216', 'Web Download', 'Attempted to Contact', 'Services', 90000, 'Seattle', 'WA', 'USA'),
  ('Chanay (Sample)', 'Yuki', 'Whobrey', 'Director Ops', 'yuki@chanay.com', '555-1217', 'Partner', 'Qualified', 'Logistics', 750000, 'Miami', 'FL', 'USA'),
  ('Morlong (Sample)', 'Fletcher', 'Flosi', 'CFO', 'fletcher@morlong.com', '555-1218', 'External Referral', 'Contacted', 'Finance', 2000000, 'New York', 'NY', 'USA'),
  ('Commercial (Sample)', 'Bette', 'Nicka', 'Account Exec', 'bette@commercial.com', '555-1219', 'Public Relations', 'Junk Lead', 'Commercial', 45000, 'Boston', 'MA', 'USA'),
  ('Truhlar (Sample)', 'Vinou', 'Ruta', 'Engineer', 'vinou@truhlar.com', '555-1220', 'Web Research', 'Lost Lead', 'Engineering', 320000, 'Denver', 'CO', 'USA'),
  ('TechCorp', 'Alex', 'Chen', 'CTO', 'alex@techcorp.io', '555-2001', 'Web Download', 'Open', 'Technology', 5000000, 'Palo Alto', 'CA', 'USA'),
  ('GreenLeaf', 'Sam', 'Rivera', 'Founder', 'sam@greenleaf.co', '555-2002', 'Cold Call', 'Contacted', 'Agriculture', 800000, 'Portland', 'OR', 'USA'),
  ('NovaSoft', 'Jordan', 'Lee', 'Product Lead', 'jordan@novasoft.com', '555-2003', 'Trade Show', 'Qualified', 'Software', 1500000, 'Austin', 'TX', 'USA');

INSERT INTO zcrm.accounts (account_name, account_type, industry, phone, website, annual_revenue, employees, billing_city, billing_state, billing_country) VALUES
  ('Acme Corporation', 'Customer', 'Technology', '555-0100', 'https://acme.example', 5000000, 250, 'San Jose', 'CA', 'USA'),
  ('Globex Industries', 'Customer', 'Manufacturing', '555-0101', 'https://globex.example', 12000000, 800, 'Houston', 'TX', 'USA'),
  ('Initech', 'Prospect', 'Software', '555-0102', 'https://initech.example', 3000000, 120, 'Austin', 'TX', 'USA'),
  ('Umbrella Health', 'Customer', 'Healthcare', '555-0103', 'https://umbrella.example', 8000000, 400, 'Chicago', 'IL', 'USA'),
  ('Stark Logistics', 'Partner', 'Logistics', '555-0104', 'https://stark.example', 2000000, 90, 'Seattle', 'WA', 'USA');

INSERT INTO zcrm.contacts (first_name, last_name, title, email, phone, account_id, lead_source, mailing_city, mailing_state)
SELECT 'Tony', 'Stark', 'CEO', 'tony@stark.example', '555-3001', id, 'Partner', 'Seattle', 'WA' FROM zcrm.accounts WHERE account_name = 'Stark Logistics' LIMIT 1;
INSERT INTO zcrm.contacts (first_name, last_name, title, email, phone, account_id, lead_source, mailing_city, mailing_state)
SELECT 'Pepper', 'Potts', 'COO', 'pepper@acme.example', '555-3002', id, 'Employee Referral', 'San Jose', 'CA' FROM zcrm.accounts WHERE account_name = 'Acme Corporation' LIMIT 1;
INSERT INTO zcrm.contacts (first_name, last_name, title, email, phone, account_id, lead_source, mailing_city, mailing_state)
SELECT 'Bruce', 'Banner', 'Scientist', 'bruce@umbrella.example', '555-3003', id, 'Web Download', 'Chicago', 'IL' FROM zcrm.accounts WHERE account_name = 'Umbrella Health' LIMIT 1;
INSERT INTO zcrm.contacts (first_name, last_name, title, email, phone, account_id, lead_source, mailing_city, mailing_state)
SELECT 'Peter', 'Parker', 'Analyst', 'peter@initech.example', '555-3004', id, 'Cold Call', 'Austin', 'TX' FROM zcrm.accounts WHERE account_name = 'Initech' LIMIT 1;
INSERT INTO zcrm.contacts (first_name, last_name, title, email, phone, account_id, lead_source, mailing_city, mailing_state)
SELECT 'Natasha', 'Romanoff', 'Security', 'nat@globex.example', '555-3005', id, 'Trade Show', 'Houston', 'TX' FROM zcrm.accounts WHERE account_name = 'Globex Industries' LIMIT 1;

INSERT INTO zcrm.deals (deal_name, amount, stage, probability, closing_date, account_id, type, lead_source)
SELECT 'Acme Enterprise License', 125000, 'Proposal/Price Quote', 75, CURRENT_DATE + 30, id, 'New Business', 'Partner' FROM zcrm.accounts WHERE account_name = 'Acme Corporation' LIMIT 1;
INSERT INTO zcrm.deals (deal_name, amount, stage, probability, closing_date, account_id, type, lead_source)
SELECT 'Globex Expansion', 85000, 'Negotiation/Review', 90, CURRENT_DATE + 14, id, 'Existing Business', 'Employee Referral' FROM zcrm.accounts WHERE account_name = 'Globex Industries' LIMIT 1;
INSERT INTO zcrm.deals (deal_name, amount, stage, probability, closing_date, account_id, type, lead_source)
SELECT 'Initech Pilot', 25000, 'Qualification', 10, CURRENT_DATE + 60, id, 'New Business', 'Web Download' FROM zcrm.accounts WHERE account_name = 'Initech' LIMIT 1;
INSERT INTO zcrm.deals (deal_name, amount, stage, probability, closing_date, account_id, type, lead_source)
SELECT 'Umbrella Support Pack', 45000, 'Needs Analysis', 20, CURRENT_DATE + 45, id, 'New Business', 'Cold Call' FROM zcrm.accounts WHERE account_name = 'Umbrella Health' LIMIT 1;
INSERT INTO zcrm.deals (deal_name, amount, stage, probability, closing_date, account_id, type, lead_source)
SELECT 'Stark Fleet Deal', 200000, 'Closed Won', 100, CURRENT_DATE - 5, id, 'New Business', 'Partner' FROM zcrm.accounts WHERE account_name = 'Stark Logistics' LIMIT 1;
INSERT INTO zcrm.deals (deal_name, amount, stage, probability, closing_date, account_id, type, lead_source)
SELECT 'Acme Upsell Q3', 60000, 'Value Proposition', 50, CURRENT_DATE + 20, id, 'Existing Business', 'Advertisement' FROM zcrm.accounts WHERE account_name = 'Acme Corporation' LIMIT 1;

INSERT INTO zcrm.tasks (subject, due_date, status, priority, description) VALUES
  ('Follow up with Kris Marrier', CURRENT_DATE + 1, 'Not Started', 'High', 'Discuss pricing options'),
  ('Send proposal to Acme', CURRENT_DATE + 3, 'In Progress', 'Highest', 'Enterprise license proposal'),
  ('Schedule demo with Initech', CURRENT_DATE + 5, 'Not Started', 'Normal', 'Product walkthrough'),
  ('Update forecast numbers', CURRENT_DATE, 'Not Started', 'High', 'Q3 forecast review'),
  ('Call Umbrella Health contact', CURRENT_DATE + 2, 'Deferred', 'Low', 'Renewal discussion');

INSERT INTO zcrm.meetings (title, location, from_datetime, to_datetime, description) VALUES
  ('Weekly Sales Sync', 'Zoom', now() + interval '1 day', now() + interval '1 day' + interval '1 hour', 'Team pipeline review'),
  ('Acme Discovery Call', 'Conference Room A', now() + interval '2 days', now() + interval '2 days' + interval '45 minutes', 'Requirements gathering'),
  ('Q3 Planning', 'HQ Boardroom', now() + interval '7 days', now() + interval '7 days' + interval '2 hours', 'Quarterly planning');

INSERT INTO zcrm.calls (subject, call_type, call_purpose, call_start, call_duration_minutes, call_result) VALUES
  ('Intro call - King Sample', 'Outbound', 'Prospecting', now() - interval '1 day', 15, 'Interested'),
  ('Support follow-up', 'Inbound', 'Support', now() - interval '3 hours', 8, 'Resolved'),
  ('Demo scheduling', 'Outbound', 'Demo', now() - interval '2 days', 12, 'Left voicemail');

INSERT INTO zcrm.products (product_name, product_code, product_category, unit_price, qty_in_stock, product_active, description) VALUES
  ('CRM Professional', 'CRM-PRO', 'Software', 99.00, 999, true, 'Professional CRM seat'),
  ('CRM Enterprise', 'CRM-ENT', 'Software', 199.00, 999, true, 'Enterprise CRM seat'),
  ('Analytics Add-on', 'ANL-01', 'Add-on', 49.00, 500, true, 'Advanced analytics module'),
  ('Onboarding Package', 'ONB-01', 'Service', 1500.00, 100, true, 'Implementation package'),
  ('Support Premium', 'SUP-PREM', 'Support', 299.00, 200, true, '24/7 premium support');

INSERT INTO zcrm.campaigns (campaign_name, campaign_type, status, start_date, end_date, budgeted_cost, expected_revenue) VALUES
  ('Summer Webinar Series', 'Webinar', 'Active', CURRENT_DATE - 10, CURRENT_DATE + 50, 5000, 50000),
  ('Partner Co-Marketing', 'Partners', 'Planning', CURRENT_DATE + 15, CURRENT_DATE + 90, 12000, 120000),
  ('Q3 Email Nurture', 'Email', 'Active', CURRENT_DATE - 5, CURRENT_DATE + 30, 2000, 25000);

INSERT INTO zcrm.vendors (vendor_name, phone, email, category, city, country) VALUES
  ('CloudHost Inc', '555-4001', 'sales@cloudhost.example', 'Infrastructure', 'Ashburn', 'USA'),
  ('PrintWorks', '555-4002', 'hello@printworks.example', 'Marketing', 'Portland', 'USA'),
  ('DataPipe LLC', '555-4003', 'info@datapipe.example', 'Data', 'Dallas', 'USA');

INSERT INTO zcrm.cases (subject, case_origin, status, priority, type, email, description) VALUES
  ('Cannot export reports', 'Email', 'New', 'High', 'Problem', 'user@acme.example', 'Export button greyed out'),
  ('Billing discrepancy', 'Phone', 'On Hold', 'Medium', 'Question', 'finance@globex.example', 'Invoice amount mismatch'),
  ('Feature request: bulk edit', 'Web', 'Escalated', 'Low', 'Feature Request', 'dev@initech.example', 'Need bulk field update');

INSERT INTO zcrm.solutions (solution_title, status, question, answer) VALUES
  ('How to export leads', 'Published', 'How do I export leads to CSV?', 'Go to Leads > Actions > Export.'),
  ('Reset user password', 'Published', 'How to reset a user password?', 'Settings > Users > Reset Password.'),
  ('Pipeline stage customization', 'Draft', 'Can I customize deal stages?', 'Yes, under Setup > Customization.');

INSERT INTO zcrm.quotes (subject, quote_stage, valid_until, account_id, sub_total, tax, grand_total)
SELECT 'Acme Annual License Quote', 'Draft', CURRENT_DATE + 30, id, 125000, 10000, 135000 FROM zcrm.accounts WHERE account_name = 'Acme Corporation' LIMIT 1;

INSERT INTO zcrm.sales_orders (subject, status, account_id, due_date, sub_total, grand_total)
SELECT 'Stark Fleet SO', 'Approved', id, CURRENT_DATE + 14, 200000, 200000 FROM zcrm.accounts WHERE account_name = 'Stark Logistics' LIMIT 1;

INSERT INTO zcrm.invoices (subject, status, account_id, invoice_date, due_date, sub_total, grand_total)
SELECT 'Stark Fleet Invoice', 'Paid', id, CURRENT_DATE - 5, CURRENT_DATE + 25, 200000, 200000 FROM zcrm.accounts WHERE account_name = 'Stark Logistics' LIMIT 1;

INSERT INTO zcrm.purchase_orders (subject, vendor_name, status, po_date, due_date, grand_total) VALUES
  ('Cloud hosting Q3', 'CloudHost Inc', 'Approved', CURRENT_DATE, CURRENT_DATE + 30, 4800);

INSERT INTO zcrm.forecasts (forecast_name, period, year, quarter, amount, quota) VALUES
  ('Q3 2026 Sales', 'Quarterly', 2026, 3, 450000, 500000),
  ('Q4 2026 Sales', 'Quarterly', 2026, 4, 0, 550000);

INSERT INTO zcrm.documents (title, folder, file_name, description) VALUES
  ('Company Overview Deck', 'Sales Collateral', 'overview.pdf', 'Standard pitch deck'),
  ('MSA Template', 'Legal', 'msa-template.docx', 'Master service agreement'),
  ('Product Datasheet', 'Sales Collateral', 'datasheet.pdf', 'Feature comparison');

INSERT INTO zcrm.price_books (price_book_name, active, pricing_model) VALUES
  ('Standard Price Book', true, 'Flat'),
  ('Partner Discount Book', true, 'Differential');

INSERT INTO zcrm.activities (activity_type, subject, body, related_to_type) VALUES
  ('note', 'Welcome to CRM', 'Your workspace is ready. Explore Leads, Deals, and Home analytics.', 'system'),
  ('status', 'Deal Closed Won', 'Stark Fleet Deal marked Closed Won', 'deal'),
  ('call', 'Call logged', 'Intro call - King Sample completed', 'call');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';;
