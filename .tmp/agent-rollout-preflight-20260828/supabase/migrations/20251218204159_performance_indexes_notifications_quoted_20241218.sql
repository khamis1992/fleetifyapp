-- ================================================================
-- NOTIFICATIONS TABLE INDEXES
-- ================================================================
--
-- Index for user filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications("userId");

-- Index for read status
CREATE INDEX IF NOT EXISTS idx_notifications_is_read
ON notifications("isRead") WHERE "isRead" IS NOT NULL;

-- Index for creation date (recent notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications("createdAt" DESC) WHERE "userId" IS NOT NULL;

-- Composite index for user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications("userId", "isRead");

-- Index for related entities
CREATE INDEX IF NOT EXISTS idx_notifications_related
ON notifications("relatedId", "relatedType") WHERE "relatedId" IS NOT NULL;

-- ================================================================
-- ANALYZE TABLE AFTER CREATING INDEXES
-- ================================================================
--
-- Update statistics for query optimizer
ANALYZE notifications;;
