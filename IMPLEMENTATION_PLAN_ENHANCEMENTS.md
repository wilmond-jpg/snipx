# snipx — Enhancement Implementation Plan

> **Project**: snipx — a system-wide snippet expander for macOS
> **Stack**: Tauri v2 (Rust backend) + React/TypeScript/Vite (frontend)
> **Current Version**: 0.1.0
> **Status**: Core expansion loop works, basic CRUD UI, settings persistence

---

## Executive Summary

snipx has a solid foundation: a working CGEventTap keyboard listener, snippet CRUD, folder organization, dark/light theme, import/export, and a tray icon. This plan outlines enhancements across four phases to move from a functional MVP toward a polished, feature-rich productivity tool.

**Core philosophy**: Each enhancement should either (a) improve the expansion reliability, (b) make snippet management faster, or (c) unlock new use cases — without bloating the codebase.

---

## Phase 1 — Expansion Engine Reliability & Power (High Priority)

These improvements make the core expansion loop more robust, flexible, and user-friendly.

### 1.1 Snippet Variables / Placeholders

**Problem**: All expansions are static text. Users need dynamic values like current date, clipboard content, or cursor position.

**Solution**: Support variables in expansion text with a `{{variable}}` syntax.

**Examples**:
- `{{date}}` → 2026-05-26
- `{{time}}` → 14:30
- `{{datetime}}` → 2026-05-26 14:30
- `{{clipboard}}` → pastes current clipboard content
- `{{cursor}}` → places cursor here after expansion (tab stop)

**Implementation**:
- Add a variable resolver module in Rust (`src-tauri/src/variables.rs`)
- Process expansion text through the resolver before injection
- Supported variables: `date` (ISO), `time` (HH:mm), `datetime`, `clipboard`, `cursor`
- `{{cursor}}` sets a post-expansion cursor position (calculate UTF-16 offset after all other variables are resolved)
- Update frontend to show a "Variables" reference panel in SnippetModal

**Files touched**: new `src-tauri/src/variables.rs`, `listener.rs`, `SnippetModal.tsx`

**Test plan**: Unit tests for each variable type, integration test for cursor position calculation

---

### 1.2 Tab Stops (Multi-cursor Placeholders)

**Problem**: Users want to type a snippet once and then tab through fill-in fields (e.g., a letter template with `{{name}}` and `{{title}}`).

**Solution**: After expansion, position the cursor at the first `{{cursor}}` marker. If multiple markers exist (`{{cursor:1}}`, `{{cursor:2}}`), cycle through them on Tab press.

**Implementation**:
- After injecting expansion text, use CGEvent to set cursor position at the first tab stop
- Track tab stops with a small state machine in the listener
- On Tab keypress immediately after expansion, jump to next tab stop
- Auto-expire tab stop state after any non-Tab keypress or 5 seconds

**Files touched**: `listener.rs`, `variables.rs`

**Test plan**: Simulate expansion + Tab sequence, verify cursor position

---

### 1.3 Expansion Inside WebView Window (Disable Expansion When snipx Is Focused)

**Problem**: Already handled (window focus check), but the current implementation uses an `AtomicBool` that can race.

**Solution**: Reinforce the focus check with a short debounce (50ms) on focus state changes to prevent false negatives during window transitions.

**Files touched**: `lib.rs` (FocusState), `listener.rs`

---

### 1.4 Graceful Listener Recovery

**Problem**: If the event tap fails or macOS resets permissions (e.g., after update), the listener silently dies.

**Solution**:
- Add a watchdog thread that checks the event tap health every 30 seconds
- If the tap is dead, attempt to recreate it
- Send a notification to the UI via Tauri event emitter (`app.emit("listener-status", ...)`)
- Show a status indicator in the sidebar footer

**Files touched**: `listener.rs`, `lib.rs`, `Sidebar.tsx`, `App.tsx`

---

### 1.5 System-wide Hotkey to Open snipx Window

**Problem**: Users must click the tray icon to open snipx.

**Solution**: Register a global hotkey (e.g., `Cmd+Shift+S`) using the Core Graphics event tap to show/hide the snipx window.

**Implementation**:
- Add a configurable hotkey in settings (default: `Cmd+Shift+S`)
- Listen for the hotkey combo in the existing event tap
- When detected, emit a signal back to the main thread to toggle window visibility

**Files touched**: `listener.rs`, `lib.rs`, `settings.rs`, `SettingsPage.tsx`, `types.ts`

---

## Phase 2 — Snippet Management UX (Medium Priority)

These enhancements make the UI faster to use and more informative.

### 2.1 Expansion-Text Search

**Problem**: The search bar only filters by label and shortcut. Users should find snippets by their content.

**Solution**: Add `expansion` text to the search filter.

**Implementation**: A one-line change in `SnippetList.tsx`:
```typescript
s.label.toLowerCase().includes(...) ||
s.shortcut.toLowerCase().includes(...) ||
s.expansion.toLowerCase().includes(...)
```

**Files touched**: `SnippetList.tsx`

---

### 2.2 Snippet Reordering (Drag & Drop)

**Problem**: Snippets are unordered (displayed in file order).

**Solution**: Add drag-and-drop reordering in SnippetList, persist the order in `snippets.json`.

**Implementation**:
- Use HTML5 Drag and Drop API (no extra dependency needed)
- On drop, reorder the array and call `save_all_snippets`
- When loading, preserve the stored order

**Files touched**: `SnippetList.tsx`, `storage.rs` (order already preserved by Vec)

---

### 2.3 Batch Operations

**Problem**: Users must delete or move snippets one at a time.

**Solution**: Add multi-select mode:
- Toggle a "Select" button in the header
- Checkboxes appear on each snippet card
- Bulk actions bar: "Move to Folder", "Delete Selected", "Select All"

**Implementation**:
- Add selection state in SnippetList
- Add batch action buttons that appear when ≥1 snippet selected
- Batch delete calls `save_all_snippets` with filtered list
- Batch move calls `save_all_snippets` with updated folder field

**Files touched**: `SnippetList.tsx`, `App.tsx`

---

### 2.4 Rich Expansion Preview

**Problem**: Users see raw expansion text in the snippet card, which may contain variables or be very long.

**Solution**: Show a partially rendered preview (resolve `{{date}}`, `{{time}}` so they see what it looks like live) and truncate with a "Show more" expand.

**Files touched**: `SnippetList.tsx`

---

### 2.5 Keyboard Shortcuts Reference

**Problem**: Keyboard shortcuts (`Cmd+N`, `Cmd+F`, `Cmd+B`) are undocumented.

**Solution**: Add a "Keyboard Shortcuts" modal (triggered by `?` key) showing all available shortcuts.

**Files touched**: new `components/ShortcutsModal.tsx`, `App.tsx`

---

### 2.6 Sidebar Snippet Counts Live Update

**Problem**: Folder counts in sidebar update, but "All Snippets" and "Uncategorized" counts could also show delta indicators.

**Solution**: Already implemented partially. Add a subtle animation when counts change.

**Files touched**: `Sidebar.tsx`

---

## Phase 3 — Advanced Features (Lower Priority)

These are larger features that add significant capability.

### 3.1 AI Snippet Generation (DeepSeek V4 API)

**Problem**: Users must manually write expansions.

**Solution**: In SnippetModal, add a "Generate with AI" button next to the Expansion field. User describes what they want in natural language, and the expansion is auto-generated.

**Implementation**:
- Add a Tauri command `generate_expansion(prompt: String) -> Result<String>`
- Create a Rust HTTP client module (`src-tauri/src/ai.rs`) that calls DeepSeek V4 API
- API key stored in settings (encrypted at rest)
- Frontend shows a streaming preview of the generated text
- Rate limiting + error handling

**Files touched**: new `src-tauri/src/ai.rs`, `Cargo.toml` (add `reqwest`), `lib.rs`, `SnippetModal.tsx`, `settings.rs`

**Security**: API key must be stored securely. Use macOS Keychain via `security` framework, or at minimum store in app_data_dir with restricted file permissions.

---

### 3.2 Usage Statistics

**Problem**: Users don't know which snippets they use most.

**Solution**: Track expansion count per snippet, display in UI.

**Implementation**:
- Add `usage_count: u64` and `last_used: Option<String>` fields to Snippet
- Increment on each expansion in the listener
- Sort snippets by usage in the UI (optional toggle)
- Show usage stats in the snippet card footer

**Files touched**: `storage.rs` (Snippet struct), `listener.rs`, `SnippetList.tsx`

---

### 3.3 Snippet History / Undo Expansion

**Problem**: If a snippet expands incorrectly, there's no way to undo.

**Solution**: After expansion, if the user presses `Cmd+Z` within 2 seconds, undo the expansion (delete the injected text and restore the shortcut).

**Implementation**:
- Keep a small ring buffer of recent expansions (shortcut + expansion length)
- When Cmd+Z is detected in the event tap and a recent expansion exists, reverse it
- Use CGEvent to delete the expansion text and retype the shortcut

**Files touched**: `listener.rs`

---

### 3.4 iCloud Sync / Multi-Device

**Problem**: Snippets live only on one machine.

**Solution**: Store `snippets.json` in iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/snipx/`).

**Implementation**:
- Add a "Sync via iCloud" toggle in settings
- When enabled, copy snippets file to iCloud directory
- Use `FSEventStream` to watch for changes and reload
- Handle conflicts with last-write-wins strategy

**Files touched**: `settings.rs`, `storage.rs`, `lib.rs`

---

### 3.5 Snippet Sharing (URL / Raw JSON)

**Problem**: Users want to share snippets with teammates.

**Solution**: Generate a shareable link or raw JSON blob that others can import.

**Implementation**:
- "Share" button on each snippet copies a JSON snippet object to clipboard
- "Import from clipboard" in settings parses and adds it
- Future: generate a tiny URL (requires backend service)

**Files touched**: `SnippetList.tsx`, `SettingsPage.tsx`

---

## Phase 4 — Polish & DX Improvements (Ongoing)

These are smaller improvements that improve quality of life and developer experience.

### 4.1 Auto-Start at Login

**Solution**: Use Tauri's `tauri-plugin-autostart` to enable launch-on-login.

**Files touched**: `Cargo.toml`, `lib.rs`, `SettingsPage.tsx`

---

### 4.2 Window Position Memory

**Problem**: Window always opens at default position.

**Solution**: Save/restore window position and size in settings.

**Files touched**: `lib.rs`, `settings.rs`

---

### 4.3 Tray Icon Right-Click Menu

**Solution**: Add "Enable/Disable Expansion" toggle to the tray menu.

**Files touched**: `lib.rs`

---

### 4.4 Accessibility Permission Watcher

**Solution**: Poll accessibility status every 5 seconds while the listener is inactive, and auto-restart the listener when permission is granted without requiring app restart.

**Files touched**: `listener.rs`, `lib.rs`

---

### 4.5 Undo/Redo for Snippet CRUD

**Solution**: Maintain an action history stack in App.tsx for create/update/delete operations.

**Files touched**: `App.tsx`

---

### 4.6 Error Boundary + Crash Reporting

**Solution**: Add a React error boundary around the snippet list and modal. Log Rust panics to a local file for debugging.

**Files touched**: new `components/ErrorBoundary.tsx`, `lib.rs`

---

### 4.7 Test Coverage Expansion

**Problem**: Only storage and listener have tests.

**Solution**: Add tests for:
- `lib.rs` — Tauri command validation logic
- `settings.rs` — load/save roundtrip
- Frontend — component rendering tests (Vitest)

**Files touched**: All modules

---

## Effort & Priority Matrix

| Enhancement | Effort | Impact | Phase |
|---|---|---|---|
| Snippet Variables | Medium | High | 1 |
| Tab Stops | Large | High | 1 |
| Expansion-text Search | Trivial | Medium | 2 |
| Drag & Drop Reorder | Small | Medium | 2 |
| Batch Operations | Medium | High | 2 |
| AI Generation | Large | High | 3 |
| Global Hotkey | Medium | High | 1 |
| Listener Recovery | Medium | High | 1 |
| Usage Stats | Small | Medium | 3 |
| Undo Expansion | Medium | Medium | 3 |
| Keyboard Shortcuts Ref | Small | Medium | 2 |
| iCloud Sync | Large | Medium | 3 |
| Auto-start | Small | Medium | 4 |
| Test Coverage | Medium | High | 4 |

---

## Recommended Build Order

```
Phase 1 ──────────────────────────────────────────────
  Week 1: 1.1 Snippet Variables + 1.5 Global Hotkey
  Week 2: 1.2 Tab Stops + 1.4 Listener Recovery

Phase 2 ──────────────────────────────────────────────
  Week 3: 2.1 Expansion Search + 2.5 Shortcuts Ref
          2.2 Drag & Drop + 2.3 Batch Operations

Phase 3 ──────────────────────────────────────────────
  Week 4: 3.1 AI Generation (MVP: non-streaming)
          3.2 Usage Statistics
  Week 5: 3.3 Undo Expansion + 3.4 iCloud Sync

Phase 4 ──────────────────────────────────────────────
  Ongoing: Auto-start, Window memory, Tray menu,
           Error boundary, Test coverage
```

---

## Dependencies to Add

| Feature | Crate / Package |
|---|---|
| Variables (`{{date}}`) | `chrono` (Rust) |
| AI Generation | `reqwest` (Rust), DeepSeek API key |
| Auto-start | `tauri-plugin-autostart` |
| iCloud FSEvents | `fsevent-sys` or `notify` (Rust) |
| Global Hotkey | Already have CGEventTap |
| Clipboard read | `core-graphics` clipboard or `arboard` |
| Testing (frontend) | `vitest`, `@testing-library/react` |

---

## Appendix: Current Architecture Notes

- **Listener thread** owns the CGEventTap + enigo for injection
- **Snippet data** shared via `Arc<Mutex<Vec<Snippet>>>` between listener and Tauri commands
- **Settings** similarly shared via `Arc<Mutex<Settings>>` + `AtomicBool`/`AtomicU8` for fast-path reads in listener
- **Focus state** uses `Arc<AtomicBool>` — expansion disabled when snipx window is focused
- **Injection** uses CGEvent (primary) with enigo fallback
- **Storage** is flat-file JSON in `app_data_dir`
- **No database** — keeps things simple for now; if snippet count exceeds ~1000, consider SQLite via `rusqlite` or `sled`
