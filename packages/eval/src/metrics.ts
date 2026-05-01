/**
 * The 8 built-in metrics, per W6 deliverable.
 *
 *   exactMatch, regex, jsonSchemaValid, toolCallContains,
 *   costUnder, latencyUnder, tokensUnder, customJudge
 *
 * Each metric is a `(scenario, output, context) => Promise<MetricResult>`
 * function. Adapter ecosystem (`@ahamie/eval-promptfoo`,
 * `@ahamie/eval-inspect-ai`, …) ships at v1.
 */

import type { StandardSchemaV1 } from "@ahamie/schema";

export interface MetricResult {
  passed: boolean;
  /** Score in [0, 1]; binary metrics report 0/1. */
  score: number;
  reason?: string;
}

export interface MetricContext {
  costUsd: number;
  latencyMs: number;
  tokensTotal: number;
  /** Tool calls observed in this scenario, in order. */
  toolCalls?: Array<{ name: string; input: unknown; output: unknown }>;
}

export type MetricFn<TOutput> = (
  output: TOutput,
  ctx: MetricContext,
) => Promise<MetricResult> | MetricResult;

export type Assertion<TOutput> =
  | { kind: "exactMatch"; expected: TOutput }
  | { kind: "regex"; pattern: string }
  | { kind: "jsonSchemaValid"; schema?: StandardSchemaV1<unknown, unknown> }
  | { kind: "toolCallContains"; tool: string }
  | { kind: "costUnder"; usd: number }
  | { kind: "latencyUnder"; ms: number }
  | { kind: "tokensUnder"; tokens: number }
  | {
      kind: "customJudge";
      rubric: (output: TOutput, ctx: MetricContext) => Promise<MetricResult> | MetricResult;
    };

const ok = (reason?: string): MetricResult => ({ passed: true, score: 1, ...(reason ? { reason } : {}) });
const fail = (reason: string): MetricResult => ({ passed: false, score: 0, reason });

export const evaluate = async <T>(
  assertion: Assertion<T>,
  output: T,
  ctx: MetricContext,
): Promise<MetricResult> => {
  switch (assertion.kind) {
    case "exactMatch":
      return JSON.stringify(output) === JSON.stringify(assertion.expected)
        ? ok()
        : fail(`expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(output)}`);
    case "regex": {
      const re = new RegExp(assertion.pattern);
      const text = typeof output === "string" ? output : JSON.stringify(output);
      return re.test(text) ? ok() : fail(`regex /${assertion.pattern}/ did not match`);
    }
    case "jsonSchemaValid": {
      if (!assertion.schema) {
        // Without a schema, "valid" means JSON-serializable.
        try {
          JSON.parse(JSON.stringify(output));
          return ok();
        } catch (e) {
          return fail(`not JSON-serializable: ${(e as Error).message}`);
        }
      }
      const r = await assertion.schema["~standard"].validate(output);
      return "value" in r ? ok() : fail(`schema mismatch: ${JSON.stringify(r.issues)}`);
    }
    case "toolCallContains": {
      const found = ctx.toolCalls?.some((c) => c.name === assertion.tool);
      return found ? ok() : fail(`tool '${assertion.tool}' not called`);
    }
    case "costUnder":
      return ctx.costUsd <= assertion.usd
        ? ok(`cost $${ctx.costUsd}`)
        : fail(`cost $${ctx.costUsd} > $${assertion.usd}`);
    case "latencyUnder":
      return ctx.latencyMs <= assertion.ms
        ? ok(`${ctx.latencyMs}ms`)
        : fail(`${ctx.latencyMs}ms > ${assertion.ms}ms`);
    case "tokensUnder":
      return ctx.tokensTotal <= assertion.tokens
        ? ok(`${ctx.tokensTotal} tokens`)
        : fail(`${ctx.tokensTotal} > ${assertion.tokens}`);
    case "customJudge":
      return assertion.rubric(output, ctx);
  }
};
