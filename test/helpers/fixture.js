const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function mktempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'git-explorer-fixture-'));
}

function run(dir, cmd) {
  return execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function write(dir, name, content) {
  fs.writeFileSync(path.join(dir, name), content, 'utf8');
}

module.exports = { mktempDir, run, write };
