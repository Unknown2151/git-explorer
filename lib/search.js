// Simple search query parser for git:search
function parseSearchQuery(query) {
    const parts = (query || '').match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const baseArgs = ['log', '--format=%H%x01%h%x01%an%x01%ae%x01%ad%x01%s', '--date=iso'];
    const greps = [];
    let filePath = null;
    let hash = null;
    for (const raw of parts) {
        const token = raw.replace(/^"|"$/g, '');
        if (!token) continue;
        if (token.startsWith('author:')) {
            const val = token.slice(7);
            // allow comma-separated authors
            const authors = val.split(',').map(s => s.trim()).filter(Boolean);
            authors.forEach(a => baseArgs.push(`--author=${a}`));
        } else if (token.startsWith('date:')) {
            const spec = token.slice(5);
            if (spec.includes('..')) {
                const [since, until] = spec.split('..').map(s => s.trim());
                if (since) baseArgs.push(`--since=${since}`);
                if (until) baseArgs.push(`--until=${until}`);
            } else if (spec.startsWith('>')) {
                baseArgs.push(`--since=${spec.slice(1)}`);
            } else if (spec.startsWith('<')) {
                baseArgs.push(`--until=${spec.slice(1)}`);
            } else {
                // exact day -> treat as since that day
                baseArgs.push(`--since=${spec}`);
            }
        } else if (token.startsWith('file:')) {
            filePath = token.slice(5);
        } else if (token.startsWith('hash:')) {
            hash = token.slice(5);
        } else {
            greps.push(token);
        }
    }
    return { args: baseArgs, greps, filePath, hash };
}

module.exports = { parseSearchQuery };
