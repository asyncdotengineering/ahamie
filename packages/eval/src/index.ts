/**
 * `@ahamie/eval` — active eval suites + the software factory loop.
 *
 * `defineSuite({ id, controller, scenarios, hiddenGolden, threshold })` is
 * the user-facing API; `runSuite()` evaluates every scenario, splits the
 * report into the **observable** partition and the **hidden_golden**
 * partition (per T13 — separate object-store prefix; the agent has no
 * write access to the golden bytes), and returns a `SuiteResult`.
 */

import { type Assertion, type MetricResult, evaluate } from "./metrics";
import type { StandardSchemaV1 } from "@ahamie/schema";

export interface Controller<TInput, TOutput> {
  name: string;
  run(args: { input: TInput; signal?: AbortSignal }): Promise<{
    output: TOutput;
    costUsd?: number;
    latencyMs?: number;
    tokensTotal?: number;
    toolCalls?: Array<{ name: string; input: unknown; output: unknown }>;
  }>;
}

export interface Scenario<TInput, TOutput> {
  id: string;
  input: TInput;
  assertions: Array<Assertion<TOutput>>;
}

export interface HiddenGolden {
  /** Object-store paths the suite host knows how to materialize. */
  refs: string[];
  threshold: number;
}

export interface SuiteDefinition<TInput, TOutput> {
  id: string;
  controller: Controller<TInput, TOutput>;
  scenarios: Array<Scenario<TInput, TOutput>>;
  hiddenGolden?: HiddenGolden;
  threshold: number;
  /** Loader for hidden-golden scenarios. Wired by the host (CLI, runner). */
  loadGoldenScenarios?: (refs: string[]) => Promise<Array<Scenario<TInput, TOutput>>>;
}

export const defineSuite = <TInput, TOutput>(
  d: SuiteDefinition<TInput, TOutput>,
): SuiteDefinition<TInput, TOutput> => d;

export interface ScenarioResult {
  id: string;
  partition: "observable" | "hidden_golden";
  passed: boolean;
  score: number;
  results: Array<{ assertion: string; passed: boolean; reason?: string }>;
}

export interface SuiteResult {
  suiteId: string;
  observable: { score: number; passed: boolean; scenarios: ScenarioResult[] };
  hiddenGolden?: { score: number; passed: boolean; scenarios: ScenarioResult[] };
  /** True iff *both* partitions met their threshold (or only observable when no golden). */
  passed: boolean;
}

const runScenario = async <TInput, TOutput>(
  controller: Controller<TInput, TOutput>,
  scenario: Scenario<TInput, TOutput>,
  partition: "observable" | "hidden_golden",
): Promise<ScenarioResult> => {
  const startedAt = Date.now();
  const out = await controller.run({ input: scenario.input });
  const ctx = {
    costUsd: out.costUsd ?? 0,
    latencyMs: out.latencyMs ?? Date.now() - startedAt,
    tokensTotal: out.tokensTotal ?? 0,
    toolCalls: out.toolCalls,
  };
  const results: ScenarioResult["results"] = [];
  let passCount = 0;
  for (const a of scenario.assertions) {
    const r: MetricResult = await evaluate(a, out.output, ctx);
    results.push({ assertion: a.kind, passed: r.passed, ...(r.reason ? { reason: r.reason } : {}) });
    if (r.passed) passCount++;
  }
  const score = scenario.assertions.length === 0 ? 1 : passCount / scenario.assertions.length;
  return { id: scenario.id, partition, passed: score === 1, score, results };
};

export const runSuite = async <TInput, TOutput>(
  suite: SuiteDefinition<TInput, TOutput>,
): Promise<SuiteResult> => {
  const observable = await Promise.all(
    suite.scenarios.map((s) => runScenario(suite.controller, s, "observable")),
  );
  const obsScore = observable.reduce((a, r) => a + r.score, 0) / Math.max(1, observable.length);
  const obsPassed = obsScore >= suite.threshold;

  let hidden: SuiteResult["hiddenGolden"];
  if (suite.hiddenGolden && suite.loadGoldenScenarios) {
    const golden = await suite.loadGoldenScenarios(suite.hiddenGolden.refs);
    const ran = await Promise.all(
      golden.map((s) => runScenario(suite.controller, s, "hidden_golden")),
    );
    const score = ran.reduce((a, r) => a + r.score, 0) / Math.max(1, ran.length);
    hidden = { score, passed: score >= suite.hiddenGolden.threshold, scenarios: ran };
  }

  return {
    suiteId: suite.id,
    observable: { score: obsScore, passed: obsPassed, scenarios: observable },
    hiddenGolden: hidden,
    passed: obsPassed && (hidden ? hidden.passed : true),
  };
};

export type { Assertion, MetricResult, MetricContext } from "./metrics";
export { evaluate } from "./metrics";
export {
  defineSoftwareFactory,
  runSoftwareFactory,
  type SoftwareFactoryDefinition,
  type FactoryIteration,
  type FactoryResult,
} from "./factory";
