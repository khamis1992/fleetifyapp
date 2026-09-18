
-- =====================================================
-- MANUAL CONFIGURATION REQUIRED FOR AUTH SECURITY
-- =====================================================
-- 
-- These security settings must be configured manually via Supabase Dashboard
-- as they are GoTrue (Supabase Auth) server configurations.
--
-- CONFIGURATION STEPS:
-- ====================
--
-- 1. OTP EXPIRY CONFIGURATION
--    Path: Dashboard > Authentication > Settings > Auth Settings
--    Action: Set "OTP Expiry" to 3600 seconds (1 hour) or less
--    Reason: Current value exceeds security best practice threshold
--    Security Impact: HIGH - Reduces window for token interception attacks
--
-- 2. LEAKED PASSWORD PROTECTION
--    Path: Dashboard > Authentication > Settings > Security and Protection
--    Action: Enable "Leaked Password Protection"
--    Feature: Integrates with HaveIBeenPwned API
--    Reason: Prevents users from using compromised passwords
--    Security Impact: HIGH - Protects against credential stuffing attacks
--
-- =====================================================

-- This migration serves as documentation only
-- No SQL changes are required
SELECT 'Manual auth configuration required - see migration notes' as notice;
;
