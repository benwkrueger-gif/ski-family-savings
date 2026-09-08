type Attachment = {
  filename: string;
  contentType: string;
  bytes: Buffer;
};

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
}

function base64Url(value: Buffer | string): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64url");
}

export function buildRawEmail(options: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Attachment[];
}): string {
  const mixedBoundary = `sfs_mixed_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
  const altBoundary = `sfs_alt_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
  const headers = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${encodeSubject(options.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
  ];

  const parts = options.html
    ? [
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        "",
        `--${altBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: quoted-printable",
        "",
        toQuotedPrintable(options.text),
        `--${altBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: quoted-printable",
        "",
        toQuotedPrintable(options.html),
        `--${altBoundary}--`,
      ]
    : [
        `--${mixedBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: quoted-printable",
        "",
        toQuotedPrintable(options.text),
      ];

  for (const attachment of options.attachments ?? []) {
    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "",
      attachment.bytes.toString("base64"),
    );
  }

  parts.push(`--${mixedBoundary}--`, "");
  return base64Url(`${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`);
}

function toQuotedPrintable(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      let out = "";
      for (const char of line) {
        const code = char.charCodeAt(0);
        if (char === "=" || code < 32 || code > 126) {
          out += `=${code.toString(16).toUpperCase().padStart(2, "0")}`;
        } else {
          out += char;
        }
      }
      return out;
    })
    .join("\r\n");
}
