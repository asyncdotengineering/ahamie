/**
 * `@ahamie/storage` — the spine.
 *
 * Re-exports:
 *   - `createDb`, `closeDb`, `AhamieDb` from `./client`
 *   - `migrate` from `./migrate`
 *   - every Drizzle table from `./schema`
 *
 * Consumers also reach for `./schema` directly when they only need the
 * table shapes (e.g. for the docs site).
 */

export { createDb, closeDb, type AhamieDb, type CreateDbOptions } from "./client";
export { migrate, type MigrateOptions, type MigrationApplied } from "./migrate";
export * from "./schema";
