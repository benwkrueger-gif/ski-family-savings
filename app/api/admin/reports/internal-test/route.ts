import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDb } from "@/lib/db";
import { customerReports } from "@/lib/db/schema";
import { addPipelineLog } from "@/lib/db/settings";
import { ensureCustomerFolder, upsertDrivePdf } from "@/lib/google/drive";
import { env, googleSenderEmail } from "@/lib/env";
import { buildSavingsPlanCheckoutUrl } from "@/lib/stripe/checkout";

export const runtime = "nodejs";
export const maxDuration = 60;

const FIRST_NAME = "INTERNAL-TEST";
const FILENAME = "INTERNAL TEST - Savings Plan - Ben.pdf";

function syntheticPlanPdf(): Buffer {
  const stream = Buffer.from(
    [
      "BT /F1 20 Tf 72 720 Td (INTERNAL TEST) Tj ET",
      "BT /F1 14 Tf 72 690 Td (NOT A CUSTOMER REPORT) Tj ET",
      "BT /F1 12 Tf 72 660 Td (Synthetic Ski Family Savings Plan PDF) Tj ET",
      "BT /F1 12 Tf 72 640 Td (Paid-fulfillment live verification fixture) Tj ET",
      "BT /F1 12 Tf 72 610 Td (Do not send this file to a real customer.) Tj ET",
    ].join("\n") + "\n",
  );
  const objs = [
    Buffer.from("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"),
    Buffer.from("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"),
    Buffer.from(
      "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>endobj\n",
    ),
    Buffer.concat([
      Buffer.from(`4 0 obj<< /Length ${stream.length} >>stream\n`),
      stream,
      Buffer.from("endstream\nendobj\n"),
    ]),
    Buffer.from("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n"),
  ];
  const header = Buffer.from("%PDF-1.4\n");
  const offsets = [0];
  let body = header;
  for (const obj of objs) {
    offsets.push(body.length);
    body = Buffer.concat([body, obj]);
  }
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF\n`;
  return Buffer.concat([body, Buffer.from(xref)]);
}

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const email = googleSenderEmail();
  const reportId = randomUUID();
  const tallySubmissionId = `internal-paid-test-${reportId.slice(0, 8)}`;
  const folderId = await ensureCustomerFolder({
    submittedAt: new Date(),
    firstName: FIRST_NAME,
    email,
    internalId: reportId,
  });
  const drivePlanFileId = await upsertDrivePdf({
    folderId,
    filename: FILENAME,
    bytes: syntheticPlanPdf(),
  });
  const checkoutUrl = buildSavingsPlanCheckoutUrl({
    paymentLink: env.stripePaymentLink(),
    internalId: reportId,
    email,
  });

  const db = getDb();
  await db.insert(customerReports).values({
    id: reportId,
    tallySubmissionId,
    rawTallyJson: { internalTest: true, purpose: "paid-fulfillment-live-verification" },
    familyProfile: {
      internalId: reportId,
      tallySubmissionId,
      firstName: FIRST_NAME,
      email,
      homeZip: null,
      adultsCount: 1,
      children: [],
      skiingStyle: null,
      typicalSkiDays: null,
      likelyDestinations: ["INTERNAL TEST"],
      passesAndMemberships: [],
      requestedSavingsCategories: [],
      weekdayFlexibility: null,
      affiliations: [],
      expectedSpend: null,
      alreadyKnownSavings: null,
      additionalNotes: "INTERNAL TEST fixture. Not a customer.",
    },
    firstName: FIRST_NAME,
    email,
    familySummary: "INTERNAL TEST · paid fulfillment live verification",
    status: "PDFS_READY",
    offerMode: "SCAN_UPSELL",
    offerModeReason: "internal test fixture; excluded from conversion counts",
    driveFolderId: folderId,
    drivePlanFileId,
    planFilename: FILENAME,
    stripeClientReferenceId: reportId,
    stripeCheckoutUrl: checkoutUrl,
    autoResearch: false,
    source: "internal-test",
  });
  await addPipelineLog(reportId, "RECEIVED", "Internal paid-fulfillment live test fixture created");

  return NextResponse.json({
    ok: true,
    reportId,
    email,
    planFilename: FILENAME,
    checkoutUrl,
  });
}
