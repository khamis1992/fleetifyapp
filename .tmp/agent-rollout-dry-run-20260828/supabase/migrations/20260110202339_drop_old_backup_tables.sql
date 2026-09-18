-- Drop old backup tables that are no longer needed
-- These tables contain outdated data from previous migrations

-- payments_backup_20251107: 6,568 rows - old payment data backup from Nov 2025
DROP TABLE IF EXISTS public.payments_backup_20251107;

-- reminder_schedules_backup_20250101: 9 rows - old reminder schedules backup
DROP TABLE IF EXISTS public.reminder_schedules_backup_20250101;

-- reminder_templates_backup_20250101: 28 rows - old reminder templates backup
DROP TABLE IF EXISTS public.reminder_templates_backup_20250101;

-- Add comment to document this cleanup
COMMENT ON SCHEMA public IS 'Standard public schema - cleaned up backup tables on 2026-01-10';;
