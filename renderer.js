window.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('git-graph');
    const selectRepoBtn = document.getElementById('select-repo-btn');
    const repoPathDiv = document.getElementById('repo-path');
    const searchInput = document.getElementById('search-input');
    const commitMetaDiv = document.getElementById('commit-meta');
    const changedFilesDiv = document.getElementById('changed-files-list');
    const tooltip = document.getElementById('tooltip');

    let commitMap = new Map();
    let panZoomInstance = null;
    let allCommitsWithLayout = [];
    let currentFolderPath = '';

    function renderGraph(commitsWithLayout) {
        if (panZoomInstance) {
            panZoomInstance.destroy();
            panZoomInstance = null;
        }

        svg.innerHTML = '';
        commitMap = new Map(commitsWithLayout.map(c => [c.oid, c]));

        if (commitsWithLayout.length === 0) {
            return;
        }

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
            panZoomInstance = svgPanZoom('#git-graph', {
                zoomEnabled: true,
                controlIconsEnabled: true,
                fit: false,
                center: false,
            });
            panZoomInstance.fit();
            panZoomInstance.center();
        }, 50);
    }

    selectRepoBtn.addEventListener('click', async () => {
        repoPathDiv.innerText = '';
        svg.innerHTML = '';
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

    let mouseDownPos = null;
    svg.addEventListener('mousedown', (e) => {
        mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    svg.addEventListener('mouseup', async (e) => {
        if (mouseDownPos) {
            const distance = Math.sqrt(
                Math.pow(e.clientX - mouseDownPos.x, 2) +
                Math.pow(e.clientY - mouseDownPos.y, 2)
            );
            console.log('Mouse move distance:', distance);

            if (distance < 5) {
                console.log('Click detected (distance < 5)');
                const oid = e.target.dataset.oid;
                console.log('Target OID:', oid);
                if (oid) {
                    const commitData = commitMap.get(oid);
                    console.log('Found commit data:', commitData);
                    if (commitData) {
                        console.log('Updating UI...');
                        const date = new Date(commitData.commit.author.timestamp * 1000).toLocaleString();
                        commitMetaDiv.innerHTML = `<pre>Commit: ${commitData.oid}\n\n` +
                            `Author: ${commitData.commit.author.name}\n` +
                            `Date: ${date}\n\n` +
                            `${commitData.commit.message}</pre>`;

                        changedFilesDiv.innerHTML = '<em>Loading changed files...</em>';
                        const parentOid = commitData.commit.parent[0];
                        const changedFiles = await window.api.getCommitDiff({ folderPath: currentFolderPath, oid, parentOid });

                        if (changedFiles.error) {
                            changedFilesDiv.innerHTML = `<p class="error">Could not load diff: ${changedFiles.error}</p>`;
                            return;
                        }

                        let filesHtml = '<h4>Changed Files:</h4><ul>';
                        changedFiles.forEach(file => {
                            filesHtml += `<li class="file-${file.status}"><span>${file.status.toUpperCase()}</span> ${file.filename}</li>`;
                        });
                        filesHtml += '</ul>';

                        changedFilesDiv.innerHTML = filesHtml;
                    } else {
                        console.error('No commit data found for this OID in the map.');
                    }
                } else {
                    console.error('No OID found on the clicked target. Target was:', e.target);
                }
            } else {
                console.log('Drag detected (distance >= 5), ignoring click.');
            }
        } else {
            console.error('Error: mouseDownPos was not set.');
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

});