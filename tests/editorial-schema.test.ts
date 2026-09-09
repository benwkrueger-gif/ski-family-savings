import assert from "node:assert/strict";
import { test } from "node:test";
import { zodTextFormat } from "openai/helpers/zod";
import {
  assertOpenAiStrictObjectSchema,
  editorialStructuredOutputFormat,
  EditorialModelSchema,
  ReportWritingSchema,
} from "../lib/copy/writing-schema.ts";

test("editorial model schema is accepted by the installed Structured Outputs helper", () => {
  const format = editorialStructuredOutputFormat();
  assert.equal(format.type, "json_schema");
  assert.equal(format.strict, true);
  assert.equal(format.name, "ski_family_editorial");
  const issues = assertOpenAiStrictObjectSchema(format.schema);
  assert.deepEqual(issues, []);
  const schema = JSON.stringify(format.schema);
  assert.doesNotMatch(schema, /scanContract/);
});

test("stored scanContract stamp is not a model-facing Structured Outputs field", () => {
  assert.throws(
    () => zodTextFormat(ReportWritingSchema, "ski_family_editorial"),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return (
        message.includes("properties/scanContract") &&
        message.includes(".optional()") &&
        message.includes(".nullable()")
      );
    },
  );
  assert.doesNotThrow(() => zodTextFormat(EditorialModelSchema, "ski_family_editorial"));
});
