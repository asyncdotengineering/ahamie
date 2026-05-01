/**
 * `@ahamie/schema` — Standard-Schema-conformant Zod re-export with branded ID
 * types and common refinements.
 *
 * Why a wrapper at all? Three reasons:
 *
 * 1. **Standard-Schema conformance.** Mastra, ORPC, and Better-Auth all
 *    converge on the Standard-Schema spec. We re-export the spec type so
 *    downstream packages can constrain `T extends StandardSchemaV1` without
 *    pulling Zod in directly.
 * 2. **Branded ID types.** L1 tenant enforcement (T19) requires that an
 *    `OrgId` cannot be silently used where a `RunId` is expected. The
 *    `./brand` subpath holds those.
 * 3. **Project-wide refinements.** `Email`, `Url`, `Slug`, `ConnectorRef` —
 *    used throughout the framework so they live in one place.
 */

export { z } from "zod";
export type { ZodType, ZodObject } from "zod";
export type Infer<T extends { _output: unknown }> = T["_output"];

export type { StandardSchemaV1 } from "@standard-schema/spec";

export * from "./brand";
export * from "./refine";
