const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function spawnPromise(cmd, args, opts = {}, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, Object.assign({}, opts));
    let stdout = '';
    let stderr = '';
    if (p.stdout) p.stdout.on('data', c => stdout += c.toString());
    if (p.stderr) p.stderr.on('data', c => stderr += c.toString());
    p.on('error', err => reject(err));
    p.on('close', code => resolve({ code, stdout, stderr }));
    if (input && p.stdin) {
      p.stdin.write(input);
      p.stdin.end();
    }
  });
}

async function readHeadOrWorktree(folderPath, filename) {
  try {
    const r = await spawnPromise('git', ['show', `HEAD:${filename}`], { cwd: folderPath });
    if (r.code === 0 && r.stdout) return r.stdout;
  } catch (e) {}
  try {
    return fs.readFileSync(path.join(folderPath, filename), 'utf8');
  } catch (e) { return ''; }
}

// Build a minimal unified diff for the selected hunks. This respects selected flags and editedText.
async function buildPatchFromHunks(folderPath, filename, hunks) {
  if (!folderPath || !filename || !Array.isArray(hunks)) throw new Error('Missing args');
  const before = await readHeadOrWorktree(folderPath, filename);
  const beforeLines = before.split(/\r?\n/);

  const hunksToApply = [];
  for (const h of hunks) {
    const oldStart = Number(h.oldStart) || 1;
    const oldCount = Number(h.oldCount) || 0;
    const beforeChunk = beforeLines.slice(oldStart - 1, oldStart - 1 + oldCount);
    const afterChunk = [];
    let p = 0;
    for (let li = 0; li < (h.lines || []).length; li++) {
      const ln = h.lines[li];
      const type = ln.type || (ln.raw && ln.raw[0]) || ' ';
      const text = typeof ln.text === 'string' ? ln.text : (ln.raw ? ln.raw.slice(1) : '');
      const selected = !!ln.selected;
      if (type === ' ') {
        const src = beforeChunk[p] !== undefined ? beforeChunk[p] : text;
        afterChunk.push(src);
        p++;
      } else if (type === '-') {
        if (selected) { p++; } else { const src = beforeChunk[p] !== undefined ? beforeChunk[p] : text; afterChunk.push(src); p++; }
      } else if (type === '+') {
        if (selected) { const inserted = typeof ln.editedText === 'string' ? ln.editedText : text; afterChunk.push(inserted); }
      }
    }
    const newCount = afterChunk.length;
    hunksToApply.push({ oldStart, oldCount, newCount, beforeChunk, afterChunk, header: h.header, lines: h.lines });
  }

  let patch = '';
  patch += `diff --git a/${filename} b/${filename}\n`;
  patch += `--- a/${filename}\n`;
  patch += `+++ b/${filename}\n`;
  for (const hh of hunksToApply) {
    const oldStart = hh.oldStart;
    // compute counts based on lines we will emit to avoid corrupt-patch errors
    let oldCount = 0;
    let newCount = 0;
    for (const ln of hh.lines) {
      const type = ln.type || (ln.raw && ln.raw[0]) || ' ';
      if (type === ' ' || type === '-') oldCount++;
      if (type === ' ' || type === '+') newCount++;
    }
    const newStart = oldStart;
    patch += `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n`;
    for (const ln of hh.lines) {
      const type = ln.type || (ln.raw && ln.raw[0]) || ' ';
      const text = typeof ln.text === 'string' ? ln.text : (ln.raw ? ln.raw.slice(1) : '');
      const selected = !!ln.selected;
      if (type === ' ') patch += ` ${text}\n`;
      else if (type === '-') { if (selected) patch += `-${text}\n`; else patch += ` ${text}\n`; }
      else if (type === '+') { if (selected) { const inserted = typeof ln.editedText === 'string' ? ln.editedText : text; patch += `+${inserted}\n`; } }
    }
  }

  if (!patch.endsWith('\n')) patch += '\n';
  return patch;
}

// Compute the file contents after applying selected hunks. This is used to materialize new files
// so git can create an index entry (intent-to-add) before applying a patch to the index.
async function computeAfterContent(folderPath, filename, hunks) {
  const before = await readHeadOrWorktree(folderPath, filename);
  const beforeLines = before ? before.split(/\r?\n/) : [];
  // make a mutable copy
  const result = beforeLines.slice();
  for (const h of hunks) {
    const oldStart = Number(h.oldStart) || 1;
    const oldCount = Number(h.oldCount) || 0;
    const beforeChunk = beforeLines.slice(oldStart - 1, oldStart - 1 + oldCount);
    const afterChunk = [];
    let p = 0;
    for (let li = 0; li < (h.lines || []).length; li++) {
      const ln = h.lines[li];
      const type = ln.type || (ln.raw && ln.raw[0]) || ' ';
      const text = typeof ln.text === 'string' ? ln.text : (ln.raw ? ln.raw.slice(1) : '');
      const selected = !!ln.selected;
      if (type === ' ') {
        const src = beforeChunk[p] !== undefined ? beforeChunk[p] : text;
        afterChunk.push(src);
        p++;
      } else if (type === '-') {
        if (selected) { p++; } else { const src = beforeChunk[p] !== undefined ? beforeChunk[p] : text; afterChunk.push(src); p++; }
      } else if (type === '+') {
        if (selected) { const inserted = typeof ln.editedText === 'string' ? ln.editedText : text; afterChunk.push(inserted); }
      }
    }
    // replace region in result
    const from = Math.max(0, oldStart - 1);
    result.splice(from, oldCount, ...afterChunk);
  }
  return result.join('\n');
}

async function ensureIndexEntry(folderPath, filename) {
  try {
    const ls = await spawnPromise('git', ['ls-files', '--error-unmatch', '--', filename], { cwd: folderPath });
    if (ls.code === 0) return true;
    const added = await spawnPromise('git', ['add', '--intent-to-add', '--', filename], { cwd: folderPath });
    // re-check
    const ls2 = await spawnPromise('git', ['ls-files', '--error-unmatch', '--', filename], { cwd: folderPath });
    return ls2.code === 0;
  } catch (e) { return false; }
}

async function writeBackup(folderPath, filename, patch) {
  try {
    const backupsDir = path.join(folderPath, '.git', 'patch-backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const ts = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const backupPath = path.join(backupsDir, `${ts}-${safeName}.patch`);
    fs.writeFileSync(backupPath, patch, 'utf8');
    return backupPath;
  } catch (e) { return null; }
}

async function applyPatchToIndex(folderPath, patch, force) {
  // use --index which updates the index (and worktree) and is more permissive for new files
  // First attempt: dry-run check against the index (preferred). Don't fail early on check failures;
  // some environments may report a conservative check failure while apply --index would succeed.
  let check = null;
  if (!force) {
    try { check = await spawnPromise('git', ['apply', '--check', '--index', '-p0', '--unidiff-zero', '-'], { cwd: folderPath }, patch); } catch (e) { check = null; }
  }

  // Try to apply using --index which updates the index (and worktree) and is more permissive for new files
  const applyIndex = await spawnPromise('git', ['apply', '--index', '-p0', '--unidiff-zero', '-'], { cwd: folderPath }, patch);
  if (applyIndex && applyIndex.code === 0) return { ok: true };

  // If applying to index failed, fall back to applying to the working tree and then git add the affected files
  const applyWT = await spawnPromise('git', ['apply', '-p0', '--unidiff-zero', '-'], { cwd: folderPath }, patch);
  if (!applyWT || applyWT.code !== 0) {
    return { ok: false, error: (applyIndex && (applyIndex.stderr || applyIndex.stdout)) || (applyWT && (applyWT.stderr || applyWT.stdout)) || 'git apply failed' };
  }

  // parse file paths from patch headers (lines like: diff --git a/<path> b/<path>)
  const files = [];
  const lines = (patch || '').split(/\r?\n/);
  for (const ln of lines) {
    if (ln.startsWith('diff --git')) {
      // format: diff --git a/<path> b/<path>
      const parts = ln.split(' ');
      if (parts.length >= 4) {
        const a = parts[2];
        const b = parts[3];
        const p = b.replace(/^b\//, '');
        files.push(p);
      }
    }
  }

  // Stage affected files (use normal git add so new files are added and modifications staged)
  for (const f of files) {
    try {
      await spawnPromise('git', ['add', '--', f], { cwd: folderPath });
    } catch (e) {
      // non-fatal: continue to next file
    }
  }

  return { ok: true };
}

async function stageHunks(folderPath, filename, hunks, force) {
  if (!folderPath || !filename || !Array.isArray(hunks)) throw new Error('Missing args');
  const patch = await buildPatchFromHunks(folderPath, filename, hunks);
  // If file does not exist in worktree, materialize the after-content so git can create an index entry
  const fullPath = path.join(folderPath, filename);
  if (!fs.existsSync(fullPath)) {
    try {
      const content = await computeAfterContent(folderPath, filename, hunks);
      // ensure parent dir exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content || '', 'utf8');
    } catch (e) {
      // ignore write failures; ensureIndexEntry will attempt intent-to-add anyway
    }
  }
  await ensureIndexEntry(folderPath, filename);
  const checkResult = await applyPatchToIndex(folderPath, patch, !!force);
  if (!checkResult.ok) {
    // fallback: write after-content to worktree and git add the file
    try {
      const afterContent = await computeAfterContent(folderPath, filename, hunks);
      fs.writeFileSync(fullPath, afterContent || '', 'utf8');
      // stage the file
      await spawnPromise('git', ['add', '--', filename], { cwd: folderPath });
      const backupPath = await writeBackup(folderPath, filename, patch);
      return { ok: true, patch, backupPath, fallback: true, error: checkResult.error };
    } catch (e) {
      return { ok: false, error: checkResult.error + ' ; fallback failed: ' + (e && e.message), patch };
    }
  }
  const backupPath = await writeBackup(folderPath, filename, patch);
  return { ok: true, patch, backupPath };
}

module.exports = { buildPatchFromHunks, stageHunks };
