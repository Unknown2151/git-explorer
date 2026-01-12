const { spawnSync } = require('child_process');

function topFiles(folderPath, author) {
  // returns array of { path, count }
  // run: git log --author=<author> --name-only --pretty=format:"" and count occurrences
  const p = spawnSync('git', ['log', `--author=${author}`, '--name-only', '--pretty=format:'], { cwd: folderPath, encoding: 'utf8' });
  if (p.status !== 0) throw new Error(p.stderr || `git exited ${p.status}`);
  const lines = (p.stdout || '').split(/\r?\n/).filter(Boolean);
  const counts = {};
  lines.forEach(l => { counts[l] = (counts[l] || 0) + 1; });
  const arr = Object.keys(counts).map(k => ({ path: k, count: counts[k] }));
  arr.sort((a,b) => b.count - a.count);
  return arr;
}

module.exports = { topFiles };
