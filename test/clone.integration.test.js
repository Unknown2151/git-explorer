const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('git:clone integration', () => {
  test('clones a local bare repository successfully', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-clone-'));
    const sourceRepo = path.join(tmp, 'source-repo');
    const cloneParent = path.join(tmp, 'clones');

    // Create source repo with a commit
    fs.mkdirSync(sourceRepo);
    spawnSync('git', ['init'], { cwd: sourceRepo });
    fs.writeFileSync(path.join(sourceRepo, 'README.md'), '# Test Repo\n');
    spawnSync('git', ['add', '.'], { cwd: sourceRepo });
    spawnSync('git', ['commit', '-m', 'Initial commit'], { cwd: sourceRepo });

    // Create a bare repo from source
    const bareRepo = path.join(tmp, 'source.git');
    spawnSync('git', ['clone', '--bare', sourceRepo, bareRepo]);
    expect(fs.existsSync(bareRepo)).toBeTruthy();

    // Create clone parent directory
    fs.mkdirSync(cloneParent);

    // Simulate the clone handler
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const url = bareRepo;
      const parentPath = cloneParent;

      // parse repo name
      const m = String(url).match(/[:\/]([^\/]+?)\/?(?:\.git)?$/);
      let repoName = 'repo';
      if (m && m[1]) repoName = m[1].replace(/\.git$/i, '');
      const targetPath = path.join(parentPath, repoName);

      // spawn git clone
      const p = spawn('git', ['clone', url, targetPath], { cwd: parentPath });
      let stderr = '';
      p.stderr.on('data', (c) => stderr += c.toString());
      p.on('close', (code) => {
        try {
          if (code === 0) {
            // Verify clone succeeded
            expect(fs.existsSync(targetPath)).toBeTruthy();
            expect(fs.existsSync(path.join(targetPath, '.git'))).toBeTruthy();
            expect(fs.existsSync(path.join(targetPath, 'README.md'))).toBeTruthy();

            // Verify we can run git commands in cloned repo
            const logResult = spawnSync('git', ['log', '--oneline'], { cwd: targetPath });
            expect(logResult.status).toBe(0);
            const output = logResult.stdout.toString();
            expect(output).toMatch(/Initial commit/);

            resolve(true);
          } else {
            throw new Error(`git clone failed: ${stderr}`);
          }
        } catch (e) {
          resolve(false);
          throw e;
        }
      });
      p.on('error', (err) => {
        resolve(false);
        throw err;
      });
    }).then((success) => {
      expect(success).toBe(true);
    });
  }, 30000);
});
