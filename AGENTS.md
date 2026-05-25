# AGENTS.md — snipx

## What is snipx?

snipx is a lightweight Mac desktop app that works like Text Blaze.
It listens to your keystrokes system-wide and automatically expands
short shortcuts (e.g. `/email`) into full blocks of text — in any app,
anywhere on your Mac.

The app has two parts running simultaneously:
1. A Rust background process that hooks into the keyboard and handles expansion
2. A React web UI (inside Tauri) for managing snippets visually

---

## Stack

| Layer | Tool |
|---|---|
| Desktop shell | Tauri (Rust + WebView) |
| Frontend UI | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Global keyboard listener | `core-graphics` CGEventTap |
| Text injection | `enigo` Rust crate |
| Storage | `serde_json` + local `snippets.json` |
| AI features (future) | DeepSeek V4 API |

---

## Project Structure

```
snipx/
├── src/                        ← React frontend
│   ├── App.tsx
│   ├── main.tsx
│   └── components/
│       ├── SnippetList.tsx
│       ├── SnippetModal.tsx
│       └── Sidebar.tsx
├── src-tauri/                  ← Rust backend
│   ├── src/
│   │   ├── main.rs             ← Binary entry point (calls lib::run)
│   │   ├── lib.rs              ← Tauri setup, commands, tray icon
│   │   ├── listener.rs         ← Global keyboard hook (CGEventTap) + text injection
│   │   └── storage.rs          ← Read/write snippets.json (app_data_dir)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── entitlements.plist      ← macOS accessibility entitlements
│   └── capabilities/
│       └── default.json        ← Tauri v2 capability permissions
├── AGENTS.md                   ← You are here
└── package.json
```

---

## Snippet Data Shape

Each snippet in `snippets.json` follows this structure:

```json
[
  {
    "id": "uuid-here",
    "label": "My Email",
    "shortcut": "/email",
    "expansion": "wilmond@example.com"
  }
]
```

---

## Tauri Commands (Rust → React bridge)

These are the Tauri commands the frontend calls via `invoke()`:

| Command | Description |
|---|---|
| `get_snippets` | Returns all snippets from snippets.json |
| `save_snippet` | Adds or updates a snippet |
| `delete_snippet` | Removes a snippet by ID |
| `reload_snippets` | Tells the listener thread to reload snippet data |

---

## How the Keyboard Listener Works

- Runs in a background thread using `core-graphics` CGEventTap
- Maintains a rolling buffer of recently typed characters
- On every keystroke, checks if the buffer ends with any known shortcut + a trigger key (space or tab)
- If a match is found:
  1. Uses `enigo` to delete the shortcut characters (backspaces)
  2. Types the full expansion text in place
- Snippet data is stored in `Arc<parking_lot::Mutex<Vec<Snippet>>>` shared between the listener thread and Tauri state
- The listener reloads snippets whenever `reload_snippets` is called from the UI

---

## React UI — Pages & Components

### SnippetList
- Shows all snippets as cards (label, shortcut badge, expansion preview)
- Search/filter bar at the top
- Edit and Delete buttons on each card

### SnippetModal
- Used for both Add and Edit
- Fields: Label, Shortcut (must start with `/`), Expansion (multiline)
- Calls `save_snippet` on submit, then refreshes the list

### Sidebar
- Navigation between views (Snippets, Settings)
- App name + logo at top
- Dark theme

---

## Mac Permissions

snipx requires **Accessibility permission** to listen to keystrokes system-wide.

- On first launch, show an onboarding modal guiding the user to:
  `System Settings → Privacy & Security → Accessibility → enable snipx`
- Add the `com.apple.security.automation.apple-events` entitlement in `tauri.conf.json`

---

## Build & Run Commands

```bash
# Install frontend deps
npm install

# Run in dev mode
npm run tauri dev

# Build .app for production
npm run tauri build
```

Output `.app` is at:
`src-tauri/target/release/bundle/macos/snipx.app`

---

## Coding Conventions

- Rust: use `anyhow` for error handling, `serde` + `serde_json` for all serialization
- React: functional components only, no class components
- TypeScript: strict mode on, no `any` types
- Tailwind: dark theme by default (`bg-zinc-900`, `text-zinc-100` base)
- All Tauri commands must be registered in `lib.rs` via `tauri::generate_handler!`
- Keep listener logic in `listener.rs`, storage logic in `storage.rs` — don't mix into `main.rs`

---

## Future Features (do not build yet)

- AI snippet generation using DeepSeek V4 API (user describes what they want, AI writes the expansion)
- Snippet folders / categories
- Import/export snippets as JSON
- Usage stats (how many times each snippet was triggered)
