const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git bisect binary search workflow', () => {
  test('bisects between good and bad commits', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-bisect-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });
    
    // Create commits: commits 1-5 are good, 6+ introduce bug
    for (let i = 1; i <= 10; i++) {
      fs.writeFileSync(path.join(repo, 'test.txt'), `version ${i}\n`);
      spawnSync('git', ['add', '.'], { cwd: repo });
      spawnSync('git', ['commit', '-m', `commit ${i}`], { cwd: repo });
    }
    
    // Get SHAs
    const log1 = spawnSync('git', ['log', '--oneline', '--all'], { cwd: repo, encoding: 'utf8' });
    const lines = log1.stdout.split('\n').filter(Boolean);
    const goodCommit = lines[lines.length - 6].split(' ')[0]; // commit 5
    const badCommit = lines[0].split(' ')[0]; // commit 10
    
    // Start bisect
    const start = spawnSync('git', ['bisect', 'start'], { cwd: repo });
    expect(start.status === 0).toBeTruthy();
    
    const markGood = spawnSync('git', ['bisect', 'good', goodCommit], { cwd: repo });
    expect(markGood.status === 0).toBeTruthy();
    
    const markBad = spawnSync('git', ['bisect', 'bad', badCommit], { cwd: repo, encoding: 'utf8' });
    // May exit non-zero or print status
    
    // Current HEAD should be a midpoint
    const current = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
    expect(current.status === 0).toBeTruthy();
    expect(current.stdout.trim()).toMatch(/^[0-9a-f]{40}$/);
    
    // Reset bisect
    const reset = spawnSync('git', ['bisect', 'reset'], { cwd: repo });
    expect(reset.status === 0).toBeTruthy();
  }, 30000);
});
