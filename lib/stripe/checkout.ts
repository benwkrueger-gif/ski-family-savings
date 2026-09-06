export function buildSavingsPlanCheckoutUrl(options: {
  paymentLink: string;
  internalId: string;
  email: string;
}): string {
  const url = new URL(options.paymentLink);
  url.searchParams.set("client_reference_id", options.internalId);
  url.searchParams.set("locked_prefilled_email", options.email);
  return url.toString();
}

export function checkoutUrlContains(url: string, internalId: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("client_reference_id") === internalId;
  } catch {
    return false;
  }
}
