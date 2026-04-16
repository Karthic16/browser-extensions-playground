# browser-extensions-playground

A collection of modular browser extensions built using a **scalable monorepo architecture**, organized by browser platform.

This repository is designed to support **multi-browser extension development**, enabling reuse of shared logic while keeping each addon independently deployable.

---

## 📦 Repository Structure

```
browser-extensions-playground/
├── mozilla-firefox/
│ ├── addons/
│ │ └── tabs-session-saver/
│ └── shared/
│ ├── utils/
│ ├── storage/
│ └── ui-components/
├── google-chrome/
│ ├── addons/
│ │ └── session-saver/
│ └── shared/
│ ├── utils/
│ ├── storage/
│ └── ui-components/
├── scripts/
├── docs/
└── README.md
```

---

## 🧩 Addons

### Mozilla Firefox

#### Tabs Session Saver (v1.0)
A lightweight, privacy-focused Firefox extension to save, restore, and manage browser tab sessions locally.

**Key Features:**
- Save all open tabs as collections  
- Restore sessions (new window / current window)  
- Import / Export as JSON  
- Local-first storage (no cloud, no accounts)

📂 Path: `mozilla-firefox/addons/tabs-session-saver/`  
📄 See addon-specific README for full details

---

### Google Chrome

#### Session Saver (Planned)
A Chrome-compatible version of the session saver extension.

> Currently a placeholder. Implementation will align with Chromium APIs while reusing shared logic where possible.

📂 Path: `google-chrome/addons/session-saver/`

---

## 🧠 Architecture Approach

This repository follows a **hybrid modular + shared architecture**:

- **Per-Browser Isolation**
  - Each browser (Firefox, Chrome) has its own directory
  - Handles API differences and manifest variations cleanly

- **Addon-Level Independence**
  - Each addon is self-contained and publishable independently

- **Shared Modules (Per Browser)**
  - Utilities, storage abstractions, and UI components
  - Avoid duplication while respecting browser-specific constraints

---

## 🚀 Getting Started (Development)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd browser-extensions-playground
```

### 2. Load Firefox Extension
1. Open `about:debugging`
2. Click **"This Firefox"**
3. Click **"Load Temporary Add-on"**
4. Select: `mozilla-firefox/addons/tabs-session-saver/manifest.json`

### 3. Load Chrome Extension (Future)
1. Open `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **"Load unpacked"**
4. Select: `google-chrome/addons/session-saver/`

---

## 🎯 Design Principles

- **Modular First** — Each addon is independently developed and deployable
- **Browser-Aware Architecture** — Clean separation for Firefox and Chrome ecosystems
- **Local-first** — Prioritize privacy and offline capability
- **Minimal & Performant** — Avoid unnecessary complexity
- **Extensible** — Designed to scale into a suite of productivity tools

---

## 🛣️ Roadmap

- Expand addon library across browsers
- Build shared modules for common extension patterns
- Add build & packaging automation
- Introduce cross-browser compatibility layers
- Explore optional cloud sync capabilities (opt-in only)

---

## 🤝 Contributing

Contributions, ideas, and experimentation are welcome.

**Guidelines:**

- Keep addons self-contained
- Respect browser-specific boundaries
- Avoid unnecessary permissions
- Prefer reusable abstractions where practical
- Maintain simplicity and clarity

---

## 📄 License

MIT License (or update as applicable)

