/**
 * Drizzle client factory. We use postgres-js as the driver (per T5).
 * The factory is `createDb(url, schema)` rather than a singleton so multiple
 * tests can run against ephemeral Postgres instances in parallel.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

export type AhamieDb = PostgresJsDatabase<typeof schema> & { $client: Sql };

export interface CreateDbOptions {
  /** Postgres connection string. */
  url: string;
  /** Pool size; default 10 for prod, 1 for tests. */
  max?: number;
  /** Optional `application_name` for slow-query tracing. */
  appName?: string;
  /** When true, all SQL is logged to stderr. Off by default. */
  log?: boolean;
}

export const createDb = (opts: CreateDbOptions): AhamieDb => {
  const sql = postgres(opts.url, {
    max: opts.max ?? 10,
    prepare: true,
    connection: { application_name: opts.appName ?? "ahamie" },
    onnotice: () => {},
  });
  const db = drizzle(sql, { schema, logger: opts.log ?? false });
  return Object.assign(db, { $client: sql }) as AhamieDb;
};

export const closeDb = async (db: AhamieDb): Promise<void> => {
  await db.$client.end({ timeout: 5 });
};

export type { schema };
