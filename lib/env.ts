function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function appUrl(): string {
  return (
    optional("NEXT_PUBLIC_APP_URL") ||
    optional("APP_URL") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function googleSenderEmail(): string {
  return optional("GOOGLE_SENDER_EMAIL") ?? "ben@skifamilysavings.com";
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  adminPassword: () => required("ADMIN_PASSWORD"),
  adminSessionSecret: () => required("ADMIN_SESSION_SECRET"),

  tallyApiKey: () => required("TALLY_API_KEY"),
  tallyFormId: () => optional("TALLY_FORM_ID"),
  tallyWebhookSecret: () => required("TALLY_WEBHOOK_SECRET"),

  openaiApiKey: () => required("OPENAI_API_KEY"),
  openaiWebhookSecret: () => required("OPENAI_WEBHOOK_SECRET"),
  openaiResearchModel: () => optional("OPENAI_RESEARCH_MODEL") ?? "gpt-5.6-sol",

  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),
  googleRefreshToken: () => optional("GOOGLE_REFRESH_TOKEN"),
  googleReportsRootFolderId: () => optional("GOOGLE_REPORTS_ROOT_FOLDER_ID"),

  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  stripePaymentLink: () => required("STRIPE_SAVINGS_PLAN_PAYMENT_LINK"),
};
