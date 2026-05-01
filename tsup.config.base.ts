import { defineConfig, type Options } from "tsup";

export const baseConfig: Options = {
  format: ["esm"],
  target: "node22",
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  treeshake: true,
  minify: false,
  shims: false,
};

export default defineConfig(baseConfig);
