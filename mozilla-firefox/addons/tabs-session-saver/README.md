# Tabs Session Saver — Firefox Extension

A lightweight, privacy-focused Firefox extension to **save, restore, and manage browser tab sessions**.

Built with Manifest V3 and designed with a **local-first approach** — no cloud, no accounts, no tracking.

---

## Features

### Session Management

- **Save All Tabs**
  Capture all open tabs in the current window as a named collection
  _(filters out internal URLs like `about:` and `moz-extension:`)_

- **Restore Collections**
  Reopen saved sessions:
  - in a **new window**
  - or the **current window** (configurable)

- **Delete Collections**
  Remove saved sessions with confirmation

### Import / Export

- **Export Collections**
  Save sessions as `.json` files locally

- **Import Collections**
  Restore sessions from exported files via a dedicated import UI

### Settings

- Toggle restore behavior:
  - Open in **new window**
  - Open in **current window**

---

## Architecture

| File | Role |
|------|------|
| `manifest.json` | Extension configuration (MV3) |
| `popup/popup.html` | Main popup UI |
| `popup/popup.css` | Styling |
| `popup/popup.js` | Core logic |
| `background.js` | Handles downloads |
| `import-page.html/js` | Import interface |
| `icons/` | Extension icons |

---

## Permissions

| Permission | Purpose |
|-----------|--------|
| `storage` | Persist collections and settings locally |
| `tabs` | Read and create tabs/windows |
| `downloads` | Export collections as JSON |

---

## Data Format

```json
{
  "name": "Session Name",
  "createdAt": "2026-04-16T10:30:00.000Z",
  "tabs": [
    {
      "url": "https://example.com",
      "title": "Example"
    }
  ]
}
```

Export metadata includes:
- `version` (e.g., `"1.0"`)
- `exportedAt` timestamp

---

## Development Setup

### Load Extension in Firefox

1. Open `about:debugging`
2. Click **"This Firefox"**
3. Click **"Load Temporary Add-on"**
4. Select `manifest.json`

---

## Design Philosophy

- Local-first and privacy-focused
- Lightweight and fast
- Simple and intuitive UX
- Built for extensibility

---

## Future Scope

> This roadmap is indicative and will evolve over time.

### Functional Enhancements
- Folder/Grouping support
- Tagging and search
- Partial restore and preview
- Smart restore (skip duplicates)

### Data Improvements
- Auto-save sessions
- Version history
- Backup & recovery

### UX Enhancements
- Drag & drop
- Inline editing
- Keyboard shortcuts
- Favicons and improved UI

### Integration
- Context menu support
- Pinned tab handling

### Import/Export
- Selective import
- Version migration

### Optional Cloud (Future)
- Sync across devices (opt-in)
- Shareable sessions

---

## License

MIT License (or update as applicable)
