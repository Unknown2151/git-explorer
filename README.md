# Git Explorer 🚀

**A high-performance, power-user Git GUI built for speed and advanced workflows.**

Git Explorer is a cross-platform desktop client (built with Electron) designed to bridge the gap between the speed of the command line and the usability of a GUI. Unlike other clients that freeze on large repositories or hide advanced features behind paywalls, Git Explorer is built to handle 50,000+ commits instantly and puts tools like Interactive Rebase and Bisect at your fingertips.

![Git Explorer Graph](https://via.placeholder.com/800x400?text=Git+Explorer+Screenshot+Coming+Soon)

---

## 🌟 Why Git Explorer? (The "Standalone" Factor)

Most Git clients are either too simple (missing features) or too slow (bloated). Git Explorer stands out because:

* **⚡ Zero-Lag Performance:** Powered by a custom **Virtual Scrolling engine**, it renders graphs with 50,000+ commits in milliseconds. No more waiting for your history to load.
* **🔀 Interactive Rebase GUI:** Drag-and-drop commits to squash, fixup, or reorder them. We make the scariest Git command safe and easy.
* **🧠 "Pro" Tools Built-In:** Features like **Git Bisect** (bug hunting), **Worktrees** (parallel development), and **Submodules** are first-class citizens, not hidden away.
* **⌨️ Keyboard First:** Includes a VS Code-style **Command Palette (`Cmd+K`)**. Jump between views, run commands, and switch branches without lifting your hands from the keyboard.
* **🔄 Real-Time Sync:** Automatically detects changes made in your terminal or editor and updates the UI instantly.

---

## ✨ Key Features

### 🎨 Visual History
* **Metro-Style Graph:** Beautiful, readable commit history with Bezier curves.
* **Virtual Rendering:** Only draws what is on screen, ensuring silky smooth scrolling.
* **Rich Metadata:** Click any commit to see full diffs, author info, and file stats.

### 🛠 Advanced Workflows
* **Interactive Rebase:** A dedicated editor to rewrite history visually.
* **Worktree Management:** Create and manage multiple working directories for the same repo (great for fixing bugs while in the middle of a feature).
* **Git Bisect Wizard:** Step-by-step UI to find the commit that broke your code.
* **Stashing:** Save and apply changes with partial hunk support.

### 💻 Developer Experience
* **Command Palette:** Quickly access any feature with `Ctrl+K` / `Cmd+K`.
* **Partial Staging:** Stage specific lines/hunks of code (not just full files).
* **Diff Viewer:** Side-by-side and Inline diff views with syntax highlighting.
* **Dark Mode:** Built for late-night coding sessions.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v16 or higher)
* Git (Recommended for advanced features, though internal JS-Git is used for basics)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/git-explorer.git](https://github.com/your-username/git-explorer.git)
    cd git-explorer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the app:**
    ```bash
    npm start
    ```

---

## ⌨️ Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd/Ctrl + K` | Open Command Palette |
| `Cmd/Ctrl + R` | Refresh Current View |
| `Esc` | Close Modals / Clear Selection |

---

## 🏗 Architecture

Git Explorer uses a modular, modern architecture:
* **Frontend:** HTML5/CSS3 with a custom `GraphRenderer` (SVG) and `ViewManager`.
* **Backend:** Electron `ipcMain` handlers split into modular services (`gitHandlers`, `aiHandlers`).
* **Git Engine:** Hybrid approach using `isomorphic-git` (pure JS) for speed and portability, plus native `spawn('git')` for complex operations.

---

## 🤝 Contributing

Contributions are welcome! Whether it's fixing a bug 🐛, improving performance 🚀, or adding a new feature ✨.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📜 License

Distributed under the ISC License. See `package.json` for more information.
