const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function run(cmd, args, opts) {
  return spawnSync(cmd, args, Object.assign({ encoding: 'utf8' }, opts));
}

describe('integration: stage hunks', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-explorer-test-'));
    run('git', ['init'], { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'line1\nline2\nline3\nline4\nline5\n');
    run('git', ['add', '.'], { cwd: tmpDir });
    run('git', ['commit', '-m', 'initial'], { cwd: tmpDir });
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  test('stages a single-line change via test-stage-hunks.js', () => {
    // modify file
    const filePath = path.join(tmpDir, 'file.txt');
    const content = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    content[1] = 'changed-line2';
    fs.writeFileSync(filePath, content.join('\n'), 'utf8');

    // prepare hunks.json that selects the changed + line
    const hunks = [
      {
        oldStart: 1,
        oldCount: 5,
        newStart: 1,
        newCount: 5,
        lines: [
          { type: ' ', text: 'line1' },
          { type: '-', text: 'line2', selected: true },
          { type: '+', text: 'changed-line2', selected: true },
          { type: ' ', text: 'line3' },
          { type: ' ', text: 'line4' }
        ]
      }
    ];

    fs.writeFileSync(path.join(tmpDir, 'hunks.json'), JSON.stringify({ filename: 'file.txt', hunks }, null, 2), 'utf8');

    const out = run(process.execPath, [path.join(__dirname, '..', 'scripts', 'test-stage-hunks.js')], { cwd: tmpDir });
    expect(out.status).toBe(0);
    // Confirm staged diff includes changed-line2
    const staged = run('git', ['diff', '--staged', '--', 'file.txt'], { cwd: tmpDir });
    expect(staged.stdout).toContain('+changed-line2');
    expect(staged.stdout).toContain('-line2');
  });
});
