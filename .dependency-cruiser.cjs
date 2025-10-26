// .dependency-cruiser.cjs
const path = require("path");

/** Use absolute paths so depcruise resolves `extends` correctly */
const webTsconfig = path.resolve(__dirname, "apps/web/tsconfig.json");

 /** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "warn", from: {}, to: { circular: true } },
    { name: "no-orphans", severity: "info", from: { orphan: true }, to: {} }
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: webTsconfig }, // 👈 absolute path
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types"]
    },
    doNotFollow: { path: "node_modules" }
  }
};
