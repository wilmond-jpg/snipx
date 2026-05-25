import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as backend from "./backend";
import type { Snippet, Settings } from "./types";
import Sidebar from "./components/Sidebar";
import SnippetList from "./components/SnippetList";
import SnippetModal from "./components/SnippetModal";
import SettingsPage from "./components/SettingsPage";
import ToastContainer, { useToast } from "./components/ui/Toast";
import Button from "./components/ui/Button";
import "./App.css";

const STORAGE_KEY = "snipx_accessibility_dismissed";

const isMac =
  typeof navigator !== "undefined" &&
  navigator.userAgent.includes("Mac");

function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [persistentFolders, setPersistentFolders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("snippets");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [closingModal, setClosingModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, dismissToast } = useToast();

  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    triggerKey: "both",
    theme: "dark",
  });
  const [accessibilityGranted, setAccessibilityGranted] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    backend.getSettings().then(setSettings);
    backend.checkAccessibility().then(setAccessibilityGranted);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        setEditingSnippet(null);
        setModalOpen(true);
      }
      if (e.metaKey && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.metaKey && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [showAccessibility, setShowAccessibility] = useState(
    isMac && !localStorage.getItem(STORAGE_KEY),
  );

  const loadSnippets = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await backend.getSnippets();
      setSnippets(data);
    } catch (e) {
      console.error("Failed to load snippets:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const loadFolders = useCallback(async () => {
    try {
      const data = await backend.getFolders();
      setPersistentFolders(data);
    } catch (e) {
      console.error("Failed to load folders:", e);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const dismissAccessibility = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowAccessibility(false);
  };

  const handleSave = async (snippet: Snippet): Promise<string | null> => {
    try {
      await backend.saveSnippet(snippet);
      await loadSnippets(false);
      setClosingModal(true);
      setTimeout(() => {
        setModalOpen(false);
        setEditingSnippet(null);
        setClosingModal(false);
      }, 150);
      showToast(snippet.label ? `Saved "${snippet.label}"` : "Snippet saved", "success");
      return null;
    } catch (e) {
      return String(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const deleted = snippets.find((s) => s.id === id);
      await backend.deleteSnippet(id);
      await loadSnippets(false);
      if (deleted) showToast(`Deleted "${deleted.label}"`, "success");
    } catch (e) {
      showToast("Failed to delete snippet", "error");
    }
  };

  const handleEdit = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSnippet(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setClosingModal(true);
    setTimeout(() => {
      setModalOpen(false);
      setEditingSnippet(null);
      setClosingModal(false);
    }, 150);
  };

  const handleSelectFolder = (folder: string) => {
    setSelectedFolder(folder);
    setActiveTab("snippets");
  };

  const persistFolders = async (folders: string[]) => {
    try {
      await backend.saveFolders(folders);
      setPersistentFolders(folders);
    } catch (e) {
      console.error("Failed to save folders:", e);
    }
  };

  const handleAddFolder = async (name: string) => {
    const updated = [...new Set([...persistentFolders, name])].sort();
    await persistFolders(updated);
    setSelectedFolder(name);
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    try {
      const updatedFolders = persistentFolders.map((f) => f === oldName ? newName : f);
      await backend.saveFolders(updatedFolders);
      setPersistentFolders(updatedFolders);

      const updated = snippets.map((s) => ({
        ...s,
        folder: s.folder === oldName ? newName : s.folder,
      }));
      await backend.saveAllSnippets(updated);
      await loadSnippets(false);
      if (selectedFolder === oldName) setSelectedFolder(newName);
    } catch (e) {
      console.error("Failed to rename folder:", e);
    }
  };

  const handleDeleteFolder = async (name: string) => {
    try {
      const updatedFolders = persistentFolders.filter((f) => f !== name);
      await backend.saveFolders(updatedFolders);
      setPersistentFolders(updatedFolders);

      const updated = snippets.map((s) => ({
        ...s,
        folder: s.folder === name ? "" : s.folder,
      }));
      await backend.saveAllSnippets(updated);
      await loadSnippets(false);
      if (selectedFolder === name) setSelectedFolder("");
    } catch (e) {
      console.error("Failed to delete folder:", e);
    }
  };

  const handleSettingsChange = (s: Settings) => {
    setSettings(s);
  };

  const filteredSnippets = useMemo(
    () =>
      selectedFolder === ""
        ? snippets
        : selectedFolder === "__uncategorized__"
          ? snippets.filter((s) => !s.folder)
          : snippets.filter((s) => s.folder === selectedFolder),
    [snippets, selectedFolder],
  );

  const snippetFolders = useMemo(
    () => [...new Set(snippets.map((s) => s.folder).filter(Boolean))],
    [snippets],
  );

  const folderList = useMemo(
    () => [...new Set([...persistentFolders, ...snippetFolders])].sort(),
    [persistentFolders, snippetFolders],
  );

  return (
    <div className="relative h-screen bg-surface text-primary overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        snippets={snippets}
        folders={folderList}
        selectedFolder={selectedFolder}
        onSelectFolder={handleSelectFolder}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      <div className={`h-full overflow-y-auto transition-[padding] duration-200 ease-out ${sidebarOpen ? "pl-64" : "pl-14"}`}>
        {activeTab === "settings" ? (
          <SettingsPage
            settings={settings}
            onSettingsChange={handleSettingsChange}
            accessibilityGranted={accessibilityGranted}
            snippetCount={snippets.length}
            onImportDone={() => loadSnippets(false)}
            showToast={showToast}
          />
        ) : (
          <div key={selectedFolder || "__all__"} className="flex flex-col min-w-0">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-primary">Snippets</h2>
              <Button onClick={handleAdd}>
                + New Snippet{selectedFolder && !selectedFolder.startsWith("_") ? ` in "${selectedFolder}"` : ""}
              </Button>
            </header>

            <SnippetList
              snippets={filteredSnippets}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchInputRef={searchInputRef}
              selectedFolder={selectedFolder}
              loading={loading}
              onAdd={handleAdd}
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-150 ${
            closingModal ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="fixed inset-0 bg-black/60" onClick={handleCloseModal} />
          <div
            className={`relative transition-all duration-150 ${
              closingModal ? "scale-95 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <SnippetModal
              snippet={editingSnippet}
              onSave={handleSave}
              onClose={handleCloseModal}
              folders={folderList}
              defaultFolder={selectedFolder.startsWith("_") ? "" : selectedFolder}
              snippets={snippets}
              editingId={editingSnippet?.id ?? null}
            />
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismissToast={dismissToast} />

      {showAccessibility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-elevated rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-primary mb-2">
              Accessibility Permission Required
            </h2>
            <p className="text-secondary text-sm leading-relaxed">
              snipx needs Accessibility access to expand snippets
              system-wide in any app.
            </p>
            <ol className="mt-4 space-y-2 text-sm text-primary">
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">1.</span>
                <span>
                  Open{" "}
                  <strong className="text-primary">
                    System Settings
                  </strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">2.</span>
                <span>
                  Go to{" "}
                  <strong className="text-primary">
                    Privacy &amp; Security
                  </strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">3.</span>
                <span>
                  Select{" "}
                  <strong className="text-primary">
                    Accessibility
                  </strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-400 shrink-0">4.</span>
                <span>Toggle <strong className="text-primary">snipx</strong> on</span>
              </li>
            </ol>
            <button
              onClick={dismissAccessibility}
              className="mt-6 w-full px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
