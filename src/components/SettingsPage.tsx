import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "../types";
import Toggle from "./ui/Toggle";
import Button from "./ui/Button";

interface SettingsPageProps {
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  accessibilityGranted: boolean;
  snippetCount: number;
  onImportDone: () => void;
  showToast?: (message: string, variant: "success" | "error" | "info") => void;
}

export default function SettingsPage({
  settings,
  onSettingsChange,
  accessibilityGranted,
  snippetCount,
  onImportDone,
  showToast,
}: SettingsPageProps) {
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accessibility, setAccessibility] = useState(accessibilityGranted);

  useEffect(() => {
    setAccessibility(accessibilityGranted);
  }, [accessibilityGranted]);

  useEffect(() => {
    invoke<boolean>("check_accessibility").then(setAccessibility).catch(() => {});
  }, []);

  const update = (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    onSettingsChange(updated);
    setSaving(true);
    Promise.all([
      invoke("save_settings", { settings: updated }),
      ...(partial.theme ? [invoke("set_window_theme", { theme: partial.theme })] : []),
    ]).catch(console.error).finally(() => setSaving(false));
  };

  const handleExport = async () => {
    try {
      const json = await invoke<string>("export_snippets");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "snipx-snippets.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await invoke("import_snippets", { json: text });
      showToast?.("Snippets imported successfully", "success");
      onImportDone();
    } catch (err) {
      showToast?.(`Import failed: ${err}`, "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-primary mb-6">Settings</h2>

      <div className="space-y-8 max-w-xl">
        <section className="bg-elevated rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Expansion</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary font-medium">Enable Expansion</p>
              <p className="text-xs text-secondary mt-0.5">Allow snippet expansion system-wide</p>
            </div>
            <Toggle
              checked={settings.enabled}
              onChange={(checked) => update({ enabled: checked })}
            />
          </div>

          <div className="mt-5">
            <p className="text-sm text-primary font-medium mb-2.5">Trigger Key</p>
            <div className="flex gap-3">
              {(["space", "tab", "both"] as const).map((key) => (
                <label
                  key={key}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    settings.triggerKey === key
                      ? "border-violet-500 bg-violet-500/10 text-primary"
                      : "border-border bg-card text-secondary hover:bg-card-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="triggerKey"
                    value={key}
                    checked={settings.triggerKey === key}
                    onChange={() => update({ triggerKey: key })}
                    className="sr-only"
                  />
                  {key === "space" ? "Space" : key === "tab" ? "Tab" : "Both"}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-elevated rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Appearance</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary font-medium">Theme</p>
              <p className="text-xs text-secondary mt-0.5">Dark or light color scheme</p>
            </div>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    settings.theme === t
                      ? "bg-violet-600 text-white"
                      : "bg-card text-secondary hover:bg-card-hover"
                  }`}
                >
                  {t === "dark" ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      Dark
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Light
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-elevated rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Accessibility</h3>
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${accessibility ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm text-primary">
              {accessibility ? "Permission granted" : "Permission not granted"}
            </span>
            {!accessibility && (
              <button
                onClick={async () => {
                  try {
                    const { openUrl } = await import("@tauri-apps/plugin-opener");
                    await openUrl(
                      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
                    );
                  } catch {
                    window.open(
                      "https://support.apple.com/guide/mac-help/change-accessibility-preferences-on-mac-mchlp1071",
                    );
                  }
                }}
                className="ml-auto px-3 py-1 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                Open Settings
              </button>
            )}
          </div>
        </section>

        <section className="bg-elevated rounded-xl p-5 border border-border shadow-card">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Data
            <span className="ml-2 text-xs font-normal text-secondary normal-case">
              ({snippetCount} snippets)
            </span>
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleExport}>
              Export as JSON
            </Button>
            <label className="px-4 py-2 rounded-lg text-sm font-medium bg-card text-primary hover:bg-card-hover border border-border transition-colors cursor-pointer">
              Import from JSON
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {saving && (
          <p className="text-xs text-secondary text-right animate-pulse">Saving...</p>
        )}
      </div>
    </div>
  );
}
