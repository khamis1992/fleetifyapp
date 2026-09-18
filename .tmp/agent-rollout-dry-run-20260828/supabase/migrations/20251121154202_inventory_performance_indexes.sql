-- Inventory System Performance Indexes
-- Add indexes for inventory management to improve query performance

-- First, let's check if inventory tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'inventory%'
ORDER BY table_name;;
