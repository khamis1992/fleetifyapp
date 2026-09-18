-- Supabase PostgreSQL Schema for AutoParts Website
-- This script creates all tables with proper PostgreSQL syntax

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(320),
  "logoUrl" TEXT,
  "isActive" INTEGER DEFAULT 1 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Parts table
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  "shopId" INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  "partNumber" VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  description TEXT,
  price INTEGER NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  "lowStockThreshold" INTEGER DEFAULT 5 NOT NULL,
  condition VARCHAR(20) DEFAULT 'new' NOT NULL CHECK (condition IN ('new', 'used', 'refurbished')),
  "imageUrl" TEXT,
  "compatibleMakes" TEXT,
  "compatibleModels" TEXT,
  "compatibleYears" TEXT,
  specifications TEXT,
  "isActive" INTEGER DEFAULT 1 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('low_stock', 'new_order', 'order_shipped', 'order_delivered', 'system')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  "relatedId" INTEGER,
  "relatedType" VARCHAR(50),
  "isRead" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  "customerId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "shopId" INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  "customerName" VARCHAR(255) NOT NULL,
  "customerEmail" VARCHAR(320) NOT NULL,
  "customerPhone" VARCHAR(50),
  "shippingAddress" TEXT NOT NULL,
  "shippingCity" VARCHAR(100) NOT NULL,
  "shippingZip" VARCHAR(20) NOT NULL,
  "shippingMethod" VARCHAR(50) NOT NULL,
  subtotal INTEGER NOT NULL,
  "shippingCost" INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  "paymentMethod" VARCHAR(50),
  "paymentStatus" VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK ("paymentStatus" IN ('pending', 'paid', 'failed', 'refunded')),
  "trackingNumber" VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Order Items table
CREATE TABLE IF NOT EXISTS "orderItems" (
  id SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "partId" INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  "partName" VARCHAR(255) NOT NULL,
  "partNumber" VARCHAR(100),
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shops_userId ON shops("userId");
CREATE INDEX IF NOT EXISTS idx_parts_shopId ON parts("shopId");
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_orders_shopId ON orders("shopId");
CREATE INDEX IF NOT EXISTS idx_orders_customerId ON orders("customerId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orderItems_orderId ON "orderItems"("orderId");
CREATE INDEX IF NOT EXISTS idx_orderItems_partId ON "orderItems"("partId");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parts_updated_at ON parts;
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();;
