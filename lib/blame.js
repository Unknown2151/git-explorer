// Simple parser for `git blame --line-porcelain` output
function parseLinePorcelain(text) {
    const lines = (text || '').split(/\r?\n/);
    const results = [];
    let cur = null;
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i];
        if (!ln) continue;
        if (/^[0-9a-f]{40} /.test(ln)) {
            // header: <sha> <orig-line-no> <final-line-no> <num-lines?>
            const parts = ln.split(' ');
            cur = { commit: parts[0] };
            continue;
        }
        if (ln[0] === '\t') {
            // code line
            if (!cur) cur = {};
            cur.code = ln.slice(1);
            results.push(cur);
            cur = null;
            continue;
        }
        // key: value lines
        const sp = ln.split(' ');
        const key = sp[0];
        const val = ln.slice(key.length + 1);
        if (!cur) continue;
        if (key === 'author') cur.author = val;
        else if (key === 'author-mail') cur.authorMail = val;
        else if (key === 'author-time') cur.authorTime = Number(val) || 0;
        else if (key === 'author-tz') cur.authorTz = val;
        else if (key === 'committer') cur.committer = val;
        else if (key === 'summary') cur.summary = val;
        else if (key === 'filename') cur.filename = val;
        // ignore other keys for now
    }
    return results;
}

module.exports = { parseLinePorcelain };
