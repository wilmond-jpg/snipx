export interface Snippet {
  id: string;
  label: string;
  shortcut: string;
  expansion: string;
  folder: string;
}

export interface Settings {
  enabled: boolean;
  triggerKey: "space" | "tab" | "both";
  theme: "dark" | "light";
}
