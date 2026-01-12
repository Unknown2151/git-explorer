const fs = require('fs');
const git = require('isomorphic-git');
let parentPort;
try {
    // In worker_threads context this will be available.
    ({ parentPort } = require('worker_threads'));
} catch (e) {
    parentPort = undefined;
}

// Unified send function that works for worker_threads (parentPort.postMessage)
// and for child process IPC (process.send).
function send(msg) {
    if (parentPort && typeof parentPort.postMessage === 'function') {
        try { parentPort.postMessage(msg); } catch (e) { /* ignore */ }
        return;
    }
    if (typeof process !== 'undefined' && typeof process.send === 'function') {
        try { process.send(msg); } catch (e) { /* ignore */ }
    }
}

async function handleMessage(msg) {
    try {
        const { folderPath, oid, parentOid } = msg || {};
        if (!folderPath || !oid) return send({ success: false, error: 'Missing args' });

        // Use isomorphic-git's statusMatrix to derive file change status incrementally.
        const rows = await git.statusMatrix({ fs, dir: folderPath, ref1: parentOid || undefined, ref2: oid });
        const results = [];
        for (const row of rows) {
            const [filename, head, workdir/*, stage*/] = row;
            let status = 'unknown';
            if (head === 0 && workdir === 2) status = 'added';
            else if (head === 1 && workdir === 0) status = 'deleted';
            else if (head === 1 && workdir === 2) status = 'modified';
            else if (head === 0 && workdir === 0) status = 'added';
            const fileObj = { filename, status, oldFilename: undefined };
            results.push(fileObj);
            // send incremental progress so renderer can show partial lists quickly
            send({ progress: true, oid, file: fileObj });
        }

        send({ success: true, data: results });
    } catch (err) {
        send({ success: false, error: String(err && err.message ? err.message : err) });
    }
}

// Support both worker_threads (parentPort) and child-process IPC (process.on('message')).
if (parentPort && typeof parentPort.on === 'function') {
    parentPort.on('message', (m) => void handleMessage(m));
} else if (typeof process !== 'undefined' && typeof process.on === 'function') {
    process.on('message', (m) => void handleMessage(m));
}

// Accept one-shot invocation via argv for debugging convenience.
if (require.main === module && process.argv.length > 2) {
    try {
        const payload = JSON.parse(process.argv[2]);
        handleMessage(payload).catch(() => {});
    } catch (e) { /* ignore malformed argv */ }
}