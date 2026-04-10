-- Migration: Add Jitsi Meeting Columns to professor_slots
-- Created: 2026-01-23
-- Description: Adds meeting_url and meeting_password columns to support Jitsi Meet video conferencing

-- Add meeting_url column to store the Jitsi meeting room URL
ALTER TABLE professor_slots ADD COLUMN meeting_url VARCHAR(255);

-- Add meeting_password column to store the Jitsi meeting password
ALTER TABLE professor_slots ADD COLUMN meeting_password VARCHAR(20);

-- Optional: Add index for faster queries on meeting URLs
CREATE INDEX idx_professor_slots_meeting_url ON professor_slots(meeting_url) WHERE meeting_url IS NOT NULL;
