export default class CommandPalette {
    constructor(commands = [], opts = {}) {
        this.commands = Array.isArray(commands) ? commands : [];
        this.modal = null;
        this.input = null;
        this.list = null;
        this.opts = opts;
        this._build();
        this._bind();
    }

    _build() {
        if (document.getElementById('cmd-palette-root')) {
            this.modal = document.getElementById('cmd-palette-root');
            this.input = document.getElementById('cmd-palette-input');
            this.list = document.getElementById('cmd-palette-list');
            return;
        }
        const root = document.createElement('div');
        root.id = 'cmd-palette-root';
        root.style.display = 'none';
        root.style.position = 'fixed';
        root.style.left = '50%';
        root.style.top = '12%';
        root.style.transform = 'translateX(-50%)';
        root.style.background = '#1f2326';
        root.style.color = '#ddd';
        root.style.padding = '10px';
        root.style.borderRadius = '6px';
        root.style.zIndex = 3500;
        root.style.width = '640px';
        root.style.maxWidth = '94%';
        root.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';

        const input = document.createElement('input');
        input.id = 'cmd-palette-input';
        input.placeholder = 'Type a command (Ctrl/Cmd+K)';
        input.style.width = '100%';
        input.style.padding = '10px';
        input.style.fontSize = '15px';
        input.style.background = '#0b0b0b';
        input.style.color = '#ddd';
        input.style.border = '1px solid #333';
        input.style.borderRadius = '6px';

        const list = document.createElement('div');
        list.id = 'cmd-palette-list';
        list.style.maxHeight = '320px';
        list.style.overflow = 'auto';
        list.style.marginTop = '8px';

        root.appendChild(input);
        root.appendChild(list);
        document.body.appendChild(root);

        this.modal = root; this.input = input; this.list = list;
    }

    _bind() {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.open();
            }
            if (e.key === 'Escape') this.close();
        });
        this.input.addEventListener('input', (e) => this._renderList(e.target.value || ''));
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const first = this.list.querySelector('.cmd-item');
                if (first && first._cmd) { first._cmd.action(); this.close(); }
            }
        });
    }

    open() {
        this.modal.style.display = 'block';
        this.input.value = '';
        this._renderList('');
        setTimeout(() => this.input.focus(), 10);
    }

    close() { this.modal.style.display = 'none'; }

    register(commands = []) { this.commands = this.commands.concat(commands); }

    _renderList(filter) {
        this.list.innerHTML = '';
        const q = (filter || '').toLowerCase();
        const results = this.commands.filter(c => {
            if (!q) return true;
            return (c.label && c.label.toLowerCase().includes(q)) || (c.description && c.description.toLowerCase().includes(q));
        }).slice(0, 200);
        results.forEach(c => {
            const row = document.createElement('div'); row.className = 'cmd-item'; row.style.padding = '8px'; row.style.borderRadius = '6px'; row.style.cursor = 'pointer';
            const left = document.createElement('div'); left.style.display = 'flex'; left.style.flexDirection = 'column';
            const name = document.createElement('div'); name.className = 'cmd-name'; name.textContent = c.label; name.style.fontWeight = '600';
            const desc = document.createElement('div'); desc.className = 'cmd-desc'; desc.textContent = c.description || ''; desc.style.opacity = '0.75'; desc.style.fontSize = '13px';
            left.appendChild(name); left.appendChild(desc);
            row.appendChild(left);
            row._cmd = c;
            row.addEventListener('click', () => { c.action(); this.close(); });
            this.list.appendChild(row);
        });
    }
}
