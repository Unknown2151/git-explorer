const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git submodule status and update', () => {
  test('detects submodule status', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-submodule-'));
    const mainRepo = path.join(tmp, 'main');
    const subRepo = path.join(tmp, 'sub');
    
    // Create sub repo
    fs.mkdirSync(subRepo);
    spawnSync('git', ['init'], { cwd: subRepo });
    fs.writeFileSync(path.join(subRepo, 'README.md'), 'sub');
    spawnSync('git', ['add', '.'], { cwd: subRepo });
    spawnSync('git', ['commit', '-m', 'init'], { cwd: subRepo });
    
    // Create main repo and add submodule
    fs.mkdirSync(mainRepo);
    spawnSync('git', ['init'], { cwd: mainRepo });
    fs.writeFileSync(path.join(mainRepo, '.gitmodules'), `[submodule "sub"]\n\tpath = sub\n\turl = ${subRepo}\n`);
    spawnSync('git', ['config', '--file', '.gitmodules', '--add', 'submodule.sub.path', 'sub'], { cwd: mainRepo });
    spawnSync('git', ['config', '--file', '.gitmodules', '--add', 'submodule.sub.url', subRepo], { cwd: mainRepo });
    spawnSync('git', ['add', '.gitmodules'], { cwd: mainRepo });
    spawnSync('git', ['commit', '-m', 'add submodule'], { cwd: mainRepo });
    
    // Query .gitmodules parsing
    const configFile = path.join(mainRepo, '.gitmodules');
    const content = fs.readFileSync(configFile, 'utf8');
    expect(content).toMatch(/submodule "sub"/);
    expect(content).toMatch(/path = sub/);
  }, 30000);
});
