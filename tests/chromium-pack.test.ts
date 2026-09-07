import assert from "node:assert/strict";
import { test } from "node:test";
import { serverlessChromiumPackUrl } from "../reports/chromium-pack.ts";

test("serverless Chromium pack URL is architecture-specific for v149", () => {
  const previous = process.env.CHROMIUM_PACK_URL;
  delete process.env.CHROMIUM_PACK_URL;
  try {
    assert.equal(
      serverlessChromiumPackUrl("x64"),
      "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar",
    );
    assert.equal(
      serverlessChromiumPackUrl("arm64"),
      "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.arm64.tar",
    );
  } finally {
    if (previous === undefined) delete process.env.CHROMIUM_PACK_URL;
    else process.env.CHROMIUM_PACK_URL = previous;
  }
});
