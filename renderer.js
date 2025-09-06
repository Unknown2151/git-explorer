window.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('git-graph');
    const selectRepoBtn = document.getElementById('select-repo-btn');
    const repoPathDiv = document.getElementById('repo-path');
    const searchInput = document.getElementById('search-input');
    const commitMetaDiv = document.getElementById('commit-meta');
    const changedFilesDiv = document.getElementById('changed-files-list');
    const tooltip = document.getElementById('tooltip');
    const graphContainer = document.getElementById('graph-container');
    const splitter = document.getElementById('splitter');

    let commitMap = new Map();
    let panZoomInstance = null;
    let allCommitsWithLayout = [];
    let currentFolderPath = '';
    let activeCommit = null;

    function renderGraph(commitsWithLayout) {
        if (panZoomInstance) {
            panZoomInstance.destroy();
            panZoomInstance = null;
        }
        svg.innerHTML = '';
        commitMap = new Map(commitsWithLayout.map(c => [c.oid, c]));
        if (commitsWithLayout.length === 0) return;

        commitsWithLayout.forEach(commit => {
            commit.commit.parent.forEach(parentOid => {
                const parentCommit = commitMap.get(parentOid);
                if (parentCommit) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', commit.x);
                    line.setAttribute('y1', commit.y);
                    line.setAttribute('x2', parentCommit.x);
                    line.setAttribute('y2', parentCommit.y);
                    line.setAttribute('stroke', commit.color || '#555');
                    line.setAttribute('stroke-width', 2);
                    line.dataset.childOid = commit.oid;
                    svg.appendChild(line);
                }
            });
        });

        commitsWithLayout.forEach(commit => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', commit.x);
            circle.setAttribute('cy', commit.y);
            circle.setAttribute('r', 8);
            circle.setAttribute('fill', commit.color || '#61afef');
            circle.setAttribute('stroke', '#282c34');
            circle.setAttribute('stroke-width', 2);
            circle.dataset.oid = commit.oid;
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = commit.commit.message;
            circle.appendChild(title);
            svg.appendChild(circle);
        });

        setTimeout(() => {
            if (panZoomInstance) {
                panZoomInstance.updateBBox();
                panZoomInstance.fit();
                panZoomInstance.center();
            } else {
                panZoomInstance = svgPanZoom('#git-graph', {
                    zoomEnabled: true,
                    controlIconsEnabled: true,
                    fit: true,
                    center: true,
                });
            }
        }, 50);
    }

    function renderCommitDetails(commitData) {
        activeCommit = commitData;
        const date = new Date(commitData.commit.author.timestamp * 1000).toLocaleString();
        commitMetaDiv.innerHTML = `
            <div class="commit-meta-item">
              <span class="meta-label">Commit:</span>
              <span class="meta-value monospace" id="commit-hash-value">${commitData.oid}</span>
              <button class="copy-button" data-hash="${commitData.oid}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
            <div class="commit-meta-item">
              <span class="meta-label">Author:</span>
              <span class="meta-value">${commitData.commit.author.name}</span>
            </div>
            <div class="commit-meta-item">
              <span class="meta-label">Date:</span>
              <span class="meta-value">${date}</span>
            </div>
            <pre class="commit-message">${commitData.commit.message}</pre>
        `;

        changedFilesDiv.innerHTML = '<em>Loading changed files...</em>';
        const parentOid = commitData.commit.parent[0];
        window.api.getCommitDiff({ folderPath: currentFolderPath, oid: commitData.oid, parentOid }).then(changedFiles => {
            if (changedFiles.error) {
                changedFilesDiv.innerHTML = `<p class="error">Could not load list of files: ${changedFiles.error}</p>`;
                return;
            }
            let filesHtml = '<h4>Changed Files:</h4><ul>';
            changedFiles.forEach(file => {
                filesHtml += `<li class="file-diff-link file-${file.status}" data-filename="${file.filename}" data-oid="${commitData.oid}" data-parentoid="${parentOid || ''}">
                    <span>${file.status.toUpperCase()}</span> ${file.filename}
                </li>`;
            });
            filesHtml += '</ul>';
            changedFilesDiv.innerHTML = filesHtml;
        });
    }

    selectRepoBtn.addEventListener('click', async () => {
        repoPathDiv.innerText = '';
        svg.innerHTML = '';
        commitMetaDiv.innerHTML = '';
        changedFilesDiv.innerHTML = '';
        const folderPath = await window.api.selectFolder();
        if (!folderPath) return;

        currentFolderPath = folderPath;
        repoPathDiv.innerText = `Loading repository: ${folderPath}`;
        const rawCommits = await window.api.getLog(folderPath);
        if (!Array.isArray(rawCommits)) {
            const errorMessage = rawCommits?.error || 'Could not load commit history.';
            repoPathDiv.innerText = `Error: ${errorMessage}`;
            return;
        }
        allCommitsWithLayout = await window.api.calculateLayout(rawCommits);
        renderGraph(allCommitsWithLayout);
        repoPathDiv.innerText = `Showing ${allCommitsWithLayout.length} commits from: ${folderPath}`;
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const allCircles = svg.querySelectorAll('circle');
        const allLines = svg.querySelectorAll('line');
        if (!searchTerm) {
            allCircles.forEach(c => c.style.opacity = '1');
            allLines.forEach(l => l.style.opacity = '1');
            return;
        }
        const matchingOids = new Set();
        allCommitsWithLayout.forEach(commit => {
            if (commit.commit.message.toLowerCase().includes(searchTerm)) {
                matchingOids.add(commit.oid);
            }
        });
        allCircles.forEach(circle => {
            circle.style.opacity = matchingOids.has(circle.dataset.oid) ? '1' : '0.2';
        });
        allLines.forEach(line => {
            line.style.opacity = matchingOids.has(line.dataset.childOid) ? '1' : '0.2';
        });
    });

    changedFilesDiv.addEventListener('click', async (e) => {
        const fileLink = e.target.closest('.file-diff-link');
        if (fileLink) {
            const { filename, oid, parentoid } = fileLink.dataset;
            changedFilesDiv.innerHTML = `<em>Loading diff for ${filename}...</em>`;
            const patch = await window.api.getFileDiff({ folderPath: currentFolderPath, oid, parentOid: parentoid, filename });
            const backButtonHtml = '<button class="back-button">&larr; Back to File List</button>';
            if (patch) {
                const diffHtml = Diff2Html.html(patch, { drawFileList: false, outputFormat: 'side-by-side', matching: 'lines' });
                changedFilesDiv.innerHTML = backButtonHtml + diffHtml;
            } else {
                changedFilesDiv.innerHTML = backButtonHtml + `<p class="error">Could not generate diff for ${filename}.</p>`;
            }
        }

        const backButton = e.target.closest('.back-button');
        if (backButton && activeCommit) {
            renderCommitDetails(activeCommit);
        }
    });

    let mouseDownPos = null;
    svg.addEventListener('mousedown', (e) => {
        mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    svg.addEventListener('mouseup', (e) => {
        if (mouseDownPos) {
            const distance = Math.sqrt(Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2));
            if (distance < 5) {
                const oid = e.target.dataset.oid;
                if (oid) {
                    const commitData = commitMap.get(oid);
                    if (commitData) {
                        renderCommitDetails(commitData);
                    }
                }
            }
        }
    });

    svg.addEventListener('mouseover', (event) => {
        const oid = event.target.dataset.oid;
        if (oid) {
            const commitData = commitMap.get(oid);
            if (commitData) {
                tooltip.style.display = 'block';
                tooltip.textContent = commitData.commit.message;
                tooltip.style.left = `${event.pageX + 15}px`;
                tooltip.style.top = `${event.pageY + 15}px`;
            }
        }
    });

    svg.addEventListener('mouseout', () => {
        tooltip.style.display = 'none';
    });

    commitMetaDiv.addEventListener('click', (e) => {
        const target = e.target.closest('.copy-button');
        if (target) {
            const hash = target.dataset.hash;
            navigator.clipboard.writeText(hash).then(() => {
                target.innerHTML = 'Copied!';
                setTimeout(() => {
                    target.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 1000);
            });
        }
    });

    splitter.addEventListener('mousedown', (e) => {
        e.preventDefault();
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    });

    function resize(e) {
        graphContainer.style.width = e.clientX + 'px';
    }

    function stopResize() {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResize);
    }
});