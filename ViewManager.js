export default class ViewManager {
    // viewsMap: { name: HTMLElement }
    // onChange: optional callback(viewName)
    constructor(viewsMap = {}, onChange = null) {
        this.views = { ...viewsMap };
        this.onChange = typeof onChange === 'function' ? onChange : () => {};
        this.current = null;
    }

    // show the named view and hide all others
    show(viewName) {
        Object.keys(this.views).forEach(k => {
            try { const el = this.views[k]; if (!el) return; el.style.display = 'none'; } catch (e) { /* ignore */ }
        });
        const target = this.views[viewName];
        if (target) target.style.display = 'block';
        this.current = viewName;
        try { this.onChange(viewName); } catch (e) { /* ignore */ }
    }

    // convenience: register or update view element
    set(name, element) {
        this.views[name] = element;
    }

    getCurrent() { return this.current; }
}
