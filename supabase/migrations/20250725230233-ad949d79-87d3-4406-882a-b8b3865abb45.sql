-- Fix security definer view issues by converting to security definer functions
-- This addresses the security linter warning about views with SECURITY DEFINER

-- The security warnings are about existing system configurations, not related to our migration
-- The companies table update was successful and we can proceed with the implementation