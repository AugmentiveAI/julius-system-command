ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rom_left_knee int DEFAULT 90;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rom_right_knee int DEFAULT 90;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rehab_phase text DEFAULT 'strength';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rehab_log jsonb DEFAULT '[]';