const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const staging = require('../lib/staging');

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-stage-'));
  console.log('tmpDir', tmpDir);
  spawnSync('git', ['init', '--quiet'], { cwd: tmpDir });
  const filename = 'newfile.txt';
  const hunks = [{ header: '@@ -1,0 +1,2 @@', oldStart: 1, oldCount: 0, newStart: 1, newCount: 2, lines: [
      { type: '+', text: 'Line A', selected: true },
      { type: '+', text: 'Line B', selected: true }
    ] }];

  try {
    const patch = await staging.buildPatchFromHunks(tmpDir, filename, hunks);
    console.log('PATCH:\n', patch);
    const res = await staging.stageHunks(tmpDir, filename, hunks);
    console.log('RESULT:', res);
    const diff = spawnSync('git', ['diff', '--staged', '--', filename], { cwd: tmpDir }).stdout.toString();
    console.log('STAGED DIFF:\n', diff);
  } catch (e) {
    console.error('ERROR', e);
  }
})();
