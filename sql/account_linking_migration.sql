-- ===================================================================
-- Account Linking Migration Script
-- تحديث قاعدة البيانات لدعم ربط الحسابات بالعملاء والموردين والموظفين
-- ===================================================================

-- 1. إضافة أعمدة ربط الحسابات
-- Add account linking columns to chart_of_accounts table
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS can_link_customers BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_link_vendors BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_link_employees BOOLEAN DEFAULT FALSE;

-- 2. إضافة تعليقات للأعمدة الجديدة
-- Add comments for new columns
COMMENT ON COLUMN chart_of_accounts.can_link_customers IS 'إمكانية ربط الحساب بالعملاء - Can link account to customers';
COMMENT ON COLUMN chart_of_accounts.can_link_vendors IS 'إمكانية ربط الحساب بالموردين - Can link account to vendors';  
COMMENT ON COLUMN chart_of_accounts.can_link_employees IS 'إمكانية ربط الحساب بالموظفين - Can link account to employees';

-- 3. تحديث القيم الافتراضية للحسابات الموجودة
-- Update default values for existing accounts

-- تحديث ربط العملاء (Customer accounts: 113xxx, 114xxx)
UPDATE chart_of_accounts 
SET can_link_customers = TRUE 
WHERE is_header = FALSE 
  AND (account_code LIKE '113%' OR account_code LIKE '114%');

-- تحديث ربط الموردين (Vendor accounts: 213xxx, 214xxx)  
UPDATE chart_of_accounts 
SET can_link_vendors = TRUE 
WHERE is_header = FALSE 
  AND (account_code LIKE '213%' OR account_code LIKE '214%');

-- تحديث ربط الموظفين (Employee accounts: 215xxx, 216xxx)
UPDATE chart_of_accounts 
SET can_link_employees = TRUE 
WHERE is_header = FALSE 
  AND (account_code LIKE '215%' OR account_code LIKE '216%');

-- 4. إنشاء فهارس لتحسين الأداء
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_accounts_can_link_customers 
ON chart_of_accounts(can_link_customers) 
WHERE can_link_customers = TRUE;

CREATE INDEX IF NOT EXISTS idx_chart_accounts_can_link_vendors 
ON chart_of_accounts(can_link_vendors) 
WHERE can_link_vendors = TRUE;

CREATE INDEX IF NOT EXISTS idx_chart_accounts_can_link_employees 
ON chart_of_accounts(can_link_employees) 
WHERE can_link_employees = TRUE;

-- 5. إنشاء فهرس مركب للبحث السريع
-- Create composite index for fast searching
CREATE INDEX IF NOT EXISTS idx_chart_accounts_linking_composite 
ON chart_of_accounts(is_header, can_link_customers, can_link_vendors, can_link_employees);

-- 6. إضافة قيود للتحقق من صحة البيانات
-- Add constraints to ensure data integrity

-- التأكد من أن الحسابات الرئيسية لا يمكن ربطها
-- Ensure header accounts cannot be linked

-- حذف القيود إذا كانت موجودة ثم إعادة إنشائها
-- Drop constraints if they exist, then recreate them
DO $$
BEGIN
    -- حذف القيد الأول إذا كان موجوداً
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_header_no_customer_link') THEN
        ALTER TABLE chart_of_accounts DROP CONSTRAINT chk_header_no_customer_link;
    END IF;
    
    -- حذف القيد الثاني إذا كان موجوداً
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_header_no_vendor_link') THEN
        ALTER TABLE chart_of_accounts DROP CONSTRAINT chk_header_no_vendor_link;
    END IF;
    
    -- حذف القيد الثالث إذا كان موجوداً
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_header_no_employee_link') THEN
        ALTER TABLE chart_of_accounts DROP CONSTRAINT chk_header_no_employee_link;
    END IF;
END $$;

-- إضافة القيود الجديدة
-- Add new constraints
ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chk_header_no_customer_link 
CHECK (NOT (is_header = TRUE AND can_link_customers = TRUE));

ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chk_header_no_vendor_link 
CHECK (NOT (is_header = TRUE AND can_link_vendors = TRUE));

ALTER TABLE chart_of_accounts 
ADD CONSTRAINT chk_header_no_employee_link 
CHECK (NOT (is_header = TRUE AND can_link_employees = TRUE));

-- 7. إنشاء دالة للتحقق من صحة ربط الحسابات
-- Create function to validate account linking
CREATE OR REPLACE FUNCTION validate_account_linking()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من أن الحسابات الرئيسية لا يمكن ربطها
    -- Check that header accounts cannot be linked
    IF NEW.is_header = TRUE THEN
        NEW.can_link_customers := FALSE;
        NEW.can_link_vendors := FALSE;
        NEW.can_link_employees := FALSE;
    END IF;
    
    -- التحقق من أن حسابات النظام لا يمكن تعديل إعدادات ربطها
    -- Check that system accounts linking settings cannot be modified
    IF NEW.is_system = TRUE AND OLD.is_system = TRUE THEN
        NEW.can_link_customers := OLD.can_link_customers;
        NEW.can_link_vendors := OLD.can_link_vendors;
        NEW.can_link_employees := OLD.can_link_employees;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء المشغل للتحقق التلقائي
-- Create trigger for automatic validation
DROP TRIGGER IF EXISTS trg_validate_account_linking ON chart_of_accounts;
CREATE TRIGGER trg_validate_account_linking
    BEFORE INSERT OR UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION validate_account_linking();

-- 9. إنشاء دالة للحصول على الحسابات القابلة للربط
-- Create function to get linkable accounts
CREATE OR REPLACE FUNCTION get_linkable_accounts(
    p_company_id UUID,
    p_link_type TEXT DEFAULT NULL -- 'customers', 'vendors', 'employees', or NULL for all
)
RETURNS TABLE (
    id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    account_name_ar VARCHAR,
    account_level INTEGER,
    can_link_customers BOOLEAN,
    can_link_vendors BOOLEAN,
    can_link_employees BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id,
        ca.account_code,
        ca.account_name,
        ca.account_name_ar,
        ca.account_level,
        ca.can_link_customers,
        ca.can_link_vendors,
        ca.can_link_employees
    FROM chart_of_accounts ca
    WHERE ca.company_id = p_company_id
      AND ca.is_header = FALSE
      AND ca.is_active = TRUE
      AND (
          p_link_type IS NULL OR
          (p_link_type = 'customers' AND ca.can_link_customers = TRUE) OR
          (p_link_type = 'vendors' AND ca.can_link_vendors = TRUE) OR
          (p_link_type = 'employees' AND ca.can_link_employees = TRUE)
      )
    ORDER BY ca.account_code;
END;
$$ LANGUAGE plpgsql;

-- 10. إنشاء view للحسابات القابلة للربط
-- Create view for linkable accounts
CREATE OR REPLACE VIEW v_linkable_accounts AS
SELECT 
    ca.*,
    CASE 
        WHEN ca.can_link_customers THEN 'customers'
        WHEN ca.can_link_vendors THEN 'vendors'
        WHEN ca.can_link_employees THEN 'employees'
        ELSE 'none'
    END as primary_link_type,
    (ca.can_link_customers::int + ca.can_link_vendors::int + ca.can_link_employees::int) as link_count
FROM chart_of_accounts ca
WHERE ca.is_header = FALSE 
  AND ca.is_active = TRUE
  AND (ca.can_link_customers = TRUE OR ca.can_link_vendors = TRUE OR ca.can_link_employees = TRUE);

-- 11. إضافة تعليق على الـ view
-- Add comment to the view
COMMENT ON VIEW v_linkable_accounts IS 'عرض للحسابات القابلة للربط بالعملاء أو الموردين أو الموظفين - View for accounts that can be linked to customers, vendors, or employees';

-- 12. إنشاء إحصائيات للحسابات
-- Create statistics for accounts
CREATE OR REPLACE VIEW v_account_linking_stats AS
SELECT 
    company_id,
    COUNT(*) as total_accounts,
    COUNT(*) FILTER (WHERE is_header = TRUE) as header_accounts,
    COUNT(*) FILTER (WHERE is_header = FALSE) as detail_accounts,
    COUNT(*) FILTER (WHERE is_system = TRUE) as system_accounts,
    COUNT(*) FILTER (WHERE can_link_customers = TRUE) as customer_linkable,
    COUNT(*) FILTER (WHERE can_link_vendors = TRUE) as vendor_linkable,
    COUNT(*) FILTER (WHERE can_link_employees = TRUE) as employee_linkable,
    COUNT(*) FILTER (WHERE can_link_customers = TRUE OR can_link_vendors = TRUE OR can_link_employees = TRUE) as total_linkable
FROM chart_of_accounts
WHERE is_active = TRUE
GROUP BY company_id;

-- 13. إضافة تعليق على إحصائيات الحسابات
-- Add comment to account statistics view
COMMENT ON VIEW v_account_linking_stats IS 'إحصائيات ربط الحسابات لكل شركة - Account linking statistics per company';

-- ===================================================================
-- تحقق من نجاح التحديث
-- Verification queries
-- ===================================================================

-- التحقق من إضافة الأعمدة الجديدة
-- Verify new columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts' 
  AND column_name IN ('can_link_customers', 'can_link_vendors', 'can_link_employees');

-- التحقق من الفهارس الجديدة
-- Verify new indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'chart_of_accounts' 
  AND indexname LIKE '%link%';

-- التحقق من القيود الجديدة
-- Verify new constraints were added
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'chart_of_accounts'::regclass 
  AND conname LIKE '%link%';

-- عرض إحصائيات سريعة للتحديث
-- Show quick update statistics
SELECT 
    'Total accounts' as metric,
    COUNT(*) as count
FROM chart_of_accounts
UNION ALL
SELECT 
    'Customer linkable accounts' as metric,
    COUNT(*) as count
FROM chart_of_accounts 
WHERE can_link_customers = TRUE
UNION ALL
SELECT 
    'Vendor linkable accounts' as metric,
    COUNT(*) as count
FROM chart_of_accounts 
WHERE can_link_vendors = TRUE
UNION ALL
SELECT 
    'Employee linkable accounts' as metric,
    COUNT(*) as count
FROM chart_of_accounts 
WHERE can_link_employees = TRUE;

-- ===================================================================
-- انتهاء ملف التحديث
-- End of migration script
-- ===================================================================

-- رسالة نجاح التحديث
-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ تم تطبيق تحديث ربط الحسابات بنجاح - Account linking migration completed successfully!';
    RAISE NOTICE '📊 يمكنك الآن استخدام نظام ربط الحسابات - You can now use the account linking system';
END $$;
