ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS writing_json jsonb;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS writing_fingerprint text;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS writing_completed_at timestamptz;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS pdfs_fingerprint text;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS draft_fingerprint text;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS job_kind text;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS job_started_at timestamptz;
