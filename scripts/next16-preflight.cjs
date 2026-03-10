#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function findMatches(text, regex) {
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match.index);
  }
  return matches;
}

function toLineCol(text, idx) {
  const chunk = text.slice(0, idx);
  const lines = chunk.split(/\r?\n/);
  return { line: lines.length, col: lines.at(-1).length + 1 };
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function readPackage() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg;
}

const issues = [];
const warnings = [];

const pkg = readPackage();
const nextVersion = pkg.dependencies?.next || pkg.devDependencies?.next || '';
if (!/^\^?16\./.test(nextVersion)) {
  warnings.push(`Next no está en 16.x (actual: ${nextVersion || 'no definido'})`);
}

const files = TARGET_DIRS.flatMap((dir) => {
  const full = path.join(ROOT, dir);
  return fs.existsSync(full) ? walk(full) : [];
});

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  for (const idx of findMatches(text, /\bcookies\(\)\.(get|set|delete)\s*\(/g)) {
    const { line, col } = toLineCol(text, idx);
    issues.push(`${rel(file)}:${line}:${col} uso sync de cookies(), migrar a (await cookies())`);
  }

  for (const idx of findMatches(text, /\bcookieStore\s*=\s*cookies\(\)\s*;/g)) {
    const { line, col } = toLineCol(text, idx);
    issues.push(`${rel(file)}:${line}:${col} uso sync de cookies(), migrar a await cookies()`);
  }

  if (file.includes(path.join('app', 'teams', '[slug]', 'page.tsx')) || file.includes(path.join('app', 'payment', 'return', 'page.tsx'))) {
    if (/params\s*:\s*\{\s*slug\s*:\s*string\s*\}/m.test(text)) {
      warnings.push(`${rel(file)} usa params tipado sync; en Next 16 conviene Promise<{...}> + await params`);
    }
    if (/searchParams\?\s*:\s*Record</m.test(text)) {
      warnings.push(`${rel(file)} usa searchParams tipado sync; en Next 16 conviene Promise<Record<...>> + await searchParams`);
    }
  }
}

console.log('== Next 16 Preflight ==');
console.log(`Archivos inspeccionados: ${files.length}`);
console.log(`Issues bloqueantes: ${issues.length}`);
console.log(`Warnings: ${warnings.length}`);

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log(`- ${w}`);
}

if (issues.length > 0) {
  console.log('\nIssues:');
  for (const issue of issues) console.log(`- ${issue}`);
  process.exit(1);
}

console.log('\nOK: no se detectaron usos sync de cookies().');
