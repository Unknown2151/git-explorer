const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git conflict versions', () => {
  test('creates merge conflict and stages unmerged entries', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-conflict-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });
    // initial file
    fs.writeFileSync(path.join(repo, 'f.txt'), 'line1\ncommon\nline3\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: repo });
    // branch and change
    spawnSync('git', ['checkout', '-b', 'branch-a'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'f.txt'), 'line1\nTHEIRS\nline3\n');
    spawnSync('git', ['commit', '-am', 'branch change'], { cwd: repo });
    // checkout master and change
    spawnSync('git', ['checkout', 'master'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'f.txt'), 'line1\nOURS\nline3\n');
    spawnSync('git', ['commit', '-am', 'master change'], { cwd: repo });
    // attempt merge to cause conflict
    const m = spawnSync('git', ['merge', 'branch-a'], { cwd: repo, encoding: 'utf8' });
    // merge should exit non-zero and leave unmerged entries
    expect(m.status !== 0).toBeTruthy();
    const ls = spawnSync('git', ['ls-files', '-u'], { cwd: repo, encoding: 'utf8' });
    expect(ls.status === 0).toBeTruthy();
    // ensure staged entries are present
    expect(ls.stdout && ls.stdout.includes('f.txt')).toBeTruthy();
    // read stage contents
    const anc = spawnSync('git', ['show', ':1:f.txt'], { cwd: repo, encoding: 'utf8' });
    const ours = spawnSync('git', ['show', ':2:f.txt'], { cwd: repo, encoding: 'utf8' });
    const theirs = spawnSync('git', ['show', ':3:f.txt'], { cwd: repo, encoding: 'utf8' });
    expect(anc.status === 0).toBeTruthy();
    expect(ours.status === 0).toBeTruthy();
    expect(theirs.status === 0).toBeTruthy();
    expect(ours.stdout.includes('OURS')).toBeTruthy();
    expect(theirs.stdout.includes('THEIRS')).toBeTruthy();
  }, 30000);
});
