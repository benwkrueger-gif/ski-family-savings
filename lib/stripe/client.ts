import Stripe from "stripe";
import { env } from "@/lib/env";

let stripe: Stripe | undefined;

export function stripeClient(): Stripe {
  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey());
  }
  return stripe;
}

export function constructStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  if (!signature) throw new Error("Missing Stripe-Signature header");
  return stripeClient().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret());
}
