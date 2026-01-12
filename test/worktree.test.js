const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git worktree add/remove flow', () => {
  test('can add and remove a worktree', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-worktree-test-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'README.md'), '# test\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: repo });
    // create branch
    spawnSync('git', ['checkout', '-b', 'feature-1'], { cwd: repo });
    // go back to main
    spawnSync('git', ['checkout', 'master'], { cwd: repo });

    const wtPath = path.join(tmp, 'worktree1');
    // add worktree
    const add = spawnSync('git', ['worktree', 'add', wtPath, 'feature-1'], { cwd: repo });
    expect(add.status === 0).toBeTruthy();
    // list and ensure it's present
    const list = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd: repo, encoding: 'utf8' });
    expect(list.status === 0).toBeTruthy();
    expect(list.stdout).toMatch(/worktree /);
    // remove it
    const rm = spawnSync('git', ['worktree', 'remove', '--force', wtPath], { cwd: repo });
    expect(rm.status === 0).toBeTruthy();
  }, 20000);
});
