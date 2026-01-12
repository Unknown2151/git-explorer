const fs = require('fs');
const path = require('path');

function writeFileToWorktree(folderPath, filename, content) {
  if (!folderPath || !filename) throw new Error('Missing args');
  const target = path.join(folderPath, filename);
  fs.writeFileSync(target, content || '', 'utf8');
  return { ok: true };
}

module.exports = { writeFileToWorktree };
