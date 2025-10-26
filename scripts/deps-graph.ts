#!/usr/bin/env tsx
/**
 * scripts/deps-graph.ts
 * -------------------------------------------------------------
 * Builds a dependency/connectivity graph between source files by
 * analyzing TypeScript/TSX imports and exports. Respects .gitignore.
 *
 * Outputs: dot | mermaid | json | csv (edge list)
 *
 * Examples (pnpm):
 *   pnpm tsx scripts/deps-graph.ts --dir ./ --format mermaid > graph.mmd
 *   pnpm tsx scripts/deps-graph.ts --dir ./ --format dot > graph.dot
 *   pnpm tsx scripts/deps-graph.ts --dir ./ --format json > graph.json
 *   pnpm tsx scripts/deps-graph.ts --dir ./ --format csv > graph.csv
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import ts from 'typescript';

type Format = 'dot' | 'mermaid' | 'json' | 'csv' | 'report';

interface Options {
  dir: string;
  ext: string[];
  ignore: string[];
  format: Format;
  out?: string;
  absolute: boolean;
  project?: string; // optional explicit tsconfig path
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    dir: '.',
    ext: ['ts', 'tsx'],
    ignore: ['**/tests/**','**/node_modules/**', '**/dist/**', '**/docs/**', '**/scripts/**', '**/coverage/**'],
    format: 'mermaid',
    absolute: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--dir' && n) { opts.dir = n; i++; continue; }
    if (a === '--ext' && n) { opts.ext = n.split(',').map(s => s.trim().replace(/^\./, '')); i++; continue; }
    if (a === '--ignore' && n) { opts.ignore = n.split(',').map(s => s.trim()); i++; continue; }
    if (a === '--format' && n) { opts.format = (n as Format); i++; continue; }
    if (a === '--out' && n) { opts.out = n; i++; continue; }
    if (a === '--absolute') { opts.absolute = true; continue; }
    if (a === '--project' && n) { opts.project = n; i++; continue; }
    if (a === '--help' || a === '-h') { printHelpAndExit(); }
  }
  return opts;
}

function printHelpAndExit(): never {
  console.log(`\nDependency Graph Builder (TS/TSX)\n` +
    `Usage: tsx scripts/deps-graph.ts [options]\n\n` +
    `Options:\n` +
    `  --dir <path>        Root directory (default: .)\n` +
    `  --ext <a,b>         Extensions to include (default: ts,tsx)\n` +
    `  --ignore <globs>    Extra globs to ignore (comma-separated)\n` +
    `  --format <fmt>      dot | mermaid | json | csv (default: mermaid)\n` +
    `  --out <file>        Write to file (default: stdout)\n` +
    `  --absolute          Use absolute file paths in nodes
` +
    `  --project <path>    Path to a tsconfig.json to force (monorepo-safe)
` +
    `  -h, --help          Show help
`);
  process.exit(0);
}

// -----------------------------
// TS config / module resolution
// -----------------------------

interface TsEnv {
  compilerOptions: ts.CompilerOptions;
  configDir: string;
}

// Cache nearest tsconfig per directory for monorepos
const tsEnvCache = new Map<string, TsEnv>();

function findNearestTsconfig(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (ts.sys.fileExists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadTsEnvForFile(file: string, forcedProject?: string): TsEnv {
  const basedir = path.dirname(file);
  if (forcedProject) {
    const abs = path.isAbsolute(forcedProject) ? forcedProject : path.resolve(process.cwd(), forcedProject);
    const cfg = ts.readConfigFile(abs, ts.sys.readFile);
    const parsed = cfg.error ? { options: {} as ts.CompilerOptions } : ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(abs));
    return { compilerOptions: parsed.options ?? {}, configDir: path.dirname(abs) };
  }
  // use cache by nearest folder with tsconfig
  const key = basedir;
  if (tsEnvCache.has(key)) return tsEnvCache.get(key)!;
  const configPath = findNearestTsconfig(basedir);
  if (!configPath) {
    const env = { compilerOptions: {}, configDir: basedir };
    tsEnvCache.set(key, env);
    return env;
  }
  const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = cfg.error ? { options: {} as ts.CompilerOptions } : ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(configPath));
  const env = { compilerOptions: parsed.options ?? {}, configDir: path.dirname(configPath) };
  tsEnvCache.set(key, env);
  return env;
}

function loadTsEnv(cwd: string): TsEnv {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    return { compilerOptions: {}, configDir: cwd };
  }
  const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
  if (cfg.error) {
    return { compilerOptions: {}, configDir: path.dirname(configPath) };
  }
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(configPath));
  return { compilerOptions: parsed.options ?? {}, configDir: path.dirname(configPath) };
}

function resolveModule(spec: string, containingFile: string, env: TsEnv): string | null {
  // Try path mapping aware resolution
  const res = ts.resolveModuleName(spec, containingFile, env.compilerOptions, ts.sys);
  if (res?.resolvedModule) {
    const resolved = res.resolvedModule.resolvedFileName;
    if (resolved.includes('node_modules') || resolved.endsWith('.d.ts')) return null;
    return path.normalize(resolved);
  }
  // Fallback: attempt to resolve relative to containing file
  if (spec.startsWith('.')) {
    const tryExts = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
    for (const suffix of tryExts) {
      const p = path.normalize(path.resolve(path.dirname(containingFile), spec + suffix));
      if (ts.sys.fileExists(p)) return p;
    }
  }
  return null;
}

// -----------------------------
// Parse helpers (robust against TS changes)
// -----------------------------

function identText(id: ts.Node | undefined): string {
  if (!id) return '';
  if (ts.isIdentifier(id)) return String(id.escapedText);
  if (ts.isStringLiteralLike(id)) return id.text;
  try { return (id as any).getText?.() ?? ''; } catch { return ''; }
}

function hasExportModifier(node: ts.Node): boolean {
  const mods = (node as ts.HasModifiers).modifiers;
  return Array.isArray(mods) && mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
}

// -----------------------------
// Parse source files
// -----------------------------

type Edge = { source: string; target: string; names: string[] };
interface NodeInfo { id: string; exports: Set<string>; }

// For usage reporting of aggregator indexes
type Usage = { symbol: string; importer: string };
interface AggregatorReport { file: string; exported: string[]; used: Usage[]; unused: string[]; }

function collectFromSource(sourceFile: ts.SourceFile, env: TsEnv): { edges: Edge[]; exports: Set<string> } {
  const edges: Edge[] = [];
  const exports = new Set<string>();
  const here = path.normalize(sourceFile.fileName);

  const addEdge = (targetSpec: string, names: string[]) => {
    const target = resolveModule(targetSpec, here, env);
    if (!target) return;
    edges.push({ source: here, target, names });
  };

  function visit(node: ts.Node) {
    // import ... from 'x'
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const names: string[] = [];
      const ic = node.importClause;
      if (ic) {
        if (ic.name) names.push('default');
        if (ic.namedBindings) {
          if (ts.isNamedImports(ic.namedBindings)) {
            for (const el of ic.namedBindings.elements) {
              names.push(identText(el.propertyName) || identText(el.name));
            }
          } else if (ts.isNamespaceImport(ic.namedBindings)) {
            names.push('*');
          }
        }
      }
      addEdge(node.moduleSpecifier.text, names);
    }

    // export { .. } from 'x' | export * as ns from 'x' | export * from 'x'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const names: string[] = [];
      const ec = node.exportClause;
      if (ec) {
        if (ts.isNamedExports(ec)) {
          for (const el of ec.elements) {
            names.push(identText(el.propertyName) || identText(el.name));
          }
        } else if ('name' in ec) { // NamespaceExport
          names.push(identText((ec as any).name));
        }
      } else {
        names.push('*');
      }
      addEdge(node.moduleSpecifier.text, names);
    }

    // Dynamic import("x")
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteralLike(arg)) addEdge(arg.text, ['*']);
    }

    // require('x')
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteralLike(arg)) addEdge(arg.text, ['*']);
    }

    // Local exported names
    if (hasExportModifier(node)) {
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        const name = identText((node as ts.DeclarationStatement).name) || '(anonymous)';
        exports.add(name);
      }
      if (ts.isVariableStatement(node)) {
        for (const d of node.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) exports.add(identText(d.name));
        }
      }
    }

    if (ts.isExportAssignment(node)) exports.add('default');
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) exports.add(identText(el.name));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { edges, exports };
}

// -----------------------------
// Graph building with re-export tracing
// -----------------------------

type ReExport = { from: string; names: string[] };
interface ModuleMeta extends NodeInfo { reexports: ReExport[]; imports: Map<string, string[]>; }

interface Graph { nodes: Map<string, ModuleMeta>; edges: Edge[]; }

function buildGraph(files: string[], envDefault: TsEnv, forcedProject?: string): { graph: Graph; reports: AggregatorReport[] } {
  const nodes = new Map<string, ModuleMeta>();
  const edges: Edge[] = [];
  const reports: AggregatorReport[] = [];

  // Build program using all files with default env (only for AST parse); module resolution will use per-file envs
  const program = ts.createProgram({ rootNames: files, options: envDefault.compilerOptions });

  for (const sf of program.getSourceFiles()) {
    if (!files.includes(sf.fileName)) continue; // skip lib files
    const env = loadTsEnvForFile(sf.fileName, forcedProject);
    const { edges: e, exports } = collectFromSource(sf, env);
    const id = path.normalize(sf.fileName);

    // Collect re-exports + imports again with env for accurate module names
    const reexports: ReExport[] = [];
    const imports = new Map<string, string[]>();
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        const mod = node.moduleSpecifier.text;
        const names: string[] = [];
        const ic = node.importClause;
        if (ic) {
          if (ic.name) names.push('default');
          if (ic.namedBindings) {
            if (ts.isNamedImports(ic.namedBindings)) {
              for (const el of ic.namedBindings.elements) names.push(identText(el.name) || identText(el.propertyName));
            } else if (ts.isNamespaceImport(ic.namedBindings)) names.push('*');
          }
        }
        imports.set(mod, (imports.get(mod) || []).concat(names.length ? names : ['*']));
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        const mod = node.moduleSpecifier.text;
        const names: string[] = [];
        const ec = node.exportClause;
        if (ec) {
          if (ts.isNamedExports(ec)) for (const el of ec.elements) names.push(identText(el.name) || identText(el.propertyName));
          else if ('name' in ec) names.push(identText((ec as any).name)); // namespace export
        } else names.push('*');
        reexports.push({ from: mod, names });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    nodes.set(id, { id, exports, reexports, imports });
    edges.push(...e);
  }

  // Build export origin map per module
  const exportOrigin = new Map<string, Map<string, string>>();
  for (const [id, meta] of nodes) {
    const env = loadTsEnvForFile(id, forcedProject);
    const origin = new Map<string, string>();
    for (const name of meta.exports) origin.set(name, id);
    for (const rx of meta.reexports) {
      const target = resolveModule(rx.from, id, env);
      if (!target) continue;
      if (rx.names.includes('*')) origin.set('*', target);
      else for (const n of rx.names) origin.set(n, target);
    }
    exportOrigin.set(id, origin);
  }

  // Usage tracking for aggregators
  const usageByAggregator = new Map<string, Usage[]>();

  for (const [id, meta] of nodes) {
    for (const [spec, names] of meta.imports) {
      const env = loadTsEnvForFile(id, forcedProject);
      const resolved = resolveModule(spec, id, env);
      if (!resolved) continue;
      const originMap = exportOrigin.get(resolved);
      if (!originMap) continue;
      for (const n of names) {
        if (n === '*') continue;
        const target = originMap.get(n) || originMap.get('*');
        if (target && target !== resolved) {
          // inferred edge through aggregator
          edges.push({ source: id, target, names: [`${n} via ${path.relative(path.dirname(id), resolved) || path.basename(resolved)}`] });
          usageByAggregator.set(resolved, (usageByAggregator.get(resolved) || []).concat([{ symbol: n, importer: id }]));
        }
      }
    }
  }

  // Prepare reports for files that look like collectors (index.ts/tsx)
  for (const [id, meta] of nodes) {
    const isCollector = /(^|\|\/)index\.tsx?$/.test(id) || meta.reexports.length > 0;
    if (!isCollector) continue;
    const exported = new Set<string>([...meta.exports, ...meta.reexports.flatMap(r => r.names.includes('*') ? ['*'] : r.names)]);
    const usedList = usageByAggregator.get(id) || [];
    const usedSymbols = new Set(usedList.map(u => u.symbol));
    const unused = [...exported].filter(s => s !== '*' && !usedSymbols.has(s)).sort();
    reports.push({ file: id, exported: [...exported].sort(), used: usedList, unused });
  }

  return { graph: { nodes, edges }, reports };
}
// -----------------------------
// Output formats
// -----------------------------

function toRel(p: string, root: string, absolute: boolean) {
  return absolute ? path.normalize(p) : path.relative(root, p) || path.basename(p);
}

function renderDOT(g: Graph, root: string, absolute: boolean): string {
  const lines: string[] = [
    'digraph G {',
    '  rankdir=LR;',
    '  node [shape=box, style=rounded];',
  ];
  for (const node of g.nodes.values()) {
    const id = toRel(node.id, root, absolute);
    const label = id.replace(/\\/g, '/');
    lines.push(`  "${label}";`);
  }
  for (const e of g.edges) {
    const from = toRel(e.source, root, absolute).replace(/\\/g, '/');
    const to = toRel(e.target, root, absolute).replace(/\\/g, '/');
    const names = e.names.length ? e.names.slice(0, 6).join(', ') + (e.names.length > 6 ? '…' : '') : '';
    const label = names ? ` [label="${names}"]` : '';
    lines.push(`  "${from}" -> "${to}"${label};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function idify(s: string) { return s.replace(/[^a-zA-Z0-9_]/g, '_'); }

function renderMermaid(g: Graph, root: string, absolute: boolean): string {
  const seen = new Set<string>();
  const out: string[] = ['graph LR'];
  const norm = (p: string) => toRel(p, root, absolute).replace(/\\/g, '/');
  for (const e of g.edges) {
    const from = norm(e.source);
    const to = norm(e.target);
    const key = `${from}->${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`  ${idify(from)} --> ${idify(to)}:::edge`);
  }
  for (const n of g.nodes.values()) {
    const label = norm(n.id);
    out.push(`  ${idify(label)}["${label}"]`);
  }
  out.push('classDef edge stroke-width:1px;');
  return out.join('\n');
}

function renderJSON(g: Graph, root: string, absolute: boolean): string {
  const nodes = Array.from(g.nodes.values()).map(n => ({ id: toRel(n.id, root, absolute), exports: Array.from(n.exports).sort() }));
  const edges = g.edges.map(e => ({ source: toRel(e.source, root, absolute), target: toRel(e.target, root, absolute), names: e.names }));
  return JSON.stringify({ nodes, edges }, null, 2);
}

function renderCSV(g: Graph, root: string, absolute: boolean): string {
  const lines = ['source,target,names'];
  for (const e of g.edges) {
    const from = toRel(e.source, root, absolute).replace(/\"/g, '\"\"');
    const to = toRel(e.target, root, absolute).replace(/\"/g, '\"\"');
    const names = e.names.join(';').replace(/\"/g, '\"\"');
    lines.push(`\"${from}\",\"${to}\",\"${names}\"`);
  }
  return lines.join('\n');
}


function renderReport(reports: AggregatorReport[], root: string, absolute: boolean): string {
  const rel = (p: string) => toRel(p, root, absolute).replace(/\\/g, '/');
  const out: string[] = [];
  out.push(`# Aggregator Usage Report`);
  for (const r of reports.sort((a, b) => rel(a.file).localeCompare(rel(b.file)))) {
    out.push(`\n## ${rel(r.file)}`);
    out.push(`\n**Exported (${r.exported.length})**: ${r.exported.join(', ') || '(none)'}`);
    out.push(`\n**Unused (${r.unused.length})**: ${r.unused.join(', ') || '(none)'}`);
    if (r.used.length) {
      out.push(`\n**Used via this index (${r.used.length})**`);
      out.push(`\n| symbol | first importer |`);
      out.push(`|---|---|`);
      const seen = new Set<string>();
      for (const u of r.used) {
        if (seen.has(u.symbol)) continue;
        seen.add(u.symbol);
        out.push(`| ${u.symbol} | ${rel(u.importer)} |`);
      }
    }
  }
  return out.join('\n'); // ✅ close renderReport properly
}
// -----------------------------
// Main
// -----------------------------

async function main() {
  const opts = parseArgs(process.argv);
  const root = path.resolve(process.cwd(), opts.dir);
  const tsenv = loadTsEnv(root);

  const patterns = opts.ext.map(e => `**/*.${e}`);
  const files = await globby(patterns, {
    cwd: root,
    absolute: true,
    gitignore: true,
    dot: false,
    ignore: opts.ignore,
    followSymbolicLinks: false,
  });

  const result = buildGraph(files, tsenv, opts.project);

  let out: string;
  switch (opts.format) {
    case 'dot':
      out = renderDOT(result.graph, root, opts.absolute);
      break;
    case 'json':
      out = renderJSON(result.graph, root, opts.absolute);
      break;
    case 'csv':
      out = renderCSV(result.graph, root, opts.absolute);
      break;
    case 'report':
      out = renderReport(result.reports, root, opts.absolute);
      break;
    case 'mermaid':
    default:
      out = renderMermaid(result.graph, root, opts.absolute);
      break;
  }

  if (opts.out)
    await fs.writeFile(path.resolve(root, opts.out), out, 'utf8');
  else
    process.stdout.write(out + '\n'); // ✅ Correct newline escape
}

main().catch((err) => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
