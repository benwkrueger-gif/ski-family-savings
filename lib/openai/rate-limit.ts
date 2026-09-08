export const RESEARCH_RATE_LIMIT_MAX_RETRIES = 2;
export const RESEARCH_RATE_LIMIT_MAX_WAIT_MS = 30_000;

export type TpmRateLimit = {
  limit: number | null;
  used: number | null;
  requested: number | null;
  retryAfterSeconds: number | null;
};

export type RateLimitRetryDecision =
  | { action: "fail_oversized"; reason: string }
  | { action: "fail"; reason: string }
  | { action: "wait"; ms: number };

function headerValue(headers: Headers | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
}

function parseRetryAfterSeconds(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const seconds = Number.parseFloat(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, (date - Date.now()) / 1000);
}

export function parseTpmRateLimit(error: {
  message?: string;
  headers?: Headers;
}): TpmRateLimit {
  const message = error.message ?? "";
  const limit = message.match(/\bLimit\s+(\d+)/i)?.[1];
  const used = message.match(/\bUsed\s+(\d+)/i)?.[1];
  const requested = message.match(/\bRequested\s+(\d+)/i)?.[1];
  const retryFromMessage = message.match(/try again in\s+([\d.]+)\s*s/i)?.[1];
  const retryAfter =
    parseRetryAfterSeconds(headerValue(error.headers, "retry-after")) ??
    (retryFromMessage ? Number.parseFloat(retryFromMessage) : null);
  return {
    limit: limit ? Number.parseInt(limit, 10) : headerValue(error.headers, "x-ratelimit-limit-tokens")
      ? Number.parseInt(headerValue(error.headers, "x-ratelimit-limit-tokens")!, 10)
      : null,
    used: used ? Number.parseInt(used, 10) : null,
    requested: requested ? Number.parseInt(requested, 10) : null,
    retryAfterSeconds: retryAfter != null && Number.isFinite(retryAfter) ? retryAfter : null,
  };
}

export function decideRateLimitRetry(input: {
  attempt: number;
  maxRetries?: number;
  limit?: number | null;
  used?: number | null;
  requested?: number | null;
  retryAfterSeconds?: number | null;
}): RateLimitRetryDecision {
  const maxRetries = input.maxRetries ?? RESEARCH_RATE_LIMIT_MAX_RETRIES;
  if (
    input.requested != null &&
    input.limit != null &&
    input.requested > input.limit
  ) {
    return {
      action: "fail_oversized",
      reason: `request reserved ${input.requested} tokens against a ${input.limit} TPM limit`,
    };
  }
  if (input.attempt >= maxRetries) {
    return { action: "fail", reason: "rate limit retries exhausted" };
  }
  const backoffMs = Math.min(
    RESEARCH_RATE_LIMIT_MAX_WAIT_MS,
    1000 * 2 ** input.attempt,
  );
  const retryAfterMs =
    input.retryAfterSeconds != null ? Math.ceil(input.retryAfterSeconds * 1000) : 0;
  const ms = Math.min(RESEARCH_RATE_LIMIT_MAX_WAIT_MS, Math.max(backoffMs, retryAfterMs, 1000));
  return { action: "wait", ms };
}

export function estimatedTpmReservation(options: {
  inputChars: number;
  maxOutputTokens: number;
}): number {
  const inputTokens = Math.ceil(options.inputChars / 4);
  return Math.max(options.maxOutputTokens, inputTokens);
}
