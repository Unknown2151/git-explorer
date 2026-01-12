const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const remote = require('../lib/remote');

describe('remote manager integration', () => {
  test('list, set-url, prune basic flow', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-remote-'));
    const repo = path.join(tmp, 'repo');
    fs.mkdirSync(repo);
    const init = spawnSync('git', ['init'], { cwd: repo });
    expect(init.status).toBe(0);

    // create a commit so git is happy
    fs.writeFileSync(path.join(repo, 'README.md'), '# test\n');
    spawnSync('git', ['add', '.'], { cwd: repo });
    spawnSync('git', ['commit', '-m', 'init'], { cwd: repo });

    // create a local bare repo to act as remote (avoids network)
    const bare = path.join(tmp, 'remote-bare.git');
    const initBare = spawnSync('git', ['init', '--bare', bare]);
    expect(initBare.status).toBe(0);

    // add a remote pointing to the local bare repo
    const add = spawnSync('git', ['remote', 'add', 'origin', bare], { cwd: repo });
    expect(add.status).toBe(0);

    // list
    return remote.listRemotes(repo).then(res => {
      expect(res && res.ok).toBeTruthy();
      const remotes = res.remotes || [];
      const origin = remotes.find(r => r.name === 'origin');
      expect(origin).toBeTruthy();
      expect(origin.fetch || origin.push).toMatch(/remote-bare\.git/);

      // set-url (change fetch) to another local bare repo
      const updatedBare = path.join(tmp, 'remote-updated.git');
      const initUpdated = spawnSync('git', ['init', '--bare', updatedBare]);
      expect(initUpdated.status).toBe(0);

      return remote.setRemoteUrl(repo, 'origin', updatedBare, false).then(setRes => {
        expect(setRes && setRes.ok).toBeTruthy();
        return remote.listRemotes(repo).then(list2 => {
          expect(list2 && list2.ok).toBeTruthy();
          const after = list2.remotes.find(r => r.name === 'origin');
          expect(after.fetch || after.push).toMatch(/updated.git/);

          // prune (should succeed even if nothing to prune)
          return remote.pruneRemote(repo, 'origin').then(pRes => {
            try { process.stdout.write('prune result: ' + JSON.stringify(pRes) + '\n'); } catch (e) {}
            expect(pRes && pRes.ok).toBeTruthy();
          });
        });
      });
    });
  }, 20000);
});
