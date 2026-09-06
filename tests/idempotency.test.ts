import assert from "node:assert/strict";
import { test } from "node:test";

test("webhook event ids are unique per provider", () => {
  const seen = new Set<string>();
  const claim = (provider: string, eventId: string) => {
    const key = `${provider}:${eventId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  assert.equal(claim("stripe", "evt_1"), true);
  assert.equal(claim("stripe", "evt_1"), false);
  assert.equal(claim("tally", "evt_1"), true);
  assert.equal(claim("stripe", "evt_2"), true);
});

test("paid fulfillment is skipped when a session was already delivered", () => {
  const delivered = new Set<string>(["cs_paid"]);
  const shouldSend = (sessionId: string, alreadyEmailed: boolean) => {
    if (delivered.has(sessionId) || alreadyEmailed) return false;
    delivered.add(sessionId);
    return true;
  };

  assert.equal(shouldSend("cs_paid", false), false);
  assert.equal(shouldSend("cs_new", true), false);
  assert.equal(shouldSend("cs_new2", false), true);
  assert.equal(shouldSend("cs_new2", false), false);
});
