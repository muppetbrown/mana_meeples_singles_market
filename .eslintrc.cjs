module.exports = {
root: true,
extends: [
"eslint:recommended",
"plugin:react/recommended",
"plugin:react-hooks/recommended",
"plugin:import/recommended",
"plugin:import/typescript",
"prettier"
],
parser: "@typescript-eslint/parser",
plugins: ["@typescript-eslint"],
settings: { react: { version: "detect" } },
env: { browser: true, node: true, es2022: true },
rules: {
"react/prop-types": "off",
"import/no-unresolved": "off" // handled by TS path mapping
},
ignorePatterns: ["**/dist", "**/*.d.ts"]
};