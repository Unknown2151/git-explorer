export default class CloneModal {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
        this._build();
    }

    _build() {
        if (document.getElementById('clone-modal-root')) return;
        const root = document.createElement('div');
        root.id = 'clone-modal-root';
        root.style.display = 'none';
        root.className = 'modal-overlay';

        const panel = document.createElement('div');
        panel.className = 'modal-panel';
        panel.innerHTML = `
            <h3 style="margin-top:0;">Clone Repository</h3>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <input id="clone-repo-url" placeholder="Repository URL (https or ssh)" style="width:100%; padding:8px; background:#0b0b0b; color:#ddd; border:1px solid #333; border-radius:4px;" />
                <div style="display:flex; gap:8px; align-items:center;">
                    <input id="clone-parent-path" placeholder="Parent folder (destination)" style="flex:1; padding:8px; background:#0b0b0b; color:#ddd; border:1px solid #333; border-radius:4px;" />
                    <button id="clone-select-folder" class="back-button">Browse…</button>
                </div>
                <div id="clone-status" style="min-height:20px; color:#9aa4b2; font-size:13px;"></div>
            </div>
            <div style="text-align:right; margin-top:12px;">
                <button id="clone-cancel" class="back-button">Cancel</button>
                <button id="clone-confirm" class="back-button" style="margin-left:8px;">Clone</button>
            </div>
        `;

        root.appendChild(panel);
        document.body.appendChild(root);

        this.root = root;
        this.urlInput = panel.querySelector('#clone-repo-url');
        this.parentInput = panel.querySelector('#clone-parent-path');
        this.selectBtn = panel.querySelector('#clone-select-folder');
        this.cancelBtn = panel.querySelector('#clone-cancel');
        this.confirmBtn = panel.querySelector('#clone-confirm');
        this.statusEl = panel.querySelector('#clone-status');

        this.selectBtn.addEventListener('click', async () => {
            try {
                const picked = await window.api.selectFolder();
                if (picked) this.parentInput.value = picked;
            } catch (e) { this._setStatus('Folder selection canceled'); }
        });

        this.cancelBtn.addEventListener('click', () => this.hide());

        this.confirmBtn.addEventListener('click', async () => {
            const url = (this.urlInput.value || '').trim();
            const parentPath = (this.parentInput.value || '').trim();
            if (!url) return this._setStatus('Please enter a repository URL');
            if (!parentPath) return this._setStatus('Please select a destination folder');
            this._setStatus('Cloning…');
            this._setLoading(true);
            try {
                const res = await window.api.cloneRepo(url, parentPath);
                if (res && res.success) {
                    this._setStatus('Clone successful: ' + res.path);
                    this._setLoading(false);
                    setTimeout(() => { this.hide(); if (this.onSuccess) this.onSuccess(res.path); }, 400);
                } else {
                    this._setStatus('Clone failed: ' + (res && res.error));
                    this._setLoading(false);
                }
            } catch (e) {
                this._setStatus('Clone error: ' + (e && e.message));
                this._setLoading(false);
            }
        });
    }

    _setStatus(msg) { if (this.statusEl) this.statusEl.textContent = msg || ''; }
    _setLoading(isLoading) { if (this.confirmBtn) this.confirmBtn.disabled = !!isLoading; }

    show(defaultUrl = '', defaultParent = '') {
        if (!this.root) this._build();
        this.urlInput.value = defaultUrl || '';
        this.parentInput.value = defaultParent || '';
        this._setStatus('');
        this.root.style.display = 'block';
        setTimeout(() => this.urlInput.focus(), 50);
    }

    hide() { if (this.root) this.root.style.display = 'none'; }
}
