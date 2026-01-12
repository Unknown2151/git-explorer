const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { writeFileToWorktree } = require('../lib/writeFile');

describe('git:writeFile integration', () => {
  test('writes file content to working tree via helper', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-writefile-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    // init repo so path looks realistic
    const init = spawnSync('git', ['init'], { cwd: repo });
    expect(init.status === 0).toBeTruthy();

    const filename = 'hello.txt';
    const content = 'This is a test\nLine two\n';
    const res = writeFileToWorktree(repo, filename, content);
    expect(res && res.ok).toBeTruthy();

    const full = path.join(repo, filename);
    expect(fs.existsSync(full)).toBeTruthy();
    const read = fs.readFileSync(full, 'utf8');
    expect(read).toBe(content);
  }, 10000);
});
