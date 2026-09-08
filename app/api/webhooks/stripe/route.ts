import { log } from "@/lib/logger";
import { constructStripeEvent, stripeClient, stripeEventMatchesSecretMode } from "@/lib/stripe/client";
import { claimWebhookEvent, getReportById, updateReport } from "@/lib/pipeline/store";
import { fulfillPaidPlan, type StripeSessionLike } from "@/lib/pipeline/fulfillment";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (error) {
    log.warn("stripe_webhook_invalid_signature", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Invalid signature", { status: 400 });
  }

  if (!stripeEventMatchesSecretMode(event.livemode)) {
    log.error("stripe_mode_mismatch", {
      eventId: event.id,
      livemode: event.livemode,
    });
    return new Response("Stripe mode mismatch", { status: 400 });
  }

  const claimed = await claimWebhookEvent({
    provider: "stripe",
    eventId: event.id,
    payload: { type: event.type, livemode: event.livemode },
  });
  if (!claimed) {
    log.info("stripe_webhook_duplicate_event", { eventId: event.id, type: event.type });
  }

  log.info("stripe_payment_received", { eventId: event.id, type: event.type, duplicate: !claimed });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const full =
        session.payment_status && session.client_reference_id
          ? session
          : await stripeClient().checkout.sessions.retrieve(session.id);

      const reportId = full.client_reference_id ?? undefined;
      if (reportId && full.payment_status === "paid") {
        const report = await getReportById(reportId);
        if (report) {
          const keepStatus =
            report.status === "PLAN_DELIVERED" ||
            report.status === "PLAN_DELIVERING" ||
            report.status === "PLAN_DELIVERY_FAILED";
          await updateReport(report.id, {
            status: keepStatus ? report.status : "PURCHASED",
            stripeCheckoutSessionId: full.id,
            stripePaymentStatus: full.payment_status,
            stripePaidAt: new Date(),
            purchasedAt: report.purchasedAt ?? new Date(),
          });
        }
      }

      await fulfillPaidPlan({
        stripeEventId: event.id,
        session: {
          id: full.id,
          payment_status: full.payment_status,
          status: full.status,
          client_reference_id: full.client_reference_id,
          customer_email: full.customer_email,
          customer_details: full.customer_details,
        } satisfies StripeSessionLike,
      });
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      log.warn("stripe_async_payment_failed", { sessionId: session.id });
    }
  } catch (error) {
    log.error("stripe_webhook_error", {
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
