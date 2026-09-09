ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS confirmation_status text;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS gmail_confirmation_message_id text;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS confirmation_attempted_at timestamptz;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS confirmation_error text;
