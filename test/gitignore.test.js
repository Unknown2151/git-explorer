const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { readGitignore, appendGitignore, writeGitignore } = require('../lib/gitignore');

describe('gitignore helpers', () => {
  test('read/append/write patterns and check-ignore', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-ignore-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });

    // start with empty gitignore
    expect(readGitignore(repo)).toEqual([]);

    // append pattern
    appendGitignore(repo, '*.log');
    const after = readGitignore(repo);
    expect(after).toContain('*.log');

    // git check-ignore should mark a matching filename as ignored
    const chk = spawnSync('git', ['check-ignore', 'error.log'], { cwd: repo });
    // exit code 0 => ignored
    expect(chk.status === 0).toBeTruthy();

    // write new patterns
    writeGitignore(repo, ['node_modules/', '.env']);
    const rew = readGitignore(repo);
    expect(rew).toContain('node_modules/');
    expect(rew).toContain('.env');
  });
});
