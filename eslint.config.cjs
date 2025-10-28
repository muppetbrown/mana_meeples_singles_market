// eslint.config.cjs — ESLint 9 flat config (CJS loader)

const { defineConfig, globalIgnores } = require("eslint/config");
const { fixupConfigRules } = require("@eslint/compat");
const { FlatCompat } = require("@eslint/eslintrc");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");
const js = require("@eslint/js");

// If you use import plugin with TS paths:
const importPlugin = require("eslint-plugin-import");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  // ── Base presets ──────────────────────────────────────────────────────────
  fixupConfigRules(
    compat.extends(
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:react/jsx-runtime",
      "plugin:react-hooks/recommended",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "prettier"
    )
  ),

  // ── TypeScript (type-aware) for app sources only ─────────────────────────
  ...fixupConfigRules(
    compat
      .extends(
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
      )
      .map((cfg) => ({
        ...cfg,
        files: ["apps/{api,web}/**/*.{ts,tsx}"], // <-- scope to apps
      }))
  ),
  {
    files: ["apps/{api,web}/**/*.{ts,tsx}"],
    plugins: { import: importPlugin },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        // IMPORTANT: point the TS parser at the per-app projects we actually use
        project: ["./apps/api/tsconfig.json", "./apps/web/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: "detect" },
      // Teach import plugin about TS project + path aliases
      "import/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["apps/api/tsconfig.json", "apps/web/tsconfig.json"],
        },
        node: { extensions: [".ts", ".tsx", ".js", ".jsx", ".d.ts"] },
      },
    },
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Allow async handlers passed to Express/router without wrapping
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // ── Tests: allow Vitest/Jest-style globals (type-aware still on via above) ─
  {
    files: [
      "apps/api/tests/**/*.{ts,tsx}",
      "apps/web/src/**/*.{test,spec}.{ts,tsx}",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest }, // covers describe/it/expect
    },
  },

  // ── Scripts: TS without type-aware parsing (no project = no parsing errors) ─
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: null, // turn OFF type-aware for scripts to avoid project mismatch
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: { ...globals.node },
    },
    rules: {
      // you can keep basic TS rules here if you like
    },
  },

  // ── Plain JS/JSX (no TS project) ─────────────────────────────────────────
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "detect" } },
    rules: {
      // Keep off unless resolver is fully configured for JS import paths
      "import/no-unresolved": "off",
    },
  },

  // ── Ignores ───────────────────────────────────────────────────────────────
  globalIgnores([
    "**/dist/**",
    "**/build/**",
    "**/docs/**",
    "**/database/**",
    "**/coverage/**",
    "**/repo-report/**",
    "**/*.d.ts",
  ]),
]);
