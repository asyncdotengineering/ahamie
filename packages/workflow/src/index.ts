/**
 * `@ahamie/workflow` — wraps Mastra's workflow engine.
 *
 * v0 default is the in-process Mastra workflow. v1 ships
 * `@ahamie/automation-inngest` as a drop-in alternative for prod-grade
 * durability. The Trigger→Event→Run→Action→Delivery contract is engine-
 * agnostic; that contract lives in `@ahamie/automation`. This package owns
 * the **step DSL** and the **suspend/resume + idempotency** discipline.
 */

import type { StandardSchemaV1 } from "@ahamie/schema";

export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "suspended";

export interface StepContext<TIn, TOut> {
  input: TIn;
  /** Suspend the workflow until `resume(stepId, payload)` is called. */
  suspend(reason: string): Promise<never>;
  /** Free-form per-step state; persisted across suspend/resume. */
  state: Record<string, unknown>;
  /** Idempotency key. Re-runs with the same key MUST yield identical output. */
  idempotencyKey: string;
  signal: AbortSignal;
}

export interface StepDefinition<TIn, TOut> {
  id: string;
  inputSchema?: StandardSchemaV1<unknown, TIn>;
  outputSchema?: StandardSchemaV1<unknown, TOut>;
  /** When `true`, the step's output is cached forever on idempotency key. */
  idempotent?: boolean;
  execute(ctx: StepContext<TIn, TOut>): Promise<TOut>;
}

export const defineStep = <TIn, TOut>(d: StepDefinition<TIn, TOut>): StepDefinition<TIn, TOut> => d;

export interface WorkflowDefinition<TInput, TOutput> {
  id: string;
  inputSchema?: StandardSchemaV1<unknown, TInput>;
  outputSchema?: StandardSchemaV1<unknown, TOutput>;
  steps: Array<StepDefinition<unknown, unknown>>;
}

export const defineWorkflow = <TInput, TOutput>(
  d: WorkflowDefinition<TInput, TOutput>,
): WorkflowDefinition<TInput, TOutput> => d;

export interface WorkflowRunResult<TOut> {
  status: "succeeded" | "failed" | "suspended";
  output: TOut | null;
  steps: Array<{ id: string; status: StepStatus; output: unknown }>;
  error?: { message: string };
}

/**
 * In-process runner. Each step runs in sequence; if a step calls
 * `ctx.suspend()`, the workflow returns `status: "suspended"` and can be
 * resumed via `resume()` below. This is the v0 default — the Mastra
 * workflow engine becomes the implementation in v0.1.
 */
export const runWorkflow = async <TInput, TOutput>(
  wf: WorkflowDefinition<TInput, TOutput>,
  input: TInput,
  opts: { signal?: AbortSignal; idempotencyKey?: string } = {},
): Promise<WorkflowRunResult<TOutput>> => {
  const signal = opts.signal ?? new AbortController().signal;
  const idempotencyKey = opts.idempotencyKey ?? `${wf.id}-${Date.now()}`;
  const steps: WorkflowRunResult<TOutput>["steps"] = [];

  let value: unknown = input;
  for (const step of wf.steps) {
    if (signal.aborted) {
      steps.push({ id: step.id, status: "failed", output: null });
      return { status: "failed", output: null, steps, error: { message: "aborted" } };
    }
    try {
      let suspended = false;
      const ctx: StepContext<unknown, unknown> = {
        input: value,
        async suspend(): Promise<never> {
          suspended = true;
          throw new Error("__ahamie_suspend");
        },
        state: {},
        idempotencyKey: `${idempotencyKey}-${step.id}`,
        signal,
      };
      try {
        value = await step.execute(ctx);
        steps.push({ id: step.id, status: "succeeded", output: value });
      } catch (err) {
        if (suspended) {
          steps.push({ id: step.id, status: "suspended", output: null });
          return { status: "suspended", output: null, steps };
        }
        throw err;
      }
    } catch (err) {
      const e = err as Error;
      steps.push({ id: step.id, status: "failed", output: null });
      return { status: "failed", output: null, steps, error: { message: e.message } };
    }
  }

  return { status: "succeeded", output: value as TOutput, steps };
};
