const { spawn } = require('child_process');

function parseRemoteLines(out) {
    // parse lines like: "origin\tgit@github.com:owner/repo.git (fetch)"
    const lines = (out || '').split(/\r?\n/).filter(Boolean);
    const map = new Map();
    lines.forEach(l => {
        const m = l.match(/^([^\t\s]+)\s+([^\s]+)\s+\((fetch|push)\)/);
        if (!m) return;
        const name = m[1];
        const url = m[2];
        const kind = m[3];
        if (!map.has(name)) map.set(name, { name, fetch: null, push: null });
        const entry = map.get(name);
        entry[kind] = url;
    });
    return Array.from(map.values());
}

function listRemotes(folderPath) {
    return new Promise((resolve) => {
        const p = spawn('git', ['remote', '-v'], { cwd: folderPath });
        let out = '';
        let err = '';
        p.stdout.on('data', c => out += c.toString());
        p.stderr.on('data', c => err += c.toString());
        p.on('close', (code) => {
            if (code !== 0) return resolve({ error: err || `git remote -v exited ${code}` });
            try {
                const remotes = parseRemoteLines(out);
                resolve({ ok: true, remotes });
            } catch (e) { resolve({ error: e && e.message }); }
        });
        p.on('error', (e) => resolve({ error: e && e.message }));
    });
}

function setRemoteUrl(folderPath, name, url, isPush) {
    return new Promise((resolve) => {
        if (!name || !url) return resolve({ error: 'Missing name or url' });
        const args = isPush ? ['remote', 'set-url', '--push', name, url] : ['remote', 'set-url', name, url];
        const p = spawn('git', args, { cwd: folderPath });
        let err = '';
        p.stderr.on('data', c => err += c.toString());
        p.on('close', (code) => {
            if (code !== 0) return resolve({ error: err || `git remote set-url exited ${code}` });
            resolve({ ok: true });
        });
        p.on('error', (e) => resolve({ error: e && e.message }));
    });
}

function pruneRemote(folderPath, name) {
    return new Promise((resolve) => {
        if (!name) return resolve({ error: 'Missing name' });
        const p = spawn('git', ['remote', 'prune', name], { cwd: folderPath });
        let out = '';
        let err = '';
        p.stdout.on('data', c => out += c.toString());
        p.stderr.on('data', c => err += c.toString());
        p.on('close', (code) => {
            if (code !== 0) return resolve({ error: err || `git remote prune exited ${code}` });
            resolve({ ok: true, output: out });
        });
        p.on('error', (e) => resolve({ error: e && e.message }));
    });
}

module.exports = { listRemotes, setRemoteUrl, pruneRemote };
