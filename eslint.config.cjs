// eslint.config.cjs — ESLint 9 flat config (CJS loader)

const { defineConfig, globalIgnores } = require("eslint/config");
const { fixupConfigRules } = require("@eslint/compat");
const { FlatCompat } = require("@eslint/eslintrc");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([
  // ── Base presets (apply to all files) ──────────────────────────────────────
  fixupConfigRules(
    compat.extends(
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:react/jsx-runtime",          // modern JSX (no React in scope)
      "plugin:react-hooks/recommended",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "prettier"
    )
  ),

  // ── TypeScript (including type-aware rules) — ONLY for ts/tsx ─────────────
  ...fixupConfigRules(
    compat
      .extends(
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
      )
      .map((cfg) => ({
        // scope those extends to TS files only
        ...cfg,
        files: ["**/*.{ts,tsx}"]
      }))
  ),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname
      },
      globals: { ...globals.browser, ...globals.node }
    },
    settings: {
      react: { version: "detect" }
      // If you use TS path aliases, also install:
      // pnpm add -D eslint-import-resolver-typescript
      // and then uncomment:
      // 'import/resolver': { typescript: { project: ['./tsconfig.json'] } }
    },
    rules: {
      // Reasonable TS tweaks
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }]
    }
  },

  // ── JavaScript / JSX (no TS parser; no type-aware TS rules) ───────────────
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: { ...globals.browser, ...globals.node }
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      // Keep this off unless you configure the resolver for Node/TS paths
      "import/no-unresolved": "off"
    }
  },

  // ── Ignores ───────────────────────────────────────────────────────────────
  globalIgnores([
    "**/dist/**",
    "**/build/**",
    "**/docs/**",
    "**/database/**",
    "**/coverage/**",
    "**/repo-report/**",
    "**/*.d.ts"
    // If you want to exclude this config file entirely, uncomment:
    // ".dependency-cruiser.cjs"
  ])
]);
