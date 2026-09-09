ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS initial_report_sent_at timestamptz;
ALTER TABLE customer_reports ADD COLUMN IF NOT EXISTS initial_report_delivery_type text;
