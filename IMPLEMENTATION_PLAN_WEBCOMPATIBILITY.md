# snipx — Web Compatibility Implementation Plan

> **Project**: snipx — a system-wide snippet expander for macOS
> **Stack**: Tauri v2 (Rust backend) + React/TypeScript/Vite (frontend)
> **Status**: All data operations route through `invoke()` → Tauri Rust commands.
>   Running Vite standalone (`npm run dev`) silently fails on every `invoke()` call.
> **Goal**: Standalone web frontend with full snippet CRUD, folder management, import/export, settings persistence.

---

## Problem

The React frontend depends entirely on `@tauri-apps/api/core` `invoke()` for all data:

| Operation | Tauri Command | Web Behavior |
|-----------|---------------|-------------|
| Load snippets | `get_snippets` | `invoke()` throws → empty state |
| Save snippet | `save_snippet` | `invoke()` throws → save silently fails |
| Delete snippet | `delete_snippet` | `invoke()` throws → delete silently fails |
| Load folders | `get_folders` | `invoke()` throws → no folders |
| Save folders | `save_folders` | `invoke()` throws → folders not saved |
| Load settings | `get_settings` | `invoke()` throws → default settings used |
| Save settings | `save_settings` | `invoke()` throws → settings lost on reload |
| Export/Import | `export_snippets`, `import_snippets` | `invoke()` throws → broken |
| Accessibility | `check_accessibility` | `invoke()` throws → not checked |
| Window theme | `set_window_theme` | `invoke()` throws → CSS still applies locally |

The UI renders, but nothing persists. The app is unusable as a snippet manager on web.

---

## Solution

Create a **unified data layer** (`src/backend.ts`) that detects Tauri availability and falls back to `localStorage` on web. All 11 `invoke()` call sites get replaced with calls to this module. Desktop-only features (expansion engine, accessibility, tray, window management) gracefully degrade on web.

---

## Files to Create

### 1. `src/backend.ts` (~120 lines)

A single module exporting async functions that mirror every Tauri command signature.

**Architecture:**

```
src/backend.ts
├── isTauri: boolean          — detected via window.__TAURI__ at module level
├── isWeb: boolean            — !isTauri
│
├── getSnippets()             → localStorage("snipx_snippets")
├── saveSnippet(snippet)      → read + upsert + write localStorage
├── deleteSnippet(id)         → read + filter + write localStorage
├── saveAllSnippets(snippets) → write localStorage
│
├── getFolders()              → localStorage("snipx_folders")
├── saveFolders(folders)      → write localStorage
│
├── getSettings()             → localStorage("snipx_settings") with defaults
├── saveSettings(settings)    → write localStorage
│
├── exportSnippets(snippets)  → JSON.stringify(snippets)  (takes data argument)
├── importSnippets(json)      → JSON.parse + write localStorage
│
├── checkAccessibility()      → true  (no-op, not applicable on web)
└── setWindowTheme()          → no-op (CSS theme handled by App.tsx already)
```

**Detection logic:**

```typescript
export const isTauri =
  typeof window !== "undefined" && "__TAURI__" in window;
export const isWeb = !isTauri;
```

When `isTauri`, delegate to `invoke()`. When `isWeb`, use `localStorage`. This way the desktop build still uses the Rust backend with no performance overhead — the abstraction is only a thin if/else per function.

**Key details:**
- `localStorage` keys: `snipx_snippets`, `snipx_folders`, `snipx_settings`
- Settings defaults on web: `{ enabled: true, triggerKey: "both", theme: "dark" }`
- Settings `triggerKey` mapping: the Rust backend maps strings → u8. On web, just store/load the string directly.
- `checkAccessibility()` always returns `true` on web (no macOS Accessibility API needed)
- `setWindowTheme()` is a no-op on web — `App.tsx` already handles theme via `data-theme` attribute on `<html>`

---

## Files to Modify

### 2. `src/App.tsx` (~15 lines changed)

| Change | Location | What |
|--------|----------|------|
| Import swap | Line 2 | `import { invoke } from "@tauri-apps/api/core"` → `import * as backend from "./backend"` |
| Settings load | Lines 43-48 | `invoke<Settings>("get_settings")` → `backend.getSettings()` |
| Accessibility check | Lines 46-48 | `invoke<boolean>("check_accessibility")` → `backend.checkAccessibility()` |
| Accessibility banner | Line 72 | Always set `accessibilityGranted` to `true` on web (native check is desktop-only) |
| `loadSnippets` | Lines 77-85 | `invoke<Snippet[]>("get_snippets")` → `backend.getSnippets()` |
| `loadFolders` | Lines 91-98 | `invoke<string[]>("get_folders")` → `backend.getFolders()` |
| `handleSave` | Lines 109-121 | `invoke("save_snippet", { snippet })` → `backend.saveSnippet(snippet)` |
| `handleDelete` | Lines 129-131 | `invoke("delete_snippet", { id })` → `backend.deleteSnippet(id)` |
| `persistFolders` | Lines 163 | `invoke("save_folders", { folders })` → `backend.saveFolders(folders)` |
| `handleRenameFolder` | Lines 179+ | Both `save_folders` + `save_all_snippets` → `backend.saveFolders()` + `backend.saveAllSnippets()` |
| `handleDeleteFolder` | Lines 197+ | Both calls → `backend.saveFolders()` + `backend.saveAllSnippets()` |

No changes to component logic, event handlers, keyboard shortcuts, or rendering. Only the data access layer changes.

### 3. `src/components/SettingsPage.tsx` (~10 lines changed)

| Change | Location | What |
|--------|----------|------|
| Import swap | Line 2 | `import { invoke } from "@tauri-apps/api/core"` → `import * as backend from "../backend"` |
| Accessibility re-check | Lines 32-34 | `invoke<boolean>("check_accessibility")` → `backend.checkAccessibility()` |
| `update()` — settings save | Lines 40-43 | `invoke("save_settings", ...)` → `backend.saveSettings(updated)` |
| `update()` — theme | Line 42 | `invoke("set_window_theme", ...)` → `backend.setWindowTheme()` (becomes no-op on web) |
| `handleExport` | Lines 46-59 | `invoke<string>("export_snippets")` → `backend.exportSnippets(snippets)` |
| `handleImportFile` | Lines 61-73 | `invoke("import_snippets", { json: text })` → `backend.importSnippets(text)` |

**Accessibility section (optional):** The Accessibility section on web shows a static "Not applicable in browser" message instead of the macOS permission check UI. Or simply hide the entire section when `isWeb`.

### 4. `vite.config.ts` (~5 lines changed)

Current config has Tauri-specific env vars and strict port:

```typescript
// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
```

Replace with:

```typescript
const host = process.env.TAURI_DEV_HOST;
```

Remove the `@ts-expect-error` comment (or add a proper env type). Make `strictPort: false` for standalone web dev so it doesn't crash on port conflict. Keep the rest as-is — the `TAURI_DEV_HOST` check will just be `undefined` when running standalone, which already works (Vite falls back to `localhost`).

### 5. `package.json` (+1 line)

Add script:

```json
"dev:web": "vite"
```

This runs the frontend standalone at `http://localhost:1420` without any Tauri backend. Full CRUD works via localStorage.

---

## What Won't Work on Web (Graceful Degradation)

| Feature | Reason |
|---------|--------|
| Global keyboard listener | CGEventTap is macOS-native; no browser API for system-wide key hooks |
| Text injection (`{{...}}` expansion) | `enigo`/CGEvent keyboard simulation is macOS-native |
| System tray icon | Tauri-specific native feature |
| Window focus tracking | `on_window_event` is Tauri-specific |
| macOS Accessibility API check | `AXIsProcessTrustedWithOptions` is native macOS |
| `{{clipboard}}` variable | Browser Clipboard API requires user-initiated gesture |
| Tray menu (Show/Hide, Quit) | Tauri-specific |

The web version is a **snippet manager** — create, edit, delete, organize, import, export, theme toggle. Expansion only works in the desktop app. This is clearly better than the current state where nothing works.

---

## Implementation Order

```
Step 1: Create src/backend.ts with all 11 functions
Step 2: Update src/App.tsx — swap imports and call sites
Step 3: Update src/components/SettingsPage.tsx — swap imports and call sites
Step 4: Update vite.config.ts — remove Tauri-specific blockers
Step 5: Update package.json — add dev:web script
Step 6: Test: npm run dev:web → full CRUD via localStorage
         Test: npm run tauri dev → still works via Rust backend
```

---

## Files Changed Summary

| File | Action | Lines Changed |
|------|--------|--------------|
| `src/backend.ts` | **CREATE** | ~120 new |
| `src/App.tsx` | MODIFY | ~15 |
| `src/components/SettingsPage.tsx` | MODIFY | ~10 |
| `vite.config.ts` | MODIFY | ~5 |
| `package.json` | MODIFY | +1 |

---

## Future Considerations (Not in Scope)

- **IndexedDB instead of localStorage** — for large snippet collections (>500KB). Not needed now.
- **Live variable preview** — show `{{date}}` → `2026-05-26` inline in the expansion textarea. Already works on desktop via Rust; could add a `src/variables-web.ts` TypeScript port for web parity.
- **PWA support** — manifest, service worker, offline support. Overkill for current scope.
- **Keyboard expansion simulation** — provide a "test expansion" button in the snippet modal that shows what the snippet would expand to. Nice touch but not required for CRUD.
