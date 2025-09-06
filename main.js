const { app, BrowserWindow, ipcMain, dialog, utilityProcess } = require('electron');
const path = require('path');
const git = require('isomorphic-git');
const fs = require('fs');
const dagre = require('dagre');
const Diff = require('diff');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('index.html');
    win.webContents.openDevTools();
};

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:selectFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return canceled ? null : filePaths[0];
});

ipcMain.handle('git:getLog', async (_e, folderPath) => {
    if (!folderPath || typeof folderPath !== 'string') {
        return { error: 'Invalid folder path provided.' };
    }
    try {
        return await git.log({ fs, dir: folderPath, depth: 50 });
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('git:calculateLayout', async (_e, commits) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({});
    g.setDefaultEdgeLabel(() => ({}));

    commits.forEach(commit => {
        g.setNode(commit.oid, {
            label: commit.commit.message,
            width: 40,
            height: 40
        });
    });

    commits.forEach(commit => {
        commit.commit.parent.forEach(parentOid => {
            g.setEdge(parentOid, commit.oid);
        });
    });

    dagre.layout(g);

    const palette = [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
        '#f58231', '#911eb4', '#46f0f0', '#f032e6',
        '#bcf60c', '#fabebe', '#008080', '#e6beff',
        '#9a6324', '#fffac8', '#800000', '#aaffc3',
        '#808000', '#ffd8b1', '#000075'
    ];

    const xMap = new Map();
    let colorIndex = 0;

    return g.nodes().map(oid => {
        const node = g.node(oid);
        const commit = commits.find(c => c.oid === oid);

        if (!xMap.has(node.x)) {
            xMap.set(node.x, colorIndex);
            colorIndex = (colorIndex + 1) % palette.length;
        }
        const assignedColor = palette[xMap.get(node.x)];

        return {
            ...commit,
            x: node.x,
            y: node.y,
            color: assignedColor
        };
    });
});

ipcMain.handle('git:getCommitDiff', (event, { folderPath, oid, parentOid }) => {
    return new Promise((resolve) => {
        const worker = utilityProcess.fork(path.join(__dirname, 'diff-worker.js'));

        worker.on('message', (response) => {
            console.log("Worker response:", response);
            if (response.success) {
                resolve(response.data);
            } else {
                resolve({ error: response.error });
            }
            worker.kill();
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                resolve({ error: `Worker stopped with exit code: ${code}` });
            }
        });

        worker.postMessage({ folderPath, oid, parentOid });
    });
});

ipcMain.handle('git:getFileDiff', async (_e, { folderPath, oid, parentOid, filename }) => {
    let before = '';
    let after = '';

    try {
        const { blob } = await git.readBlob({ fs, dir: folderPath, oid, filepath: filename });
        after = Buffer.from(blob).toString('utf8');
    } catch {}

    try {
        if (parentOid) {
            const { blob } = await git.readBlob({ fs, dir: folderPath, oid: parentOid, filepath: filename });
            before = Buffer.from(blob).toString('utf8');
        }
    } catch {}

    return Diff.createPatch(filename, before, after);
});