#!/usr/bin/env ts-node
/**
 * scripts/line-lengths.ts
 * ---------------------------------------------
 * Counts line-related stats for files in a project while respecting .gitignore.
 *
 * Defaults to TypeScript sources (.ts, .tsx). You can override with --ext.
 *
 * Usage examples:
 *  - pnpm ts-node scripts/line-lengths.ts
 *  - pnpm ts-node scripts/line-lengths.ts --dir ./shop --ext ts,tsx,js,jsx
 *  - pnpm ts-node scripts/line-lengths.ts --json > line-stats.json
 *
 * Add an npm script:
 *  "scripts": {
 *    "count:lines": "pnpm ts-node scripts/line-lengths.ts --dir ./ --ext ts,tsx"
 *  }
 *
 * Notes:
 * - Respects .gitignore automatically (via globby's `gitignore: true`).
 * - Follows symlinks: false (avoids double counting & potential loops).
 * - Excludes common generated folders by default (dist, build, coverage), configurable via --ignore.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import * as readline from 'node:readline';
import { globby } from 'globby';

interface Options {
  dir: string;
  ext: string[];
  json: boolean;
  csv: boolean;
  ignore: string[];
  absolute: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    dir: '.',
    ext: ['ts', 'tsx'],
    json: false,
    csv: false,
    ignore: ['**/node_modules/**','**/dist/**', '**/build/**', '**/coverage/**', '**/.next/**', '**/.out/**'],
    absolute: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--dir' && next) { opts.dir = next; i++; continue; }
    if (arg === '--ext' && next) { opts.ext = next.split(',').map(s => s.trim().replace(/^\./, '')).filter(Boolean); i++; continue; }
    if (arg === '--ignore' && next) { opts.ignore = next.split(',').map(s => s.trim()).filter(Boolean); i++; continue; }
    if (arg === '--json') { opts.json = true; continue; }
    if (arg === '--csv') { opts.csv = true; continue; }
    if (arg === '--absolute') { opts.absolute = true; continue; }
    if (arg === '--help' || arg === '-h') { printHelpAndExit(); }
  }
  return opts;
}

function printHelpAndExit(): never {
  console.log(`\nLine length stats (respects .gitignore)\n\n` +
    `Options:\n` +
    `  --dir <path>       Root directory to scan (default: .)\n` +
    `  --ext a,b,c        Extensions to include (default: ts,tsx)\n` +
    `  --ignore globs     Additional ignore globs (comma-separated)\n` +
    `  --json             Output JSON instead of table\n` +
    `  --csv              Output CSV (ignored if --json)\n` +
    `  --absolute         Print absolute file paths\n` +
    `  -h, --help         Show this help\n`);
  process.exit(0);
}

function isProbablyText(ext: string): boolean {
  const binaryLike = new Set(['png','jpg','jpeg','gif','webp','ico','pdf','woff','woff2','eot','ttf','otf','mp4','mp3','mov','zip','gz','bz2','7z']);
  return !binaryLike.has(ext.toLowerCase());
}

export interface FileLineStats {
  file: string;
  lines: number;
  longestLine: number;
  avgLine: number;
  chars: number;
}

async function readLineStats(filePath: string): Promise<FileLineStats> {
  const fh = await fs.open(filePath, 'r');
  const stream = fh.createReadStream({ encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lines = 0;
  let longest = 0;
  let chars = 0;

  for await (const line of rl) {
    lines++;
    const len = [...line].length;
    chars += len;
    if (len > longest) longest = len;
  }

  await rl.close();
  await fh.close();

  const avg = lines > 0 ? Math.round((chars / lines) * 100) / 100 : 0;
  return { file: filePath, lines, longestLine: longest, avgLine: avg, chars };
}

async function main() {
  const opts = parseArgs(process.argv);
  const root = path.resolve(process.cwd(), opts.dir);

  const patterns = opts.ext.map(e => `**/*.${e}`);

  const files = await globby(patterns, {
    cwd: root,
    absolute: true,
    dot: false,
    gitignore: true,
    followSymbolicLinks: false,
    ignore: opts.ignore,
  });

  const filtered = files.filter(f => isProbablyText(path.extname(f).slice(1)));

  const stats: FileLineStats[] = [];
  for (const f of filtered) {
    try {
      const s = await fs.stat(f);
      if (!s.isFile()) continue;
      const st = await readLineStats(f);
      stats.push({ ...st, file: opts.absolute ? f : path.relative(root, f) });
    } catch (err) {
      console.warn(`Skipping ${f}: ${(err as Error).message}`);
    }
  }

  stats.sort((a, b) => b.lines - a.lines);

  if (opts.json) {
    console.log(JSON.stringify({
      dir: opts.absolute ? root : pathToFileURL(root).pathname,
      extensions: opts.ext,
      files: stats,
      totals: summarize(stats),
    }, null, 2));
    return;
  }

  if (opts.csv) {
    console.log(toCSV(stats));
    const t = summarize(stats);
    console.log(`TOTAL,${t.files},${t.lines},${t.chars},${t.longestLine},${t.avgLine}`);
    return;
  }

  printTable(stats);
  const totals = summarize(stats);
  console.log(`\nTotals: files=${totals.files} lines=${totals.lines} chars=${totals.chars} longestLine=${totals.longestLine} avgLine=${totals.avgLine}`);
}

function summarize(stats: FileLineStats[]) {
  let files = stats.length;
  let lines = 0;
  let chars = 0;
  let longestLine = 0;
  for (const s of stats) {
    lines += s.lines;
    chars += s.chars;
    if (s.longestLine > longestLine) longestLine = s.longestLine;
  }
  const avgLine = lines > 0 ? Math.round((chars / lines) * 100) / 100 : 0;
  return { files, lines, chars, longestLine, avgLine };
}

function toCSV(stats: FileLineStats[]): string {
  const header = 'file,lines,chars,longestLine,avgLine';
  const rows = stats.map(s => [csvEscape(s.file), s.lines, s.chars, s.longestLine, s.avgLine].join(','));
  return [header, ...rows].join('\n');
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function printTable(stats: FileLineStats[]) {
  const fileW = Math.max(4, ...stats.map(s => s.file.length));
  const linesW = Math.max(5, ...stats.map(s => String(s.lines).length));
  const charsW = Math.max(5, ...stats.map(s => String(s.chars).length));
  const longW = Math.max(11, ...stats.map(s => String(s.longestLine).length));
  const avgW = Math.max(7, ...stats.map(s => String(s.avgLine).length));

  const pad = (str: string | number, w: number) => String(str).padStart(w, ' ');
  const row = (f: string, l: string, c: string, lo: string, a: string) => `${f}  ${l}  ${c}  ${lo}  ${a}`;

  console.log(row(
    'file'.padEnd(fileW, ' '),
    pad('lines', linesW),
    pad('chars', charsW),
    pad('longest', longW),
    pad('avg', avgW),
  ));
  console.log('-'.repeat(fileW + linesW + charsW + longW + avgW + 8));

  for (const s of stats) {
    console.log(row(
      s.file.padEnd(fileW, ' '),
      pad(s.lines, linesW),
      pad(s.chars, charsW),
      pad(s.longestLine, longW),
      pad(s.avgLine, avgW),
    ));
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((err) => {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}