const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git:fileHistory with --follow', () => {
  test('tracks file history through rename', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-filehistory-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });
    
    // Initial commit with file
    fs.writeFileSync(path.join(repo, 'oldname.txt'), 'content1\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: repo });
    
    // Rename file
    spawnSync('git', ['mv', 'oldname.txt', 'newname.txt'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'renamed'], { cwd: repo });
    
    // Modify renamed file
    fs.writeFileSync(path.join(repo, 'newname.txt'), 'content2\n');
    spawnSync('git', ['commit', '-am', 'modified'], { cwd: repo });
    
    // Query history with --follow
    const log = spawnSync('git', ['log', '--follow', '--format=%h %s', '--', 'newname.txt'], { cwd: repo, encoding: 'utf8' });
    expect(log.status === 0).toBeTruthy();
    expect(log.stdout).toMatch(/renamed/);
    expect(log.stdout).toMatch(/initial/);
    expect(log.stdout).toMatch(/modified/);
  }, 20000);
});
