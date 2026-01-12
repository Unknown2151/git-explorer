const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { topFiles } = require('../lib/author');

describe('lib/author.topFiles', () => {
  test('returns top files for an author', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-author-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });

    // create files and commits
    fs.writeFileSync(path.join(repo, 'a.txt'), 'one');
    fs.writeFileSync(path.join(repo, 'b.txt'), 'one');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'c1', '--author', 'Alice <alice@example.com>'], { cwd: repo });

    fs.writeFileSync(path.join(repo, 'a.txt'), 'two');
    spawnSync('git', ['commit', '-am', 'c2', '--author', 'Alice <alice@example.com>'], { cwd: repo });

    fs.writeFileSync(path.join(repo, 'b.txt'), 'two');
    spawnSync('git', ['commit', '-am', 'c3', '--author', 'Bob <bob@example.com>'], { cwd: repo });

    const files = topFiles(repo, 'Alice');
    expect(files.find(f => f.path === 'a.txt').count).toBeGreaterThanOrEqual(2);
    expect(files.find(f => f.path === 'b.txt').count).toBeGreaterThanOrEqual(1);
  });
});
