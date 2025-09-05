const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');
const git = require('isomorphic-git');
const fs = require('fs');
const dagre = require('dagre');


const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
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
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

ipcMain.handle('dialog:selectFolder', async () => {
    console.log('ipcMain: Received signal to open folder dialog.');
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) {
        return;
    } else {
        return filePaths[0];
    }
});

ipcMain.handle('git:getLog', async (events, folderPath) => {
    if (!folderPath || typeof folderPath !== 'string') {
        return { error: 'Invalid folder path provided.' };
    }
    try {
        const commits = await git.log({
            fs,
            dir: folderPath,
            depth: 50
        });
        return commits;
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('git:calculateLayout', async (event, commits) => {
    console.log('--- In Main Process: Received this data in calculateLayout ---');
    console.log(commits);
    const g = new dagre.graphlib.Graph();
    g.setGraph({});
    g.setDefaultEdgeLabel(() => ({}));

    commits.forEach(commit => {
        g.setNode(commit.oid, { label: commit.commit.message, width: 40, height: 40 });
    });

    commits.forEach(commit => {
        commit.commit.parent.forEach(parentOid => {
            g.setEdge(parentOid, commit.oid);
        });
    });

    dagre.layout(g);

    const colorPalette = [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
        '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
        '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
        '#aaffc3', '#808000', '#ffd8b1', '#000075'
    ];
    const xCoords = new Map();
    let colorIndex = 0;

    const commitsWithLayout = [];
    g.nodes().forEach(oid => {
        const node = g.node(oid);
        const originalCommit = commits.find(c => c.oid === oid);

        if (!xCoords.has(node.x)) {
            xCoords.set(node.x, colorIndex);
            colorIndex = (colorIndex + 1) % colorPalette.length;
        }
        const assignedColorIndex = xCoords.get(node.x);

        commitsWithLayout.push({
            ...originalCommit,
            x: node.x,
            y: node.y,
            color: colorPalette[assignedColorIndex]
        });
    });

    return commitsWithLayout;
});

const anEmptyTreeOid = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

ipcMain.handle('git:getCommitDiff', async (event, { folderPath, oid, parentOid }) => {
    try {
        const ref1 = parentOid || anEmptyTreeOid;
        const ref2 = oid;

        const fileChanges = await git.statusMatrix({
            fs,
            dir: folderPath,
            ref1: ref1,
            ref2: ref2
        });

        return fileChanges.map(([filename, head, workdir, stage]) => ({
            filename,
            status: head === 0 && workdir === 2 ? 'added' :
                head === 1 && workdir === 0 ? 'deleted' :
                    head === 1 && workdir === 2 ? 'modified' : 'unknown'
        }));

    } catch (e) {
        return { error: e.message };
    }
});