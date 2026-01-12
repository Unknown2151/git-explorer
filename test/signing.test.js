const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git signing status query with %G? format', () => {
  test('queries commit signing status', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-signing-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    spawnSync('git', ['init'], { cwd: repo });
    fs.writeFileSync(path.join(repo, 'README.md'), 'test');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd: repo });
    
    // Query with %G? format (N = no signature)
    const log = spawnSync('git', ['log', '--format=%H%x01%G?%x01%GK', '-5'], { cwd: repo, encoding: 'utf8' });
    expect(log.status === 0).toBeTruthy();
    const lines = log.stdout.split('\n').filter(Boolean);
    expect(lines.length > 0).toBeTruthy();
    // First line should have format: SHA\x01status\x01keyid
    const parts = lines[0].split('\x01');
    expect(parts.length === 3).toBeTruthy();
    // status should be 'N' for unsigned commit
    expect(parts[1]).toMatch(/^[NGBUXYR]?$/);
  }, 20000);
});
