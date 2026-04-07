-- Migration: Add admin functionality columns
-- Run this in pgAdmin to update your existing database

-- Add is_admin and is_suspended columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Add is_verified column to professors table
ALTER TABLE professors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Fix reviews table: update unique constraint from booking_id to (professor_id, student_id)
-- First, drop the old constraint if it exists
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;

-- Drop booking_id column if it exists (we use professor_id + student_id instead)
ALTER TABLE reviews DROP COLUMN IF EXISTS booking_id;

-- Add unique constraint for one review per student per professor
-- First delete duplicates if any exist
DELETE FROM reviews r1
USING reviews r2
WHERE r1.id > r2.id
  AND r1.professor_id = r2.professor_id
  AND r1.student_id = r2.student_id;

-- Now add the unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_professor_student_unique'
    ) THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_professor_student_unique UNIQUE (professor_id, student_id);
    END IF;
END $$;

-- Create the first admin user (replace EMAIL with your admin email)
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-admin@email.com';

-- Verify admins exist
SELECT id, email, name, surname, is_admin FROM users WHERE is_admin = TRUE;

-- Show migration complete
SELECT 'Migration completed successfully!' as status;
