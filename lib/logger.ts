type LogFields = Record<string, unknown>;

const SECRET_KEYS = /secret|token|password|authorization|api[_-]?key|refresh/i;

function sanitize(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEYS.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (key === "children" || key === "familyProfile" || key === "rawTally") {
      out[key] = "[omitted]";
      continue;
    }
    out[key] = value;
  }
  return out;
}

function write(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  const payload = {
    level,
    event,
    ts: new Date().toISOString(),
    ...sanitize(fields),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};
