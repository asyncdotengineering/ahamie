/**
 * Migration runner. Discovers `.sql` files under `drizzle/`, applies in
 * lexical order, records each in `__ahamie_migrations`. Idempotent: replay
 * is a no-op (verified by `migration replay idempotent` test, exit criterion
 * for W1).
 *
 * We deliberately do not use `drizzle-kit`'s built-in migrator at v0
 * because we want bundle-safe execution: the migrations directory ships
 * inside the package tarball, and the runner looks beside its compiled
 * file (`__dirname` resolved at runtime).
 */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { AhamieDb } from "./client";

export interface MigrationApplied {
  id: string;
  hash: string;
  appliedNow: boolean;
}

export interface MigrateOptions {
  /** Override the directory of `.sql` files. Defaults to `<pkg>/drizzle`. */
  dir?: string;
  /** Optional logger. */
  log?: (msg: string) => void;
}

const here = (): string => {
  // ESM-safe: works in tsup output.
  const url = (import.meta as ImportMeta).url;
  return dirname(fileURLToPath(url));
};

const defaultDir = (): string => resolve(here(), "..", "drizzle");

export const migrate = async (
  db: AhamieDb,
  opts: MigrateOptions = {},
): Promise<MigrationApplied[]> => {
  const dir = opts.dir ?? defaultDir();
  const log = opts.log ?? (() => {});

  // Bootstrap the journal table if the very first migration hasn't run yet.
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS "__ahamie_migrations" (
      "id" text PRIMARY KEY NOT NULL,
      "hash" text,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    )`,
  );
  // Backfill column for older deploys.
  await db.execute(
    sql`ALTER TABLE "__ahamie_migrations" ADD COLUMN IF NOT EXISTS "hash" text`,
  );

  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (
      (await db.execute(sql`SELECT "id" FROM "__ahamie_migrations"`)) as unknown as Array<{
        id: string;
      }>
    ).map((r) => r.id),
  );

  const result: MigrationApplied[] = [];
  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    const body = await readFile(join(dir, file), "utf8");
    const hash = createHash("sha256").update(body).digest("hex");

    if (applied.has(id)) {
      log(`migrate: ${id} already applied`);
      result.push({ id, hash, appliedNow: false });
      continue;
    }

    log(`migrate: applying ${id}`);
    await db.execute(sql.raw(body));
    await db.execute(
      sql`INSERT INTO "__ahamie_migrations" ("id", "hash") VALUES (${id}, ${hash})
          ON CONFLICT ("id") DO NOTHING`,
    );
    result.push({ id, hash, appliedNow: true });
  }
  return result;
};
