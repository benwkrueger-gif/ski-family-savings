CREATE TABLE IF NOT EXISTS customer_reports (
  id uuid PRIMARY KEY,
  tally_form_id text,
  tally_submission_id text NOT NULL,
  tally_event_id text,
  raw_tally_json jsonb NOT NULL,
  family_profile jsonb,
  first_name text,
  email text,
  home_zip text,
  family_summary text,
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'RECEIVED',
  offer_mode text,
  offer_mode_reason text,
  openai_response_id text,
  research_json jsonb,
  core_savings_low double precision,
  core_savings_high double precision,
  optional_savings_low double precision,
  optional_savings_high double precision,
  confidence text,
  human_review_flags jsonb,
  drive_folder_id text,
  drive_scan_file_id text,
  drive_plan_file_id text,
  scan_filename text,
  plan_filename text,
  gmail_draft_id text,
  gmail_paid_message_id text,
  stripe_client_reference_id text,
  stripe_checkout_url text,
  stripe_checkout_session_id text,
  stripe_payment_status text,
  stripe_paid_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  research_started_at timestamptz,
  research_completed_at timestamptz,
  pdf_started_at timestamptz,
  pdfs_ready_at timestamptz,
  draft_ready_at timestamptz,
  purchased_at timestamptz,
  plan_delivering_at timestamptz,
  plan_delivered_at timestamptz,
  auto_research boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'webhook',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_reports_tally_submission_id_idx
  ON customer_reports (tally_submission_id);
CREATE INDEX IF NOT EXISTS customer_reports_status_idx ON customer_reports (status);
CREATE INDEX IF NOT EXISTS customer_reports_email_idx ON customer_reports (email);
CREATE INDEX IF NOT EXISTS customer_reports_openai_response_id_idx
  ON customer_reports (openai_response_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_reports_stripe_session_id_idx
  ON customer_reports (stripe_checkout_session_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  report_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_id_idx
  ON webhook_events (provider, event_id);

CREATE TABLE IF NOT EXISTS pipeline_logs (
  id uuid PRIMARY KEY,
  report_id uuid NOT NULL,
  stage text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_logs_report_id_idx ON pipeline_logs (report_id);

CREATE TABLE IF NOT EXISTS stripe_fulfillments (
  id uuid PRIMARY KEY,
  stripe_event_id text NOT NULL,
  stripe_session_id text NOT NULL,
  report_id uuid NOT NULL,
  status text NOT NULL,
  mismatch text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_fulfillments_event_id_idx
  ON stripe_fulfillments (stripe_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS stripe_fulfillments_session_id_idx
  ON stripe_fulfillments (stripe_session_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
