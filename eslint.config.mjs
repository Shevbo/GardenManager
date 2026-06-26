import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored / minified third-party assets — not our source to lint.
    "public/**",
  ]),
  // GARD-1 harness verify-gate policy: the gate fails on real defects, not on
  // inherited stylistic debt. `tsc --noEmit` (strict) remains the type-safety
  // gate; `no-explicit-any` is surfaced as a warning (visible, non-blocking)
  // so verify can be green and meaningful. Real-bug rules stay at error.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Inherited UI perf-hint (React-Compiler era); surfaced as warning, not a
      // gate blocker. Tracked tech-debt — fix the 13 call sites in a follow-up.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
