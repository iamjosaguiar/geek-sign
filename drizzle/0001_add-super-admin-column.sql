-- Add is_super_admin column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" boolean DEFAULT false NOT NULL;

-- Set super admin status for Jos and Andy
UPDATE "users" SET "is_super_admin" = true WHERE "email" IN ('jos@profitgeeks.com.au', 'admin@ambrit.com.au');
