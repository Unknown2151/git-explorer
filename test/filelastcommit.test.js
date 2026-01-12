const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git file last commit time', () => {
  test('git log returns a unix timestamp for last commit of a file', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-filetime-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'a.txt'), 'hello');
    spawnSync('git', ['add', 'a.txt'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'add a'], { cwd: repo });
    const r = spawnSync('git', ['log', '-1', '--format=%ct', '--', 'a.txt'], { cwd: repo, encoding: 'utf8' });
    expect(r.status === 0).toBeTruthy();
    const t = parseInt((r.stdout || '').trim(), 10);
    expect(Number.isFinite(t) && t > 0).toBeTruthy();
  });
});
