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

    const commitsWithLayout = [];
    g.nodes().forEach(oid => {
        const node = g.node(oid);
        const originalCommit = commits.find(c => c.oid === oid);
        commitsWithLayout.push({
            ...originalCommit,
            x: node.x,
            y: node.y,
        });
    });

    return commitsWithLayout;
});