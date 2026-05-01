import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Storage tests share a Postgres host. Schema isolation handles data
    // separation, but `CREATE EXTENSION IF NOT EXISTS` races inside
    // pg_extension's unique index when two files start migration at once.
    // Single-file mode keeps both bullets in the chamber.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
