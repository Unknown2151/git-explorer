#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildPatchFromHunks(filename, hunks) {
  // produce a minimal unified patch
  let header = `*** Begin Patch\n*** Update File: ${filename}\n`;
  // We'll build a standard unified diff header
  let patch = `diff --git a/${filename} b/${filename}\n`;
  patch += `--- a/${filename}\n`;
  patch += `+++ b/${filename}\n`;
  hunks.forEach(h => {
    const oldStart = Number(h.oldStart) || 1;
    const newStart = Number(h.newStart) || oldStart;
    // compute counts based on lines that will be emitted
    let oldCount = 0;
    let newCount = 0;
    const linesOut = [];
    (h.lines || []).forEach(ln => {
      const type = ln.type || (ln.raw && ln.raw[0]) || ' ';
      const text = ln.editedText !== undefined ? ln.editedText : (ln.text !== undefined ? ln.text : (ln.raw ? ln.raw.slice(1) : ''));
      // determine if this line will be included on old/new side
      if (type === ' ' ) { oldCount++; newCount++; linesOut.push(` ${text}`); }
      else if (type === '-') { oldCount++; linesOut.push(`-${text}`); }
      else if (type === '+') { newCount++; linesOut.push(`+${text}`); }
      else { linesOut.push(` ${text}`); oldCount++; newCount++; }
    });
    patch += `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n`;
    linesOut.forEach(l => { patch += l + '\n'; });
  });
  // ensure trailing newline
  if (!patch.endsWith('\n')) patch += '\n';
  return patch;
}

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ stdio: 'pipe', encoding: 'utf8' }, opts));
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

async function main() {
  const cwd = process.cwd();
  const repo = cwd;
  // read hunks.json in cwd
  const jpath = path.join(cwd, 'hunks.json');
  if (!fs.existsSync(jpath)) {
    console.error('Place a hunks.json file in the repo root with { filename, hunks }');
    process.exit(2);
  }
  const j = JSON.parse(fs.readFileSync(jpath, 'utf8'));
  const filename = j.filename;
  const hunks = j.hunks || [];
  const patch = buildPatchFromHunks(filename, hunks);
  const patchFile = path.join(cwd, 'tmp-test-patch.patch');
  fs.writeFileSync(patchFile, patch, 'utf8');
  console.log('Generated patch:\n', patch);

  // ensure file is in index (intent-to-add) if necessary
  const ls = run('git', ['ls-files', '--error-unmatch', '--', filename], { cwd: repo });
  if (ls.status !== 0) {
    console.log('File not in index, adding intent-to-add');
    run('git', ['add', '--intent-to-add', '--', filename], { cwd: repo });
  }

  // dry-run check
  console.log('Running git apply --check --cached');
  const check = run('git', ['apply', '--check', '--cached', patchFile], { cwd: repo });
  console.log('check status', check.status, check.stderr || check.stdout);
  if (check.status !== 0) {
    console.error('git apply --check failed. Aborting.');
    process.exit(check.status || 1);
  }

  // apply to index
  console.log('Applying patch to index');
  const apply = run('git', ['apply', '--cached', patchFile], { cwd: repo });
  console.log('apply status', apply.status, apply.stderr || apply.stdout);
  if (apply.status !== 0) {
    console.error('git apply --cached failed');
    process.exit(apply.status || 1);
  }

  // show staged diff
  const diff = run('git', ['diff', '--staged', '--', filename], { cwd: repo });
  console.log('Staged diff:\n', diff.stdout);
  fs.unlinkSync(patchFile);
  console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });
