import { useState, useEffect, useCallback } from "react";
import type { Snippet } from "../types";
import Input from "./ui/Input";
import TextArea from "./ui/TextArea";
import Select from "./ui/Select";
import Button from "./ui/Button";

interface SnippetModalProps {
  snippet: Snippet | null;
  onSave: (snippet: Snippet) => Promise<string | null>;
  onClose: () => void;
  folders: string[];
  defaultFolder?: string;
  snippets: Snippet[];
  editingId: string | null;
}

export default function SnippetModal({
  snippet,
  onSave,
  onClose,
  folders,
  defaultFolder = "",
  snippets,
  editingId,
}: SnippetModalProps) {
  const [form, setForm] = useState<Snippet>(snippet ?? { id: "", label: "", shortcut: "", expansion: "", folder: "" });
  const isEdit = snippet !== null;

  useEffect(() => {
    if (snippet) {
      setForm(snippet);
    } else {
      setForm({ id: "", label: "", shortcut: "", expansion: "", folder: defaultFolder || "" });
    }
  }, [snippet, defaultFolder]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        document.getElementById("snipx-submit-btn")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const checkDuplicateShortcut = useCallback((shortcut: string) => {
    if (!shortcut || shortcut === snippet?.shortcut) {
      setDuplicateWarning(null);
      return;
    }
    const dupe = snippets.find((s) => s.shortcut === shortcut && s.id !== editingId);
    setDuplicateWarning(dupe ? `Shortcut already used by "${dupe.label}"` : null);
  }, [snippets, snippet?.shortcut, editingId]);

  const handleShortcutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith("/")) {
      val = "/" + val;
    }
    setForm((prev) => ({ ...prev, shortcut: val }));
    checkDuplicateShortcut(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!form.label.trim() || !form.shortcut.trim() || !form.expansion.trim()) {
      if (!form.label.trim()) {
        setValidationError("Label is required");
      } else if (!form.shortcut.trim()) {
        setValidationError("Shortcut is required");
      } else {
        setValidationError("Expansion is required");
      }
      return;
    }
    const shortcut = form.shortcut.startsWith("/") ? form.shortcut : "/" + form.shortcut;
    if (duplicateWarning) {
      setValidationError(duplicateWarning);
      return;
    }
    const error = await onSave({
      ...form,
      shortcut,
      id: form.id || crypto.randomUUID(),
    });
    if (error) {
      setValidationError(error);
    }
  };

  const set = (field: keyof Snippet) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-elevated rounded-2xl shadow-modal w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">
          {isEdit ? "Edit Snippet" : "New Snippet"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Label"
            value={form.label}
            onChange={set("label")}
            placeholder="e.g. My Email"
            autoFocus
          />
          <div>
            <Input
              label="Shortcut"
              value={form.shortcut}
              onChange={handleShortcutChange}
              placeholder="e.g. /email"
            />
            {duplicateWarning && (
              <p className="mt-1 text-sm text-amber-400">{duplicateWarning}</p>
            )}
            {validationError && (
              <p className="mt-1 text-sm text-red-400">{validationError}</p>
            )}
          </div>
          <TextArea
            label="Expansion"
            rows={4}
            value={form.expansion}
            onChange={set("expansion")}
            placeholder="e.g. john@example.com"
            charCount={form.expansion.length}
          />
          <Select label="Folder" value={form.folder} onChange={set("folder")}>
            <option value="">None</option>
            {folders.filter(f => f).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button id="snipx-submit-btn" type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
