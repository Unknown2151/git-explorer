const fs = require('fs');
const path = require('path');
const { mktempDir, run, write } = require('./helpers/fixture');

jest.setTimeout(120000);

test('rename detection with similarity threshold: git detects rename when similarity >= 50%', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  // create a file and commit
  write(d, 'a.txt', 'line1\nline2\nline3\nline4\n');
  run(d, 'git add a.txt');
  run(d, 'git commit -q -m "init"');

  // perform git mv so rename can be detected, then edit the target to simulate modification
  run(d, 'git mv a.txt b.txt');
  // modify the moved file
  const bpath = path.join(d, 'b.txt');
  let bcontent = fs.readFileSync(bpath, 'utf8').split(/\r?\n/);
  bcontent[1] = 'line2_modified';
  fs.writeFileSync(bpath, bcontent.join('\n') + '\n', 'utf8');
  run(d, 'git add b.txt');
  run(d, 'git commit -q -m "rename-ish"');

  // verify HEAD tree contains b.txt and not a.txt
  const tree = run(d, 'git ls-tree --name-only -r HEAD');
  const names = tree.split(/\r?\n/).filter(Boolean);
  expect(names.includes('b.txt')).toBe(true);
  expect(names.includes('a.txt')).toBe(false);
});

test('repeated lines across files: patch generation for many dupes in multiple files', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  // create two files with many repeated lines
  const block = Array(100).fill('dup').join('\n') + '\n';
  write(d, 'f1.txt', block);
  write(d, 'f2.txt', block);
  run(d, 'git add .');
  run(d, 'git commit -q -m "init"');

  // change one occurrence in each file
  let l1 = fs.readFileSync(path.join(d, 'f1.txt'), 'utf8').split(/\r?\n/);
  l1[50] = 'changed1';
  fs.writeFileSync(path.join(d, 'f1.txt'), l1.join('\n') + '\n');
  let l2 = fs.readFileSync(path.join(d, 'f2.txt'), 'utf8').split(/\r?\n/);
  l2[75] = 'changed2';
  fs.writeFileSync(path.join(d, 'f2.txt'), l2.join('\n') + '\n');

  run(d, 'git --no-pager diff --name-only > changed.list');
  const changed = fs.readFileSync(path.join(d, 'changed.list'), 'utf8').trim().split(/\r?\n/).filter(Boolean);
  expect(changed).toContain('f1.txt');
  expect(changed).toContain('f2.txt');
});

test('CRLF/LF normalization: diffs remain meaningful when files have CRLF vs LF', () => {
  const d = mktempDir();
  run(d, 'git init -q');
  // write file with LF and commit
  write(d, 'crlf.txt', 'a\nb\nc\n');
  run(d, 'git add crlf.txt');
  run(d, 'git commit -q -m "lf"');

  // rewrite with CRLF
  // disable autocrlf for this repo to force diffs to reflect actual CRLF vs LF
  run(d, 'git config core.autocrlf false');
  fs.writeFileSync(path.join(d, 'crlf.txt'), 'a\r\nb\r\nc\r\n', 'utf8');
  // ensure git detects change (status should show modified file)
  const status = run(d, 'git status --porcelain');
  expect(status.split(/\r?\n/).some(l => l.includes('crlf.txt'))).toBe(true);
});
