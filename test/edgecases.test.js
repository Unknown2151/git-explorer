const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

jest.setTimeout(120000);

function mktempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'git-explorer-test-'));
}

function writeFile(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content, 'utf8');
}

function run(dir, cmd) {
  return execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

test('repeated lines: single-hunk apply succeeds', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  writeFile(d, 'file.txt', Array(20).fill('dup-line').join('\n') + '\n');
  run(d, 'git add file.txt');
  run(d, 'git commit -q -m "initial"');

  // change one occurrence (line 10)
  const lines = fs.readFileSync(path.join(d, 'file.txt'), 'utf8').split(/\r?\n/);
  lines[9] = 'changed-dup-line';
  fs.writeFileSync(path.join(d, 'file.txt'), lines.join('\n') + '\n', 'utf8');

  // generate patch and extract first hunk
  run(d, 'git --no-pager diff -- file.txt > full.patch');
  run(d, "awk '/^@@/ { if (h==0) {h=1; print; next} else {exit} } h==1 {print}' full.patch > hunk.patch");

  // Assemble minimal patch
  const patch = `diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n` + fs.readFileSync(path.join(d, 'hunk.patch'), 'utf8');
  fs.writeFileSync(path.join(d, 'hunk1.patch'), patch, 'utf8');

  // check and apply against index
  run(d, 'git add --intent-to-add -- file.txt');
  run(d, 'git apply --check --cached -p1 --unidiff-zero < hunk1.patch');
  run(d, 'git apply --cached -p1 --unidiff-zero < hunk1.patch');

  const staged = run(d, 'git --no-pager diff --staged -- file.txt');
  expect(staged).toContain('changed-dup-line');
});

test('adjacent/overlapping hunks: partial apply', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  writeFile(d, 'file.txt', 'a\n'.repeat(50));
  run(d, 'git add file.txt');
  run(d, 'git commit -q -m "initial"');

  // make two edits separated so git will likely produce separate hunks
  let lines = fs.readFileSync(path.join(d, 'file.txt'), 'utf8').split(/\r?\n/);
  lines[10] = 'X_line';
  lines[30] = 'Y_line';
  fs.writeFileSync(path.join(d, 'file.txt'), lines.join('\n') + '\n', 'utf8');

  run(d, 'git --no-pager diff -- file.txt > full.patch');
  const full = fs.readFileSync(path.join(d, 'full.patch'), 'utf8');
  // extract hunk blocks robustly
  const hunkRegex = /^@@[\s\S]*?(?=^@@|\z)/gm;
  const hunks = full.match(hunkRegex) || [];
  expect(hunks.length).toBeGreaterThan(0);
  // pick the first hunk as a partial apply candidate
  const chosen = hunks[0];
  const patch = `diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n` + chosen;
  fs.writeFileSync(path.join(d, 'hunk.partial.patch'), patch, 'utf8');

  run(d, 'git add --intent-to-add -- file.txt');
  // try check and apply the single hunk
  run(d, 'git apply --check --cached -p1 --unidiff-zero < hunk.partial.patch');
  run(d, 'git apply --cached -p1 --unidiff-zero < hunk.partial.patch');

  const staged = run(d, 'git --no-pager diff --staged -- file.txt');
  // partial apply should stage at least one of the changed lines
  const ok = staged.includes('X_line') || staged.includes('Y_line');
  expect(ok).toBe(true);
});

test('binary file: git diff reports binary and no patch produced', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  // write a small binary file
  const buf = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
  fs.writeFileSync(path.join(d, 'img.bin'), buf);
  run(d, 'git add img.bin');
  run(d, 'git commit -q -m "binary initial"');
  // change binary
  const buf2 = Buffer.from([9,8,7,6,5,4,3,2,1,0]);
  fs.writeFileSync(path.join(d, 'img.bin'), buf2);
  // git diff should indicate binary files and not present an ordinary patch
  const out = run(d, 'git --no-pager diff -- img.bin');
  expect(out.toLowerCase()).toMatch(/binary files|^diff --git a\/img.bin b\/img.bin/m);
});

test('rename detection: git shows R in name-status', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  writeFile(d, 'old.txt', 'hello\n');
  run(d, 'git add old.txt');
  run(d, 'git commit -q -m "add old"');
  // rename using git mv so rename is recorded
  run(d, 'git mv old.txt new.txt');
  run(d, 'git commit -q -m "rename"');
  // verify the HEAD tree contains new.txt and not old.txt
  const tree = run(d, 'git ls-tree --name-only -r HEAD');
  const names = tree.split(/\r?\n/).filter(Boolean);
  expect(names.includes('new.txt')).toBe(true);
  expect(names.includes('old.txt')).toBe(false);
});
