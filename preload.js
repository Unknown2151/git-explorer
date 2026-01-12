const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    cloneRepo: (url, parentPath) => ipcRenderer.invoke('git:clone', { url, parentPath }),
    getLog: (folderPath) => ipcRenderer.invoke('git:getLog', folderPath),
    calculateLayout: (commits) => ipcRenderer.invoke('git:calculateLayout', commits),
    getCommitDiff: (args) => ipcRenderer.invoke('git:getCommitDiff', args),
    getFileDiff: (args) => ipcRenderer.invoke('git:getFileDiff', args),
    getFileDiffHunks: (args) => ipcRenderer.invoke('git:getFileDiffHunks', args)
    ,
    getDiffCached: (folderPath) => ipcRenderer.invoke('git:diffCached', { folderPath })
});

contextBridge.exposeInMainWorld('debugApi', {
    clearCache: () => ipcRenderer.invoke('cache:clear'),
    // get debug info such as which IPC method was last used by worker
    getWorkerIpcMethod: () => ipcRenderer.invoke('debug:getWorkerIpcMethod')
});

contextBridge.exposeInMainWorld('settingsApi', {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s) => ipcRenderer.invoke('settings:set', s),
    setCacheSizes: (commitMax, fileMax) => ipcRenderer.invoke('cache:setSizes', { commitMax, fileMax })
});

contextBridge.exposeInMainWorld('nativeApi', {
    isAvailable: () => ipcRenderer.invoke('native:available')
});

ipcRenderer.on('native-git:unavailable', () => {
    window.dispatchEvent(new CustomEvent('native-git:unavailable'));
});

contextBridge.exposeInMainWorld('cacheApi', {
    stats: () => ipcRenderer.invoke('cache:stats')
});

contextBridge.exposeInMainWorld('rebaseApi', {
    start: (folderPath, baseOid) => ipcRenderer.invoke('git:rebase:start', { folderPath, baseOid }),
    writeTodo: (folderPath, lines) => ipcRenderer.invoke('git:rebase:writeTodo', { folderPath, lines }),
    'continue': (folderPath) => ipcRenderer.invoke('git:rebase:continue', { folderPath }),
    abort: (folderPath) => ipcRenderer.invoke('git:rebase:abort', { folderPath }),
    interactiveRebase: (folderPath, baseHash, todoLines) => ipcRenderer.invoke('git:interactiveRebase', { folderPath, baseHash, todoLines })
});

contextBridge.exposeInMainWorld('githubApi', {
    storeToken: (token) => ipcRenderer.invoke('github:storeToken', { token }),
    getPrs: (folderPath) => ipcRenderer.invoke('github:getPrs', { folderPath }),
    getToken: () => ipcRenderer.invoke('github:getToken'),
    validateForRepo: (folderPath) => ipcRenderer.invoke('github:validateForRepo', { folderPath }),
    checkoutPr: (folderPath, prNumber) => ipcRenderer.invoke('github:checkoutPr', { folderPath, prNumber })
});

contextBridge.exposeInMainWorld('aiApi', {
    generateCommitMessage: (folderPath, diffText) => ipcRenderer.invoke('ai:generateCommitMessage', { folderPath, diffText })
    , storeKey: (key) => ipcRenderer.invoke('ai:storeKey', { key }),
    getKey: () => ipcRenderer.invoke('ai:getKey')
});

contextBridge.exposeInMainWorld('gitApi', {
    reflog: (folderPath) => ipcRenderer.invoke('git:reflog', { folderPath }),
    resetTo: (folderPath, sha, mode) => ipcRenderer.invoke('git:resetTo', { folderPath, sha, mode }),
    blameFile: (folderPath, oid, filename) => ipcRenderer.invoke('git:blameFile', { folderPath, oid, filename }),
    checkoutCommit: (folderPath, sha) => ipcRenderer.invoke('git:checkoutCommit', { folderPath, sha })
    ,
    fileLastCommitTime: (folderPath, filename) => ipcRenderer.invoke('git:fileLastCommitTime', { folderPath, filename }),
    getConflictVersions: (folderPath, filename) => ipcRenderer.invoke('git:getConflictVersions', { folderPath, filename }),
    writeFile: (folderPath, filename, content) => ipcRenderer.invoke('git:writeFile', { folderPath, filename, content }),
    worktreeList: (folderPath) => ipcRenderer.invoke('git:worktreeList', { folderPath }),
    worktreeAdd: (folderPath, path, branch) => ipcRenderer.invoke('git:worktreeAdd', { folderPath, path, branch }),
    worktreeRemove: (folderPath, path) => ipcRenderer.invoke('git:worktreeRemove', { folderPath, path }),
    fileHistory: (folderPath, filename) => ipcRenderer.invoke('git:fileHistory', { folderPath, filename }),
    getSigningStatus: (folderPath) => ipcRenderer.invoke('git:getSigningStatus', { folderPath }),
    configureSigningKey: (folderPath, keyId, useGpg) => ipcRenderer.invoke('git:configureSigningKey', { folderPath, keyId, useGpg }),
    bisectStart: (folderPath, goodCommit, badCommit) => ipcRenderer.invoke('git:bisectStart', { folderPath, goodCommit, badCommit }),
    bisectGood: (folderPath) => ipcRenderer.invoke('git:bisectGood', { folderPath }),
    bisectBad: (folderPath) => ipcRenderer.invoke('git:bisectBad', { folderPath }),
    bisectReset: (folderPath) => ipcRenderer.invoke('git:bisectReset', { folderPath }),
    submoduleStatus: (folderPath) => ipcRenderer.invoke('git:submoduleStatus', { folderPath }),
    submoduleInit: (folderPath) => ipcRenderer.invoke('git:submoduleInit', { folderPath }),
    submoduleUpdate: (folderPath, path) => ipcRenderer.invoke('git:submoduleUpdate', { folderPath, path })
    ,
    // advanced search and ignore helpers
    search: (folderPath, query) => ipcRenderer.invoke('git:search', { folderPath, query }),
    readGitignore: (folderPath) => ipcRenderer.invoke('git:readGitignore', { folderPath }),
    appendGitignore: (folderPath, pattern) => ipcRenderer.invoke('git:appendGitignore', { folderPath, pattern }),
    writeGitignore: (folderPath, patterns) => ipcRenderer.invoke('git:writeGitignore', { folderPath, patterns }),
    checkIgnore: (folderPath, filename) => ipcRenderer.invoke('git:checkIgnore', { folderPath, filename }),
    authorStats: (folderPath, author) => ipcRenderer.invoke('git:authorStats', { folderPath, author }),
    authorTopFiles: (folderPath, author) => ipcRenderer.invoke('git:authorTopFiles', { folderPath, author }),
    remoteList: (folderPath) => ipcRenderer.invoke('git:remoteList', { folderPath }),
    remoteSetUrl: (folderPath, name, url, isPush) => ipcRenderer.invoke('git:remoteSetUrl', { folderPath, name, url, isPush }),
    remotePrune: (folderPath, name) => ipcRenderer.invoke('git:remotePrune', { folderPath, name })
});

// Discard selected hunks API
contextBridge.exposeInMainWorld('discardApi', {
    discardHunks: (folderPath, filename, hunks) => ipcRenderer.invoke('git:discardHunks', { folderPath, filename, hunks })
});

contextBridge.exposeInMainWorld('stagingApi', {
    status: (folderPath) => ipcRenderer.invoke('git:status', folderPath),
    stage: (folderPath, filename) => ipcRenderer.invoke('git:stage', { folderPath, filename }),
    unstage: (folderPath, filename) => ipcRenderer.invoke('git:unstage', { folderPath, filename }),
    commit: (folderPath, message) => ipcRenderer.invoke('git:commit', { folderPath, message })
});

contextBridge.exposeInMainWorld('compareApi', {
    compare: (folderPath, a, b) => ipcRenderer.invoke('git:compare', { folderPath, a, b })
});

contextBridge.exposeInMainWorld('hunksApi', {
    getFileHunks: (folderPath, filename) => ipcRenderer.invoke('git:getFileHunks', { folderPath, filename }),
    stageHunks: (folderPath, filename, patch, force) => ipcRenderer.invoke('git:stageHunks', { folderPath, filename, patch, force }),
    check: (folderPath, patch) => ipcRenderer.invoke('git:apply:check', { folderPath, patch })
    ,
    createPatch: (folderPath, filename, before, after) => ipcRenderer.invoke('git:createPatch', { folderPath, filename, before, after })
    ,
    getStructured: (folderPath, filename) => ipcRenderer.invoke('git:getFileHunksStructured', { folderPath, filename }),
    stageSelected: (folderPath, filename, hunks, force) => ipcRenderer.invoke('git:stageSelectedHunks', { folderPath, filename, hunks, force })
    ,
    buildPatch: (folderPath, filename, hunks) => ipcRenderer.invoke('git:buildPatchFromSelected', { folderPath, filename, hunks })
});

contextBridge.exposeInMainWorld('revertApi', {
    revertBackup: (folderPath, backupPath) => ipcRenderer.invoke('git:revertPatchBackup', { folderPath, backupPath })
});

contextBridge.exposeInMainWorld('fileApi', {
    getFileContent: (folderPath, filename, source) => ipcRenderer.invoke('git:getFileContent', { folderPath, filename, source })
});

contextBridge.exposeInMainWorld('stashApi', {
    list: (folderPath) => ipcRenderer.invoke('git:stash:list', folderPath),
    show: (folderPath, stashRef) => ipcRenderer.invoke('git:stash:show', { folderPath, stashRef }),
    apply: (folderPath, stashRef) => ipcRenderer.invoke('git:stash:apply', { folderPath, stashRef }),
    pop: (folderPath, stashRef) => ipcRenderer.invoke('git:stash:pop', { folderPath, stashRef }),
    drop: (folderPath, stashRef) => ipcRenderer.invoke('git:stash:drop', { folderPath, stashRef })
});

contextBridge.exposeInMainWorld('cherryApi', {
    cherryPickNoCommit: (folderPath, oid) => ipcRenderer.invoke('git:cherry:no-commit', { folderPath, oid }),
    cherryAbort: (folderPath) => ipcRenderer.invoke('git:cherry:abort', folderPath)
});

contextBridge.exposeInMainWorld('conflictApi', {
    list: (folderPath) => ipcRenderer.invoke('git:conflicts', folderPath),
    resolveOurs: (folderPath, file) => ipcRenderer.invoke('git:resolve:ours', { folderPath, file }),
    resolveTheirs: (folderPath, file) => ipcRenderer.invoke('git:resolve:theirs', { folderPath, file }),
    resolveMark: (folderPath, file) => ipcRenderer.invoke('git:resolve:mark', { folderPath, file })
});

// expose a way for renderer to listen to cache cleared notifications
ipcRenderer.on('cache:cleared', () => {
    // forward as a window event
    window.dispatchEvent(new CustomEvent('cache:cleared'));
});

ipcRenderer.on('git:commitDiff:progress', (_e, payload) => {
    window.dispatchEvent(new CustomEvent('git:commitDiff:progress', { detail: payload }));
});

ipcRenderer.on('git:commitDiff:fallback', (_e, payload) => {
    window.dispatchEvent(new CustomEvent('git:commitDiff:fallback', { detail: payload }));
});

ipcRenderer.on('settings:updated', (_e, payload) => {
    window.dispatchEvent(new CustomEvent('settings:updated', { detail: payload }));
});

ipcRenderer.on('cache:show', () => {
    window.dispatchEvent(new CustomEvent('cache:show'));
});
