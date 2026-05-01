/**
 * `@ahamie/telemetry` — thin OTel layer for non-Mastra packages.
 *
 * **Critical division of labor (T14):**
 *
 * - Mastra `Observability` owns AI spans (model calls, tool calls, agent
 *   steps, workflow steps). We bridge to it; we do not duplicate it.
 * - This package owns spans for: storage queries, automation runtime, the
 *   connector proxy, identity middleware, eval runs, outcome writes.
 *
 * One pipeline at the exporter — both feed the same OTel SDK so traces
 * stitch end-to-end.
 *
 * v0 ships an in-memory exporter as the default so dev experience needs no
 * extra infra. v1 ships `@ahamie/telemetry-{otlp,langfuse,sentry}` adapters.
 */

import { context, type Span, SpanStatusCode, trace, type Tracer } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  InMemorySpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
  type SpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  exporter?: "memory" | "console" | { custom: SpanExporter };
}

export interface Telemetry {
  tracer(name: string, version?: string): Tracer;
  shutdown(): Promise<void>;
  /** Test-only: pull spans from the in-memory exporter (no-op for other exporters). */
  __spans?(): ReadableSpan[];
}

export const initTelemetry = (config: TelemetryConfig): Telemetry => {
  let memoryExporter: InMemorySpanExporter | null = null;
  let processor: SpanProcessor;

  if (!config.exporter || config.exporter === "memory") {
    memoryExporter = new InMemorySpanExporter();
    processor = new SimpleSpanProcessor(memoryExporter);
  } else if (config.exporter === "console") {
    processor = new BatchSpanProcessor(new ConsoleSpanExporter());
  } else {
    processor = new BatchSpanProcessor(config.exporter.custom);
  }

  const provider = new BasicTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion ?? "0.1.0",
    }),
    spanProcessors: [processor],
  });

  return {
    tracer: (name: string, version?: string) => provider.getTracer(name, version),
    shutdown: () => provider.shutdown(),
    __spans: memoryExporter ? () => memoryExporter!.getFinishedSpans() : undefined,
  };
};

export interface SpanFn<T> {
  (span: Span): Promise<T> | T;
}

/**
 * Wrap an async function in a span. On throw, the span is marked as ERROR
 * and the error is recorded. Used everywhere that wants tracing without
 * inheriting the verbose OTel API surface.
 */
export const withSpan = async <T>(
  tracer: Tracer,
  name: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: SpanFn<T>,
): Promise<T> => {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (v !== undefined) cleaned[k] = v;
  }
  return tracer.startActiveSpan(name, { attributes: cleaned }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
};

export { context, trace, SpanStatusCode };
export type { Span, Tracer, SpanExporter, ReadableSpan };
