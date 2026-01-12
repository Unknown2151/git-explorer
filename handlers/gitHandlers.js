// handlers/gitHandlers.js
// Core git operation handlers for status, staging, and commits

module.exports = function registerGitHandlers(deps) {
  const { ipcMain, spawn, fs, path, git, dagre, Diff, BrowserWindow, utilityProcess, settings, commitDiffCache, fileDiffCache, nativeGitAvailable } = deps || {};

  if (!ipcMain || !spawn) {
    console.warn('[gitHandlers] Missing dependencies, skipping registration');
    return;
  }

  // Get repository status
  ipcMain.handle('git:status', async (_e, folderPath) => {
    if (!folderPath) return { error: 'Folder path required' };
    try {
      const p = spawn('git', ['status', '--porcelain'], { cwd: folderPath });
      let out = '';
      p.stdout.on('data', c => out += c.toString());
      return await new Promise((resolve) => {
        p.on('close', (code) => {
          if (code !== 0) return resolve({ error: `git status exited ${code}` });
          const lines = out.split(/\r?\n/).filter(Boolean);
          const files = lines.map(l => {
            const status = l.slice(0, 2).trim();
            const rest = l.slice(3).trim();
            return { status, path: rest };
          });
          resolve(files);
        });
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Stage a file
  ipcMain.handle('git:stage', async (_e, { folderPath, filename }) => {
    if (!folderPath || !filename) return { error: 'Missing args' };
    try {
      const p = spawn('git', ['add', '--', filename], { cwd: folderPath });
      return await new Promise((resolve) => {
        p.on('close', (code) => resolve(code === 0 ? { ok: true } : { error: `git add exited ${code}` }));
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Unstage a file
  ipcMain.handle('git:unstage', async (_e, { folderPath, filename }) => {
    if (!folderPath || !filename) return { error: 'Missing args' };
    try {
      const p = spawn('git', ['restore', '--staged', '--', filename], { cwd: folderPath });
      return await new Promise((resolve) => {
        p.on('close', (code) => resolve(code === 0 ? { ok: true } : { error: `git restore --staged exited ${code}` }));
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Create a commit
  ipcMain.handle('git:commit', async (_e, { folderPath, message }) => {
    if (!folderPath || !message) return { error: 'Missing args' };
    try {
      const p = spawn('git', ['commit', '-m', message], { cwd: folderPath });
      let out = '';
      p.stdout.on('data', c => out += c.toString());
      return await new Promise((resolve) => {
        p.on('close', (code) => resolve(code === 0 ? { ok: true, output: out } : { error: `git commit exited ${code}` }));
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Clone a repository into a parent path
  ipcMain.handle('git:clone', async (_e, { url, parentPath }) => {
    if (!url || !parentPath) return { success: false, error: 'Missing url or parentPath' };
    try {
      // parse repo name from url (handle https and scp-like)
      const m = String(url).match(/[:\/]([^\/]+?)\/?(?:\.git)?$/);
      let repoName = 'repo';
      if (m && m[1]) repoName = m[1].replace(/\.git$/i, '');
      const targetPath = path.join(parentPath, repoName);
      // spawn git clone
      const p = spawn('git', ['clone', url, targetPath], { cwd: parentPath });
      let stderr = '';
      p.stderr.on('data', (c) => stderr += c.toString());
      return await new Promise((resolve) => {
        p.on('close', (code) => {
          if (code === 0) return resolve({ success: true, path: targetPath });
          resolve({ success: false, error: stderr || `git clone exited ${code}` });
        });
        p.on('error', (err) => resolve({ success: false, error: err && err.message }));
      });
    } catch (err) { return { success: false, error: err && err.message }; }
  });

  // Rebase state tracking (in-memory)
  const rebaseStates = new Map();

  // Helper: start rebase by returning todo entries (without starting process)
  ipcMain.handle('git:rebase:start', async (_e, { folderPath, baseOid }) => {
    if (!folderPath || !baseOid) return { error: 'Missing args' };
    try {
      // list commits from base..HEAD in reverse (oldest->newest)
      const args = ['log', '--reverse', '--format=%H|%s', `${baseOid}..HEAD`];
      const p = spawn('git', args, { cwd: folderPath });
      let out = '';
      p.stdout.on('data', c => out += c.toString());
      return await new Promise((resolve) => {
        p.on('close', (code) => {
          if (code !== 0) return resolve({ error: `git log exited ${code}` });
          const lines = out.split(/\r?\n/).filter(Boolean);
          const todo = lines.map(l => {
            const parts = l.split('|');
            return { sha: parts[0], message: parts.slice(1).join('|'), action: 'pick', raw: l };
          });
          // store state (baseOid) so writeTodo/continue can use it
          rebaseStates.set(folderPath, { baseOid, tempTodoPath: null });
          resolve({ todo });
        });
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Write the todo lines to a temp file for the sequence editor
  ipcMain.handle('git:rebase:writeTodo', async (_e, { folderPath, lines }) => {
    if (!folderPath || !Array.isArray(lines)) return { error: 'Missing args' };
    try {
      const os = require('os');
      const tmp = os.tmpdir();
      const tmpFile = path.join(tmp, `rebase_todo_input_${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, lines.join('\n'), 'utf8');
      const state = rebaseStates.get(folderPath) || {};
      state.tempTodoPath = tmpFile;
      rebaseStates.set(folderPath, state);
      return { ok: true, path: tmpFile };
    } catch (err) { return { error: err && err.message }; }
  });

  // Continue (run) the interactive rebase using GIT_SEQUENCE_EDITOR trick
  ipcMain.handle('git:rebase:continue', async (_e, { folderPath }) => {
    if (!folderPath) return { error: 'Missing args' };
    try {
      const state = rebaseStates.get(folderPath);
      if (!state || !state.baseOid) return { error: 'No rebase state. Call start first.' };
      if (!state.tempTodoPath) return { error: 'No todo written. Call writeTodo first.' };
      const tempTodoListPath = state.tempTodoPath.replace(/\\/g, '/');
      // editor script writes the provided temp file into the path Git gives
      const editorScript = `node -e "const fs=require('fs'); fs.writeFileSync(process.argv[1], fs.readFileSync('${tempTodoListPath}'))"`;
      const env = Object.assign({}, process.env, { GIT_SEQUENCE_EDITOR: editorScript });
      const p = spawn('git', ['rebase', '-i', state.baseOid], { cwd: folderPath, env });
      return await new Promise((resolve) => {
        p.on('close', (code) => {
          // clean up temp file
          try { fs.unlinkSync(state.tempTodoPath); } catch (e) {}
          rebaseStates.delete(folderPath);
          if (code === 0) return resolve({ ok: true });
          // non-zero -> likely conflicts
          return resolve({ status: 'CONFLICT', code });
        });
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Abort an in-progress rebase
  ipcMain.handle('git:rebase:abort', async (_e, { folderPath }) => {
    if (!folderPath) return { error: 'Missing folderPath' };
    try {
      const p = spawn('git', ['rebase', '--abort'], { cwd: folderPath });
      return await new Promise((resolve) => {
        p.on('close', (code) => resolve(code === 0 ? { ok: true } : { error: `git rebase --abort exited ${code}` }));
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  // Convenience: interactive rebase helper per prompt
  ipcMain.handle('git:interactiveRebase', async (_e, { folderPath, baseHash, todoLines }) => {
    if (!folderPath || !baseHash || !Array.isArray(todoLines)) return { error: 'Missing args' };
    try {
      const os = require('os');
      const tmp = os.tmpdir();
      const tmpFile = path.join(tmp, `rebase_todo_input_${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, todoLines.join('\n'), 'utf8');
      const tempTodoListPath = tmpFile.replace(/\\/g, '/');
      const editorScript = `node -e "const fs=require('fs'); fs.writeFileSync(process.argv[1], fs.readFileSync('${tempTodoListPath}'))"`;
      const env = Object.assign({}, process.env, { GIT_SEQUENCE_EDITOR: editorScript });
      const p = spawn('git', ['rebase', '-i', baseHash], { cwd: folderPath, env });
      return await new Promise((resolve) => {
        p.on('close', (code) => {
          try { fs.unlinkSync(tmpFile); } catch (e) {}
          if (code === 0) return resolve({ ok: true });
          return resolve({ status: 'CONFLICT', code });
        });
        p.on('error', (err) => resolve({ error: err && err.message }));
      });
    } catch (err) { return { error: err && err.message }; }
  });

  console.info('[gitHandlers] registered core git handlers');
};
