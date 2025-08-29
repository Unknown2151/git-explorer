window.addEventListener('DOMContentLoaded', () => {

    const svg = document.getElementById('git-graph');
    const selectRepoBtn = document.getElementById('select-repo-btn');
    const repoPathDiv = document.getElementById('repo-path');
    const detailsPanel = document.getElementById('commit-details');
    const tooltip = document.getElementById('tooltip');
    const searchInput = document.getElementById('search-input');
    let commitMap = new Map();
    let panZoomInstance = null;
    let allCommitsWithLayout = [];

    /**
     * Renders the graph.
     */
    function renderGraph(commitsWithLayout) {
        if (panZoomInstance) {
            panZoomInstance.destroy();
        }
        svg.innerHTML = '';
        commitMap = new Map(commitsWithLayout.map(c => [c.oid, c]));

        // Draw lines
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

        // Draw circles
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

        panZoomInstance = svgPanZoom('#git-graph', {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: true,
            center: true,
        });
    }

    // --- Event Listeners ---

    selectRepoBtn.addEventListener('click', async () => {
        repoPathDiv.innerText = '';
        svg.innerHTML = '';
        const folderPath = await window.api.selectFolder();
        if (!folderPath) return;

        repoPathDiv.innerText = `Loading repository: ${folderPath}`;
        const rawCommits = await window.api.getLog(folderPath);

        if (!Array.isArray(rawCommits)) {
            const errorMessage = rawCommits?.error || 'Could not load commit history.';
            repoPathDiv.innerText = `Error: ${errorMessage}`;
            return;
        }

        allCommitsWithLayout = await window.api.calculateLayout(rawCommits);
        renderGraph(allCommitsWithLayout);

        const commitsWithLayout = await window.api.calculateLayout(rawCommits);
        renderGraph(commitsWithLayout);
        repoPathDiv.innerText = `Showing ${rawCommits.length} commits from: ${folderPath}`;
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

    svg.addEventListener('click', (event) => {
        const oid = event.target.dataset.oid;
        if (oid) {
            const commitData = commitMap.get(oid);
            if (commitData) {
                const date = new Date(commitData.commit.author.timestamp * 1000).toLocaleString();
                detailsPanel.innerText = `Commit: ${commitData.oid}\n\n` +
                    `Author: ${commitData.commit.author.name}\n` +
                    `Date: ${date}\n\n` +
                    `${commitData.commit.message}`;
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

});