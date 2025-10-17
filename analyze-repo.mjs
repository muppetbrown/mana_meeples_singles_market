#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import * as parser from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import chalk from 'chalk';

const traverse = traverseModule.default || traverseModule; // CJS/ESM interop
const parseErrors = [];

// -------------------- CLI ARGS --------------------
function parseArgs() {
  const argv = process.argv.slice(2);
  const getFlag = (name, def) => {
    const i = argv.findIndex(a => a === `--${name}`);
    if (i !== -1) return argv[i + 1];
    const eq = argv.find(a => a.startsWith(`--${name}=`));
    if (eq) return eq.split('=')[1];
    return def;
  };
  const getBool = (name) => argv.includes(`--${name}`);

  const root = path.resolve(getFlag('root', '.'));
  const out = path.resolve(getFlag('out', './repo-report'));
  const extensions = (getFlag('extensions', '.js,.jsx,.ts,.tsx,.mjs,.cjs')).split(',').map(s => s.trim()).filter(Boolean);
  const includeDefault = 'routes,services,utils,middleware,config,mana-meeples-shop,.';
  const include = (getFlag('include', includeDefault)).split(',').map(s => s.trim()).filter(Boolean);
  const excludeDefault = '**/{node_modules,dist,build,.next,.vercel,.turbo,coverage}/**';
  const exclude = (getFlag('exclude', excludeDefault)).split(',').map(s => s.trim()).filter(Boolean);
  const entryDefault = 'server.js';
  const entry = (getFlag('entry', entryDefault) || entryDefault).split(',').map(s => s.trim()).filter(Boolean).map(p => path.resolve(root, p));

  const json = getBool('json');
  const md = getBool('md');
  const dot = getBool('dot');

  return { root, out, extensions, include, exclude, entry, json, md, dot };
}

const args = parseArgs();
fs.mkdirSync(args.out, { recursive: true });

// -------------------- PATH/EXT HELPERS --------------------
const toPosix = (p) => p.replace(/\\/g, '/');
const isWinAbs = (p) => /^[A-Za-z]:\\/.test(p);
const isLocalPath = (p) => p.startsWith('/') || isWinAbs(p);

// Build extension regex from CLI
const EXT_RE = new RegExp(
  `\\.(${(args.extensions || ['.js'])
    .map(e => e.replace(/^\./, ''))
    .map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})$`,
  'i'
);


// -------------------- FILE LIST --------------------
function listProjectFiles() {
  const patterns = args.include.map(inc => `${toPosix(inc)}/**/*`);
  const files = fg.sync(patterns, {
    cwd: args.root,
    ignore: args.exclude.map(toPosix),
    onlyFiles: true,
    absolute: true,
    dot: false,
  });
  return files.filter(f => EXT_RE.test(f));
}

const files = listProjectFiles();
if (files.length === 0) {
  console.error(chalk.red(`No source files found in ${args.include.join(', ')} with extensions ${args.extensions.join(', ')}`));
  process.exit(1);
}
const filesSet = new Set(files);

// -------------------- PARSING & GRAPH --------------------
function readFileSafe(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return (h >>> 0).toString(16); }

function resolveImport(fromFile, request, projectFilesSet) {
  if (!request || request.startsWith('http')) return null;
  if (!request.startsWith('.') && !request.startsWith('/')) return request; // external pkg
  const baseDir = path.dirname(fromFile);
  const target = path.resolve(baseDir, request);
  if (projectFilesSet.has(target)) return target;
  for (const ext of args.extensions.map(e => e.startsWith('.') ? e : `.${e}`)) {
    if (projectFilesSet.has(target + ext)) return target + ext;
  }
  for (const ext of args.extensions.map(e => e.startsWith('.') ? e : `.${e}`)) {
    const idx = path.join(target, 'index' + ext);
    if (projectFilesSet.has(idx)) return idx;
  }
  return null;
}

const nodes = new Map();
const edges = [];
function getOrCreateNode(id, info = {}) {
  let n = nodes.get(id);
  if (!n) {
    n = {
      id,
      path: isLocalPath(id) ? id : undefined,
      ext: isLocalPath(id) ? path.extname(id) : undefined,
      sizeBytes: undefined,
      lines: undefined,
      exports: [],
      imports: [],
      isExternal: !isLocalPath(id),
      isTest: /(\.test\.|\.spec\.|__tests__|__mocks__|\.stories\.)/i.test(id),
      onlyReExports: false,
      ...info,
    };
    nodes.set(id, n);
  }
  return n;
}

function parseFile(file) {
  const code = readFileSafe(file);
  const n = getOrCreateNode(file);
  n.sizeBytes = Buffer.byteLength(code, 'utf8');
  n.lines = code.split(/\r?\n/).length;

    let ast;
    try {
    ast = parser.parse(code, {
        sourceType: 'unambiguous',
        plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        ],
    });
    } catch (err) {
    parseErrors.push({
        file,
        message: err && err.message ? err.message : String(err),
    });
    return; // skip this file, keep going
    }

  traverse(ast, {
    ImportDeclaration(p) {
      const src = (p.node.source && p.node.source.value) || '';
      const names = p.node.specifiers.map(s => {
        if (t.isImportSpecifier(s)) return s.imported.name;
        if (t.isImportDefaultSpecifier(s)) return 'default';
        if (t.isImportNamespaceSpecifier(s)) return '*';
        return '*';
      });
      n.imports.push({ from: src, names, kind: 'import' });
      n.onlyReExports = false;
    },
    CallExpression(p) {
      if (t.isIdentifier(p.node.callee) && p.node.callee.name === 'require') {
        const [arg] = p.node.arguments;
        if (t.isStringLiteral(arg)) {
          n.imports.push({ from: arg.value, names: ['*'], kind: 'require' });
          n.onlyReExports = false;
        }
      }
    },
    ExportAllDeclaration(p) {
      const src = (p.node.source && p.node.source.value) || '';
      n.imports.push({ from: src, names: ['*'], kind: 'exportAll' });
    },
    ExportNamedDeclaration(p) {
      const src = p.node.source ? p.node.source.value : '';
      if (src) {
        n.imports.push({ from: src, names: p.node.specifiers.map(s => s.exported.name), kind: 'exportFrom' });
      }
      if (p.node.declaration) {
        const d = p.node.declaration;
        if (t.isFunctionDeclaration(d) || t.isClassDeclaration(d)) {
          if (d.id) n.exports.push({ name: d.id.name, kind: 'value' });
          n.onlyReExports = false;
        } else if (t.isVariableDeclaration(d)) {
          d.declarations.forEach(dec => {
            if (t.isIdentifier(dec.id)) n.exports.push({ name: dec.id.name, kind: 'value' });
            n.onlyReExports = false;
          });
        }
      }
    },
    ExportDefaultDeclaration() {
      n.exports.push({ name: 'default', kind: 'default' });
      n.onlyReExports = false;
    },
  });

  n.onlyReExports = n.exports.length === 0 && n.imports.every(i => i.kind === 'exportAll' || i.kind === 'exportFrom');

  for (const im of n.imports) {
    const target = resolveImport(file, im.from, filesSet);
    const toId = target || im.from;
    edges.push({ from: file, to: toId, kind: im.kind === 'require' ? 'require' : 'import' });
    getOrCreateNode(toId, { isExternal: !isLocalPath(toId) });
  }
}

for (const f of files) parseFile(f);
for (const e of args.entry) getOrCreateNode(e);

// -------------------- ANALYSIS --------------------
const adj = new Map();
const rev = new Map();
for (const n of nodes.keys()) { adj.set(n, new Set()); rev.set(n, new Set()); }
for (const e of edges) { adj.get(e.from).add(e.to); rev.get(e.to).add(e.from); }

function findCycles() {
  const temp = new Set();
  const perm = new Set();
  const stack = [];
  const cycles = [];
  function visit(n) {
    if (perm.has(n)) return;
    if (temp.has(n)) { const i = stack.lastIndexOf(n); if (i !== -1) cycles.push(stack.slice(i)); return; }
    temp.add(n); stack.push(n);
    for (const m of adj.get(n) || []) visit(m);
    temp.delete(n); perm.add(n); stack.pop();
  }
  for (const n of nodes.keys()) visit(n);
  return cycles.filter(c => c.length > 1);
}

function longestReexportChain() {
  const results = [];
  const visited = new Set();
  for (const [id, n] of nodes) {
    if (!isLocalPath(id) || !n.onlyReExports || visited.has(id)) continue;
    const chain = [id];
    let cur = id; let steps = 0;
    while (true) {
      const outs = [...(adj.get(cur) || [])].filter(x => isLocalPath(x));
      if (outs.length !== 1) break;
      const next = outs[0];
      const nextNode = nodes.get(next);
      if (!nextNode || !nextNode.onlyReExports) break;
      if (chain.includes(next)) break;
      chain.push(next); cur = next; steps++; visited.add(next);
      if (steps > 50) break;
    }
    if (chain.length > 1) results.push({ chain, length: chain.length });
  }
  return results.sort((a, b) => b.length - a.length);
}

function findOrphans() {
  const res = [];
  for (const [id, n] of nodes) {
    if (!isLocalPath(id)) continue; if (n.isTest) continue;
    const indeg = (rev.get(id) || new Set()).size;
    const isEntry = args.entry.includes(id);
    if (indeg === 0 && !isEntry) res.push(id);
  }
  return res;
}

function findLargeFiles(limitLines = 400) {
  const res = [];
  for (const [id, n] of nodes) {
    if (!isLocalPath(id)) continue;
    if ((n.lines || 0) > limitLines) res.push(id);
  }
  return res;
}

function detectUnusedExports() {
  const importedNamesByFile = new Map();
  for (const e of edges) {
    if (!isLocalPath(e.to)) continue;
    const fromNode = nodes.get(e.from);
    if (!fromNode) continue;
    for (const im of fromNode.imports) {
      const r = resolveImport(e.from, im.from, filesSet);
      if ((r || im.from) === e.to) {
        const set = importedNamesByFile.get(e.to) || new Set();
        im.names.forEach(n => set.add(n));
        importedNamesByFile.set(e.to, set);
      }
    }
  }
  const unused = [];
  for (const [id, n] of nodes) {
    if (!isLocalPath(id)) continue;
    const imported = importedNamesByFile.get(id) || new Set();
    const ex = n.exports.map(e => e.name);
    const u = ex.filter(x => !imported.has(x));
    if (u.length) unused.push({ file: id, exports: u });
  }
  return unused;
}

const cycles = findCycles();
const orphans = findOrphans();
const bigFiles = findLargeFiles();
const reexportChains = longestReexportChain();
const unused = detectUnusedExports();
const hotspots = [...nodes.values()]
  .filter(n => n.path && !n.isExternal)
  .map(n => ({ file: n.id, fanIn: (rev.get(n.id) || new Set()).size, fanOut: (adj.get(n.id) || new Set()).size, lines: n.lines || 0, score: ((rev.get(n.id) || new Set()).size) * (n.lines || 0) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);

const rel = (p) => {
  const isLocal = isLocalPath(p);
  if (!isLocal) return p;
  return path.relative(args.root, p).split('\\').join('/');
};

const jsonOut = {
  generatedAt: new Date().toISOString(),
  root: args.root,
  files: [...nodes.values()].map(n => ({ id: rel(n.id), isExternal: n.isExternal, lines: n.lines, sizeBytes: n.sizeBytes, onlyReExports: n.onlyReExports, exports: n.exports, isTest: n.isTest })),
  edges: edges.map(e => ({ from: rel(e.from), to: rel(e.to), kind: e.kind })),
  metrics: {
    cycles: cycles.map(c => c.map(rel)),
    orphans: orphans.map(rel),
    bigFiles: bigFiles.map(rel),
    reexportChains: reexportChains.map(c => ({ length: c.length, chain: c.chain.map(rel) })),
    unusedExports: unused.map(u => ({ file: rel(u.file), exports: u.exports })),
    hotspots: hotspots.map(h => ({ ...h, file: rel(h.file) })),
  },
  parseErrors,
};

function writeJSON() {
  const p = path.join(args.out, 'graph.json');
  fs.writeFileSync(p, JSON.stringify(jsonOut, null, 2));
  console.log(chalk.green(`✔ JSON graph:`), p);
}

function writeDOT() {
  const p = path.join(args.out, 'repo.dot');
  const lines = [];
  const idFor = (s) => 'n' + hash(s);
  lines.push('digraph repo {');
  lines.push('  rankdir=LR;');
  for (const n of nodes.values()) {
    const id = idFor(n.id);
    const label = rel(n.id).replace(/"/g, '\\"');
    const shape = n.isExternal ? 'box' : (n.onlyReExports ? 'folder' : 'ellipse');
    lines.push(`  ${id} [label="${label}", shape=${shape}];`);
  }
  for (const e of edges) {
    const a = idFor(e.from);
    const b = idFor(e.to);
    lines.push(`  ${a} -> ${b};`);
  }
  lines.push('}');
  fs.writeFileSync(p, lines.join('/n'));
  console.log(chalk.green(`✔ DOT graph:`), p);
}

function writeMarkdown() {
  const p = path.join(args.out, 'REPORT.md');
  const md = [];
  md.push(`# Repository Dependency Report`);
  md.push(`_Generated: ${new Date().toISOString()}_`);
  md.push('');
  md.push('## Summary');
  md.push(`- Files scanned: ${[...nodes.values()].filter(n => !n.isExternal).length}`);
  md.push(`- External packages referenced: ${[...nodes.values()].filter(n => n.isExternal).length}`);
  md.push(`- Edges: ${edges.length}`);
  md.push('');

  const list = (arr, empty = 'None') => arr.length ? arr.map(a => `- ${a}`).join('/n') : `- ${empty}`;

  const hotspotsLocal = [...hotspots];
  md.push('## Hotspots (fan-in × lines)');
  if (hotspotsLocal.length) {
    md.push('| File | Fan-in | Fan-out | Lines | Score |');
    md.push('|---|---:|---:|---:|---:|');
    for (const h of hotspotsLocal) md.push(`| ${rel(h.file)} | ${h.fanIn} | ${h.fanOut} | ${h.lines} | ${h.score} |`);
  } else md.push('- None');
  md.push('');

  md.push('## Circular Dependencies');
  md.push(list(cycles.map(c => c.map(rel).join(' → '))));
  md.push('');

  md.push('## Orphan Files (no inbound references)');
  md.push(list(orphans.map(rel)));
  md.push('');

  md.push('## Large Files (> 400 lines)');
  md.push(list(bigFiles.map(rel)));
  md.push('');

  md.push('## Long Re-export Chains (barrels)');
  if (reexportChains.length) {
    reexportChains.slice(0, 20).forEach(rc => md.push(`- length ${rc.length}: ${rc.chain.map(rel).join(' → ')}`));
  } else md.push('- None');
  md.push('');

  md.push('## Possibly Unused Exports');
  if (unused.length) unused.forEach(u => md.push(`- ${rel(u.file)}: ${u.exports.join(', ')}`));
  else md.push('- None');
  md.push('');

    md.push('## Parse Errors (skipped files)');
    if (parseErrors.length) {
    parseErrors.forEach(pe => md.push(`- ${rel(pe.file)} — ${pe.message}`));
    } else {
    md.push('- None');
    }
    md.push('');

  md.push('## Suggested Actions');
  md.push('- Break cycles by introducing interfaces or dependency inversion at one edge.');
  md.push('- Split hotspots into smaller modules; decouple shared utilities used by many callers.');
  md.push('- Collapse long barrel chains: export from the source or a single top-level index.');
  md.push('- Remove or move orphans; ensure entrypoints are declared via `--entry`.');
  md.push('- Trim large files (>400 lines) into cohesive components/hooks.');
  md.push('- Delete or inline exports that are never imported.');
  md.push('');

  fs.writeFileSync(p, md.join('/n'));
  console.log(chalk.green(`✔ Markdown report:`), p);
}

if (args.json) writeJSON();
if (args.dot) writeDOT();
if (args.md) writeMarkdown();
if (!args.json && !args.dot && !args.md) console.log(chalk.yellow('No output format selected. Use --json, --md, or --dot.'));
