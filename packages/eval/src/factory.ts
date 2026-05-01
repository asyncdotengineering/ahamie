/**
 * Software-factory outer loop (RFC §13.4 + §8.10).
 *
 * `defineSoftwareFactory({spec, agent, suite, threshold})`:
 *   1. Run the suite against the controller (agent).
 *   2. If hidden-golden score >= threshold → success, exit.
 *   3. Otherwise: prompt the agent to revise; re-run; repeat up to maxIterations.
 *   4. Each iteration's spec mutation goes onto a tabu list — the loop
 *      cannot retry an identical revision twice (PAC discipline).
 */

import type { Controller, SuiteDefinition, SuiteResult } from "./index";
import { runSuite } from "./index";

export interface SoftwareFactoryDefinition<TInput, TOutput> {
  spec: { id: string; description: string };
  agent: Controller<TInput, TOutput>;
  /** Suite to gate on. */
  suite: SuiteDefinition<TInput, TOutput>;
  /** PAC threshold the loop must hit. */
  threshold: number;
  /** Hard cap on revisions. */
  maxIterations?: number;
  /** Spec-mutation callback — produces a new revision string given the failing report. */
  reviseSpec?: (
    currentSpec: { id: string; description: string },
    failingReport: SuiteResult,
  ) => Promise<{ id: string; description: string }>;
}

export const defineSoftwareFactory = <TInput, TOutput>(
  d: SoftwareFactoryDefinition<TInput, TOutput>,
): SoftwareFactoryDefinition<TInput, TOutput> => d;

export interface FactoryIteration {
  iteration: number;
  specHash: string;
  result: SuiteResult;
  revised: boolean;
}

export interface FactoryResult {
  outcome: "succeeded" | "failed" | "abandoned";
  iterations: FactoryIteration[];
  bestScore: number;
}

const hashSpec = async (spec: { description: string }): Promise<string> => {
  const buf = new TextEncoder().encode(spec.description);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const runSoftwareFactory = async <TInput, TOutput>(
  factory: SoftwareFactoryDefinition<TInput, TOutput>,
): Promise<FactoryResult> => {
  const max = factory.maxIterations ?? 5;
  const tabu = new Set<string>();
  const iterations: FactoryIteration[] = [];
  let spec = factory.spec;
  let best = 0;
  let outcome: FactoryResult["outcome"] = "failed";

  for (let i = 0; i < max; i++) {
    const specHash = await hashSpec(spec);
    if (tabu.has(specHash)) {
      outcome = "abandoned";
      break;
    }
    tabu.add(specHash);

    const result = await runSuite(factory.suite);
    const score = result.hiddenGolden?.score ?? result.observable.score;
    best = Math.max(best, score);

    iterations.push({ iteration: i, specHash, result, revised: false });

    if (score >= factory.threshold) {
      outcome = "succeeded";
      break;
    }

    if (!factory.reviseSpec) {
      outcome = "failed";
      break;
    }
    spec = await factory.reviseSpec(spec, result);
    iterations[iterations.length - 1]!.revised = true;
  }

  return { outcome, iterations, bestScore: best };
};
