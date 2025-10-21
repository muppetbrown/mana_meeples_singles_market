import fs from "node:fs";
const summaryFile = "./coverage/coverage-final.json";
if (fs.existsSync(summaryFile)) {
  const json = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
  const totals = Object.values(json).reduce(
    (acc, f) => {
      acc.statements.covered += f.s.covered; acc.statements.total += f.s.total;
      acc.branches.covered += f.b.covered; acc.branches.total += f.b.total;
      acc.functions.covered += f.f.covered; acc.functions.total += f.f.total;
      acc.lines.covered += f.l.covered; acc.lines.total += f.l.total;
      return acc;
    },
    { statements: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 }, lines: { covered: 0, total: 0 } }
  );
  function pct({covered,total}) { return total ? ((covered/total)*100).toFixed(1) : "0.0"; }
  console.log(`\nCoverage: S ${pct(totals.statements)}%  B ${pct(totals.branches)}%  F ${pct(totals.functions)}%  L ${pct(totals.lines)}%\n`);
}
