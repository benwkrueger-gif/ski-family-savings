export type IdentityFields = {
  internalId: string;
  email: string | null | undefined;
  planReportId?: string | null;
  planCustomerEmail?: string | null;
  stripeClientReferenceId?: string | null;
};

export type IdentityCheck = {
  ok: boolean;
  mismatches: string[];
};

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function assertSameCustomer(fields: IdentityFields): IdentityCheck {
  const mismatches: string[] = [];
  const internalId = fields.internalId?.trim();

  if (!internalId) {
    mismatches.push("missing internal report id");
  }

  if (fields.stripeClientReferenceId && fields.stripeClientReferenceId !== internalId) {
    mismatches.push(
      `stripe client_reference_id ${fields.stripeClientReferenceId} does not match report ${internalId}`,
    );
  }

  if (fields.planReportId && fields.planReportId !== internalId) {
    mismatches.push(`plan report id ${fields.planReportId} does not match report ${internalId}`);
  }

  const reportEmail = normalizeEmail(fields.email);
  const planEmail = normalizeEmail(fields.planCustomerEmail);
  if (planEmail && reportEmail && planEmail !== reportEmail) {
    mismatches.push(`plan email ${planEmail} does not match report email ${reportEmail}`);
  }

  if (fields.planCustomerEmail !== undefined && fields.planCustomerEmail !== null && !planEmail) {
    mismatches.push("plan customer email is empty");
  }

  return { ok: mismatches.length === 0, mismatches };
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeEmail(a);
  const right = normalizeEmail(b);
  return Boolean(left) && left === right;
}
