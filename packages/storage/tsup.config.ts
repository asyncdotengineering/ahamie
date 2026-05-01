import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config.base";

export default defineConfig({
  ...baseConfig,
  entry: [
    "src/index.ts",
    "src/client.ts",
    "src/migrate.ts",
    "src/schema/index.ts",
    "src/test-helpers.ts",
  ],
  // testcontainers pulls native modules (ssh2 / cpu-features) that esbuild
  // cannot bundle; we mark it external so consumers resolve it at runtime.
  external: ["@testcontainers/postgresql", "testcontainers"],
});
