const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    getLog: (folderPath) => ipcRenderer.invoke('git:getLog', folderPath),
    calculateLayout: (commits) => ipcRenderer.invoke('git:calculateLayout', commits),
    getCommitDiff: (args) => ipcRenderer.invoke('git:getCommitDiff', args),
    getFileDiff: (args) => ipcRenderer.invoke('git:getFileDiff', args)
});
