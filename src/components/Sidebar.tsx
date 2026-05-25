import { useState, useRef, useEffect } from "react";
import type { Snippet } from "../types";
import IconButton from "./ui/IconButton";
import Input from "./ui/Input";
import Button from "./ui/Button";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  snippets: Snippet[];
  folders: string[];
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  onAddFolder: (name: string) => void;
  onRenameFolder: (oldName: string, newName: string) => void;
  onDeleteFolder: (name: string) => void;
}

const tabs = [
  { id: "snippets", label: "Snippets" },
  { id: "settings", label: "Settings" },
];

export default function Sidebar({
  open,
  onToggle,
  activeTab,
  onTabChange,
  snippets,
  folders,
  selectedFolder,
  onSelectFolder,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
}: SidebarProps) {
  const uncounted = snippets.filter((s) => !s.folder).length;
  const folderCount = (folder: string) => snippets.filter((s) => s.folder === folder).length;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const addInput = useRef<HTMLInputElement>(null);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInput = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);

  useEffect(() => {
    if (adding) addInput.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (renaming) renameInput.current?.focus();
  }, [renaming]);

  const confirmAdd = () => {
    const name = newName.trim();
    if (name) {
      onAddFolder(name);
    }
    setAdding(false);
    setNewName("");
  };

  const confirmRename = (oldName: string) => {
    const name = renameValue.trim();
    if (name && name !== oldName) {
      onRenameFolder(oldName, name);
    }
    setRenaming(null);
    setRenameValue("");
  };

  return (
    <>
      {!open && (
        <IconButton
          onClick={onToggle}
          label="Open sidebar"
          className="absolute top-6 left-6 z-20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </IconButton>
      )}

      <aside className={`absolute inset-y-0 left-0 z-10 w-64 bg-elevated flex flex-col border-r border-border shadow-elevated transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div data-tauri-drag-region className="flex items-center p-6 shrink-0">
          {open && (
            <>
              <IconButton onClick={onToggle} label="Close sidebar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </IconButton>
              <h1 className="text-2xl font-bold text-violet-400 tracking-tight ml-3">snipx</h1>
            </>
          )}
        </div>

      <div className={`flex-1 overflow-y-auto ${open ? "" : "hidden"}`}>
        <nav className="px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-card-hover text-primary"
                  : "text-secondary hover:text-primary hover:bg-card-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 px-3">
          <button
            onClick={() => setFoldersCollapsed((p) => !p)}
            className="w-full flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider px-4 mb-1"
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${foldersCollapsed ? "-rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Folders
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-200 ${foldersCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
          >
            <div className="overflow-hidden space-y-0.5">
            <button
              onClick={() => onSelectFolder("")}
              className={`w-full flex items-center justify-between px-4 py-1.5 rounded-lg text-sm transition-colors ${
                selectedFolder === ""
                  ? "bg-card-hover text-primary"
                  : "text-secondary hover:text-primary hover:bg-card-hover"
              }`}
            >
              <span>All Snippets</span>
              <span className="text-xs text-muted">{snippets.length}</span>
            </button>
            <button
              onClick={() => onSelectFolder("__uncategorized__")}
              className={`w-full flex items-center justify-between px-4 py-1.5 rounded-lg text-sm transition-colors ${
                selectedFolder === "__uncategorized__"
                  ? "bg-card-hover text-primary"
                  : "text-secondary hover:text-primary hover:bg-card-hover"
              }`}
            >
              <span>Uncategorized</span>
              <span className="text-xs text-muted">{uncounted}</span>
            </button>
            {folders.map((folder) => (
              <div key={folder} className="group flex items-center gap-1">
                {renaming === folder ? (
                  <Input
                    ref={renameInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => confirmRename(folder)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename(folder);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm"
                  />
                ) : (
                  <button
                    onClick={() => onSelectFolder(folder)}
                    className={`flex-1 flex items-center justify-between px-4 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedFolder === folder
                        ? "bg-card-hover text-primary"
                        : "text-secondary hover:text-primary hover:bg-card-hover"
                    }`}
                  >
                    <span className="truncate">{folder}</span>
                    <span className="text-xs text-muted">{folderCount(folder)}</span>
                  </button>
                )}
                {selectedFolder === folder && renaming !== folder && confirmDelete !== folder && (
                  <div className="flex gap-0.5 shrink-0">
                    <IconButton
                      onClick={() => { setRenaming(folder); setRenameValue(folder); }}
                      label="Rename folder"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </IconButton>
                    <IconButton
                      onClick={() => setConfirmDelete(folder)}
                      label="Delete folder"
                      className="hover:text-red-400"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </IconButton>
                  </div>
                )}
                {confirmDelete === folder && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { onDeleteFolder(folder); setConfirmDelete(null); }}
                    >
                      Confirm?
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>

          {adding ? (
            <div className="px-3 mt-1">
              <Input
                ref={addInput}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={confirmAdd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAdd();
                  if (e.key === "Escape") { setAdding(false); setNewName(""); }
                }}
                placeholder="Folder name"
                className="rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full text-left px-4 py-1.5 mt-1 rounded-lg text-sm text-muted hover:text-primary hover:bg-card-hover transition-colors"
            >
              + Add Folder
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
