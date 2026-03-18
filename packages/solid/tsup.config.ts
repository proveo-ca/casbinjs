import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  esbuildOptions(options) {
    options.jsx = "automatic";
    options.jsxImportSource = "solid-js";
  },
});
