const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const staging = require('../lib/staging');

function run(cmd, args, opts) { return spawnSync(cmd, args, Object.assign({ encoding: 'utf8' }, opts)); }

describe('lib/staging edge cases', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'staging-test-'));
    run('git', ['init'], { cwd: tmpDir });
  });
  afterEach(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} });

  test('addition-only hunk for new file (not in HEAD)', async () => {
    const filename = 'new.txt';
    fs.writeFileSync(path.join(tmpDir, filename), 'line1\nline2\n', 'utf8');
    const hunks = [{ oldStart: 1, oldCount: 0, newStart: 1, newCount: 2, lines: [ { type: '+', text: 'line1', selected: true }, { type: '+', text: 'line2', selected: true } ] }];
    const patch = await staging.buildPatchFromHunks(tmpDir, filename, hunks);
    expect(patch).toContain('+++ b/new.txt');
    // stage it
    const res = await staging.stageHunks(tmpDir, filename, hunks, false);
    expect(res.ok).toBe(true);
  });

  test('deletion-only hunk', async () => {
    const filename = 'file.txt';
    fs.writeFileSync(path.join(tmpDir, filename), 'a\nb\nc\n', 'utf8');
    run('git', ['add', filename], { cwd: tmpDir });
    run('git', ['commit', '-m', 'init'], { cwd: tmpDir });
    // delete line b
    const hunks = [{ oldStart: 1, oldCount: 3, newStart: 1, newCount: 2, lines: [ { type: ' ', text: 'a' }, { type: '-', text: 'b', selected: true }, { type: ' ', text: 'c' } ] }];
    const patch = await staging.buildPatchFromHunks(tmpDir, filename, hunks);
    expect(patch).toContain('-b');
    const res = await staging.stageHunks(tmpDir, filename, hunks, false);
    expect(res.ok).toBe(true);
  });

  test('CRLF normalization: accept LF in input and produce valid patch', async () => {
    const filename = 'crlf.txt';
    // create file in HEAD
    fs.writeFileSync(path.join(tmpDir, filename), 'one\ntwo\n', 'utf8');
    run('git', ['add', filename], { cwd: tmpDir });
    run('git', ['commit', '-m', 'init'], { cwd: tmpDir });
    // modify to windows newlines
    fs.writeFileSync(path.join(tmpDir, filename), 'one\r\ntwo modified\r\n', 'utf8');
    const hunks = [{ oldStart: 1, oldCount: 2, newStart: 1, newCount: 2, lines: [ { type: ' ', text: 'one' }, { type: '+', text: 'two modified', selected: true } ] }];
    const patch = await staging.buildPatchFromHunks(tmpDir, filename, hunks);
    expect(patch).toBeTruthy();
    const res = await staging.stageHunks(tmpDir, filename, hunks, false);
    expect(res.ok).toBe(true);
  });
});
