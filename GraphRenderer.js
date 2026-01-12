export class GitGraph {
    constructor(svgElement, containerElement = null) {
        if (!svgElement) throw new Error('svgElement required');
        this.svg = svgElement;
        this.container = containerElement;
        this.commitMap = new Map();
        this.allCommits = [];
        this.panZoomInstance = null;
        
        // Virtual scrolling config
        this.rowHeight = 30; // pixels per commit
        this.bufferSize = 10; // commits to render above/below visible area
        this.currentStartIndex = 0;
        this.currentEndIndex = 0;
        this.totalHeight = 0;
        this.scrollListenerActive = false;
    }

    heatColorFromTimestamp(ts) {
        if (!ts) return '';
        const now = Math.floor(Date.now() / 1000);
        const ageSec = Math.max(0, now - ts);
        const day = 24 * 60 * 60;
        if (ageSec <= day) return 'rgba(255,80,80,0.18)';
        if (ageSec <= 7 * day) return 'rgba(255,160,80,0.14)';
        if (ageSec <= 30 * day) return 'rgba(255,220,120,0.10)';
        if (ageSec <= 90 * day) return 'rgba(140,200,255,0.06)';
        return 'rgba(160,180,230,0.04)';
    }

    clear() {
        this.svg.innerHTML = '';
        this.commitMap.clear();
        this.allCommits = [];
        try { if (this.panZoomInstance) { this.panZoomInstance.destroy(); this.panZoomInstance = null; } } catch (e) { }
    }

    /**
     * Calculate which commits should be visible based on scroll position
     */
    calculateVisibleRange(scrollTop, viewportHeight) {
        // Calculate which commits are in the visible viewport
        const startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.bufferSize);
        const endIndex = Math.min(this.allCommits.length, Math.ceil((scrollTop + viewportHeight) / this.rowHeight) + this.bufferSize);
        return { startIndex, endIndex };
    }

    /**
     * Render only the visible commits (virtual scrolling)
     */
    renderVisibleCommits(startIndex, endIndex) {
        if (startIndex === this.currentStartIndex && endIndex === this.currentEndIndex) {
            return; // No change needed
        }

        this.currentStartIndex = startIndex;
        this.currentEndIndex = endIndex;
        
        const visibleCommits = this.allCommits.slice(startIndex, endIndex);
        
        // Clear SVG but keep commit map
        this.svg.innerHTML = '';

        if (visibleCommits.length === 0) return;

        // Draw bezier 'metro' links for visible commits
        visibleCommits.forEach(commit => {
            (commit.commit.parent || []).forEach(parentOid => {
                const parent = this.commitMap.get(parentOid);
                if (!parent) return;
                const sx = Number(commit.x);
                const sy = Number(commit.y);
                const ex = Number(parent.x);
                const ey = Number(parent.y);
                const d = `M ${sx} ${sy} C ${sx} ${sy + 20}, ${ex} ${ey - 20}, ${ex} ${ey}`;
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', d);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', commit.color || '#555');
                path.setAttribute('stroke-width', 2);
                path.setAttribute('stroke-linecap', 'round');
                path.style.transition = 'stroke 0.2s ease';
                path.dataset.childOid = commit.oid;
                this.svg.appendChild(path);
            });
        });

        // Draw visible commit nodes
        visibleCommits.forEach(commit => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', commit.x);
            circle.setAttribute('cy', commit.y);
            circle.setAttribute('r', 8);
            circle.setAttribute('fill', commit.color || '#61afef');
            circle.setAttribute('stroke', '#282c34');
            circle.setAttribute('stroke-width', 2);
            circle.style.cursor = 'pointer';
            circle.style.transition = 'transform 0.15s ease-in-out';
            circle.dataset.oid = commit.oid;
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = commit.commit.message || '';
            circle.appendChild(title);
            this.svg.appendChild(circle);
        });
    }

    /**
     * Setup scroll listener on container
     */
    setupScrollListener() {
        if (!this.container || this.scrollListenerActive) return;
        
        this.scrollListenerActive = true;
        let scrollTimeout = null;

        const handleScroll = () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            
            const scrollTop = this.container.scrollTop;
            const viewportHeight = this.container.clientHeight;
            const { startIndex, endIndex } = this.calculateVisibleRange(scrollTop, viewportHeight);
            
            this.renderVisibleCommits(startIndex, endIndex);

            // Re-initialize pan/zoom after scroll (debounced)
            scrollTimeout = setTimeout(() => {
                try {
                    if (this.panZoomInstance) {
                        this.panZoomInstance.updateBBox();
                    }
                } catch (err) {
                    // Ignore pan/zoom errors
                }
            }, 200);
        };

        this.container.addEventListener('scroll', handleScroll, { passive: true });
    }

    render(commitsWithLayout = []) {
        this.clear();
        this.allCommits = commitsWithLayout;
        this.commitMap = new Map(commitsWithLayout.map(c => [c.oid, c]));

        if (!commitsWithLayout || commitsWithLayout.length === 0) return;

        // Calculate total height for scrollbar
        this.totalHeight = commitsWithLayout.length * this.rowHeight;

        // If container provided, set up virtual scrolling
        if (this.container) {
            this.container.style.height = `${this.container.clientHeight || 600}px`;
            this.container.style.overflow = 'auto';
            
            // Create spacer div to maintain scroll dimensions
            let spacer = this.container.querySelector('[data-virtual-spacer]');
            if (!spacer) {
                spacer = document.createElement('div');
                spacer.dataset.virtualSpacer = 'true';
                this.container.appendChild(spacer);
            }
            spacer.style.height = `${this.totalHeight}px`;
            spacer.style.pointerEvents = 'none';

            // Initial render of visible commits
            const scrollTop = this.container.scrollTop;
            const viewportHeight = this.container.clientHeight;
            const { startIndex, endIndex } = this.calculateVisibleRange(scrollTop, viewportHeight);
            this.renderVisibleCommits(startIndex, endIndex);

            // Setup scroll listener
            this.setupScrollListener();

            // Initialize pan/zoom
            setTimeout(() => {
                try {
                    if (this.panZoomInstance) {
                        this.panZoomInstance.updateBBox();
                    } else if (window && window.svgPanZoom) {
                        this.panZoomInstance = window.svgPanZoom('#git-graph', { 
                            zoomEnabled: true, 
                            controlIconsEnabled: true, 
                            fit: false,
                            center: false 
                        });
                    }
                } catch (err) {
                    console.warn('panZoom error', err);
                }
            }, 50);
        } else {
            // Fallback: render all commits if no container (old behavior)
            this.renderVisibleCommits(0, commitsWithLayout.length);

            // initialize pan/zoom
            setTimeout(() => {
                try {
                    if (this.panZoomInstance) {
                        this.panZoomInstance.updateBBox();
                        this.panZoomInstance.fit();
                        this.panZoomInstance.center();
                    } else if (window && window.svgPanZoom) {
                        this.panZoomInstance = window.svgPanZoom('#git-graph', { 
                            zoomEnabled: true, 
                            controlIconsEnabled: true, 
                            fit: true, 
                            center: true 
                        });
                    }
                } catch (err) {
                    console.warn('panZoom error', err);
                }
            }, 50);
        }
    }
}

export default GitGraph;
