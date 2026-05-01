import { z } from "zod";

/** RFC-5321 mailbox-shaped string. Zod 4 uses top-level constructors. */
export const Email = z.email().max(254).describe("Email address");

/** http(s) URL only — we reject mailto:, file:, etc. */
export const Url = z
  .url()
  .refine((u) => /^https?:\/\//.test(u), { message: "must be http or https URL" })
  .describe("HTTP or HTTPS URL");

/** kebab-case slug, 1-64 chars, used for automation/agent/connector ids. */
export const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: "slug must be kebab-case, start with a letter, end alphanumeric",
  })
  .describe("kebab-case slug");

/** Reference into the connector registry. Format: `<provider>:<scope>` (e.g. `slack:#engineering`). */
export const ConnectorRef = z
  .string()
  .regex(/^[a-z][a-z0-9-]*:[\w#@./-]+$/, {
    message: "connector ref must be `provider:scope` (e.g. `slack:#engineering`)",
  })
  .describe("ConnectorRef");

/** Money amount in USD with 4-decimal precision (used for budget caps). */
export const UsdAmount = z.number().nonnegative().multipleOf(0.0001);

/** Cron expression in 5-field format. We only validate cardinality here; croner does the rest at runtime. */
export const CronExpr = z
  .string()
  .regex(/^(\S+\s+){4}\S+$/, { message: "cron must have 5 space-separated fields" });

/** ISO 8601 timestamp with timezone. */
export const Iso8601 = z.string().datetime({ offset: true });

/** SHA-256 hex (lowercase, 64 chars) — used for CAS object ids. */
export const Sha256Hex = z
  .string()
  .regex(/^[a-f0-9]{64}$/, { message: "must be lowercase hex sha256" });
