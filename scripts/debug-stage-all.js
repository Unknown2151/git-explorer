const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const staging = require('../lib/staging');

function run(cmd, args, opts) { return spawnSync(cmd, args, Object.assign({ encoding: 'utf8' }, opts)); }

async function runAddition() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-add-'));
  console.log('\n== ADDITION TEST on', dir);
  run('git', ['init', '--quiet'], { cwd: dir });
  const filename = 'new.txt';
  fs.writeFileSync(path.join(dir, filename), 'line1\nline2\n', 'utf8');
  const hunks = [{ oldStart: 1, oldCount: 0, newStart: 1, newCount: 2, lines: [ { type: '+', text: 'line1', selected: true }, { type: '+', text: 'line2', selected: true } ] }];
  const patch = await staging.buildPatchFromHunks(dir, filename, hunks);
  console.log('PATCH:\n', patch);
  const res = await staging.stageHunks(dir, filename, hunks, false);
  console.log('RES:', res);
  console.log('git status:', run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir }).stdout);
}

async function runDeletion() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-del-'));
  console.log('\n== DELETION TEST on', dir);
  run('git', ['init', '--quiet'], { cwd: dir });
  const filename = 'file.txt';
  fs.writeFileSync(path.join(dir, filename), 'a\nb\nc\n', 'utf8');
  run('git', ['add', filename], { cwd: dir });
  run('git', ['commit', '-m', 'init'], { cwd: dir });
  const hunks = [{ oldStart: 1, oldCount: 3, newStart: 1, newCount: 2, lines: [ { type: ' ', text: 'a' }, { type: '-', text: 'b', selected: true }, { type: ' ', text: 'c' } ] }];
  const patch = await staging.buildPatchFromHunks(dir, filename, hunks);
  console.log('PATCH:\n', patch);
  const res = await staging.stageHunks(dir, filename, hunks, false);
  console.log('RES:', res);
  console.log('git diff --staged:', run('git', ['diff', '--staged', '--', filename], { cwd: dir }).stdout);
}

async function runCRLF() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-crlf-'));
  console.log('\n== CRLF TEST on', dir);
  run('git', ['init', '--quiet'], { cwd: dir });
  const filename = 'crlf.txt';
  fs.writeFileSync(path.join(dir, filename), 'one\ntwo\n', 'utf8');
  run('git', ['add', filename], { cwd: dir });
  run('git', ['commit', '-m', 'init'], { cwd: dir });
  fs.writeFileSync(path.join(dir, filename), 'one\r\ntwo modified\r\n', 'utf8');
  const hunks = [{ oldStart: 1, oldCount: 2, newStart: 1, newCount: 2, lines: [ { type: ' ', text: 'one' }, { type: '+', text: 'two modified', selected: true } ] }];
  const patch = await staging.buildPatchFromHunks(dir, filename, hunks);
  console.log('PATCH:\n', patch);
  const res = await staging.stageHunks(dir, filename, hunks, false);
  console.log('RES:', res);
  console.log('git diff --staged:', run('git', ['diff', '--staged', '--', filename], { cwd: dir }).stdout);
}

(async () => { await runAddition(); await runDeletion(); await runCRLF(); })();
