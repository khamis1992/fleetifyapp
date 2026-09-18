-- Migration Part 1: Add Columns
-- Date: 2026-01-31

-- إضافة الأعمدة من المذكرة الشارحة
ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS months_unpaid INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_penalty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;

-- إضافة الأعمدة من كشف المطالبات المالية
ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS invoices_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_invoices_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_penalties DECIMAL(10,2) DEFAULT 0;

-- إضافة الأعمدة من كشف المخالفات المرورية
ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS violations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS violations_amount DECIMAL(10,2) DEFAULT 0;;
