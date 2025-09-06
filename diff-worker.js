const fs = require('fs');
const git = require('isomorphic-git');

const anEmptyTreeOid = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

process.parentPort.on('message', async (e) => {
    const { folderPath, oid, parentOid } = e.data;
    try {
        const ref1 = parentOid || anEmptyTreeOid;
        const ref2 = oid;

        const fileChanges = await git.statusMatrix({
            fs,
            dir: folderPath,
            ref1: ref1,
            ref2: ref2
        });

        const result = fileChanges.map(([filename, head, workdir, stage]) => ({
            filename,
            status: head === 0 && workdir === 2 ? 'added' :
                head === 1 && workdir === 0 ? 'deleted' :
                    head === 1 && workdir === 2 ? 'modified' : 'unknown'
        }));
        process.parentPort.postMessage({ success: true, data: result });
    } catch (err) {
        process.parentPort.postMessage({ success: false, error: err.message });
    }
});