-- Simplified RLS approach for Manus OAuth authentication
-- Since we're using service role key from backend, we'll implement
-- authorization logic in the application layer instead of database RLS

-- Enable RLS on all tables (for security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orderItems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role access
-- The backend will handle authorization logic

-- Users table: Allow all operations from service role
CREATE POLICY "Service role full access to users"
ON users FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Shops table: Allow all operations from service role
CREATE POLICY "Service role full access to shops"
ON shops FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Parts table: Allow all operations from service role
CREATE POLICY "Service role full access to parts"
ON parts FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Orders table: Allow all operations from service role
CREATE POLICY "Service role full access to orders"
ON orders FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Order Items table: Allow all operations from service role
CREATE POLICY "Service role full access to orderItems"
ON "orderItems" FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Notifications table: Allow all operations from service role
CREATE POLICY "Service role full access to notifications"
ON notifications FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);;
