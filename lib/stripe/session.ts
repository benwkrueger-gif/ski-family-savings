export type StripeSessionLike = {
  id: string;
  payment_status?: string | null;
  status?: string | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
};

export function sessionLooksPaid(session: StripeSessionLike): boolean {
  return session.payment_status === "paid" || session.status === "complete";
}
