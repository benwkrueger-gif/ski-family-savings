import { env } from "@/lib/env";
import { configuredTallyFormId } from "./payload";
import type { TallyApiQuestion, TallyApiSubmission } from "./payload";

type SubmissionsResponse = {
  page?: number;
  limit?: number;
  hasMore?: boolean;
  questions?: TallyApiQuestion[];
  submissions?: TallyApiSubmission[];
};

export async function listTallySubmissions(options?: {
  formId?: string;
  page?: number;
  limit?: number;
}): Promise<{ questions: TallyApiQuestion[]; submissions: TallyApiSubmission[]; hasMore: boolean }> {
  const formId = options?.formId || configuredTallyFormId();
  if (!formId) throw new Error("TALLY_FORM_ID is not configured");

  const params = new URLSearchParams({
    page: String(options?.page ?? 1),
    limit: String(options?.limit ?? 100),
    filter: "completed",
  });

  const response = await fetch(`https://api.tally.so/forms/${formId}/submissions?${params}`, {
    headers: {
      Authorization: `Bearer ${env.tallyApiKey()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Tally API ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as SubmissionsResponse;
  return {
    questions: data.questions ?? [],
    submissions: data.submissions ?? [],
    hasMore: Boolean(data.hasMore),
  };
}

export async function listAllTallySubmissions(formId?: string): Promise<{
  questions: TallyApiQuestion[];
  submissions: TallyApiSubmission[];
}> {
  const submissions: TallyApiSubmission[] = [];
  let questions: TallyApiQuestion[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await listTallySubmissions({ formId, page, limit: 100 });
    if (result.questions.length) questions = result.questions;
    submissions.push(...result.submissions);
    hasMore = result.hasMore;
    page += 1;
    if (page > 50) break;
  }

  return { questions, submissions };
}
