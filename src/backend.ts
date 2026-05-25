import { invoke } from "@tauri-apps/api/core";
import type { Snippet, Settings } from "./types";

export const isTauri =
  typeof window !== "undefined" && "__TAURI__" in window;
export const isWeb = !isTauri;

const LS_KEY_SNIPPETS = "snipx_snippets";
const LS_KEY_FOLDERS = "snipx_folders";
const LS_KEY_SETTINGS = "snipx_settings";

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function getSnippets(): Promise<Snippet[]> {
  if (isTauri) {
    return invoke<Snippet[]>("get_snippets");
  }
  return lsGet<Snippet[]>(LS_KEY_SNIPPETS) ?? [];
}

export async function saveSnippet(snippet: Snippet): Promise<void> {
  if (isTauri) {
    await invoke("save_snippet", { snippet });
    return;
  }
  const snippets = lsGet<Snippet[]>(LS_KEY_SNIPPETS) ?? [];
  const idx = snippets.findIndex((s) => s.id === snippet.id);
  if (idx >= 0) {
    snippets[idx] = snippet;
  } else {
    snippets.push(snippet);
  }
  lsSet(LS_KEY_SNIPPETS, snippets);
}

export async function deleteSnippet(id: string): Promise<void> {
  if (isTauri) {
    await invoke("delete_snippet", { id });
    return;
  }
  const snippets = lsGet<Snippet[]>(LS_KEY_SNIPPETS) ?? [];
  lsSet(
    LS_KEY_SNIPPETS,
    snippets.filter((s) => s.id !== id),
  );
}

export async function saveAllSnippets(snippets: Snippet[]): Promise<void> {
  if (isTauri) {
    await invoke("save_all_snippets", { snippets });
    return;
  }
  lsSet(LS_KEY_SNIPPETS, snippets);
}

export async function getFolders(): Promise<string[]> {
  if (isTauri) {
    return invoke<string[]>("get_folders");
  }
  return lsGet<string[]>(LS_KEY_FOLDERS) ?? [];
}

export async function saveFolders(folders: string[]): Promise<void> {
  if (isTauri) {
    await invoke("save_folders", { folders });
    return;
  }
  lsSet(LS_KEY_FOLDERS, folders);
}

const WEB_DEFAULT_SETTINGS: Settings = {
  enabled: true,
  triggerKey: "both",
  theme: "dark",
};

export async function getSettings(): Promise<Settings> {
  if (isTauri) {
    return invoke<Settings>("get_settings");
  }
  return lsGet<Settings>(LS_KEY_SETTINGS) ?? { ...WEB_DEFAULT_SETTINGS };
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (isTauri) {
    await invoke("save_settings", { settings });
    return;
  }
  lsSet(LS_KEY_SETTINGS, settings);
}

export async function exportSnippets(): Promise<string> {
  if (isTauri) {
    return invoke<string>("export_snippets");
  }
  const snippets = lsGet<Snippet[]>(LS_KEY_SNIPPETS) ?? [];
  return JSON.stringify(snippets, null, 2);
}

export async function importSnippets(json: string): Promise<void> {
  if (isTauri) {
    await invoke("import_snippets", { json });
    return;
  }
  const parsed: Snippet[] = JSON.parse(json);
  for (const s of parsed) {
    if (!s.id || !s.shortcut) {
      throw new Error("Each snippet must have an id and shortcut");
    }
  }
  lsSet(LS_KEY_SNIPPETS, parsed);
}

export async function checkAccessibility(): Promise<boolean> {
  if (isTauri) {
    return invoke<boolean>("check_accessibility");
  }
  return true;
}

export async function setWindowTheme(_theme: string): Promise<void> {
  if (isTauri) {
    await invoke("set_window_theme", { theme: _theme });
  }
}
