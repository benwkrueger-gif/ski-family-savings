import { TALLY_FORM_URL } from "@/lib/config";

export function tallyFormIdFromUrl(url = TALLY_FORM_URL): string | undefined {
  const match = url.match(/tally\.so\/r\/([A-Za-z0-9]+)/);
  return match?.[1];
}

export function configuredTallyFormId(): string {
  return process.env.TALLY_FORM_ID?.trim() || tallyFormIdFromUrl() || "";
}

export type TallyWebhookPayload = {
  eventId?: string;
  eventType?: string;
  createdAt?: string;
  data?: {
    responseId?: string;
    submissionId?: string;
    respondentId?: string;
    formId?: string;
    formName?: string;
    createdAt?: string;
    fields?: TallyWebhookField[];
  };
};

export type TallyWebhookField = {
  key?: string;
  label?: string;
  type?: string;
  value?: unknown;
  options?: Array<{ id: string; text: string }>;
};

export type TallyApiSubmission = {
  id: string;
  formId?: string;
  respondentId?: string;
  isCompleted?: boolean;
  submittedAt?: string;
  responses?: Array<{
    id?: string;
    questionId?: string;
    answer?: unknown;
  }>;
};

export type TallyApiQuestion = {
  id: string;
  type?: string;
  title?: string;
  fields?: Array<{ uuid?: string; title?: string; questionType?: string }>;
};

export type NormalizedTallyField = {
  id: string;
  label: string;
  type?: string;
  value: unknown;
  options?: Array<{ id: string; text: string }>;
};

export function extractSubmissionId(payload: TallyWebhookPayload): string | undefined {
  return payload.data?.submissionId || payload.data?.responseId;
}

export function fieldsFromWebhook(payload: TallyWebhookPayload): NormalizedTallyField[] {
  return (payload.data?.fields ?? []).map((field) => ({
    id: field.key || "",
    label: field.label || "",
    type: field.type,
    value: field.value,
    options: field.options,
  }));
}

export function fieldsFromApi(
  questions: TallyApiQuestion[],
  submission: TallyApiSubmission,
): NormalizedTallyField[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  return (submission.responses ?? []).map((response) => {
    const question = response.questionId ? questionById.get(response.questionId) : undefined;
    return {
      id: response.questionId || response.id || "",
      label: question?.title || "",
      type: question?.type,
      value: response.answer,
    };
  });
}
