import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const customerReports = pgTable(
  "customer_reports",
  {
    id: uuid("id").primaryKey(),
    tallyFormId: text("tally_form_id"),
    tallySubmissionId: text("tally_submission_id").notNull(),
    tallyEventId: text("tally_event_id"),
    rawTallyJson: jsonb("raw_tally_json").notNull(),
    familyProfile: jsonb("family_profile"),
    firstName: text("first_name"),
    email: text("email"),
    homeZip: text("home_zip"),
    familySummary: text("family_summary"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    status: text("status").notNull().default("RECEIVED"),
    offerMode: text("offer_mode"),
    offerModeReason: text("offer_mode_reason"),

    openaiResponseId: text("openai_response_id"),
    researchJson: jsonb("research_json"),
    coreSavingsLow: doublePrecision("core_savings_low"),
    coreSavingsHigh: doublePrecision("core_savings_high"),
    optionalSavingsLow: doublePrecision("optional_savings_low"),
    optionalSavingsHigh: doublePrecision("optional_savings_high"),
    confidence: text("confidence"),
    humanReviewFlags: jsonb("human_review_flags").$type<string[]>(),

    driveFolderId: text("drive_folder_id"),
    driveScanFileId: text("drive_scan_file_id"),
    drivePlanFileId: text("drive_plan_file_id"),
    scanFilename: text("scan_filename"),
    planFilename: text("plan_filename"),

    gmailDraftId: text("gmail_draft_id"),
    gmailPaidMessageId: text("gmail_paid_message_id"),

    stripeClientReferenceId: text("stripe_client_reference_id"),
    stripeCheckoutUrl: text("stripe_checkout_url"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentStatus: text("stripe_payment_status"),
    stripePaidAt: timestamp("stripe_paid_at", { withTimezone: true }),

    lastError: text("last_error"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),

    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    researchStartedAt: timestamp("research_started_at", { withTimezone: true }),
    researchCompletedAt: timestamp("research_completed_at", { withTimezone: true }),
    pdfStartedAt: timestamp("pdf_started_at", { withTimezone: true }),
    pdfsReadyAt: timestamp("pdfs_ready_at", { withTimezone: true }),
    draftReadyAt: timestamp("draft_ready_at", { withTimezone: true }),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    planDeliveringAt: timestamp("plan_delivering_at", { withTimezone: true }),
    planDeliveredAt: timestamp("plan_delivered_at", { withTimezone: true }),

    autoResearch: boolean("auto_research").notNull().default(true),
    source: text("source").notNull().default("webhook"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("customer_reports_tally_submission_id_idx").on(table.tallySubmissionId),
    index("customer_reports_status_idx").on(table.status),
    index("customer_reports_email_idx").on(table.email),
    index("customer_reports_openai_response_id_idx").on(table.openaiResponseId),
    uniqueIndex("customer_reports_stripe_session_id_idx").on(table.stripeCheckoutSessionId),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    reportId: uuid("report_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("webhook_events_provider_event_id_idx").on(table.provider, table.eventId)],
);

export const pipelineLogs = pgTable(
  "pipeline_logs",
  {
    id: uuid("id").primaryKey(),
    reportId: uuid("report_id").notNull(),
    stage: text("stage").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("pipeline_logs_report_id_idx").on(table.reportId)],
);

export const stripeFulfillments = pgTable(
  "stripe_fulfillments",
  {
    id: uuid("id").primaryKey(),
    stripeEventId: text("stripe_event_id").notNull(),
    stripeSessionId: text("stripe_session_id").notNull(),
    reportId: uuid("report_id").notNull(),
    status: text("status").notNull(),
    mismatch: text("mismatch"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("stripe_fulfillments_event_id_idx").on(table.stripeEventId),
    uniqueIndex("stripe_fulfillments_session_id_idx").on(table.stripeSessionId),
  ],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CustomerReport = typeof customerReports.$inferSelect;
export type NewCustomerReport = typeof customerReports.$inferInsert;
