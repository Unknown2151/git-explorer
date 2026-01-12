export default class RebaseEditor {
  constructor() {
    this.modal = null;
    this.resolve = null;
  }

  // Create modal DOM once
  _createModal() {
    if (this.modal) return this.modal;
    const modal = document.createElement('div');
    modal.id = 'rebase-editor-modal';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.zIndex = 3000;
    modal.style.display = 'none';

    const panel = document.createElement('div');
    panel.style.background = '#1f2326';
    panel.style.color = '#ddd';
    panel.style.width = '900px';
    panel.style.maxWidth = '94%';
    panel.style.margin = '36px auto';
    panel.style.padding = '12px';
    panel.style.borderRadius = '8px';
    panel.style.height = '80%';
    panel.style.overflow = 'auto';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    const title = document.createElement('h3');
    title.textContent = 'Interactive Rebase';
    panel.appendChild(title);

    const list = document.createElement('div');
    list.id = 'rebase-editor-list';
    list.style.flex = '1 1 auto';
    list.style.overflow = 'auto';
    panel.appendChild(list);

    const footer = document.createElement('div');
    footer.style.marginTop = '12px';
    footer.style.textAlign = 'right';

    const abortBtn = document.createElement('button');
    abortBtn.className = 'back-button';
    abortBtn.textContent = 'Close';
    abortBtn.addEventListener('click', () => this._close(null));

    const startBtn = document.createElement('button');
    startBtn.className = 'back-button';
    startBtn.style.marginLeft = '8px';
    startBtn.textContent = 'Start Rebase';
    startBtn.addEventListener('click', () => this._onStart());

    footer.appendChild(abortBtn);
    footer.appendChild(startBtn);
    panel.appendChild(footer);

    modal.appendChild(panel);
    document.body.appendChild(modal);
    this.modal = modal;
    return modal;
  }

  // Show commits array [{ oid, subject }] and set baseOid/folderPath
  show(commits = [], baseOid = '', folderPath = '') {
    this._createModal();
    const list = this.modal.querySelector('#rebase-editor-list');
    list.innerHTML = '';
    this.baseOid = baseOid;
    this.folderPath = folderPath;

    commits.forEach((c, idx) => {
      const row = document.createElement('div');
      row.className = 'rebase-row draggable';
      row.draggable = true;
      row.dataset.oid = c.oid || '';

      const hash = document.createElement('div'); hash.className = 'rebase-hash'; hash.textContent = (c.oid || '').slice(0,8);
      const msg = document.createElement('div'); msg.className = 'rebase-message'; msg.textContent = c.subject || '';
      const action = document.createElement('select'); action.className = 'rebase-action';
      ['pick','reword','edit','squash','fixup','drop'].forEach(a => { const opt = document.createElement('option'); opt.value = a; opt.textContent = a; if (a==='pick') opt.selected = true; action.appendChild(opt); });

      row.appendChild(hash);
      row.appendChild(msg);
      row.appendChild(action);
      list.appendChild(row);

      // drag handlers
      row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.oid); row.classList.add('dragging'); });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
    });

    // enable drop reordering
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = this._getDragAfterElement(list, e.clientY);
      const dragging = list.querySelector('.dragging');
      if (!dragging) return;
      if (!after) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
    });

    this.modal.style.display = 'block';

    return new Promise((resolve) => { this.resolve = resolve; });
  }

  _getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.rebase-row:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  async _onStart() {
    const list = this.modal.querySelector('#rebase-editor-list');
    const rows = Array.from(list.querySelectorAll('.rebase-row'));
    const lines = rows.map(r => {
      const action = r.querySelector('.rebase-action').value || 'pick';
      const sha = r.dataset.oid || '';
      const msg = (r.querySelector('.rebase-message') || {}).textContent || '';
      return `${action} ${sha} ${msg}`.trim();
    });
    try {
      if (!this.folderPath || !this.baseOid) {
        console.warn('Missing folderPath or baseOid for interactive rebase');
      }
      const res = await window.rebaseApi.interactiveRebase(this.folderPath, this.baseOid, lines);
      if (res && res.status === 'CONFLICT') {
        alert('Rebase started but hit conflicts. Resolve them in the "Staging" tab.');
        this._close(res);
        return;
      }
      this._close(res);
      window.dispatchEvent(new Event('git:history-changed'));
    } catch (err) {
      console.error('Interactive rebase failed', err);
      this._close({ error: err && err.message });
    }
  }

  _close(value) {
    if (this.modal) this.modal.style.display = 'none';
    if (this.resolve) this.resolve(value);
    this.resolve = null;
  }
}
