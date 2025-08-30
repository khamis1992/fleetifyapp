-- Add fields for direct account creation
ALTER TABLE public.account_creation_requests 
ADD COLUMN direct_creation boolean DEFAULT false,
ADD COLUMN temporary_password text,
ADD COLUMN password_expires_at timestamp with time zone;