const fs = require('fs');
const path = require('path');

function readGitignore(folderPath) {
  const p = path.join(folderPath, '.gitignore');
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8');
  return raw.split(/\r?\n/).filter(Boolean);
}

function appendGitignore(folderPath, pattern) {
  const p = path.join(folderPath, '.gitignore');
  fs.appendFileSync(p, (fs.existsSync(p) ? '\n' : '') + pattern + '\n', 'utf8');
  return true;
}

function writeGitignore(folderPath, patterns) {
  const p = path.join(folderPath, '.gitignore');
  const content = (patterns || []).map(l => (l || '').replace(/\r?\n/g, '')).join('\n') + '\n';
  fs.writeFileSync(p, content, 'utf8');
  return true;
}

module.exports = { readGitignore, appendGitignore, writeGitignore };
